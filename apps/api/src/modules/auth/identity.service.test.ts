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
  type GoogleIdentity,
} from "./auth.provider";
import {
  IdentityService,
  encodePassword,
  checkPassword,
} from "./identity.service";
import { AuthService } from "./auth.service";
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
      const phone = {
        destination: "+14155552671",
        channel: "sms" as const,
        purpose: "sign_in" as const,
      };
      const phoneChallenge = await service.issue(phone, "127.0.0.3", null);
      const phoneSession = await service.verify(
        { ...phone, challengeId: phoneChallenge.challengeId, code: sms.code },
        metadata,
        null,
      );
      assert.ok("user" in phoneSession);
      await assert.rejects(
        service.verify(
          { ...phone, challengeId: phoneChallenge.challengeId, code: sms.code },
          metadata,
          null,
        ),
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
      await auth.logout(signed.token);
      assert.equal(await auth.authenticateSession(signed.token), null);
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
      await service.changeMethod(signed.user.id, linked.id, "unlink");
      await assert.rejects(
        service.password(linkInput.destination, "secure password", metadata),
      );
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
    } finally {
      await db?.destroy();
      // Only this test's newly created, random database is ever dropped.
      await sql`DROP DATABASE IF EXISTS ${sql.id(name)}`.execute(admin);
      await admin.destroy();
    }
  },
);
