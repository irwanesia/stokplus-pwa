import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import { getProfitLoss } from '@/expenses/repository'
import type { StockLot } from '@/db/schema'
import { saveCategory, saveProduct, saveUnit } from '@/master/repository'
import type { ProductCategory, Unit } from '@/db/schema'
import {
  cancelWriteoff,
  getExpiryLots,
  getInventoryConsistency,
  getStockOverview,
  getStocktake,
  saveStocktake,
  saveWriteoff,
} from '@/inventory/repository'

let productId: string
let unit: Unit
let category: ProductCategory
let earlyLot: StockLot
let laterLot: StockLot

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  category = await saveCategory({
    kode: 'FRZ',
    nama: 'Frozen Food',
    deskripsi: '',
    status: 'active',
  })
  unit = await saveUnit({ nama: 'Pcs', simbol: 'pcs', status: 'active' })
  const result = await saveProduct({
    kode: '',
    nama: 'Siomay Ayam',
    kategori_id: category.id,
    base_unit_id: unit.id,
    track_expiry: true,
    expiry_alert_days: 30,
    min_stock_base: 3,
    status: 'active',
    opening_stock_base: 0,
    opening_expiry_date: '',
    opening_lot_code: '',
    units: [
      {
        unit_id: unit.id,
        conversion_qty: 1,
        is_base: true,
        can_purchase: false,
        can_sell: true,
        is_default_purchase: false,
        is_default_sale: true,
        harga_beli_default: 200,
        harga_jual: 500,
        barcode: '',
        status: 'active',
      },
    ],
  })
  productId = result.id
  const now = '2026-10-26T00:00:00.000Z'
  earlyLot = {
    id: 'lot-expired',
    product_id: productId,
    purchase_id: null,
    purchase_item_id: null,
    lot_code: 'LOT-EARLY',
    received_at: '2026-09-01',
    expiry_date: '2026-10-01',
    qty_received_base: 5,
    qty_remaining_base: 5,
    unit_cost_base: 100,
    source: 'purchase',
    status: 'active',
    created_at: now,
    updated_at: now,
  }
  laterLot = {
    ...earlyLot,
    id: 'lot-later',
    lot_code: 'LOT-LATER',
    received_at: '2026-10-01',
    expiry_date: '2026-12-01',
    qty_received_base: 15,
    qty_remaining_base: 15,
    unit_cost_base: 200,
  }
  await db.stock_lots.bulkAdd([earlyLot, laterLot])
  await db.products.update(productId, { stock_base: 20 })
})

