import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import type { ProductCategory, Unit } from '@/db/schema'
import {
  generateProductCode,
  getProductActivity,
  removeCategory,
  removeProduct,
  removeUnit,
  saveCategory,
  saveProduct,
  saveUnit,
} from '@/master/repository'
import type { ProductDraft, ProductUnitDraft } from '@/master/types'

let category: ProductCategory
let unitPcs: Unit
let unitPack: Unit
let unitDus: Unit
let unitGram: Unit
let unitKg: Unit

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))

  category = await saveCategory({
    kode: 'FRZ',
    nama: 'Frozen Food',
    deskripsi: 'Produk beku.',
    status: 'active',
  })
  unitPcs = await saveUnit({ nama: 'Pcs', simbol: 'pcs', status: 'active' })
  unitPack = await saveUnit({ nama: 'Pack', simbol: 'pack', status: 'active' })
  unitDus = await saveUnit({ nama: 'Dus', simbol: 'dus', status: 'active' })
  unitGram = await saveUnit({ nama: 'Gram', simbol: 'g', status: 'active' })
  unitKg = await saveUnit({ nama: 'Kilogram', simbol: 'kg', status: 'active' })
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
        harga_beli_default: 20000,
        harga_jual: 24000,
      }),
      unitRow({
        unit_id: unitDus.id,
        conversion_qty: 100,
        is_base: false,
        can_purchase: true,
        is_default_purchase: false,
        can_sell: false,
        is_default_sale: false,
        harga_beli_default: 150000,
        harga_jual: 0,
      }),
    ],
    opening_stock_base: 0,
    opening_expiry_date: '',
    opening_lot_code: '',
    ...overrides,
  }
}

