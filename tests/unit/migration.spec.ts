import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import {
  buildMigrationPlan,
  commitMigration,
  inspectLegacyExport,
} from '@/features/migration/service'

const exportData = {
  meta: {
    app: 'SMPP Laravel',
    version: '1.0',
    exported_at: '2026-10-27T00:00:00+07:00',
    schema: 'mysql-2026-10',
    source_php: '8.3.36',
  },
  tables: {
    product_categories: [{ id: 1, kode: 'FRO', nama: 'Frozen', status: 1 }],
    units: [{ id: 2, nama: 'Pcs', status: 1 }],
    products: [
      {
        id: 5,
        kode: 'FR-001',
        nama: 'Siomay',
        kategori_id: 1,
        satuan_id: 2,
        harga_beli: '600.00',
        harga_jual: '1000.00',
        min_stock: 2,
        stock: 3,
        status: 1,
      },
    ],
    suppliers: [{ id: 8, kode: 'SUP-1', nama: 'Supplier', status: 1 }],
    customers: [{ id: 9, kode: 'CUS-1', nama: 'Pelanggan', status: 1 }],
    expense_categories: [{ id: 10, kode: 'OPS', nama: 'Operasional', status: 1 }],
    purchases: [
      {
        id: 11,
        nomor_nota: 'PB/20261001/0001',
        tanggal: '2026-10-01',
        supplier_id: 8,
        metode_pembayaran: 'kredit',
        total: '1100.00',
        diskon: '100.00',
        bayar: '1000.00',
        status: 'completed',
      },
    ],
    purchase_details: [
      {
        id: 12,
        purchase_id: 11,
        product_id: 5,
        qty: 2,
        harga_beli: '600.00',
        diskon: '100.00',
        subtotal: '1100.00',
      },
    ],
    sales: [
      {
        id: 13,
        nomor_nota: 'PJ/20261002/0001',
        tanggal: '2026-10-02',
        customer_id: 9,
        metode_pembayaran: 'tunai',
        total: '950.00',
        diskon: '50.00',
        bayar: '900.00',
        status: 'completed',
      },
    ],
    sale_details: [
      {
        id: 14,
        sale_id: 13,
        product_id: 5,
        qty: 1,
        harga_jual: '1000.00',
        diskon: '50.00',
        subtotal: '950.00',
      },
    ],
    expenses: [
      {
        id: 15,
        nomor_transaksi: 'BB/20261003/0001',
        tanggal: '2026-10-03',
        expense_category_id: 10,
        nominal: '100.00',
        metode_pembayaran: 'tunai',
        status: 'completed',
      },
    ],
    stock_movements: [
      {
        id: 16,
        product_id: 5,
        tipe: 'purchase',
        jumlah: 2,
        stock_sebelum: 0,
        stock_sesudah: 2,
      },
    ],
    stock_opnames: [
      {
        id: 17,
        nomor_opname: 'OP/20261004/0001',
        tanggal: '2026-10-04',
      },
    ],
    stock_opname_details: [
      {
        id: 18,
        stock_opname_id: 17,
        product_id: 5,
        stock_sistem: 2,
        stock_fisik: 3,
        selisih: 1,
      },
    ],
  },
}

function inspect() {
  return inspectLegacyExport(JSON.stringify(exportData))
}

async function clearDatabase() {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
}

beforeEach(clearDatabase)

afterAll(async () => {
  db.close()
  await db.delete()
})

