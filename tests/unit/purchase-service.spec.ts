import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import type { ProductCategory, Supplier, Unit } from '@/db/schema'
import { saveProduct, saveCategory, saveUnit } from '@/master/repository'
import type { ProductDraft, ProductUnitDraft } from '@/master/types'
import { cancelPurchase, getPurchaseDetail, savePurchase } from '@/purchases/repository'
import type { PurchaseDraft } from '@/purchases/types'
import { saveSupplier } from '@/master/repository'

let category: ProductCategory
let supplier: Supplier
let unitPcs: Unit
let unitPack: Unit
let unitDus: Unit
let productId: string

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))

  category = await saveCategory({
    kode: 'FRZ',
    nama: 'Frozen Food',
    deskripsi: 'Produk beku.',
    status: 'active',
  })
  supplier = await saveSupplier({
    kode: '',
    nama: 'CV Beku Nusantara',
    telepon: '0812',
    alamat: 'Jl. Distribusi',
    catatan: '',
    status: 'active',
  })
  unitPcs = await saveUnit({ nama: 'Pcs', simbol: 'pcs', status: 'active' })
  unitPack = await saveUnit({ nama: 'Pack', simbol: 'pack', status: 'active' })
  unitDus = await saveUnit({ nama: 'Dus', simbol: 'dus', status: 'active' })

  const result = await saveProduct(productDraft())
  productId = result.id
})

function unitRow(overrides: Partial<ProductUnitDraft>): ProductUnitDraft {
  return {
    unit_id: unitPcs.id,
    conversion_qty: 1,
    is_base: true,
    can_purchase: false,
    can_sell: true,
    is_default_purchase: false,
    is_default_sale: true,
    harga_beli_default: 0,
    harga_jual: 2500,
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
    min_stock_base: 20,
    status: 'active',
    units: [
      unitRow({}),
      unitRow({
        unit_id: unitPack.id,
        conversion_qty: 10,
        is_base: false,
        can_purchase: true,
        is_default_purchase: true,
        can_sell: true,
        is_default_sale: false,
        harga_beli_default: 20_000,
        harga_jual: 24_000,
      }),
      unitRow({
        unit_id: unitDus.id,
        conversion_qty: 100,
        is_base: false,
        can_purchase: true,
        is_default_purchase: false,
        can_sell: false,
        is_default_sale: false,
        harga_beli_default: 150_000,
        harga_jual: 0,
      }),
    ],
    opening_stock_base: 0,
    opening_expiry_date: '',
    opening_lot_code: '',
    ...overrides,
  }
}

function purchaseDraft(overrides: Partial<PurchaseDraft> = {}): PurchaseDraft {
  return {
    nomor_nota: '',
    tanggal: '2026-10-25',
    supplier_id: supplier.id,
    metode_pembayaran: 'tunai',
    diskon: 0,
    biaya_angkut: 0,
    bayar: 1_000_000,
    keterangan: 'Pembelian uji.',
    items: [
      {
        product_id: productId,
        unit_id: unitDus.id,
        qty_unit: 2,
        harga_beli_unit: 150_000,
        diskon: 0,
        expiry_date: '2026-12-12',
        lot_code: '',
      },
    ],
    ...overrides,
  }
}

