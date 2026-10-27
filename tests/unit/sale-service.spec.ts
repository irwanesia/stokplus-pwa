import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import type { ProductCategory, Supplier, Unit } from '@/db/schema'
import { saveCategory, saveProduct, saveSupplier, saveUnit } from '@/master/repository'
import type { ProductDraft, ProductUnitDraft } from '@/master/types'
import { savePurchase } from '@/purchases/repository'
import type { PurchaseDraft } from '@/purchases/types'
import { cancelSale, getSaleDetail, saveSaleAction } from '@/sales/repository'
import type { SaleDraft } from '@/sales/types'
import { todayJakarta } from '@/utils/date'

let category: ProductCategory
let supplier: Supplier
let unitPcs: Unit
let unitPack: Unit
let productId: string

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function unitRow(overrides: Partial<ProductUnitDraft>): ProductUnitDraft {
  return {
    unit_id: unitPcs.id,
    conversion_qty: 1,
    is_base: true,
    can_purchase: true,
    can_sell: true,
    is_default_purchase: true,
    is_default_sale: true,
    harga_beli_default: 100,
    harga_jual: 2_500,
    barcode: '',
    status: 'active',
    ...overrides,
  }
}

function productDraft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  return {
    kode: '',
    nama: 'Siomay Ayam',
    kategori_id: category.id,
    base_unit_id: unitPcs.id,
    track_expiry: true,
    expiry_alert_days: 30,
    min_stock_base: 0,
    status: 'active',
    units: [
      unitRow({}),
      unitRow({
        unit_id: unitPack.id,
        conversion_qty: 10,
        is_base: false,
        can_purchase: false,
        is_default_purchase: false,
        is_default_sale: false,
        harga_beli_default: 0,
        harga_jual: 2_500,
      }),
    ],
    opening_stock_base: 0,
    opening_expiry_date: '',
    opening_lot_code: '',
    ...overrides,
  }
}

function purchaseDraft(options: {
  date: string
  expiry: string
  qty?: number
  price?: number
  lotCode?: string
}): PurchaseDraft {
  const qty = options.qty ?? 20
  const price = options.price ?? 100
  return {
    nomor_nota: '',
    tanggal: options.date,
    supplier_id: supplier.id,
    metode_pembayaran: 'tunai',
    diskon: 0,
    biaya_angkut: 0,
    bayar: qty * price,
    keterangan: '',
    items: [
      {
        product_id: productId,
        unit_id: unitPcs.id,
        qty_unit: qty,
        harga_beli_unit: price,
        diskon: 0,
        expiry_date: options.expiry,
        lot_code: options.lotCode ?? '',
      },
    ],
  }
}

function saleDraft(overrides: Partial<SaleDraft> = {}): SaleDraft {
  return {
    nomor_nota: '',
    tanggal: todayJakarta(),
    customer_id: '',
    metode_pembayaran: 'tunai',
    diskon: 0,
    bayar: 2_500,
    keterangan: '',
    items: [
      {
        product_id: productId,
        unit_id: unitPack.id,
        qty_unit: 1,
        harga_jual_unit: 2_500,
        diskon: 0,
      },
    ],
    ...overrides,
  }
}

async function receiveLot(options: {
  date: string
  expiry: string
  qty?: number
  price?: number
  lotCode?: string
}) {
  return savePurchase(purchaseDraft(options), { complete: true })
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  category = await saveCategory({
    kode: 'FRZ',
    nama: 'Frozen Food',
    deskripsi: '',
    status: 'active',
  })
  supplier = await saveSupplier({
    kode: '',
    nama: 'Supplier Uji',
    telepon: '',
    alamat: '',
    catatan: '',
    status: 'active',
  })
  unitPcs = await saveUnit({ nama: 'Pcs', simbol: 'pcs', status: 'active' })
  unitPack = await saveUnit({ nama: 'Pack', simbol: 'pack', status: 'active' })
  productId = (await saveProduct(productDraft())).id
})