describe('Laravel migration', () => {
  it('rejects unsupported PHP and broken relations before preparing data', () => {
    const oldPhp = structuredClone(exportData)
    oldPhp.meta.source_php = '8.3.35'
    expect(() => inspectLegacyExport(JSON.stringify(oldPhp))).toThrow('PHP 8.3.36+')

    const brokenRelation = structuredClone(exportData)
    brokenRelation.tables.sale_details[0].product_id = 404
    expect(() => inspectLegacyExport(JSON.stringify(brokenRelation))).toThrow(
      'data yang tidak tersedia',
    )
  })

  it('maps legacy IDs deterministically, estimates COGS, and quarantines unknown expiry', async () => {
    const preview = inspect()
    const options = { 5: { trackExpiry: true, expiryDate: '' } }
    const plan = await buildMigrationPlan(preview, '2026-10-27', options)
    const repeated = await buildMigrationPlan(preview, '2026-10-27', options)

    expect(plan.stockReconciles).toBe(true)
    expect(plan.quarantineCount).toBe(1)
    expect(plan.tables.products?.[0].legacy_id).toBe(5)
    expect(plan.tables.products?.[0].id).toBe(repeated.tables.products?.[0].id)
    expect(plan.tables.stock_lots?.[0]).toMatchObject({
      qty_remaining_base: 3,
      unit_cost_base: 500,
      status: 'quarantined',
      source: 'import',
    })
    expect(plan.tables.sales?.[0]).toMatchObject({ total: 900, hpp_total: 500, gross_profit: 400 })
    expect(plan.tables.purchases?.[0].metode_pembayaran).toBe('kredit')
    expect(plan.tables.sale_items?.[0]).toMatchObject({
      hpp_total: 500,
      hpp_is_estimated: true,
    })
    expect(plan.tables.stock_movements).toHaveLength(1)
    expect(plan.totals).toEqual({ sales: 900, purchases: 1000, expenses: 100, stock: 3 })
  })

  it('uses a supplied expiry date and rejects historical transactions after cutover', async () => {
    const plan = await buildMigrationPlan(inspect(), '2026-10-27', {
      5: { trackExpiry: true, expiryDate: '2027-01-31' },
    })
    expect(plan.tables.stock_lots?.[0]).toMatchObject({
      expiry_date: '2027-01-31',
      status: 'active',
    })
    await expect(
      buildMigrationPlan(inspect(), '2026-10-01', { 5: { trackExpiry: false, expiryDate: '' } }),
    ).rejects.toThrow('setelah tanggal cutover')
  })

  it('imports atomically, records a report, and preserves local profile and settings', async () => {
    await db.business_profile.put({
      id: 'main',
      nama_usaha: 'Toko Lokal',
      nama_pemilik: 'Pemilik',
      alamat: '',
      telepon: '',
      catatan_laporan: '',
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
    })
    await db.settings.put({ key: 'pin_hash', value: 'local-pin-hash', updated_at: '2026-10-01' })
    const plan = await buildMigrationPlan(inspect(), '2026-10-27', {
      5: { trackExpiry: false, expiryDate: '' },
    })
    const result = await commitMigration(plan)

    expect(result.safetyBackupRequired).toBe(true)
    expect(await db.products.count()).toBe(1)
    expect(await db.stock_lots.toArray()).toMatchObject([{ status: 'active', expiry_date: null }])
    expect((await db.business_profile.get('main'))?.nama_usaha).toBe('Toko Lokal')
    expect((await db.settings.get('pin_hash'))?.value).toBe('local-pin-hash')
    expect((await db.settings.get('cutover_date'))?.value).toBe('2026-10-27')
    expect(await db.audit_logs.where('action').equals('laravel_migration_imported').count()).toBe(1)
  })

  it('rolls back cleared and partially written tables when the import transaction fails', async () => {
    await db.products.put({
      id: 'existing-product',
      kode: 'OLD',
      nama: 'Data lama',
      kategori_id: 'old-category',
      base_unit_id: 'old-unit',
      track_expiry: false,
      expiry_alert_days: 30,
      min_stock_base: 0,
      stock_base: 0,
      status: 'active',
      created_at: '2026-10-01',
      updated_at: '2026-10-01',
      deleted_at: null,
    })
    const plan = await buildMigrationPlan(inspect(), '2026-10-27', {
      5: { trackExpiry: false, expiryDate: '' },
    })
    const category = plan.tables.product_categories?.[0]
    if (!category) throw new Error('Expected migration category row')
    plan.tables.product_categories = [category, { ...category, id: 'duplicate-code-category' }]

    await expect(commitMigration(plan)).rejects.toThrow()
    expect(await db.products.get('existing-product')).toBeDefined()
    expect(await db.product_categories.count()).toBe(0)
    expect(await db.audit_logs.count()).toBe(0)
  })
})
