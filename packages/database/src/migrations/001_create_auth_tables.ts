import { sql, type Kysely, type SqlBool } from "kysely";

import type { Database } from "../database";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
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
      "users_status_check",
      sql`status IN ('active', 'disabled')`,
    )
    .execute();

  await db.schema
    .createTable("personal_profiles")
    .addColumn("user_id", "uuid", (column) =>
      column.primaryKey().references("users.id").onDelete("cascade"),
    )
    .addColumn("first_name", "varchar(100)")
    .addColumn("middle_name", "varchar(100)")
    .addColumn("surname", "varchar(100)")
    .addColumn("image_url", "text")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "personal_profiles_first_name_check",
      sql`first_name IS NULL OR btrim(first_name) <> ''`,
    )
    .addCheckConstraint(
      "personal_profiles_middle_name_check",
      sql`middle_name IS NULL OR btrim(middle_name) <> ''`,
    )
    .addCheckConstraint(
      "personal_profiles_surname_check",
      sql`surname IS NULL OR btrim(surname) <> ''`,
    )
    .execute();

  await db.schema
    .createTable("user_contacts")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "varchar(10)", (column) => column.notNull())
    .addColumn("normalized_value", "text", (column) => column.notNull())
    .addColumn("verified_at", "timestamptz", (column) => column.notNull())
    .addColumn("is_primary", "boolean", (column) =>
      column.notNull().defaultTo(false),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "user_contacts_type_check",
      sql`type IN ('email', 'phone')`,
    )
    .execute();

  await db.schema
    .createIndex("user_contacts_user_type_value_unique")
    .unique()
    .on("user_contacts")
    .columns(["user_id", "type", "normalized_value"])
    .execute();

  await db.schema
    .createIndex("user_contacts_primary_type_idx")
    .unique()
    .on("user_contacts")
    .columns(["user_id", "type"])
    .where(sql<SqlBool>`is_primary = true`)
    .execute();

  await db.schema
    .createIndex("user_contacts_type_value_idx")
    .on("user_contacts")
    .columns(["type", "normalized_value"])
    .execute();

  await db.schema
    .createTable("auth_identities")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("provider", "varchar(32)", (column) => column.notNull())
    .addColumn("provider_subject", "text", (column) => column.notNull())
    .addColumn("verified_at", "timestamptz", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("last_used_at", "timestamptz")
    .addCheckConstraint(
      "auth_identities_provider_check",
      sql`provider IN ('email', 'phone', 'google')`,
    )
    .execute();

  await db.schema
    .createIndex("auth_identities_provider_subject_unique")
    .unique()
    .on("auth_identities")
    .columns(["provider", "provider_subject"])
    .execute();

  await db.schema
    .createIndex("auth_identities_user_provider_idx")
    .on("auth_identities")
    .columns(["user_id", "provider"])
    .execute();

  await db.schema
    .createTable("auth_credentials")
    .addColumn("user_id", "uuid", (column) =>
      column.primaryKey().references("users.id").onDelete("cascade"),
    )
    .addColumn("password_hash", "text", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("password_changed_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable("auth_challenges")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.references("users.id").onDelete("cascade"),
    )
    .addColumn("auth_identity_id", "uuid", (column) =>
      column.references("auth_identities.id").onDelete("cascade"),
    )
    .addColumn("channel", "varchar(10)", (column) => column.notNull())
    .addColumn("purpose", "varchar(32)", (column) => column.notNull())
    .addColumn("destination_hash", "char(64)", (column) => column.notNull())
    .addColumn("secret_hash", "text", (column) => column.notNull())
    .addColumn("attempt_count", "smallint", (column) =>
      column.notNull().defaultTo(0),
    )
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("consumed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "auth_challenges_channel_check",
      sql`channel IN ('email', 'sms')`,
    )
    .addCheckConstraint(
      "auth_challenges_purpose_check",
      sql`purpose IN ('signup', 'sign_in', 'password_setup', 'password_reset', 'account_link', 'contact_verify')`,
    )
    .addCheckConstraint(
      "auth_challenges_attempt_count_check",
      sql`attempt_count BETWEEN 0 AND 5`,
    )
    .execute();

  await db.schema
    .createIndex("auth_challenges_destination_purpose_created_idx")
    .on("auth_challenges")
    .columns(["destination_hash", "purpose", "created_at"])
    .execute();

  await db.schema
    .createIndex("auth_challenges_user_created_idx")
    .on("auth_challenges")
    .columns(["user_id", "created_at"])
    .where(sql<SqlBool>`user_id IS NOT NULL`)
    .execute();

  await db.schema
    .createIndex("auth_challenges_expiry_idx")
    .on("auth_challenges")
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
    .addColumn("token_hash", "char(64)", (column) => column.notNull())
    .addColumn("ip_address", "varchar(45)")
    .addColumn("user_agent", "varchar(1024)")
    .addColumn("device_name", "varchar(200)")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("last_active_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("revoked_at", "timestamptz")
    .execute();

  await sql`ALTER TABLE sessions ALTER COLUMN ip_address TYPE inet USING ip_address::inet;`.execute(
    db,
  );

  await db.schema
    .createIndex("sessions_token_hash_unique")
    .unique()
    .on("sessions")
    .column("token_hash")
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
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("auth_nonces")
    .addColumn("nonce_hash", "char(64)", (column) => column.primaryKey())
    .addColumn("purpose", "varchar(32)", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("consumed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("auth_nonces_expiry_idx")
    .on("auth_nonces")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("auth_rate_limits")
    .addColumn("bucket_hash", "char(64)", (column) => column.primaryKey())
    .addColumn("window_started_at", "timestamptz", (column) => column.notNull())
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
    .createTable("auth_security_events")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.references("users.id").onDelete("set null"),
    )
    .addColumn("event_type", "varchar(48)", (column) => column.notNull())
    .addColumn("identity_id", "uuid")
    .addColumn("occurred_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("metadata", "jsonb", (column) =>
      column.notNull().defaultTo(sql`'{}'::jsonb`),
    )
    .execute();

  await db.schema
    .createIndex("auth_security_events_user_occurred_idx")
    .on("auth_security_events")
    .columns(["user_id", "occurred_at"])
    .execute();

  await db.schema
    .createIndex("auth_security_events_type_occurred_idx")
    .on("auth_security_events")
    .columns(["event_type", "occurred_at"])
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("auth_security_events").ifExists().execute();
  await db.schema.dropTable("auth_rate_limits").ifExists().execute();
  await db.schema.dropTable("auth_nonces").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("auth_challenges").ifExists().execute();
  await db.schema.dropTable("auth_credentials").ifExists().execute();
  await db.schema.dropTable("auth_identities").ifExists().execute();
  await db.schema.dropTable("user_contacts").ifExists().execute();
  await db.schema.dropTable("personal_profiles").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}