describe('sale repository', () => {
  it('saves a draft with stock warnings possible but no stock mutation', async () => {
    const result = await saveSaleAction(saleDraft())
    const detail = await getSaleDetail(result.id)
    expect(result.status).toBe('draft')
    expect(detail?.items[0]).toMatchObject({ qty_base: 10, hpp_total: 0, gross_profit: 0 })
    expect((await db.products.get(productId))?.stock_base).toBe(0)
    expect(await db.stock_movements.count()).toBe(0)
    expect(await db.sale_lot_consumptions.count()).toBe(0)
  })

  it('allocates FEFO, converts units, and records COGS and movements', async () => {
    const today = todayJakarta()
    await receiveLot({
      date: addDays(today, -2),
      expiry: addDays(today, 30),
      price: 150,
      lotCode: 'LATER',
    })
    await receiveLot({
      date: addDays(today, -1),
      expiry: addDays(today, 10),
      qty: 5,
      lotCode: 'SOONER',
    })

    const result = await saveSaleAction(saleDraft(), { complete: true })
    const detail = await getSaleDetail(result.id)

    expect(detail?.sale).toMatchObject({
      status: 'completed',
      subtotal: 2_500,
      total: 2_500,
      hpp_total: 1_250,
      gross_profit: 1_250,
    })
    expect(detail?.items[0]).toMatchObject({ qty_base: 10, hpp_total: 1_250, gross_profit: 1_250 })
    expect(detail?.consumptions).toHaveLength(2)
    const consumptionByLotCode = new Map(
      detail?.consumptions.map((row) => [
        detail.lots.find((lot) => lot.id === row.lot_id)?.lot_code,
        row,
      ]),
    )
    expect(consumptionByLotCode.get('SOONER')).toMatchObject({
      qty_base: 5,
      total_cost: 500,
    })
    expect(consumptionByLotCode.get('LATER')).toMatchObject({
      qty_base: 5,
      total_cost: 750,
    })
    expect((await db.products.get(productId))?.stock_base).toBe(15)

    const movements = await db.stock_movements
      .where('[ref_type+ref_id]')
      .equals(['sale', result.id])
      .toArray()
    expect(movements).toHaveLength(2)
    expect(movements[0]).toMatchObject({
      tipe: 'sale_out',
      qty_base: 5,
      stock_before_base: 25,
      stock_after_base: 20,
      ref_type: 'sale',
    })
    expect(movements[1]).toMatchObject({
      tipe: 'sale_out',
      qty_base: 5,
      stock_before_base: 20,
      stock_after_base: 15,
    })
  })

  it('allows a lot to be sold on its expiry date', async () => {
    const today = todayJakarta()
    await receiveLot({ date: today, expiry: today })
    const result = await saveSaleAction(saleDraft(), { complete: true })
    expect((await getSaleDetail(result.id))?.consumptions).toHaveLength(1)
  })

  it('skips expired and quarantined lots and rejects a shortage atomically', async () => {
    const today = todayJakarta()
    const expired = await receiveLot({
      date: addDays(today, -3),
      expiry: addDays(today, -1),
      lotCode: 'EXPIRED',
    })
    const eligible = await receiveLot({
      date: addDays(today, -2),
      expiry: addDays(today, 5),
      qty: 5,
      lotCode: 'VALID',
    })
    const quarantinedLotId = 'lot-quarantine'
    await db.stock_lots.add({
      id: quarantinedLotId,
      product_id: productId,
      purchase_id: null,
      purchase_item_id: null,
      lot_code: 'QUARANTINE',
      received_at: addDays(today, -1),
      expiry_date: null,
      qty_received_base: 10,
      qty_remaining_base: 10,
      unit_cost_base: 50,
      source: 'opening',
      status: 'quarantined',
      created_at: today,
      updated_at: today,
    })
    await db.products.update(productId, { stock_base: 35 })

    const sale = await saveSaleAction(
      saleDraft({ items: [{ ...saleDraft().items[0]!, qty_unit: 0.5, harga_jual_unit: 1_250 }] }),
      { complete: true },
    )
    const saleDetail = await getSaleDetail(sale.id)
    expect(
      saleDetail?.lots.find((lot) => lot.id === saleDetail.consumptions[0]?.lot_id)?.lot_code,
    ).toBe('VALID')
    expect((await db.stock_lots.get(quarantinedLotId))?.qty_remaining_base).toBe(10)
    expect(
      (await db.stock_lots.where('purchase_id').equals(expired.id).first())?.qty_remaining_base,
    ).toBe(20)
    expect(
      (await db.stock_lots.where('purchase_id').equals(eligible.id).first())?.qty_remaining_base,
    ).toBe(0)

    await expect(saveSaleAction(saleDraft(), { complete: true })).rejects.toThrow(
      'stok non-expired tidak cukup',
    )
    expect(await db.sales.count()).toBe(1)
    expect(await db.sale_lot_consumptions.where('sale_id').equals(sale.id).count()).toBe(1)
    expect((await db.products.get(productId))?.stock_base).toBe(30)
    expect((await db.stock_lots.get(quarantinedLotId))?.qty_remaining_base).toBe(10)
  })

  it('uses FIFO for products without expiry tracking', async () => {
    const today = todayJakarta()
    const { productId: noExpiryProduct } = await createNonExpiryProduct()
    await db.stock_lots.bulkAdd([
      {
        id: 'fifo-older',
        product_id: noExpiryProduct,
        purchase_id: null,
        purchase_item_id: null,
        lot_code: 'FIFO-OLDER',
        received_at: addDays(today, -10),
        expiry_date: null,
        qty_received_base: 20,
        qty_remaining_base: 20,
        unit_cost_base: 100,
        source: 'opening',
        status: 'active',
        created_at: today,
        updated_at: today,
      },
      {
        id: 'fifo-newer',
        product_id: noExpiryProduct,
        purchase_id: null,
        purchase_item_id: null,
        lot_code: 'FIFO-NEWER',
        received_at: addDays(today, -2),
        expiry_date: null,
        qty_received_base: 20,
        qty_remaining_base: 20,
        unit_cost_base: 120,
        source: 'opening',
        status: 'active',
        created_at: today,
        updated_at: today,
      },
    ])
    await db.products.update(noExpiryProduct, { stock_base: 40 })

    const draft = saleDraft({
      items: [
        {
          product_id: noExpiryProduct,
          unit_id: unitPack.id,
          qty_unit: 1,
          harga_jual_unit: 2_500,
          diskon: 0,
        },
      ],
    })
    const result = await saveSaleAction(draft, { complete: true })
    const detail = await getSaleDetail(result.id)
    expect(detail?.lots.find((lot) => lot.id === detail.consumptions[0]?.lot_id)?.lot_code).toBe(
      'FIFO-OLDER',
    )
  })

  it('restores lot and stock on cancellation and preserves the audit trail', async () => {
    const today = todayJakarta()
    const purchase = await receiveLot({
      date: addDays(today, -1),
      expiry: addDays(today, 30),
      qty: 20,
    })
    const lot = await db.stock_lots.where('purchase_id').equals(purchase.id).first()
    if (!lot) throw new Error('Fixture lot tidak ditemukan.')

    const result = await saveSaleAction(saleDraft(), { complete: true })
    await cancelSale(result.id)

    expect((await db.sales.get(result.id))?.status).toBe('cancelled')
    expect((await db.products.get(productId))?.stock_base).toBe(20)
    expect((await db.stock_lots.get(lot.id))?.qty_remaining_base).toBe(20)
    expect(await db.sale_lot_consumptions.where('sale_id').equals(result.id).count()).toBe(1)
    const movements = await db.stock_movements
      .where('[ref_type+ref_id]')
      .equals(['sale', result.id])
      .toArray()
    expect(movements.map((movement) => movement.tipe)).toEqual(['sale_out', 'sale_cancel'])
    expect(movements[1]).toMatchObject({
      qty_base: 10,
      stock_before_base: 10,
      stock_after_base: 20,
    })
  })

  it('refuses cancellation when the stored lot consumption is inconsistent', async () => {
    const today = todayJakarta()
    await receiveLot({ date: addDays(today, -1), expiry: addDays(today, 30) })
    const result = await saveSaleAction(saleDraft(), { complete: true })
    const consumption = await db.sale_lot_consumptions.where('sale_id').equals(result.id).first()
    if (!consumption) throw new Error('Fixture konsumsi lot tidak ditemukan.')
    await db.sale_lot_consumptions.update(consumption.id, { qty_base: 9, total_cost: 900 })

    await expect(cancelSale(result.id)).rejects.toThrow(
      'Data konsumsi lot tidak cocok dengan item penjualan; pembatalan dihentikan.',
    )
    expect((await db.sales.get(result.id))?.status).toBe('completed')
    expect((await db.products.get(productId))?.stock_base).toBe(10)
    expect((await db.stock_lots.get(consumption.lot_id))?.qty_remaining_base).toBe(10)
    expect(await db.stock_movements.where('tipe').equals('sale_cancel').count()).toBe(0)
  })
})

async function createNonExpiryProduct(): Promise<{ productId: string }> {
  const secondUnit = await saveUnit({ nama: 'Pcs non-expiry', simbol: 'pcs-n', status: 'active' })
  const result = await saveProduct(
    productDraft({
      nama: 'Nugget tanpa expiry',
      base_unit_id: secondUnit.id,
      track_expiry: false,
      units: [
        unitRow({
          unit_id: secondUnit.id,
          harga_jual: 2_500,
          harga_beli_default: 100,
        }),
        unitRow({
          unit_id: unitPack.id,
          conversion_qty: 10,
          is_base: false,
          can_purchase: false,
          is_default_purchase: false,
          is_default_sale: false,
          harga_beli_default: 0,
          harga_jual: 2_500,
        }),
      ],
    }),
  )
  return { productId: result.id }
}
