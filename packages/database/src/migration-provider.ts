import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Migration, MigrationProvider } from "kysely";

export class PlatformMigrationProvider implements MigrationProvider {
  constructor(private readonly migrationFolder: string) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const { readdir } = await import("node:fs/promises");
    const migrations: Record<string, Migration> = {};
    const fileNames = await readdir(this.migrationFolder);

    for (const fileName of fileNames) {
      if (!isMigrationFile(fileName)) continue;

      const migrationUrl = pathToFileURL(
        path.resolve(this.migrationFolder, fileName),
      );
      const loadedModule: unknown = await import(migrationUrl.href);
      if (!isRecord(loadedModule)) continue;

      const migration = isMigration(loadedModule.default)
        ? loadedModule.default
        : loadedModule;
      if (isMigration(migration)) {
        migrations[fileName.slice(0, fileName.lastIndexOf("."))] = migration;
      }
    }

    return migrations;
  }
}

function isMigrationFile(fileName: string): boolean {
  return (
    fileName.endsWith(".js") ||
    (fileName.endsWith(".ts") && !fileName.endsWith(".d.ts")) ||
    fileName.endsWith(".mjs") ||
    (fileName.endsWith(".mts") && !fileName.endsWith(".d.mts"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMigration(value: unknown): value is Migration {
  return (
    isRecord(value) &&
    typeof value.up === "function" &&
    (value.down === undefined || typeof value.down === "function")
  );
}
