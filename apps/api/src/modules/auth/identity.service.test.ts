import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sql, Migrator } from "kysely";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "@vyasen/database";
import { PlatformMigrationProvider } from "@vyasen/database/migrations";
import { config } from "../../config";
import {
  EmailProvider,
  SmsProvider,
  GoogleProvider,
  hashRateLimitKey,
  type GoogleIdentity,
} from "./auth.provider";
import {
  IdentityService,
  encodePassword,
  checkPassword,
} from "./identity.service";
import { AuthService } from "./auth.service";
import { identityRepository } from "./identity.repository";
import { buildApp } from "../../app";
import type { SessionMetadata } from "./auth.repository";

test("Argon2id password hashes use random salts and reject wrong passwords", async () => {
  const a = await encodePassword("a secure password");
  const b = await encodePassword("a secure password");
  assert.notEqual(a, b);
  assert.equal(await checkPassword(a, "a secure password"), true);
  assert.equal(await checkPassword(a, "incorrect"), false);
  assert.equal(await checkPassword("invalid", "a secure password"), false);
});

class Email extends EmailProvider {
  code = "";
  constructor() {
    super(null);
  }
  override async sendSignInCode(_destination: string, code: string) {
    this.code = code;
  }
}
class Sms extends SmsProvider {
  code = "";
  constructor() {
    super(null);
  }
  override isAvailable() {
    return true;
  }
  override async sendSignInCode(_destination: string, code: string) {
    this.code = code;
  }
}

class Google extends GoogleProvider {
  identity: GoogleIdentity = {
    subject: "google-test-subject",
    email: "google@example.test",
    name: "Google Person",
    image: null,
  };
  constructor() {
    super("test-client", "test-secret", "http://localhost/callback");
  }
  override async verifyOneTapCredential() {
    return this.identity;
  }
}

