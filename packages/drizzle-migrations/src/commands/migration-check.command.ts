import { BaseCommand } from './_base.command'
import type { DrizzleSnapshotJSON } from 'drizzle-kit/api'
import fs from 'node:fs'

export class MigrationCheckCommand extends BaseCommand<{}> {
  async run() {
    const dir = this.ctx.migrationFolder
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api')
    
    let drizzleJsonBefore = this.getDefaultDrizzleSnapshot(this.ctx.dialect)

    // Get latest migration snapshot
    const latestSnapshot = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .reverse()?.[0]

    if (latestSnapshot) {
      const latestSnapshotJSON = JSON.parse(
        fs.readFileSync(`${dir}/${latestSnapshot}`, 'utf8')
      ) as DrizzleSnapshotJSON

      drizzleJsonBefore = latestSnapshotJSON
    }

    const drizzleJsonAfter = generateDrizzleJson(this.ctx.schema)
    const sqlStatementsUp = await generateMigration(drizzleJsonBefore, drizzleJsonAfter)
    const sqlStatementsDown = await generateMigration(drizzleJsonAfter, drizzleJsonBefore)

    if (!sqlStatementsUp.length && !sqlStatementsDown.length) {
      console.log(`[Generate]: No schema changes detected`)
    } else {
      console.log(`[Generate]: Detected schema changes detected, UP: ${sqlStatementsUp.length} DOWN: ${sqlStatementsDown.length}`)
    }

  }


  getDefaultDrizzleSnapshot(dialect: DrizzleSnapshotJSON['dialect']): DrizzleSnapshotJSON {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      _meta: {
        columns: {},
        schemas: {},
        tables: {},
      },
      dialect: dialect,
      enums: {},
      prevId: '00000000-0000-0000-0000-00000000000',
      schemas: {},
      tables: {},
      version: '7',
    }
  }
}
