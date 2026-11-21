import { sql, type Kysely, type SqlBool } from "kysely";

import type { Database } from "../database";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("email", "varchar(254)", (column) =>
      column.notNull().unique(),
    )
    .addColumn("email_verified_at", "timestamptz")
    .addColumn("name", "varchar(200)")
    .addColumn("image", "text")
    .addColumn("status", "varchar(20)", (column) =>
      column.notNull().defaultTo("active"),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("last_login_at", "timestamptz")
    .addCheckConstraint(
      "users_email_normalized_check",
      sql`email = lower(btrim(email))`,
    )
    .addCheckConstraint(
      "users_status_check",
      sql`status in ('active', 'disabled')`,
    )
    .execute();

  await db.schema
    .createTable("auth_identities")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("provider", "varchar(20)", (column) => column.notNull())
    .addColumn("provider_subject", "varchar(254)", (column) =>
      column.notNull(),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "auth_identities_provider_check",
      sql`provider in ('email', 'google')`,
    )
    .addUniqueConstraint(
      "auth_identities_provider_subject_unique",
      ["provider", "provider_subject"],
    )
    .addUniqueConstraint("auth_identities_user_provider_unique", [
      "user_id",
      "provider",
    ])
    .execute();

  await db.schema
    .createTable("email_verification_codes")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("email", "varchar(254)", (column) => column.notNull())
    .addColumn("code_hash", "char(64)", (column) => column.notNull())
    .addColumn("purpose", "varchar(24)", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("consumed_at", "timestamptz")
    .addColumn("attempt_count", "smallint", (column) =>
      column.notNull().defaultTo(0),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "email_verification_codes_purpose_check",
      sql`purpose = 'sign_in'`,
    )
    .addCheckConstraint(
      "email_verification_codes_attempt_count_check",
      sql`attempt_count between 0 and 5`,
    )
    .execute();

  await db.schema
    .createIndex("email_verification_codes_email_created_idx")
    .on("email_verification_codes")
    .columns(["email", "purpose", "created_at"])
    .execute();

  await db.schema
    .createIndex("email_verification_codes_expiry_idx")
    .on("email_verification_codes")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "char(64)", (column) => column.notNull().unique())
    .addColumn("ip_address", "varchar(45)")
    .addColumn("user_agent", "varchar(1024)")
    .addColumn("device_name", "varchar(200)")
    .addColumn("device_type", "varchar(40)")
    .addColumn("browser", "varchar(120)")
    .addColumn("os", "varchar(120)")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("last_active_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("revoked_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("sessions_user_active_idx")
    .on("sessions")
    .columns(["user_id", "created_at"])
    .where(sql<SqlBool>`revoked_at IS NULL`)
    .execute();

  await db.schema
    .createIndex("sessions_expiry_idx")
    .on("sessions")
    .columns(["expires_at", "revoked_at"])
    .execute();

  await db.schema
    .createTable("auth_rate_limits")
    .addColumn("bucket_hash", "char(64)", (column) => column.primaryKey())
    .addColumn("window_started_at", "timestamptz", (column) =>
      column.notNull(),
    )
    .addColumn("request_count", "integer", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addCheckConstraint(
      "auth_rate_limits_request_count_check",
      sql`request_count > 0`,
    )
    .execute();

  await db.schema
    .createIndex("auth_rate_limits_expiry_idx")
    .on("auth_rate_limits")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("auth_nonces")
    .addColumn("nonce_hash", "char(64)", (column) => column.primaryKey())
    .addColumn("purpose", "varchar(24)", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("consumed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "auth_nonces_purpose_check",
      sql`purpose = 'google_one_tap'`,
    )
    .execute();

  await db.schema
    .createIndex("auth_nonces_expiry_idx")
    .on("auth_nonces")
    .column("expires_at")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("auth_nonces").ifExists().execute();
  await db.schema.dropTable("auth_rate_limits").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("email_verification_codes").ifExists().execute();
  await db.schema.dropTable("auth_identities").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}
