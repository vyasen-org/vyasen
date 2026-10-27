import { Kysely, PostgresDialect, type Generated } from "kysely";
import { Pool } from "pg";

export interface UsersTable {
  id: Generated<string>;
  email: string;
  email_verified_at: Date | null;
  name: string | null;
  image: string | null;
  status: Generated<"active" | "disabled">;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  last_login_at: Date | null;
}

export interface AuthIdentitiesTable {
  id: Generated<string>;
  user_id: string;
  provider: "email" | "google";
  provider_subject: string;
  created_at: Generated<Date>;
}

export interface EmailVerificationCodesTable {
  id: Generated<string>;
  email: string;
  code_hash: string;
  purpose: "sign_in";
  expires_at: Date;
  consumed_at: Date | null;
  attempt_count: Generated<number>;
  created_at: Generated<Date>;
}

export interface SessionsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  created_at: Generated<Date>;
  last_active_at: Generated<Date>;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface AuthRateLimitsTable {
  bucket_hash: string;
  window_started_at: Date;
  request_count: number;
  expires_at: Date;
}

export interface AuthNoncesTable {
  nonce_hash: string;
  purpose: "google_one_tap";
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  auth_identities: AuthIdentitiesTable;
  email_verification_codes: EmailVerificationCodesTable;
  sessions: SessionsTable;
  auth_rate_limits: AuthRateLimitsTable;
  auth_nonces: AuthNoncesTable;
}

export function createDatabase(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        application_name: "school-sms-api",
      }),
    }),
  });
}
