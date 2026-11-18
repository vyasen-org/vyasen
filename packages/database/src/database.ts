import { Kysely, PostgresDialect, type Generated } from "kysely";
import { Pool } from "pg";

export interface UsersTable {
  id: Generated<string>;
  status: Generated<"active" | "disabled">;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  last_login_at: Date | null;
}

export interface PersonalProfilesTable {
  user_id: string;
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  image_url: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface UserContactsTable {
  id: Generated<string>;
  user_id: string;
  type: "email" | "phone";
  normalized_value: string;
  verified_at: Date;
  is_primary: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AuthIdentitiesTable {
  id: Generated<string>;
  user_id: string;
  provider: "email" | "phone" | "google";
  provider_subject: string;
  verified_at: Date;
  created_at: Generated<Date>;
  last_used_at: Date | null;
}

export interface AuthCredentialsTable {
  user_id: string;
  password_hash: string;
  created_at: Generated<Date>;
  password_changed_at: Generated<Date>;
}

export interface AuthChallengesTable {
  id: Generated<string>;
  user_id: string | null;
  auth_identity_id: string | null;
  channel: "email" | "sms";
  purpose:
    | "signup"
    | "sign_in"
    | "password_setup"
    | "password_reset"
    | "account_link"
    | "contact_verify";
  destination_hash: string;
  secret_hash: string;
  attempt_count: Generated<number>;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Generated<Date>;
}

export interface SessionsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  created_at: Generated<Date>;
  last_active_at: Generated<Date>;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface AuthNoncesTable {
  nonce_hash: string;
  purpose: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Generated<Date>;
}

export interface AuthRateLimitsTable {
  bucket_hash: string;
  window_started_at: Date;
  request_count: number;
  expires_at: Date;
}

export interface AuthSecurityEventsTable {
  id: Generated<string>;
  user_id: string | null;
  event_type: string;
  identity_id: string | null;
  occurred_at: Generated<Date>;
  metadata: Record<string, unknown>;
}

export interface Database {
  users: UsersTable;
  personal_profiles: PersonalProfilesTable;
  user_contacts: UserContactsTable;
  auth_identities: AuthIdentitiesTable;
  auth_credentials: AuthCredentialsTable;
  auth_challenges: AuthChallengesTable;
  sessions: SessionsTable;
  auth_nonces: AuthNoncesTable;
  auth_rate_limits: AuthRateLimitsTable;
  auth_security_events: AuthSecurityEventsTable;
}

export function createDatabase(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        application_name: "vyasen-api",
      }),
    }),
  });
}
