import { defineConfig as defineConfigOg, type Config } from "drizzle-kit";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  buildMigrationContext,
  resolveDrizzleConfig,
} from "./helpers/drizzle-config";
import { MigrationUpCommand } from "./commands/migration-up.command";
import { MigrationDownCommand } from "./commands/migration-down.command";
export * from "./seed/_base.seeder";
export * from "./seed/seed-runner";

export type ConfigDialect = Config["dialect"];
export type DrizzleMigrationsConfig = Config & {
  /**
   * Configuration for seeders
   */
  seed?: {
    /**
     * Path to the directory containing seeders
     */
    dirPath: string;
    /**
     * Seeder to run by default if no seeder name is specified
     * @default 'db-seeder'
     */
    defaultSeeder?: string;
  };
} & (
    | {
        dialect: "postgresql";
        getMigrator: () => Promise<PostgresJsDatabase>;
      }
    | {
        dialect: "sqlite";
        getMigrator: () => Promise<BetterSQLite3Database>;
      }
    | {
        dialect: "mysql";
        getMigrator: () => Promise<MySql2Database>;
      }
  );

/**
 * @deprecated Use `defineConfig` instead
 */
export function defineConfigWithMigrator(config: DrizzleMigrationsConfig) {
  return defineConfigOg(config);
}

export function defineConfig(config: DrizzleMigrationsConfig) {
  return defineConfigOg(config);
}

export type DBClient<TDialect extends ConfigDialect> = TDialect extends "sqlite"
  ? BetterSQLite3Database
  : TDialect extends "mysql"
  ? MySql2Database
  : TDialect extends "postgresql"
  ? PostgresJsDatabase
  : never;

export type MigrationArgs<TDialect extends ConfigDialect> = {
  db: DBClient<TDialect>;
};

export type Migration<TDialect extends ConfigDialect> = {
  up: (args: MigrationArgs<TDialect>) => Promise<void>;
  down: (args: MigrationArgs<TDialect>) => Promise<void>;
};

export const migrationUpRunner = async () => {
  const ctx = await buildMigrationContext(resolveDrizzleConfig());
  const command = new MigrationUpCommand(ctx);
  await command.run();
};

export const migrationDownRunner = async (opts: { batch?: number }) => {
  const ctx = await buildMigrationContext(resolveDrizzleConfig());
  const command = new MigrationDownCommand({
    ...ctx,
    opts: {
      batchToRollDownTo: Number(opts.batch) ?? undefined,
    },
  });
  await command.run();
};
