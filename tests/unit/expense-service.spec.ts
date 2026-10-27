import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import type { ExpenseCategory, Product } from '@/db/schema'
import {
  cancelExpense,
  deleteExpenseDraft,
  getExpenseReport,
  getProfitLoss,
  saveExpense,
} from '@/expenses/repository'
import type { ExpenseDraft } from '@/expenses/types'

let electricity: ExpenseCategory
let rent: ExpenseCategory
let stockProduct: Product

function expenseDraft(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return {
    nomor_transaksi: '',
    tanggal: '2026-10-26',
    expense_category_id: electricity.id,
    keterangan: 'Tagihan listrik freezer',
    nominal: 800_000,
    metode_pembayaran: 'transfer',
    ...overrides,
  }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  const now = '2026-10-26T00:00:00.000Z'
  electricity = {
    id: 'category-electric',
    kode: 'ELK',
    nama: 'Listrik & Air',
    deskripsi: '',
    status: 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  rent = {
    ...electricity,
    id: 'category-rent',
    kode: 'SEWA',
    nama: 'Sewa Tempat',
  }
  stockProduct = {
    id: 'product-stock',
    kode: 'STK-001',
    nama: 'Produk uji',
    kategori_id: 'category',
    base_unit_id: 'unit',
    track_expiry: false,
    expiry_alert_days: null,
    min_stock_base: 0,
    stock_base: 50,
    status: 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await db.expense_categories.bulkAdd([electricity, rent])
  await db.products.add(stockProduct)
})

describe('expense repository and reports', () => {
  it('saves draft and completed expenses without changing stock', async () => {
    const draft = await saveExpense(expenseDraft(), { complete: false })
    expect(draft.status).toBe('draft')

    const completed = await saveExpense(
      expenseDraft({
        expense_category_id: rent.id,
        keterangan: 'Sewa bulan Oktober',
        nominal: 500_000,
      }),
      { complete: true },
    )

    expect(completed.status).toBe('completed')
    expect(await db.products.get(stockProduct.id)).toMatchObject({ stock_base: 50 })
    expect(await db.stock_lots.count()).toBe(0)
    expect(await db.stock_movements.count()).toBe(0)
    expect(await db.expenses.count()).toBe(2)
  })

  it('includes completed expenses by category and excludes drafts and cancellations', async () => {
    const electricityExpense = await saveExpense(expenseDraft(), { complete: true })
    await saveExpense(
      expenseDraft({
        expense_category_id: rent.id,
        keterangan: 'Sewa tempat',
        nominal: 500_000,
      }),
      { complete: true },
    )
    await saveExpense(
      expenseDraft({
        keterangan: 'Beban draft',
        nominal: 25_000,
        tanggal: '2026-10-27',
      }),
    )
    await cancelExpense(electricityExpense.id)

    const report = await getExpenseReport('2026-10-01', '2026-10-31')
    expect(report).toMatchObject({ total: 500_000, count: 1 })
    expect(report.items).toEqual([
      { categoryId: rent.id, categoryName: 'Sewa Tempat', total: 500_000, count: 1 },
    ])
    expect(await getExpenseReport('2026-10-27', '2026-10-27')).toMatchObject({
      total: 0,
      count: 0,
    })
  })

  it('builds P&L from completed sales and expenses only, without changing sale COGS', async () => {
    const now = '2026-10-26T00:00:00.000Z'
    await db.sales.bulkAdd([
      {
        id: 'sale-completed',
        nomor_nota: 'PJ-20261026-0001',
        tanggal: '2026-10-26',
        customer_id: null,
        metode_pembayaran: 'tunai',
        subtotal: 1_000_000,
        diskon: 0,
        total: 1_000_000,
        bayar: 1_000_000,
        hpp_total: 650_000,
        gross_profit: 350_000,
        status: 'completed',
        keterangan: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'sale-cancelled',
        nomor_nota: 'PJ-20261026-0002',
        tanggal: '2026-10-26',
        customer_id: null,
        metode_pembayaran: 'tunai',
        subtotal: 2_000_000,
        diskon: 0,
        total: 2_000_000,
        bayar: 2_000_000,
        hpp_total: 1_000_000,
        gross_profit: 1_000_000,
        status: 'cancelled',
        keterangan: '',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ])
    await db.sale_items.add({
      id: 'sale-item-completed',
      sale_id: 'sale-completed',
      product_id: 'product',
      unit_id: 'unit',
      qty_unit: 1,
      conversion_qty: 1,
      qty_base: 1,
      harga_jual_unit: 1_000_000,
      diskon: 0,
      subtotal: 1_000_000,
      hpp_total: 650_000,
      gross_profit: 350_000,
      created_at: now,
    })
    await db.sale_items.add({
      id: 'sale-item-cancelled',
      sale_id: 'sale-cancelled',
      product_id: 'product',
      unit_id: 'unit',
      qty_unit: 1,
      conversion_qty: 1,
      qty_base: 1,
      harga_jual_unit: 2_000_000,
      diskon: 0,
      subtotal: 2_000_000,
      hpp_total: 1_000_000,
      gross_profit: 1_000_000,
      created_at: now,
    })
    await saveExpense(expenseDraft(), { complete: true })

    const result = await getProfitLoss('2026-10-26', '2026-10-26')
    expect(result).toMatchObject({
      revenue: 1_000_000,
      cogs: 650_000,
      grossProfit: 350_000,
      inventoryLoss: 0,
      operatingExpenses: 800_000,
      netProfit: -450_000,
      completedSaleCount: 1,
      completedExpenseCount: 1,
    })
    expect((await db.sales.get('sale-completed'))?.hpp_total).toBe(650_000)

    await cancelExpense(
      (await db.expenses.where('expense_category_id').equals(electricity.id).first())!.id,
    )
    expect(await getProfitLoss('2026-10-26', '2026-10-26')).toMatchObject({
      cogs: 650_000,
      operatingExpenses: 0,
      netProfit: 350_000,
    })
    await expect(deleteExpenseDraft('unknown')).rejects.toThrow('Beban tidak ditemukan.')
  })

  it('rejects inactive categories and protects completed expense lifecycle', async () => {
    await db.expense_categories.update(electricity.id, { status: 'inactive' })
    await expect(saveExpense(expenseDraft(), { complete: true })).rejects.toThrow(
      'Kategori beban tidak aktif.',
    )

    await db.expense_categories.update(electricity.id, { status: 'active' })
    const result = await saveExpense(expenseDraft(), { complete: true })
    await expect(saveExpense(expenseDraft(), { id: result.id })).rejects.toThrow(
      'Beban selesai atau batal tidak dapat diedit.',
    )
    await expect(cancelExpense(result.id)).resolves.toBeUndefined()
    await expect(cancelExpense(result.id)).rejects.toThrow(
      'Hanya beban selesai yang dapat dibatalkan.',
    )
  })
})
