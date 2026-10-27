import * as XLSX from '@e965/xlsx'
import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import type { ExpenseCategory, Product, ProductUnit, StockLot, Unit } from '@/db/schema'
import { createReportWorkbook } from '@/features/reports/export'
import { getReportRange, getReportsData, type ReportKind } from '@/features/reports/repository'
import { todayJakarta } from '@/utils/date'

const createdAt = '2026-10-26T12:00:00.000Z'
const unit: Unit = {
  id: 'report-unit',
  nama: 'Pcs',
  simbol: 'pcs',
  status: 'active',
  created_at: createdAt,
  updated_at: createdAt,
  deleted_at: null,
}
const product: Product = {
  id: 'report-product',
  kode: 'RPT-001',
  nama: 'Siomay Ayam',
  kategori_id: 'report-category',
  base_unit_id: unit.id,
  track_expiry: true,
  expiry_alert_days: 30,
  min_stock_base: 15,
  stock_base: 10,
  status: 'active',
  created_at: createdAt,
  updated_at: createdAt,
  deleted_at: null,
}
const productUnit: ProductUnit = {
  id: 'report-product-unit',
  product_id: product.id,
  unit_id: unit.id,
  conversion_qty: 1,
  is_base: true,
  can_purchase: true,
  can_sell: true,
  is_default_purchase: true,
  is_default_sale: true,
  harga_beli_default: 100,
  harga_jual: 200,
  barcode: null,
  status: 'active',
  created_at: createdAt,
  updated_at: createdAt,
}
const expenseCategory: ExpenseCategory = {
  id: 'report-expense-category',
  kode: 'OPS',
  nama: 'Operasional',
  deskripsi: '',
  status: 'active',
  created_at: createdAt,
  updated_at: createdAt,
  deleted_at: null,
}