test(
  "fresh database: password proof, SMS, contact/link separation, sessions and replay",
  { skip: !process.env.RUN_IDENTITY_DATABASE_TESTS },
  async () => {
    const base = new URL(config.databaseUrl);
    assert.ok(
      ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname),
      "Only local test database creation is allowed.",
    );
    const name = "vyasen_identity_test_" + randomUUID().replaceAll("-", "");
    const admin = createDatabase(base.toString());
    let db: ReturnType<typeof createDatabase> | undefined;
    try {
      await sql`CREATE DATABASE ${sql.id(name)}`.execute(admin);
      base.pathname = "/" + name;
      db = createDatabase(base.toString());
      const migrator = new Migrator({
        db,
        provider: new PlatformMigrationProvider(
          path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../../../../../packages/database/src/migrations",
          ),
        ),
      });
      const migrated = await migrator.migrateToLatest();
      if (migrated.error) throw migrated.error;
      const tables = await db.introspection.getTables();
      assert.equal(
        tables.filter((t) => !t.name.startsWith("kysely_")).length,
        10,
      );
      const email = new Email();
      const sms = new Sms();
      const service = new IdentityService(db, config, email, sms);
      const metadata: SessionMetadata = {
        ipAddress: "127.0.0.1",
        userAgent: "Test",
        deviceName: "Test",
        deviceType: null,
        browser: null,
        os: null,
      };
      const input = {
        destination: "password@example.test",
        channel: "email" as const,
        purpose: "signup" as const,
      };
      const challenge = await service.issue(input, "127.0.0.1", null);
      await assert.rejects(
        service.verify(
          {
            ...input,
            purpose: "sign_in",
            challengeId: challenge.challengeId,
            code: email.code,
          },
          metadata,
          null,
        ),
      );
      const proof = await service.verify(
        { ...input, challengeId: challenge.challengeId, code: email.code },
        metadata,
        null,
      );
      assert.ok("proof" in proof);
      if (!("proof" in proof)) throw new Error("Missing proof");
      const signupProof = proof.proof;
      assert.equal(typeof signupProof, "string");
      if (!signupProof) throw new Error("Missing proof");
      await assert.rejects(
        service.signup(
          "other@example.test",
          signupProof,
          "secure password",
          metadata,
        ),
        { code: "invalid_verification_code" },
      );
      const attempts = await Promise.allSettled([
        service.signup(
          input.destination,
          signupProof,
          "secure password",
          metadata,
        ),
        service.signup(
          input.destination,
          signupProof,
          "secure password",
          metadata,
        ),
      ]);
      assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
      const expiringSignup = {
        ...input,
        destination: "proof-expiry@example.test",
      };
      const expiryChallenge = await service.issue(
        expiringSignup,
        "127.0.0.32",
        null,
      );
      const expiryProof = await service.verify(
        {
          ...expiringSignup,
          challengeId: expiryChallenge.challengeId,
          code: email.code,
        },
        metadata,
        null,
      );
      assert.ok("proof" in expiryProof);
      if (!("proof" in expiryProof)) throw new Error("Missing expiry proof");
      if (!expiryProof.proof) throw new Error("Missing expiry proof value");
      await db
        .updateTable("auth_challenges")
        .set({ expires_at: new Date(0) })
        .where("purpose", "=", "password_setup")
        .where(
          "destination_hash",
          "=",
          hashRateLimitKey(
            expiringSignup.destination,
            config.authCodeHashSecret,
          ),
        )
        .execute();
      await assert.rejects(
        service.signup(
          expiringSignup.destination,
          expiryProof.proof,
          "secure password",
          metadata,
        ),
        { code: "invalid_verification_code" },
      );
      const signed = await service.password(
        input.destination,
        "secure password",
        metadata,
      );
      await assert.rejects(
        service.password(input.destination, "wrong password", metadata),
      );
      const details = await service.account(signed.user.id);
      assert.equal(details.identities.length, 1);
      assert.equal(details.contacts[0].is_primary, true);
      await assert.rejects(
        service.changeMethod(
          signed.user.id,
          details.identities[0].id,
          "unlink",
        ),
      );
      const contact = {
        destination: "contact@example.test",
        channel: "email" as const,
        purpose: "contact_verify" as const,
      };
      const contactChallenge = await service.issue(
        contact,
        "127.0.0.2",
        signed.user.id,
      );
      await assert.rejects(
        service.verify(
          {
            ...contact,
            challengeId: contactChallenge.challengeId,
            code: email.code,
          },
          metadata,
          randomUUID(),
        ),
      );
      await service.verify(
        {
          ...contact,
          challengeId: contactChallenge.challengeId,
          code: email.code,
        },
        metadata,
        signed.user.id,
      );
      assert.equal(
        (await service.account(signed.user.id)).identities.length,
        1,
      );
      const contacts = (await service.account(signed.user.id)).contacts;
      await Promise.all(
        contacts.map((c) =>
          service.changeMethod(signed.user.id, c.id, "primary"),
        ),
      );
      assert.equal(
        (await service.account(signed.user.id)).contacts.filter(
          (c) => c.is_primary,
        ).length,
        1,
      );
      const currentPrimary = (
        await service.account(signed.user.id)
      ).contacts.find((c) => c.is_primary && c.type === "email")!;
      await service.changeMethod(
        signed.user.id,
        currentPrimary.id,
        "remove_contact",
      );
      const afterRemoval = await service.account(signed.user.id);
      await identityRepository(db).addContact(
        signed.user.id,
        "email",
        "nonprimary@example.test",
      );
      const nonprimary = (await service.account(signed.user.id)).contacts.find(
        (contact) => contact.normalized_value === "nonprimary@example.test",
      )!;
      assert.equal(nonprimary.is_primary, false);
      await service.changeMethod(
        signed.user.id,
        nonprimary.id,
        "remove_contact",
      );
      assert.equal(
        (await service.account(signed.user.id)).contacts.length,
        afterRemoval.contacts.length,
      );
      assert.equal(
        afterRemoval.contacts.some((c) => c.id === currentPrimary.id),
        false,
      );
      assert.equal(
        afterRemoval.contacts.filter((c) => c.is_primary && c.type === "email")
          .length,
        1,
      );
      assert.ok(
        afterRemoval.identities.some(
          (i) => i.provider_subject === input.destination,
        ),
      );
      await assert.rejects(
        service.changeMethod(
          randomUUID(),
          afterRemoval.contacts[0].id,
          "remove_contact",
        ),
      );
      await db.transaction().execute(async (trx) => {
        const repo = identityRepository(trx);
        await repo.lockUser(signed.user.id);
        await repo.addIdentity(signed.user.id, "phone", "+14155552672");
        const methods = (await repo.account(signed.user.id)).identities;
        const emailMethod = methods.find(
          (method) => method.provider === "email",
        )!;
        const phoneMethod = methods.find(
          (method) => method.provider === "phone",
        )!;
        assert.equal(
          await repo.unlink(signed.user.id, emailMethod.id, {
            emailOtp: false,
            sms: false,
            google: false,
          }),
          false,
          "An unavailable SMS identity cannot preserve access",
        );
        assert.equal(
          await repo.unlink(signed.user.id, phoneMethod.id, {
            emailOtp: false,
            sms: false,
            google: false,
          }),
          true,
          "The password-backed email identity remains usable",
        );
      });
      const phone = {
        // Provider availability is enforced independently of identity row count.
        destination: "+14155552671",
        channel: "sms" as const,
        purpose: "sign_in" as const,
      };
      const fallbackUser = await identityRepository(db).createUser();
      await identityRepository(db).addIdentity(
        fallbackUser,
        "email",
        "fallback@example.test",
      );
      await identityRepository(db).addIdentity(
        fallbackUser,
        "phone",
        "+14155552673",
      );
      await identityRepository(db).credentialSet(
        fallbackUser,
        "unsupported-hash",
      );
      const fallbackMethods = (await service.account(fallbackUser)).identities;
      const fallbackPhone = fallbackMethods.find(
        (method) => method.provider === "phone",
      )!;
      const fallbackService = new IdentityService(
        db,
        { ...config, smtp: null },
        email,
        sms,
      );
      await assert.rejects(
        fallbackService.changeMethod(fallbackUser, fallbackPhone.id, "unlink"),
        { code: "operation_unavailable" },
      );
      await db
        .insertInto("auth_identities")
        .values({
          user_id: fallbackUser,
          provider: "google",
          provider_subject: "unavailable-google",
          verified_at: new Date(),
        })
        .execute();
      const disabledGoogle = new IdentityService(
        db,
        {
          ...config,
          smtp: null,
          googleClientId: null,
          googleClientSecret: null,
        },
        email,
        sms,
      );
      await assert.rejects(
        disabledGoogle.changeMethod(fallbackUser, fallbackPhone.id, "unlink"),
        { code: "operation_unavailable" },
      );
      await db
        .deleteFrom("auth_identities")
        .where("provider_subject", "=", "unavailable-google")
        .execute();
      const validCredential = await identityRepository(db).credential(
        signed.user.id,
      );
      await db
        .updateTable("auth_credentials")
        .set({ password_hash: validCredential!.password_hash })
        .where("user_id", "=", fallbackUser)
        .execute();
      const removals = await Promise.allSettled(
        fallbackMethods.map((method) =>
          fallbackService.changeMethod(fallbackUser, method.id, "unlink"),
        ),
      );
      assert.equal(
        removals.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal((await service.account(fallbackUser)).identities.length, 1);
      const failingEmail = new (class extends Email {
        override async sendSignInCode() {
          throw new Error("controlled delivery failure");
        }
      })();
      await assert.rejects(
        new IdentityService(db, config, failingEmail, sms).issue(
          {
            channel: "email",
            purpose: "sign_in",
            destination: "delivery-failure@example.test",
          },
          "127.0.0.34",
          null,
        ),
        { code: "delivery_unavailable" },
      );
      const failedDelivery = await db
        .selectFrom("auth_challenges")
        .select("consumed_at")
        .where(
          "destination_hash",
          "=",
          hashRateLimitKey(
            "delivery-failure@example.test",
            config.authCodeHashSecret,
          ),
        )
        .executeTakeFirstOrThrow();
      assert.ok(
        failedDelivery.consumed_at,
        "Failed delivery must invalidate its challenge",
      );
      const phoneChallenge = await service.issue(phone, "127.0.0.3", null);
      const phoneSession = await service.verify(
        { ...phone, challengeId: phoneChallenge.challengeId, code: sms.code },
        metadata,
        null,
      );
      assert.ok("user" in phoneSession);
      if (!("user" in phoneSession)) throw new Error("Missing phone session");
      await assert.rejects(
        service.changeMethod(
          phoneSession.user.id,
          afterRemoval.contacts[0].id,
          "remove_contact",
        ),
        { code: "operation_unavailable" },
      );
      await assert.rejects(
        service.verify(
          { ...phone, challengeId: phoneChallenge.challengeId, code: sms.code },
          metadata,
          null,
        ),
      );
      await db.deleteFrom("auth_rate_limits").execute();
      const returningPhone = await service.issue(phone, "127.0.0.33", null);
      const returningSession = await service.verify(
        { ...phone, challengeId: returningPhone.challengeId, code: sms.code },
        metadata,
        null,
      );
      assert.ok(
        "user" in returningSession &&
          "user" in phoneSession &&
          returningSession.user.id === phoneSession.user.id,
      );
      const disabled = new IdentityService(
        db,
        config,
        email,
        new SmsProvider(null),
      );
      await assert.rejects(disabled.issue(phone, "127.0.0.4", null), {
        code: "sms_unavailable",
      });
      await assert.rejects(
        disabled.verify(
          { ...phone, challengeId: phoneChallenge.challengeId, code: sms.code },
          metadata,
          null,
        ),
        { code: "sms_unavailable" },
      );
      const auth = new AuthService({
        db,
        config,
        emailProvider: email,
        googleProvider: null,
      });
      const google = new Google();
      const googleAuth = new AuthService({
        db,
        config: { ...config, googleClientId: "test-client" },
        emailProvider: email,
        googleProvider: google,
      });
      const nonce = await googleAuth.createOneTapNonce("127.0.0.12");
      assert.ok(nonce.nonce);
      google.identity.nonce = nonce.nonce;
      const googleSession = await googleAuth.signInWithOneTap(
        "controlled-test-credential",
        metadata,
      );
      assert.equal(
        (await service.account(googleSession.user.id)).profile.first_name,
        "Google",
      );
      await assert.rejects(
        googleAuth.signInWithOneTap("controlled-test-credential", metadata),
      );
      const collisionNonce = await googleAuth.createOneTapNonce("127.0.0.12");
      google.identity = {
        subject: "different-google-subject",
        email: input.destination,
        name: null,
        image: null,
        nonce: collisionNonce.nonce!,
      };
      await assert.rejects(
        googleAuth.signInWithOneTap("controlled-test-credential", metadata),
        { code: "identity_link_required" },
      );
      const linkNonce = await googleAuth.createOneTapNonce("127.0.0.12");
      google.identity.nonce = linkNonce.nonce!;
      await googleAuth.linkGoogleIdentity(
        signed.user.id,
        "controlled-test-credential",
        "127.0.0.12",
      );
      assert.ok(
        (await service.account(signed.user.id)).identities.some(
          (i) => i.provider === "google",
        ),
      );
      assert.ok(await auth.authenticateSession(signed.token));
      const googleMethod = (
        await service.account(signed.user.id)
      ).identities.find((method) => method.provider === "google")!;
      const completedNonce = await googleAuth.createOneTapNonce("127.0.0.43");
      google.identity.nonce = completedNonce.nonce!;
      const completedGoogle = await googleAuth.signInWithOneTap(
        "controlled-test-credential",
        { ...metadata, ipAddress: "127.0.0.43" },
      );
      assert.equal(completedGoogle.user.id, signed.user.id);
      const raceNonce = await googleAuth.createOneTapNonce("127.0.0.40");
      google.identity.nonce = raceNonce.nonce!;
      let racingGoogle:
        ReturnType<typeof googleAuth.signInWithOneTap> | undefined;
      await db.transaction().execute(async (trx) => {
        const repo = identityRepository(trx);
        await repo.lockUser(signed.user.id);
        racingGoogle = googleAuth.signInWithOneTap(
          "controlled-test-credential",
          { ...metadata, ipAddress: "127.0.0.40" },
        );
        racingGoogle.catch(() => undefined);
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          await sql`select pg_stat_clear_snapshot()`.execute(trx);
          const state = await sql<{
            count: number;
          }>`select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%users%'`.execute(
            trx,
          );
          if (state.rows[0].count > 0) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.ok(waiting, "Google login must wait for the account lock");
        assert.equal(
          await repo.unlink(signed.user.id, googleMethod.id, {
            emailOtp: true,
            sms: false,
            google: false,
          }),
          true,
        );
      });
      await assert.rejects(racingGoogle!, { code: "google_auth_failed" });
      assert.ok(
        await auth.authenticateSession(completedGoogle.token),
        "Authentication committed before unlink retains its issued session",
      );
      const linkingUsers = [signed.user.id, googleSession.user.id];
      const concurrentLinks = await Promise.all(
        linkingUsers.map(async (userId, index) => {
          const provider = new Google();
          const linkingAuth = new AuthService({
            db: db!,
            config: { ...config, googleClientId: "test-client" },
            emailProvider: email,
            googleProvider: provider,
          });
          const challenge = await linkingAuth.createOneTapNonce(
            "127.0.0." + (41 + index),
          );
          provider.identity = {
            ...provider.identity,
            subject: "concurrent-link-subject",
            nonce: challenge.nonce!,
          };
          return () =>
            linkingAuth.linkGoogleIdentity(
              userId,
              "controlled-link-credential",
              "127.0.0." + (41 + index),
            );
        }),
      );
      const linkResults = await Promise.allSettled(
        concurrentLinks.map((link) => link()),
      );
      assert.equal(
        linkResults.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        (
          await db
            .selectFrom("auth_identities")
            .select("id")
            .where("provider_subject", "=", "concurrent-link-subject")
            .execute()
        ).length,
        1,
      );
      const eventCountBeforeLogout = await db
        .selectFrom("auth_security_events")
        .select("id")
        .execute();
      await auth.logout(signed.token);
      assert.equal(await auth.authenticateSession(signed.token), null);
      const eventCountAfterLogout = await db
        .selectFrom("auth_security_events")
        .select("id")
        .execute();
      assert.equal(
        eventCountAfterLogout.length,
        eventCountBeforeLogout.length + 1,
      );
      const auditRows = await db
        .selectFrom("auth_security_events")
        .select(["event_type", "metadata"])
        .execute();
      assert.ok(
        auditRows.some((event) => event.event_type === "session_revoked"),
      );
      assert.ok(
        auditRows.some((event) => event.event_type === "google_auth_failed"),
      );
      for (const secret of [
        signed.token,
        signupProof,
        "controlled-test-credential",
        "secure password",
      ]) {
        assert.ok(
          auditRows.every(
            (event) => !JSON.stringify(event.metadata).includes(secret),
          ),
        );
      }
      assert.ok(
        auditRows.some((event) => event.event_type === "contact_removed"),
      );
      assert.ok(
        auditRows.every(
          (event) =>
            !JSON.stringify(event.metadata).includes("secure password"),
        ),
      );
      await service.updateProfile(signed.user.id, {
        first_name: "Asha",
        middle_name: null,
        surname: "Patel",
        image_url: null,
      });
      assert.equal(
        (await service.account(signed.user.id)).profile.first_name,
        "Asha",
      );
      // Linking is independent of contact verification and uses its own proof.
      const linkInput = {
        destination: "linked@example.test",
        channel: "email" as const,
        purpose: "account_link" as const,
      };
      const linking = await service.issue(
        linkInput,
        "127.0.0.8",
        signed.user.id,
      );
      await assert.rejects(
        service.verify(
          {
            ...linkInput,
            purpose: "contact_verify",
            challengeId: linking.challengeId,
            code: email.code,
          },
          metadata,
          signed.user.id,
        ),
      );
      await service.verify(
        { ...linkInput, challengeId: linking.challengeId, code: email.code },
        metadata,
        signed.user.id,
      );
      const linked = (await service.account(signed.user.id)).identities.find(
        (i) => i.provider_subject === linkInput.destination,
      );
      assert.ok(linked);
      assert.equal(
        (
          await service.password(
            linkInput.destination,
            "secure password",
            metadata,
          )
        ).user.id,
        signed.user.id,
      );
      let racingLogin: ReturnType<typeof service.password> | undefined;
      await db.transaction().execute(async (trx) => {
        const repo = identityRepository(trx);
        await repo.lockUser(signed.user.id);
        racingLogin = service.password(
          linkInput.destination,
          "secure password",
          { ...metadata, ipAddress: "127.0.0.31" },
        );
        racingLogin.catch(() => undefined);
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          await sql`select pg_stat_clear_snapshot()`.execute(trx);
          const state = await sql<{
            count: number;
          }>`select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%users%'`.execute(
            trx,
          );
          if (state.rows[0].count > 0) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.ok(waiting, "Password login must be waiting for the user lock");
        assert.equal(
          await repo.unlink(signed.user.id, linked.id, {
            emailOtp: true,
            sms: false,
            google: false,
          }),
          true,
        );
      });
      await assert.rejects(racingLogin!, { code: "invalid_credentials" });
      await assert.rejects(
        service.password(linkInput.destination, "secure password", metadata),
      );
      const otpRace = {
        destination: "otp-race@example.test",
        channel: "email" as const,
        purpose: "sign_in" as const,
      };
      await identityRepository(db).addIdentity(
        signed.user.id,
        "email",
        otpRace.destination,
      );
      const otpRaceIdentity = (
        await service.account(signed.user.id)
      ).identities.find(
        (method) => method.provider_subject === otpRace.destination,
      )!;
      const otpRaceChallenge = await service.issue(otpRace, "127.0.0.35", null);
      const otpRaceCode = email.code;
      let racingOtp: ReturnType<typeof service.verify> | undefined;
      await db.transaction().execute(async (trx) => {
        const repo = identityRepository(trx);
        await repo.lockUser(signed.user.id);
        racingOtp = service.verify(
          {
            ...otpRace,
            challengeId: otpRaceChallenge.challengeId,
            code: otpRaceCode,
          },
          { ...metadata, ipAddress: "127.0.0.36" },
          null,
        );
        racingOtp.catch(() => undefined);
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          await sql`select pg_stat_clear_snapshot()`.execute(trx);
          const state = await sql<{
            count: number;
          }>`select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%users%'`.execute(
            trx,
          );
          if (state.rows[0].count > 0) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.ok(
          waiting,
          "OTP verification must be waiting for the user lock",
        );
        assert.equal(
          await repo.unlink(signed.user.id, otpRaceIdentity.id, {
            emailOtp: true,
            sms: false,
            google: false,
          }),
          true,
        );
      });
      await assert.rejects(racingOtp!, { code: "invalid_verification_code" });
      const expiringInput = {
        destination: "expired@example.test",
        channel: "email" as const,
        purpose: "sign_in" as const,
      };
      const expiring = await service.issue(expiringInput, "127.0.0.9", null);
      await db
        .updateTable("auth_challenges")
        .set({ expires_at: new Date(0) })
        .where("id", "=", expiring.challengeId)
        .execute();
      await assert.rejects(
        service.verify(
          {
            ...expiringInput,
            challengeId: expiring.challengeId,
            code: email.code,
          },
          metadata,
          null,
        ),
      );
      await assert.rejects(service.issue(expiringInput, "127.0.0.9", null), {
        code: "rate_limited",
      });
      const app = await buildApp(
        { ...config, databaseUrl: base.toString(), nodeEnv: "test" },
        { email, sms },
      );
      try {
        const headers = { origin: config.webOrigins[0] };
        const login = await app.inject({
          method: "POST",
          url: "/api/v1/auth/password/sessions",
          headers,
          payload: { email: input.destination, password: "secure password" },
        });
        assert.equal(login.statusCode, 200, login.body);
        const cookie = login.headers["set-cookie"];
        assert.ok(typeof cookie === "string");
        const authenticatedHeaders = {
          ...headers,
          cookie: cookie.split(";")[0],
        };
        const accountResponse = await app.inject({
          method: "GET",
          url: "/api/v1/auth/account",
          headers: authenticatedHeaders,
        });
        assert.equal(accountResponse.statusCode, 200, accountResponse.body);
        const saved = await app.inject({
          method: "POST",
          url: "/api/v1/auth/profile",
          headers: authenticatedHeaders,
          payload: {
            first_name: "Ravi",
            middle_name: null,
            surname: "Patel",
            image_url: null,
          },
        });
        assert.equal(saved.statusCode, 200, saved.body);
        assert.equal(saved.json().profile.first_name, "Ravi");
        const maximum = await app.inject({
          method: "POST",
          url: "/api/v1/auth/profile",
          headers: authenticatedHeaders,
          payload: {
            first_name: "A".repeat(100),
            middle_name: "B".repeat(100),
            surname: "C".repeat(100),
            image_url: null,
          },
        });
        assert.equal(maximum.statusCode, 200, maximum.body);
        assert.equal(
          (
            await app.inject({
              method: "GET",
              url: "/api/v1/auth/session",
              headers: authenticatedHeaders,
            })
          ).statusCode,
          200,
        );
        assert.equal(
          (
            await app.inject({
              method: "POST",
              url: "/api/v1/auth/password/sessions",
              headers,
              payload: {
                email: input.destination,
                password: "secure password",
              },
            })
          ).statusCode,
          200,
        );
        const unauthorized = await app.inject({
          method: "GET",
          url: "/api/v1/auth/account",
        });
        assert.equal(unauthorized.statusCode, 401);
        const csrf = await app.inject({
          method: "POST",
          url: "/api/v1/auth/profile",
          headers: {
            ...authenticatedHeaders,
            origin: "https://attacker.example",
          },
          payload: {
            first_name: "Attack",
            middle_name: null,
            surname: null,
            image_url: null,
          },
        });
        assert.equal(csrf.statusCode, 403);
        const logout = await app.inject({
          method: "DELETE",
          url: "/api/v1/auth/session",
          headers: authenticatedHeaders,
        });
        assert.equal(logout.statusCode, 204);
        assert.equal(
          (
            await app.inject({
              method: "GET",
              url: "/api/v1/auth/account",
              headers: authenticatedHeaders,
            })
          ).statusCode,
          401,
        );
      } finally {
        await app.close();
      }
      await auth.revokeAllSessions(signed.user.id);
      const recorded = await db
        .selectFrom("auth_security_events")
        .select(["event_type", "metadata"])
        .execute();
      for (const event of [
        "account_created",
        "identity_linked",
        "identity_unlinked",
        "contact_verified",
        "contact_removed",
        "contact_primary_changed",
        "profile_updated",
        "session_created",
        "session_revoked",
        "sessions_revoked_all",
        "google_auth_failed",
        "password_sign_in_failed",
        "otp_verification_failed",
      ]) {
        assert.ok(
          recorded.some((row) => row.event_type === event),
          "Missing security event: " + event,
        );
      }
      for (const row of recorded) {
        assert.deepEqual(
          row.metadata,
          {},
          "Authentication audit metadata must not copy untrusted credentials or errors",
        );
      }
    } finally {
      await db?.destroy();
      // Only this test's newly created, random database is ever dropped.
      await sql`DROP DATABASE IF EXISTS ${sql.id(name)}`.execute(admin);
      await admin.destroy();
    }
  },
);
