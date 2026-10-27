import dotenv from "dotenv";
import { Migrator } from "kysely";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabase } from "./database";
import { PlatformMigrationProvider } from "./migration-provider";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
  quiet: true,
});

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ??
  (process.env.NODE_ENV === "production" ? undefined : process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    "Set MIGRATION_DATABASE_URL to a migration-role connection before applying migrations.",
  );
}

const db = createDatabase(databaseUrl);
const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

try {
  const migrator = new Migrator({
    db,
    provider: new PlatformMigrationProvider(migrationsFolder),
  });
  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    console.info(`${result.status}: ${result.migrationName}`);
  }

  if (error) throw error;
} finally {
  await db.destroy();
}
