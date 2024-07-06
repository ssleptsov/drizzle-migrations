import fs from 'node:fs'
import path from 'node:path'
import * as tsx from 'tsx/cjs/api'
import type { ConfigDialect, ConfigWithMigrator, DBClient } from '..'
import type { SQLWrapper } from 'drizzle-orm'

export function resolveDrizzleConfig() {
  const configFileNames = ['drizzle.config.ts', 'drizzle.config.tsx']
  let currentDir = process.cwd()

  while (true) {
    for (const configFileName of configFileNames) {
      const configFilePath = path.join(currentDir, configFileName)
      if (fs.existsSync(configFilePath)) {
        return configFilePath
      }
    }
    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir || fs.existsSync(path.join(currentDir, '.git'))) {
      // If we reached the root or found a .git directory, stop searching
      break
    }

    currentDir = parentDir
  }

  throw new Error(
    'drizzle.config.ts{x} not found in the current directory or any parent directories.'
  )
}

export async function buildMigrationContext(drizzleConfigPath: string) {
  let drizzleConfig: ConfigWithMigrator | undefined = undefined
  try {
    drizzleConfig = tsx.require(drizzleConfigPath, __filename).default as ConfigWithMigrator
  } catch (e) {
    console.error(e)
  }
  if (!drizzleConfig) {
    throw new Error(`Failed to load drizzle config from ${drizzleConfigPath}`)
  }

  if (!drizzleConfig.out?.length) {
    throw new Error(
      'Drizzle config must have an "out" field specified, so that migrations can be generated.'
    )
  }

  if (!drizzleConfig.schema) {
    throw new Error(
      'Drizzle config must have a "schema" field specified, so that migrations can be generated.'
    )
  }

  if (!drizzleConfig.getMigrator) {
    throw new Error('Drizzle config must have a "getMigrator" field specified.')
  }

  const drizzleFolder = path.dirname(drizzleConfigPath)

  const schemaArr = Array.isArray(drizzleConfig.schema)
    ? drizzleConfig.schema
    : [drizzleConfig.schema]
  const schemaObj: Record<string, any> = {}

  for (const schemaPath of schemaArr) {
    const schemaTs = tsx.require(path.join(drizzleFolder, schemaPath), __filename)
    Object.assign(schemaObj, schemaTs)
  }

  return {
    migrationFolder: path.join(drizzleFolder, drizzleConfig.out),
    schema: schemaObj,
    dialect: drizzleConfig.dialect,
    client: (await drizzleConfig.getMigrator()) as DBClient<typeof drizzleConfig.dialect>,
    migrationTable: drizzleConfig.migrations?.table || 'drizzle_migrations',
    migrationSchema: drizzleConfig.migrations?.schema || 'public',
    opts: {},
  } as MigrationContext
}

export type MigrationContext<
  TOpts extends Record<string, any> = Record<string, any>,
  TDialect extends ConfigDialect = ConfigDialect,
> = {
  migrationFolder: string
  schema: Record<string, any>
  dialect: TDialect
  client: DBClient<TDialect>
  migrationTable: string
  migrationSchema: string
  opts: TOpts
} & (
  | {
      dialect: 'sqlite'
      client: DBClient<'sqlite'>
    }
  | {
      dialect: 'mysql'
      client: DBClient<'mysql'>
    }
  | {
      dialect: 'postgresql'
      client: DBClient<'postgresql'>
    }
)
