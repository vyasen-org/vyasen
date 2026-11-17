import { sql, type Kysely, type Transaction } from "kysely";
import type { Database } from "@vyasen/database";

export type IdentityExecutor = Kysely<Database> | Transaction<Database>;
export function identityRepository(db: IdentityExecutor) {
  return {
    async serialize(key: string) {
      await sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`.execute(
        db,
      );
    },
    async lockUser(id: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .forUpdate()
        .executeTakeFirstOrThrow();
    },
    identity(provider: "email" | "phone", subject: string) {
      return db
        .selectFrom("auth_identities")
        .selectAll()
        .where("provider", "=", provider)
        .where("provider_subject", "=", subject)
        .executeTakeFirst();
    },
    credential(id: string) {
      return db
        .selectFrom("auth_credentials")
        .selectAll()
        .where("user_id", "=", id)
        .executeTakeFirst();
    },
    async audit(userId: string | null, event: string) {
      await db
        .insertInto("auth_security_events")
        .values({ user_id: userId, event_type: event, metadata: {} })
        .execute();
    },
    async createUser() {
      const user = await db
        .insertInto("users")
        .values({ status: "active" })
        .returning("id")
        .executeTakeFirstOrThrow();
      await db
        .insertInto("personal_profiles")
        .values({ user_id: user.id })
        .execute();
      return user.id;
    },
    async credentialSet(userId: string, passwordHash: string) {
      await db
        .insertInto("auth_credentials")
        .values({ user_id: userId, password_hash: passwordHash })
        .execute();
    },
    async addIdentity(
      userId: string,
      provider: "email" | "phone",
      subject: string,
    ) {
      await db
        .insertInto("auth_identities")
        .values({
          user_id: userId,
          provider,
          provider_subject: subject,
          verified_at: new Date(),
        })
        .execute();
    },
    async addContact(
      userId: string,
      type: "email" | "phone",
      destination: string,
    ) {
      await this.serialize("contact:" + type + ":" + destination);
      const foreign = await db
        .selectFrom("user_contacts")
        .select("id")
        .where("type", "=", type)
        .where("normalized_value", "=", destination)
        .where("user_id", "!=", userId)
        .executeTakeFirst();
      if (foreign) return false;
      const existing = await db
        .selectFrom("user_contacts")
        .select("id")
        .where("user_id", "=", userId)
        .where("type", "=", type)
        .executeTakeFirst();
      await db
        .insertInto("user_contacts")
        .values({
          user_id: userId,
          type,
          normalized_value: destination,
          verified_at: new Date(),
          is_primary: !existing,
        })
        .onConflict((c) =>
          c.columns(["user_id", "type", "normalized_value"]).doNothing(),
        )
        .execute();
      return true;
    },
    challenge(id: string) {
      return db
        .selectFrom("auth_challenges")
        .selectAll()
        .where("id", "=", id)
        .forUpdate()
        .executeTakeFirst();
    },
    async issue(values: {
      id: string;
      user_id: string | null;
      auth_identity_id: string | null;
      channel: "email" | "sms";
      purpose: Database["auth_challenges"]["purpose"];
      destination_hash: string;
      secret_hash: string;
      expires_at: Date;
    }) {
      await db.insertInto("auth_challenges").values(values).execute();
    },
    async attempt(id: string, count: number) {
      await db
        .updateTable("auth_challenges")
        .set({ attempt_count: count })
        .where("id", "=", id)
        .execute();
    },
    async consume(id: string) {
      await db
        .updateTable("auth_challenges")
        .set({ consumed_at: new Date() })
        .where("id", "=", id)
        .execute();
    },
    async account(id: string) {
      const profile = await db
        .selectFrom("personal_profiles")
        .select(["first_name", "middle_name", "surname", "image_url"])
        .where("user_id", "=", id)
        .executeTakeFirstOrThrow();
      const contacts = await db
        .selectFrom("user_contacts")
        .select(["id", "type", "normalized_value", "is_primary"])
        .where("user_id", "=", id)
        .execute();
      const identities = await db
        .selectFrom("auth_identities")
        .select(["id", "provider", "provider_subject"])
        .where("user_id", "=", id)
        .execute();
      return { profile, contacts, identities };
    },
    async profile(
      id: string,
      values: {
        first_name: string | null;
        middle_name: string | null;
        surname: string | null;
        image_url: string | null;
      },
    ) {
      await db
        .updateTable("personal_profiles")
        .set({ ...values, updated_at: new Date() })
        .where("user_id", "=", id)
        .execute();
    },
    async primary(userId: string, id: string) {
      const contact = await db
        .selectFrom("user_contacts")
        .select("type")
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      if (!contact) return false;
      await db
        .updateTable("user_contacts")
        .set({ is_primary: false, updated_at: new Date() })
        .where("user_id", "=", userId)
        .where("type", "=", contact.type)
        .execute();
      await db
        .updateTable("user_contacts")
        .set({ is_primary: true, updated_at: new Date() })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .execute();
      return true;
    },
    async unlink(userId: string, id: string) {
      const methods = await db
        .selectFrom("auth_identities")
        .select("id")
        .where("user_id", "=", userId)
        .execute();
      if (methods.length <= 1 || !methods.some((m) => m.id === id))
        return false;
      await db
        .deleteFrom("auth_identities")
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .execute();
      return true;
    },
  };
}
