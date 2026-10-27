import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import { getDashboardData, getDashboardPeriodRange } from '@/features/dashboard/repository'
import type { Product, ProductUnit, StockLot, Unit } from '@/db/schema'

const now = '2026-10-26T09:00:00.000Z'
const unit: Unit = {
  id: 'unit-pcs',
  nama: 'Pcs',
  simbol: 'pcs',
  status: 'active',
  created_at: now,
  updated_at: now,
  deleted_at: null,
}
const product: Product = {
  id: 'product-dashboard',
  kode: 'DASH-001',
  nama: 'Siomay Ayam',
  kategori_id: 'category',
  base_unit_id: unit.id,
  track_expiry: true,
  expiry_alert_days: 30,
  min_stock_base: 20,
  stock_base: 15,
  status: 'active',
  created_at: now,
  updated_at: now,
  deleted_at: null,
}
const productUnit: ProductUnit = {
  id: 'product-unit',
  product_id: product.id,
  unit_id: unit.id,
  conversion_qty: 1,
  is_base: true,
  can_purchase: false,
  can_sell: true,
  is_default_purchase: false,
  is_default_sale: true,
  harga_beli_default: 100,
  harga_jual: 200,
  barcode: null,
  status: 'active',
  created_at: now,
  updated_at: now,
}

function lot(overrides: Partial<StockLot> = {}): StockLot {
  return {
    id: 'lot-expired',
    product_id: product.id,
    purchase_id: null,
    purchase_item_id: null,
    lot_code: 'DASH-LOT',
    received_at: '2026-08-01',
    expiry_date: '2026-10-01',
    qty_received_base: 5,
    qty_remaining_base: 5,
    unit_cost_base: 100,
    source: 'purchase',
    status: 'active',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.units.add(unit)
  await db.products.add(product)
  await db.product_units.add(productUnit)
  await db.stock_lots.bulkAdd([
    lot(),
    lot({
      id: 'lot-near',
      lot_code: 'DASH-NEAR',
      expiry_date: '2026-11-05',
      qty_received_base: 10,
      qty_remaining_base: 10,
      unit_cost_base: 200,
    }),
  ])
})

describe('dashboard summaries', () => {
  it('calculates date presets in local ISO calendar dates', () => {
    expect(getDashboardPeriodRange('today', '2026-10-26')).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-26',
    })
    expect(getDashboardPeriodRange('week', '2026-10-26')).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-26',
    })
    expect(getDashboardPeriodRange('week', '2026-10-28')).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-28',
    })
    expect(getDashboardPeriodRange('month', '2026-10-26').startDate).toBe('2026-10-01')
    expect(getDashboardPeriodRange('year', '2026-10-26').startDate).toBe('2026-01-01')
  })

  it('returns period KPIs, six-month series, stock alerts, and completed recent activities', async () => {
    await db.sales.bulkAdd([
      {
        id: 'sale-oct',
        nomor_nota: 'PJ-20261010-0001',
        tanggal: '2026-10-10',
        customer_id: null,
        metode_pembayaran: 'tunai',
        subtotal: 3000,
        diskon: 0,
        total: 3000,
        bayar: 3000,
        hpp_total: 1000,
        gross_profit: 2000,
        status: 'completed',
        keterangan: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'sale-september',
        nomor_nota: 'PJ-20260910-0001',
        tanggal: '2026-09-10',
        customer_id: null,
        metode_pembayaran: 'tunai',
        subtotal: 5000,
        diskon: 0,
        total: 5000,
        bayar: 5000,
        hpp_total: 2000,
        gross_profit: 3000,
        status: 'completed',
        keterangan: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'sale-draft',
        nomor_nota: 'PJ-20261011-0001',
        tanggal: '2026-10-11',
        customer_id: null,
        metode_pembayaran: 'tunai',
        subtotal: 9000,
        diskon: 0,
        total: 9000,
        bayar: 9000,
        hpp_total: 7000,
        gross_profit: 2000,
        status: 'draft',
        keterangan: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ])
    await db.sale_items.bulkAdd([
      {
        id: 'sale-item-oct',
        sale_id: 'sale-oct',
        product_id: product.id,
        unit_id: unit.id,
        qty_unit: 1,
        conversion_qty: 1,
        qty_base: 1,
        harga_jual_unit: 3000,
        diskon: 0,
        subtotal: 3000,
        hpp_total: 1000,
        gross_profit: 2000,
        created_at: now,
      },
      {
        id: 'sale-item-september',
        sale_id: 'sale-september',
        product_id: product.id,
        unit_id: unit.id,
        qty_unit: 1,
        conversion_qty: 1,
        qty_base: 1,
        harga_jual_unit: 5000,
        diskon: 0,
        subtotal: 5000,
        hpp_total: 2000,
        gross_profit: 3000,
        created_at: now,
      },
    ])
    await db.expenses.add({
      id: 'expense-oct',
      nomor_transaksi: 'BB-20261010-0001',
      tanggal: '2026-10-10',
      expense_category_id: 'expense-category',
      keterangan: 'Listrik',
      nominal: 500,
      metode_pembayaran: 'tunai',
      status: 'completed',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    await db.purchases.add({
      id: 'purchase-latest',
      nomor_nota: 'PB-20261010-0001',
      tanggal: '2026-10-11',
      supplier_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 1000,
      diskon: 0,
      biaya_angkut: 0,
      total: 1000,
      bayar: 1000,
      status: 'completed',
      keterangan: '',
      created_at: '2026-10-26T10:00:00.000Z',
      updated_at: now,
      deleted_at: null,
    })

    const data = await getDashboardData(
      { startDate: '2026-10-01', endDate: '2026-10-31' },
      '2026-10-26',
    )
    expect(data.profitLoss).toMatchObject({
      revenue: 3000,
      cogs: 1000,
      grossProfit: 2000,
      operatingExpenses: 500,
      netProfit: 1500,
    })
    expect(data.months).toHaveLength(6)
    expect(data.months.map((month) => month.key)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(data.months[4]).toMatchObject({ revenue: 5000, cogs: 2000 })
    expect(data.months[5]).toMatchObject({ revenue: 3000, cogs: 1000 })
    expect(data.lowStockCount).toBe(1)
    expect(data.outOfStockCount).toBe(0)
    expect(data.inventoryValue).toBe(2500)
    expect(data.expiredLotCount).toBe(1)
    expect(data.nearExpiryLotCount).toBe(1)
    expect(data.activities[0]?.id).toBe('purchase-latest')
    expect(data.activities.map((activity) => activity.id)).toContain('sale-draft')
    expect(data.hasTransactions).toBe(true)
  })

  it('does not include dates outside a custom activity period and always keeps six chart months', async () => {
    await db.sales.add({
      id: 'sale-old',
      nomor_nota: 'PJ-20260101-0001',
      tanggal: '2026-01-01',
      customer_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 100,
      diskon: 0,
      total: 100,
      bayar: 100,
      hpp_total: 50,
      gross_profit: 50,
      status: 'completed',
      keterangan: '',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    const data = await getDashboardData(
      { startDate: '2026-10-01', endDate: '2026-10-26' },
      '2026-10-26',
    )
    expect(data.activities).toHaveLength(0)
    expect(data.profitLoss.revenue).toBe(0)
    expect(data.months).toHaveLength(6)
    expect(data.hasTransactions).toBe(false)
  })
})
