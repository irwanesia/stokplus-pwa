import Dexie, { type Table } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { StokPlusDatabase } from '@/db/dexie'
import { ALL_STORES, DOMAIN_TABLE_NAMES, type MetaRecord } from '@/db/schema'

const databases: StokPlusDatabase[] = []
const legacyDatabases: Dexie[] = []
const names: string[] = []

afterEach(async () => {
  for (const database of databases) {
    database.close()
    await database.delete()
  }
  for (const database of legacyDatabases) {
    database.close()
    await database.delete()
  }
  databases.length = 0
  legacyDatabases.length = 0
  names.length = 0
})

function databaseName(label: string) {
  const name = `stokplus-${label}-${crypto.randomUUID()}`
  names.push(name)
  return name
}

class LegacyDatabase extends Dexie {
  app_meta!: Table<MetaRecord, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ app_meta: 'key' })
  }
}

describe('StokPlusDatabase', () => {
  it('creates the full v2 domain schema', async () => {
    const database = new StokPlusDatabase(databaseName('schema'))
    databases.push(database)

    await database.open()

    const expectedTables = Object.keys(ALL_STORES).sort()
    expect(database.verno).toBe(2)
    expect(database.tables.map((table) => table.name).sort()).toEqual(expectedTables)
    expect(database.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([...DOMAIN_TABLE_NAMES]),
    )
  })

  it('creates FEFO and lot status indexes', async () => {
    const database = new StokPlusDatabase(databaseName('indexes'))
    databases.push(database)
    await database.open()

    const indexPaths = database.stock_lots.schema.indexes.map((index) =>
      Array.isArray(index.keyPath) ? `[${index.keyPath.join('+')}]` : index.keyPath,
    )

    expect(indexPaths).toContain('[product_id+expiry_date]')
    expect(indexPaths).toContain('[product_id+status]')
  })

  it('stores metadata and upgrades a v1 database to v2', async () => {
    const name = databaseName('migration')
    const legacy = new LegacyDatabase(name)
    legacyDatabases.push(legacy)

    await legacy.open()
    const record: MetaRecord = {
      key: 'installed_at',
      value: 'phase-1',
      updated_at: new Date().toISOString(),
    }
    await legacy.app_meta.put(record)
    legacy.close()

    const upgraded = new StokPlusDatabase(name)
    databases.push(upgraded)
    await upgraded.open()

    expect(upgraded.verno).toBe(2)
    expect(await upgraded.app_meta.get('installed_at')).toEqual(record)
    expect(await upgraded.settings.get('schema_version')).toMatchObject({ value: 2 })
    expect(upgraded.tables.map((table) => table.name)).toContain('stock_lots')
  })
})
