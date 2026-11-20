import { sql, type Kysely } from "kysely";
import type { Database } from "../database";

export async function up(db: Kysely<Database>) {
  await sql`ALTER TABLE user_contacts ADD CONSTRAINT contacts_normalized_value_check CHECK (
    length(normalized_value) BETWEEN 3 AND 254 AND normalized_value = btrim(normalized_value)
    AND ((type = 'email' AND normalized_value = lower(normalized_value) AND position('@' in normalized_value) > 1)
    OR (type = 'phone' AND normalized_value ~ '^\\+[1-9][0-9]{7,14}$'))
  )`.execute(db);
  await sql`CREATE INDEX auth_challenges_destination_recent_idx ON auth_challenges (destination_hash, purpose, created_at DESC)`.execute(
    db,
  );
  await sql`CREATE INDEX auth_challenges_proof_idx ON auth_challenges (secret_hash) WHERE purpose = 'password_setup' AND consumed_at IS NULL`.execute(
    db,
  );
}
export async function down(db: Kysely<Database>) {
  await sql`DROP INDEX auth_challenges_proof_idx`.execute(db);
  await sql`DROP INDEX auth_challenges_destination_recent_idx`.execute(db);
  await sql`ALTER TABLE user_contacts DROP CONSTRAINT contacts_normalized_value_check`.execute(
    db,
  );
}
