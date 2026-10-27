import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { inspectBackupFile } from '@/backup/codec'
import { prepareBackup, restoreBackup } from '@/backup/service'
import type { BackupPayload } from '@/backup/types'
import { db } from '@/db/dexie'
import { seedSampleData } from '@/db/sampleData'
import { ensureSettingsDefaults, saveSettings } from '@/db/settings'
import { DOMAIN_TABLE_NAMES } from '@/db/schema'

const now = '2026-10-25T03:04:00.000Z'

async function clearAll() {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  await ensureSettingsDefaults()
}

async function arrangeData() {
  await seedSampleData()
  await db.business_profile.put({
    id: 'main',
    nama_usaha: 'Frozen Food Bu Rina',
    nama_pemilik: 'Rina',
    alamat: '',
    telepon: '',
    catatan_laporan: '',
    created_at: now,
    updated_at: now,
  })
  await saveSettings({
    pin_hash: 'hash',
    pin_salt: 'salt',
    pin_iterations: 210_000,
    onboarding_completed_at: now,
    cutover_date: '2026-10-01',
  })

  const product = await db.products.toCollection().first()
  const unit = product
    ? await db.product_units.where('product_id').equals(product.id).first()
    : null

  if (!product || !unit) {
    throw new Error('Sample product or unit missing')
  }

  await db.stock_lots.put({
    id: 'lot-1',
    product_id: product.id,
    purchase_id: null,
    purchase_item_id: null,
    lot_code: 'LOT-1',
    received_at: now,
    expiry_date: '2027-01-31',
    qty_received_base: 10,
    qty_remaining_base: 4,
    unit_cost_base: 1_000,
    source: 'opening',
    status: 'active',
    created_at: now,
    updated_at: now,
  })

  await db.sales.put({
    id: 'sale-1',
    nomor_nota: 'PJ-1',
    tanggal: '2026-10-25',
    customer_id: null,
    metode_pembayaran: 'tunai',
    subtotal: 1_500,
    diskon: 0,
    total: 1_500,
    bayar: 1_500,
    hpp_total: 1_000,
    gross_profit: 500,
    status: 'completed',
    keterangan: '',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })

  await db.sale_items.put({
    id: 'sale-item-1',
    sale_id: 'sale-1',
    product_id: product.id,
    unit_id: unit.unit_id,
    qty_unit: 1,
    conversion_qty: 1,
    qty_base: 1,
    harga_jual_unit: 1_500,
    diskon: 0,
    subtotal: 1_500,
    hpp_total: 1_000,
    gross_profit: 500,
    created_at: now,
  })

  await db.sale_lot_consumptions.put({
    id: 'consumption-1',
    sale_id: 'sale-1',
    sale_item_id: 'sale-item-1',
    lot_id: 'lot-1',
    qty_base: 1,
    unit_cost_base: 1_000,
    total_cost: 1_000,
    created_at: now,
  })

  await db.stock_writeoffs.put({
    id: 'writeoff-1',
    nomor: 'WO-1',
    tanggal: '2026-10-25',
    alasan: 'expired',
    keterangan: '',
    total_cost: 1_000,
    status: 'completed',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })

  await db.stock_writeoff_items.put({
    id: 'writeoff-item-1',
    writeoff_id: 'writeoff-1',
    product_id: product.id,
    lot_id: 'lot-1',
    qty_base: 1,
    unit_cost_base: 1_000,
    total_cost: 1_000,
    expiry_date: '2027-01-31',
    keterangan: '',
    created_at: now,
  })

  return { productId: product.id, unitId: unit.unit_id }
}

beforeEach(clearAll)

afterAll(async () => {
  db.close()
  await db.delete()
})

describe('backup service', () => {
  it('backs up and restores lots, expiry, consumption, and write-off data', async () => {
    const { productId } = await arrangeData()
    const exported = await prepareBackup({ encrypt: false })
    const inspected = await inspectBackupFile(exported.content)

    expect(Object.keys(exported.payload.tables).sort()).toEqual([...DOMAIN_TABLE_NAMES].sort())
    expect(exported.payload.counts.stock_lots).toBe(1)
    expect(exported.payload.counts.sale_lot_consumptions).toBe(1)
    expect(exported.payload.counts.stock_writeoffs).toBe(1)
    expect(exported.payload.counts.stock_writeoff_items).toBe(1)

    const safety = await restoreBackup(inspected.payload, {
      fileSize: inspected.fileSize,
      encrypted: false,
    })
    expect(safety.safetyBackup).not.toBeNull()
    expect(safety.safetyBackup?.file.tables.stock_lots).toHaveLength(1)

    await Promise.all(db.tables.map((table) => table.clear()))
    const restored = await restoreBackup(inspected.payload, {
      fileSize: inspected.fileSize,
      encrypted: false,
    })

    expect(restored.safetyBackup).toBeNull()
    expect(await db.business_profile.get('main')).toMatchObject({
      nama_usaha: 'Frozen Food Bu Rina',
    })
    expect(await db.stock_lots.get('lot-1')).toMatchObject({
      product_id: productId,
      expiry_date: '2027-01-31',
      qty_remaining_base: 4,
      status: 'active',
    })
    expect(await db.sale_lot_consumptions.get('consumption-1')).toMatchObject({
      lot_id: 'lot-1',
      qty_base: 1,
      total_cost: 1_000,
    })
    expect(await db.stock_writeoffs.get('writeoff-1')).toMatchObject({
      alasan: 'expired',
      total_cost: 1_000,
    })
    expect(await db.stock_writeoff_items.get('writeoff-item-1')).toMatchObject({
      lot_id: 'lot-1',
      expiry_date: '2027-01-31',
    })
    expect(await db.audit_logs.where('action').equals('backup_restored').count()).toBe(1)

    const lastBackup = await db.settings.get('last_backup_at')
    expect(lastBackup?.value).toBe(exported.file.exportedAt)
  })

  it('creates a safety backup and keeps the old data when restore fails', async () => {
    await arrangeData()
    const beforeProducts = await db.products.count()
    const beforeLots = await db.stock_lots.count()
    const exported = await prepareBackup({ encrypt: false })
    const inspected = await inspectBackupFile(exported.content)
    const badPayload = structuredClone(inspected.payload) as BackupPayload
    const products = badPayload.tables.products as Record<string, unknown>[]
    products[0].id = null

    let safetyDownloads = 0

    await expect(
      restoreBackup(badPayload, {
        fileSize: inspected.fileSize,
        onSafetyBackup: () => {
          safetyDownloads += 1
        },
      }),
    ).rejects.toThrow()

    expect(safetyDownloads).toBe(1)
    expect(await db.business_profile.get('main')).toBeDefined()
    expect(await db.products.count()).toBe(beforeProducts)
    expect(await db.stock_lots.count()).toBe(beforeLots)
    expect(await db.stock_lots.get('lot-1')).toBeDefined()
    expect(await db.audit_logs.where('action').equals('backup_restored').count()).toBe(0)
  })
})