describe('master data repository', () => {
  it('creates a product with auto code and opening lot', async () => {
    const result = await saveProduct(
      productDraft({
        opening_stock_base: 25,
        opening_expiry_date: '2026-12-31',
      }),
    )

    const product = await db.products.get(result.id)
    expect(product?.kode).toBe('FRZ-001')
    expect(product?.stock_base).toBe(25)
    expect(product?.track_expiry).toBe(true)
    expect(product?.expiry_alert_days).toBe(30)

    const units = await db.product_units.where('product_id').equals(result.id).toArray()
    expect(units).toHaveLength(3)
    expect(units.find((row) => row.unit_id === unitDus.id)?.conversion_qty).toBe(100)
    expect(units.filter((row) => row.is_base)).toHaveLength(1)

    const lots = await db.stock_lots.where('product_id').equals(result.id).toArray()
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({
      source: 'opening',
      qty_received_base: 25,
      qty_remaining_base: 25,
      expiry_date: '2026-12-31',
      status: 'active',
    })

    const movements = await db.stock_movements.where('product_id').equals(result.id).toArray()
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      tipe: 'opening',
      qty_base: 25,
      stock_before_base: 0,
      stock_after_base: 25,
    })
  })

  it('creates Ayam Fillet with gram base, kg 1000, and pack 500', async () => {
    const result = await saveProduct(
      productDraft({
        nama: 'Ayam Fillet',
        base_unit_id: unitGram.id,
        units: [
          unitRow({
            unit_id: unitGram.id,
            conversion_qty: 1,
            is_base: true,
            can_sell: true,
            is_default_sale: true,
            harga_jual: 50,
          }),
          unitRow({
            unit_id: unitKg.id,
            conversion_qty: 1000,
            is_base: false,
            can_purchase: true,
            is_default_purchase: true,
            can_sell: true,
            is_default_sale: false,
            harga_beli_default: 45000,
            harga_jual: 0,
          }),
          unitRow({
            unit_id: unitPack.id,
            conversion_qty: 500,
            is_base: false,
            can_purchase: false,
            can_sell: true,
            is_default_purchase: false,
            is_default_sale: false,
            harga_beli_default: 0,
            harga_jual: 30000,
          }),
        ],
        opening_stock_base: 1500,
        opening_expiry_date: '2026-11-30',
      }),
    )

    const product = await db.products.get(result.id)
    expect(product?.kode).toBe('FRZ-001')
    expect(product?.stock_base).toBe(1500)
    expect(product?.expiry_alert_days).toBe(30)

    const units = await db.product_units.where('product_id').equals(result.id).toArray()
    expect(units.find((row) => row.unit_id === unitKg.id)).toMatchObject({
      conversion_qty: 1000,
      is_default_purchase: true,
    })
    expect(units.find((row) => row.unit_id === unitPack.id)).toMatchObject({
      conversion_qty: 500,
      is_default_sale: false,
    })

    const lot = await db.stock_lots.where('product_id').equals(result.id).first()
    expect(lot).toMatchObject({
      source: 'opening',
      qty_received_base: 1500,
      expiry_date: '2026-11-30',
    })
  })

  it('rejects fractional opening stock in base units', async () => {
    await expect(
      saveProduct(
        productDraft({
          opening_stock_base: 1.5,
          opening_expiry_date: '2026-12-31',
        }),
      ),
    ).rejects.toThrow('Stok awal harus bilangan bulat')
  })

  it('generates product codes from the category sequence', async () => {
    await saveProduct(productDraft({ nama: 'Siomay' }))
    expect(await generateProductCode(category.id)).toBe('FRZ-002')

    await saveProduct(productDraft({ nama: 'Nugget' }))
    expect(await generateProductCode(category.id)).toBe('FRZ-003')
  })

  it('rejects expiry-tracked opening stock without an expiry', async () => {
    await expect(
      saveProduct(productDraft({ opening_stock_base: 10, opening_expiry_date: '' })),
    ).rejects.toThrow('Expiry wajib diisi')
  })

  it('rejects zero or fractional conversions', async () => {
    const zero = productDraft()
    zero.units[1]!.conversion_qty = 0
    await expect(saveProduct(zero)).rejects.toThrow('minimal 1')

    const fractional = productDraft()
    fractional.units[1]!.conversion_qty = 10.5
    await expect(saveProduct(fractional)).rejects.toThrow('bilangan bulat')
  })

  it('rejects duplicate barcodes across products', async () => {
    const first = productDraft()
    first.units[0]!.barcode = '8991234567890'
    await saveProduct(first)

    const second = productDraft({
      nama: 'Nugget Ayam',
      units: [unitRow({ barcode: '8991234567890' })],
    })

    await expect(saveProduct(second)).rejects.toThrow('sudah dipakai produk lain')
  })

  it('locks base unit and conversions after opening stock or activity', async () => {
    const result = await saveProduct(
      productDraft({ opening_stock_base: 10, opening_expiry_date: '2026-12-31' }),
    )

    const activity = await getProductActivity(result.id)
    expect(activity.hasActivity).toBe(true)
    expect(activity.lots).toBe(1)
    expect(activity.movements).toBe(1)

    const changedBase = productDraft({
      base_unit_id: unitGram.id,
      units: [
        unitRow({
          unit_id: unitGram.id,
          conversion_qty: 1,
          is_base: true,
          can_sell: false,
          is_default_sale: false,
        }),
        unitRow({
          unit_id: unitKg.id,
          conversion_qty: 1000,
          is_base: false,
          can_purchase: true,
          is_default_purchase: true,
          can_sell: false,
          is_default_sale: false,
        }),
      ],
    })
    await expect(saveProduct(changedBase, result.id)).rejects.toThrow(
      'Base unit tidak dapat diubah',
    )

    const changedConversion = productDraft({
      units: [
        unitRow({}),
        unitRow({
          unit_id: unitPack.id,
          conversion_qty: 12,
          is_base: false,
          can_purchase: true,
          is_default_purchase: true,
          can_sell: true,
          is_default_sale: false,
          harga_beli_default: 20000,
          harga_jual: 24000,
        }),
        unitRow({
          unit_id: unitDus.id,
          conversion_qty: 100,
          is_base: false,
          can_purchase: false,
          can_sell: false,
          is_default_sale: false,
        }),
      ],
    })
    await expect(saveProduct(changedConversion, result.id)).rejects.toThrow('tidak dapat diubah')
  })

  it('deactivates used master data instead of deleting history', async () => {
    const result = await saveProduct(
      productDraft({ opening_stock_base: 5, opening_expiry_date: '2026-12-31' }),
    )

    expect(await removeCategory(category.id)).toBe('inactive')
    expect((await db.product_categories.get(category.id))?.status).toBe('inactive')

    expect(await removeUnit(unitPack.id)).toBe('inactive')
    expect((await db.units.get(unitPack.id))?.status).toBe('inactive')

    expect(await removeProduct(result.id)).toBe('inactive')
    expect((await db.products.get(result.id))?.status).toBe('inactive')
    expect(await db.stock_lots.where('product_id').equals(result.id).count()).toBe(1)
  })

  it('hard deletes unused products and their unit rows', async () => {
    const result = await saveProduct(productDraft({ nama: 'Produk Tanpa Stok' }))
    expect(await removeProduct(result.id)).toBe('deleted')
    expect(await db.products.get(result.id)).toBeUndefined()
    expect(await db.product_units.where('product_id').equals(result.id).count()).toBe(0)
  })

  it('allows a tracked product with no opening stock to omit expiry', async () => {
    const result = await saveProduct(productDraft({ opening_stock_base: 0 }))
    expect((await db.products.get(result.id))?.stock_base).toBe(0)
    expect(await db.stock_lots.where('product_id').equals(result.id).count()).toBe(0)
  })
})
