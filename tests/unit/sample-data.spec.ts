import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import { seedSampleData } from '@/db/sampleData'

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('sample data', () => {
  it('seeds master data into empty tables', async () => {
    const counts = await seedSampleData()

    expect(counts.units).toBeGreaterThan(0)
    expect(counts.products).toBeGreaterThan(0)
    expect(counts.productUnits).toBeGreaterThanOrEqual(counts.products)
    expect(await db.products.count()).toBe(counts.products)
    expect(await db.product_units.count()).toBe(counts.productUnits)
    expect(await db.settings.get('sample_data_seeded')).toMatchObject({ value: true })
  })

  it('does not seed twice', async () => {
    await seedSampleData()
    await expect(seedSampleData()).rejects.toThrow('sudah pernah diisi')
  })

  it('refuses to mix sample data with existing master data', async () => {
    await db.units.put({
      id: 'unit-existing',
      nama: 'Pcs',
      simbol: 'pcs',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })

    await expect(seedSampleData()).rejects.toThrow('Data master sudah berisi')
    expect(await db.units.count()).toBe(1)
    expect(await db.products.count()).toBe(0)
  })
})