describe('inventory stock, write-off, and stocktake domain', () => {
  it('lists stock value, expiry status, and reconciliation discrepancies', async () => {
    const overview = await getStockOverview()
    expect(overview[0]).toMatchObject({
      lotStock: 20,
      stockDifference: 0,
      inventoryValue: 3_500,
      baseUnitSymbol: 'pcs',
    })
    expect((await getExpiryLots()).map((lot) => lot.id)).toEqual([earlyLot.id])

    await db.products.update(productId, { stock_base: 21 })
    expect(await getInventoryConsistency()).toHaveLength(1)
    expect(await getInventoryConsistency()).toMatchObject([
      { product: { id: productId }, stockDifference: 1 },
    ])
  })

  it('completes write-off at lot cost and cancellation restores stock and reverses P&L', async () => {
    const result = await saveWriteoff(
      {
        tanggal: '2026-10-26',
        alasan: 'expired',
        keterangan: 'Stok kedaluwarsa',
        items: [{ lot_id: earlyLot.id, qty_base: 5, keterangan: '' }],
      },
      { complete: true },
    )
    expect(result).toMatchObject({ status: 'completed', total_cost: 500 })
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 15 })
    expect(await db.stock_lots.get(earlyLot.id)).toMatchObject({
      qty_remaining_base: 0,
      status: 'depleted',
    })
    expect(
      (await db.stock_movements.toArray()).filter((row) => row.ref_id === result.id),
    ).toMatchObject([{ tipe: 'writeoff_expired', stock_before_base: 20, stock_after_base: 15 }])
    expect(await getProfitLoss('2026-10-26', '2026-10-26')).toMatchObject({
      inventoryLoss: 500,
      netProfit: -500,
    })

    await cancelWriteoff(result.id)
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 20 })
    expect(await db.stock_lots.get(earlyLot.id)).toMatchObject({
      qty_remaining_base: 5,
      status: 'active',
    })
    expect(await getProfitLoss('2026-10-26', '2026-10-26')).toMatchObject({
      inventoryLoss: 0,
      netProfit: 0,
    })
    expect(
      (await db.stock_movements.toArray()).filter((row) => row.ref_id === result.id),
    ).toHaveLength(2)
  })

  it('does not mutate stock for write-off drafts and rejects quantities above lot balance', async () => {
    const draft = await saveWriteoff({
      tanggal: '2026-10-26',
      alasan: 'damaged',
      keterangan: '',
      items: [{ lot_id: earlyLot.id, qty_base: 2, keterangan: '' }],
    })
    expect(draft.status).toBe('draft')
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 20 })
    expect(await db.stock_movements.count()).toBe(0)
    await expect(
      saveWriteoff(
        {
          tanggal: '2026-10-26',
          alasan: 'other',
          keterangan: '',
          items: [{ lot_id: earlyLot.id, qty_base: 6, keterangan: '' }],
        },
        { complete: true },
      ),
    ).rejects.toThrow('Qty write-off melebihi stok tersisa')
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 20 })
  })

  it('allocates stocktake shortage by expiry and values the loss from the consumed lots', async () => {
    const result = await saveStocktake(
      {
        tanggal: '2026-10-26',
        keterangan: 'Hitung fisik',
        items: [{ product_id: productId, physical_qty_base: 15, expiry_date: '' }],
      },
      { complete: true },
    )
    expect(result.status).toBe('completed')
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 15 })
    expect(await db.stock_lots.get(earlyLot.id)).toMatchObject({ qty_remaining_base: 0 })
    expect(await db.stock_lots.get(laterLot.id)).toMatchObject({ qty_remaining_base: 15 })
    expect(
      (await db.stock_movements.toArray()).filter((row) => row.ref_id === result.id),
    ).toMatchObject([
      {
        tipe: 'opname_shortage',
        lot_id: earlyLot.id,
        qty_base: 5,
        unit_cost_base: 100,
      },
    ])
    const detail = await getStocktake(result.id)
    expect(detail?.items[0]).toMatchObject({
      system_qty_base: 20,
      physical_qty_base: 15,
      diff_base: -5,
      diff_cost: 500,
    })
    expect(await getProfitLoss('2026-10-26', '2026-10-26')).toMatchObject({
      inventoryLoss: 500,
      netProfit: -500,
    })
  })

  it('creates a weighted-cost quarantined surplus lot and offsets inventory loss', async () => {
    const result = await saveStocktake(
      {
        tanggal: '2026-10-26',
        keterangan: '',
        items: [{ product_id: productId, physical_qty_base: 23, expiry_date: '' }],
      },
      { complete: true },
    )
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 23 })
    const surplus = (await db.stock_lots.toArray()).find((row) => row.source === 'opname_surplus')
    expect(surplus).toMatchObject({
      qty_remaining_base: 3,
      unit_cost_base: 175,
      status: 'quarantined',
      expiry_date: null,
    })
    expect(await getStocktake(result.id)).toMatchObject({
      items: [{ diff_base: 3, diff_cost: -525 }],
    })
    expect(await getProfitLoss('2026-10-26', '2026-10-26')).toMatchObject({
      inventoryLoss: -525,
      netProfit: 525,
    })
  })

  it('keeps stocktake drafts inert and blocks finalizing inconsistent stock', async () => {
    const draft = await saveStocktake({
      tanggal: '2026-10-26',
      keterangan: '',
      items: [{ product_id: productId, physical_qty_base: 18, expiry_date: '' }],
    })
    expect(await db.products.get(productId)).toMatchObject({ stock_base: 20 })
    expect(await db.stock_movements.count()).toBe(0)

    await db.products.update(productId, { stock_base: 21 })
    await expect(
      saveStocktake(
        {
          tanggal: '2026-10-26',
          keterangan: '',
          items: [{ product_id: productId, physical_qty_base: 18, expiry_date: '' }],
        },
        { id: draft.id, complete: true },
      ),
    ).rejects.toThrow('tidak konsisten')
    expect(await db.stock_movements.count()).toBe(0)
    expect(await db.stock_opnames.get(draft.id)).toMatchObject({ status: 'draft' })
  })
})