describe('purchase repository', () => {
  it('saves a draft without changing stock, lots, or movements', async () => {
    const result = await savePurchase(purchaseDraft())
    const detail = await getPurchaseDetail(result.id)

    expect(result.status).toBe('draft')
    expect(detail?.purchase.total).toBe(300_000)
    expect(detail?.items).toHaveLength(1)
    expect(detail?.items[0]).toMatchObject({
      qty_base: 200,
      subtotal: 300_000,
      expiry_date: '2026-12-12',
      lot_id: null,
    })

    const product = await db.products.get(productId)
    expect(product?.stock_base).toBe(0)
    expect(await db.stock_lots.count()).toBe(0)
    expect(await db.stock_movements.count()).toBe(0)
  })

  it('completes a purchase with lot, expiry, HPP, and stock movement', async () => {
    const result = await savePurchase(
      purchaseDraft({ diskon: 10_000, biaya_angkut: 5_000, bayar: 295_000 }),
      { complete: true },
    )
    const detail = await getPurchaseDetail(result.id)

    expect(result.status).toBe('completed')
    expect(detail?.purchase.total).toBe(295_000)
    expect(detail?.items[0]?.unit_cost_base).toBe(1475)
    expect(detail?.items[0]?.lot_code).toBe(`LOT-${result.nomor_nota}-1`)
    expect(detail?.lots).toHaveLength(1)

    const lot = detail?.lots[0]
    expect(lot).toMatchObject({
      lot_code: `LOT-${result.nomor_nota}-1`,
      expiry_date: '2026-12-12',
      qty_received_base: 200,
      qty_remaining_base: 200,
      unit_cost_base: 1475,
      source: 'purchase',
      status: 'active',
    })

    const product = await db.products.get(productId)
    expect(product?.stock_base).toBe(200)

    const movements = await db.stock_movements.toArray()
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      tipe: 'purchase_in',
      qty_base: 200,
      unit_cost_base: 1475,
      stock_before_base: 0,
      stock_after_base: 200,
      ref_type: 'purchase',
      ref_id: result.id,
    })
  })

  it('cancels an intact purchase and restores stock', async () => {
    const result = await savePurchase(purchaseDraft(), { complete: true })
    const lot = await db.stock_lots.where('product_id').equals(productId).first()

    await cancelPurchase(result.id)

    const purchase = await db.purchases.get(result.id)
    expect(purchase?.status).toBe('cancelled')

    const product = await db.products.get(productId)
    expect(product?.stock_base).toBe(0)

    const cancelledLot = lot ? await db.stock_lots.get(lot.id) : undefined
    expect(cancelledLot).toMatchObject({
      qty_remaining_base: 0,
      status: 'depleted',
    })

    const movements = await db.stock_movements.where('product_id').equals(productId).toArray()
    expect(movements.map((row) => row.tipe)).toEqual(['purchase_in', 'purchase_cancel'])
    expect(movements[1]).toMatchObject({
      stock_before_base: 200,
      stock_after_base: 0,
      qty_base: 200,
    })
  })

  it('rejects cancellation when a lot has been consumed', async () => {
    const result = await savePurchase(purchaseDraft(), { complete: true })
    const lot = await db.stock_lots.where('product_id').equals(productId).first()
    expect(lot).toBeDefined()

    await db.sale_lot_consumptions.add({
      id: 'consumption-1',
      sale_id: 'sale-1',
      sale_item_id: 'sale-item-1',
      lot_id: lot!.id,
      qty_base: 10,
      unit_cost_base: lot!.unit_cost_base,
      total_cost: 10 * lot!.unit_cost_base,
      created_at: new Date().toISOString(),
    })

    await expect(cancelPurchase(result.id)).rejects.toThrow(
      'Pembelian tidak dapat dibatalkan karena sebagian lot sudah terpakai.',
    )

    const purchase = await db.purchases.get(result.id)
    const product = await db.products.get(productId)
    expect(purchase?.status).toBe('completed')
    expect(product?.stock_base).toBe(200)
  })

  it('rejects tracked expiry without a date and fractional base qty', async () => {
    const missingExpiry = purchaseDraft()
    missingExpiry.items[0]!.expiry_date = ''

    await expect(savePurchase(missingExpiry, { complete: true })).rejects.toThrow(
      'Expiry wajib diisi',
    )
    expect((await db.products.get(productId))?.stock_base).toBe(0)

    const fractional = purchaseDraft()
    fractional.items[0] = {
      ...fractional.items[0]!,
      unit_id: unitPack.id,
      qty_unit: 0.25,
      harga_beli_unit: 20_000,
    }

    await expect(savePurchase(fractional, { complete: true })).rejects.toThrow(
      'qty base harus bilangan bulat',
    )
    expect(await db.stock_lots.count()).toBe(0)
  })

  it('rejects duplicate lot codes for the same product', async () => {
    const first = await savePurchase(purchaseDraft(), { complete: true })
    const firstDetail = await getPurchaseDetail(first.id)
    const lotCode = firstDetail?.items[0]?.lot_code ?? 'LOT-X'

    const second = purchaseDraft()
    second.items[0]!.lot_code = lotCode

    await expect(savePurchase(second, { complete: true })).rejects.toThrow(
      `Lot code ${lotCode} sudah dipakai`,
    )
  })

  it('does not write a partial purchase when a batch item is invalid', async () => {
    const draft = purchaseDraft()
    draft.items.push({
      ...draft.items[0]!,
      lot_code: 'LOT-DUPLIKAT',
    })
    draft.items[0]!.lot_code = 'LOT-DUPLIKAT'

    await expect(savePurchase(draft, { complete: true })).rejects.toThrow(
      'Lot code LOT-DUPLIKAT sudah dipakai',
    )

    expect(await db.purchases.count()).toBe(0)
    expect(await db.purchase_items.count()).toBe(0)
    expect(await db.stock_lots.count()).toBe(0)
    expect(await db.stock_movements.count()).toBe(0)
    expect((await db.products.get(productId))?.stock_base).toBe(0)
  })
})