function daysFromToday(days: number): string {
  const date = new Date(`${todayJakarta()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function createLot(expiryDate: string): StockLot {
  return {
    id: 'report-lot',
    product_id: product.id,
    purchase_id: 'report-purchase',
    purchase_item_id: 'report-purchase-item',
    lot_code: 'RPT-LOT',
    received_at: '2026-10-01',
    expiry_date: expiryDate,
    qty_received_base: 10,
    qty_remaining_base: 10,
    unit_cost_base: 100,
    source: 'purchase',
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
  }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.units.add(unit)
  await db.products.add(product)
  await db.product_units.add(productUnit)
  await db.expense_categories.add(expenseCategory)
  await db.stock_lots.add(createLot(daysFromToday(10)))
  await db.settings.put({ key: 'cutover_date', value: '2026-10-15', updated_at: createdAt })
  await db.sales.bulkAdd([
    {
      id: 'report-sale',
      nomor_nota: 'PJ-20261010-0001',
      tanggal: '2026-10-10',
      customer_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 1050,
      diskon: 100,
      total: 950,
      bayar: 950,
      hpp_total: 999,
      gross_profit: 1,
      status: 'completed',
      keterangan: '',
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    {
      id: 'report-sale-draft',
      nomor_nota: 'PJ-20261011-0001',
      tanggal: '2026-10-11',
      customer_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 5000,
      diskon: 0,
      total: 5000,
      bayar: 0,
      hpp_total: 0,
      gross_profit: 0,
      status: 'draft',
      keterangan: '',
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
  ])
  await db.sale_items.bulkAdd([
    {
      id: 'report-sale-item',
      sale_id: 'report-sale',
      product_id: product.id,
      unit_id: unit.id,
      qty_unit: 1,
      conversion_qty: 1,
      qty_base: 1,
      harga_jual_unit: 1100,
      diskon: 50,
      subtotal: 1050,
      hpp_total: 300,
      gross_profit: 750,
      created_at: createdAt,
    },
    {
      id: 'report-sale-draft-item',
      sale_id: 'report-sale-draft',
      product_id: product.id,
      unit_id: unit.id,
      qty_unit: 1,
      conversion_qty: 1,
      qty_base: 1,
      harga_jual_unit: 5000,
      diskon: 0,
      subtotal: 5000,
      hpp_total: 0,
      gross_profit: 0,
      created_at: createdAt,
    },
  ])
  await db.purchases.bulkAdd([
    {
      id: 'report-purchase',
      nomor_nota: 'PB-20261010-0001',
      tanggal: '2026-10-10',
      supplier_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 990,
      diskon: 40,
      biaya_angkut: 50,
      total: 1000,
      bayar: 1000,
      status: 'completed',
      keterangan: '',
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    {
      id: 'report-purchase-cancelled',
      nomor_nota: 'PB-20261011-0001',
      tanggal: '2026-10-11',
      supplier_id: null,
      metode_pembayaran: 'tunai',
      subtotal: 9999,
      diskon: 0,
      biaya_angkut: 0,
      total: 9999,
      bayar: 9999,
      status: 'cancelled',
      keterangan: '',
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
  ])
  await db.purchase_items.add({
    id: 'report-purchase-item',
    purchase_id: 'report-purchase',
    product_id: product.id,
    unit_id: unit.id,
    qty_unit: 10,
    conversion_qty: 1,
    qty_base: 10,
    harga_beli_unit: 100,
    diskon: 10,
    subtotal: 990,
    expiry_date: daysFromToday(10),
    lot_code: 'RPT-LOT',
    unit_cost_base: 100,
    lot_id: 'report-lot',
    created_at: createdAt,
  })
  await db.expenses.add({
    id: 'report-expense',
    nomor_transaksi: 'BB-20261010-0001',
    tanggal: '2026-10-10',
    expense_category_id: expenseCategory.id,
    keterangan: 'Listrik',
    nominal: 200,
    metode_pembayaran: 'tunai',
    status: 'completed',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  })
  await db.stock_movements.add({
    id: 'report-movement',
    product_id: product.id,
    lot_id: 'report-lot',
    tanggal: '2026-10-10',
    tipe: 'purchase_in',
    qty_unit: 10,
    conversion_qty: 1,
    qty_base: 10,
    unit_cost_base: 100,
    stock_before_base: 0,
    stock_after_base: 10,
    ref_type: 'purchase',
    ref_id: 'report-purchase',
    keterangan: '',
    created_at: createdAt,
  })
  await db.stock_writeoffs.add({
    id: 'report-writeoff',
    nomor: 'WO-20261010-0001',
    tanggal: '2026-10-10',
    alasan: 'damaged',
    keterangan: '',
    total_cost: 100,
    status: 'completed',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  })
  await db.stock_writeoff_items.add({
    id: 'report-writeoff-item',
    writeoff_id: 'report-writeoff',
    product_id: product.id,
    lot_id: 'report-lot',
    qty_base: 1,
    unit_cost_base: 100,
    total_cost: 100,
    expiry_date: daysFromToday(10),
    keterangan: '',
    created_at: createdAt,
  })
  await db.stock_opnames.add({
    id: 'report-opname',
    nomor: 'OP-20261010-0001',
    tanggal: '2026-10-10',
    status: 'completed',
    keterangan: '',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  })
  await db.stock_opname_items.add({
    id: 'report-opname-item',
    opname_id: 'report-opname',
    product_id: product.id,
    unit_id: unit.id,
    qty_unit: 1,
    conversion_qty: 1,
    system_qty_base: 10,
    physical_qty_base: 9,
    diff_base: -1,
    diff_cost: -20,
    expiry_date: daysFromToday(10),
    created_at: createdAt,
  })
})

describe('report aggregation', () => {
  it('builds inclusive preset ranges using the Monday start of week', () => {
    expect(getReportRange('today', '2026-10-26')).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-26',
    })
    expect(getReportRange('week', '2026-10-28')).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-28',
    })
    expect(getReportRange('month', '2026-10-26').startDate).toBe('2026-10-01')
    expect(getReportRange('year', '2026-10-26').startDate).toBe('2026-01-01')
    expect(
      getReportRange('custom', '2026-10-26', {
        startDate: '2026-10-02',
        endDate: '2026-10-08',
      }),
    ).toEqual({ startDate: '2026-10-02', endDate: '2026-10-08' })
  })

  it('reconciles all six reports and excludes draft/cancelled transactions', async () => {
    const data = await getReportsData({ startDate: '2026-10-01', endDate: '2026-10-31' })
    expect(data.sales).toMatchObject({
      gross: 1100,
      discount: 150,
      revenue: 950,
      cogs: 300,
      grossProfit: 650,
      count: 1,
    })
    expect(data.sales.rows[0]).toMatchObject({ estimatedHpp: true })
    expect(data.purchases).toMatchObject({
      gross: 1000,
      discount: 50,
      freight: 50,
      net: 1000,
      count: 1,
    })
    expect(data.stock).toMatchObject({
      totalProducts: 1,
      totalBaseQuantity: 10,
      inventoryValue: 1000,
      lowStockCount: 1,
      outOfStockCount: 0,
      nearExpiryLotCount: 1,
      expiredLotCount: 0,
    })
    expect(data.stock.movements).toHaveLength(1)
    expect(data.expenses.total).toBe(200)
    expect(data.expenses.rows).toHaveLength(1)
    expect(data.expiry).toMatchObject({
      nearExpiryCount: 1,
      expiredCount: 0,
      quarantineCount: 0,
      riskValue: 1000,
    })
    expect(data.expiry.writeoffs).toHaveLength(1)
    expect(data.profitLoss).toMatchObject({
      revenue: 950,
      cogs: 300,
      grossProfit: 650,
      inventoryLoss: 80,
      operatingExpenses: 200,
      netProfit: 370,
    })
    expect(data.estimatedHpp).toBe(true)
  })

  it('returns empty transaction reports and rejects invalid dates', async () => {
    const data = await getReportsData({ startDate: '2026-11-01', endDate: '2026-11-30' })
    expect(data.sales.rows).toHaveLength(0)
    expect(data.purchases.rows).toHaveLength(0)
    expect(data.expenses.rows).toHaveLength(0)
    expect(data.profitLoss.netProfit).toBe(0)
    await expect(
      getReportsData({ startDate: '2026-11-30', endDate: '2026-11-01' }),
    ).rejects.toThrow('Tanggal awal tidak boleh melewati tanggal akhir.')
  })
})

describe('Excel report export', () => {
  it('creates valid workbooks with the relevant sheets and selected period for all report types', async () => {
    const data = await getReportsData({ startDate: '2026-10-01', endDate: '2026-10-31' })
    const sheetNames: Record<ReportKind, string[]> = {
      sales: ['Penjualan'],
      purchases: ['Pembelian'],
      stock: ['Ringkasan Stok', 'Mutasi', 'Lot'],
      expenses: ['Beban', 'Ringkasan Kategori'],
      expiry: ['Lot Expiry', 'Riwayat Write-off'],
      'profit-loss': ['Laba Rugi'],
    }
    for (const kind of Object.keys(sheetNames) as ReportKind[]) {
      const workbook = await createReportWorkbook(data, kind, {
        nama_usaha: 'Frozen Food Bu Rina',
      })
      const parsed = XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), {
        type: 'array',
      })
      expect(parsed.SheetNames).toEqual(sheetNames[kind])
      const values = XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]!], {
        header: 1,
      }) as unknown[][]
      expect(values[1]).toEqual(['Frozen Food Bu Rina'])
      expect(values[2]).toEqual(['Periode', '1 Okt 2026', 'sampai', '31 Okt 2026'])
      expect(
        values.some(
          (row) =>
            row.includes('Tanggal') || row.includes('Komponen') || row.includes('Kode produk'),
        ),
        kind,
      ).toBe(true)
    }
  })
})
