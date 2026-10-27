import { db } from '@/db/dexie'
import type { StockMovement } from '@/db/schema'
import { getSetting } from '@/db/settings'
import { getExpenseReport, getProfitLoss } from '@/expenses/repository'
import type { ExpenseReport, ProfitLossSummary } from '@/expenses/types'
import { validateReportPeriod } from '@/expenses/validation'
import { getExpiryLots, getStockOverview } from '@/inventory/repository'
import type { StockLotRow, StockProductRow } from '@/inventory/types'
import { todayJakarta } from '@/utils/date'

export type ReportKind = 'sales' | 'purchases' | 'stock' | 'expenses' | 'expiry' | 'profit-loss'
export type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface ReportRange {
  startDate: string
  endDate: string
}

export interface SalesReportRow {
  id: string
  date: string
  number: string
  customer: string
  gross: number
  discount: number
  revenue: number
  cogs: number
  grossProfit: number
  estimatedHpp: boolean
}

export interface SalesReport {
  gross: number
  discount: number
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  count: number
  rows: SalesReportRow[]
}

export interface PurchaseReportRow {
  id: string
  date: string
  number: string
  supplier: string
  gross: number
  discount: number
  freight: number
  net: number
}

export interface PurchaseReport {
  gross: number
  discount: number
  freight: number
  net: number
  count: number
  rows: PurchaseReportRow[]
}

export interface StockMovementReportRow extends StockMovement {
  productName: string
  productCode: string
  baseUnitSymbol: string
}

export interface ExpiryWriteoffRow {
  id: string
  date: string
  number: string
  reason: string
  totalCost: number
}

export interface ExpiryReport {
  lots: StockLotRow[]
  expiredCount: number
  nearExpiryCount: number
  quarantineCount: number
  riskValue: number
  writeoffs: ExpiryWriteoffRow[]
}

export interface ReportsData {
  range: ReportRange
  sales: SalesReport
  purchases: PurchaseReport
  stock: {
    products: StockProductRow[]
    totalProducts: number
    totalBaseQuantity: number
    inventoryValue: number
    lowStockCount: number
    outOfStockCount: number
    expiredLotCount: number
    nearExpiryLotCount: number
    movements: StockMovementReportRow[]
  }
  expenses: ExpenseReport & {
    rows: Array<{
      id: string
      date: string
      number: string
      category: string
      description: string
      amount: number
    }>
  }
  expiry: ExpiryReport
  profitLoss: ProfitLossSummary
  estimatedHpp: boolean
  cutoverDate: string
}

const DAY_MS = 86_400_000

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getReportRange(
  period: ReportPeriod,
  today = todayJakarta(),
  customRange?: ReportRange,
): ReportRange {
  if (period === 'custom') {
    return {
      startDate: customRange?.startDate ?? today,
      endDate: customRange?.endDate ?? today,
    }
  }
  if (period === 'today') return { startDate: today, endDate: today }
  const current = new Date(`${today}T00:00:00Z`)
  if (period === 'week') {
    const weekday = current.getUTCDay() || 7
    return {
      startDate: dateString(new Date(current.getTime() - (weekday - 1) * DAY_MS)),
      endDate: today,
    }
  }
  if (period === 'month') return { startDate: `${today.slice(0, 7)}-01`, endDate: today }
  return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today }
}

function inRange(date: string, range: ReportRange): boolean {
  return date >= range.startDate && date <= range.endDate
}

function validateRange(range: ReportRange): void {
  const error = validateReportPeriod(range.startDate, range.endDate)
  if (error) throw new Error(error)
}

const writeoffReasonLabels: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Rusak',
  other: 'Lainnya',
}

export async function getReportsData(range: ReportRange): Promise<ReportsData> {
  validateRange(range)
  const [
    profitLoss,
    expenseReport,
    stockRows,
    expiryLots,
    sales,
    saleItems,
    customers,
    purchases,
    purchaseItems,
    suppliers,
    expenses,
    expenseCategories,
    movements,
    units,
    products,
    writeoffs,
    cutoverDate,
  ] = await Promise.all([
    getProfitLoss(range.startDate, range.endDate),
    getExpenseReport(range.startDate, range.endDate),
    getStockOverview(),
    getExpiryLots(),
    db.sales.toArray(),
    db.sale_items.toArray(),
    db.customers.toArray(),
    db.purchases.toArray(),
    db.purchase_items.toArray(),
    db.suppliers.toArray(),
    db.expenses.toArray(),
    db.expense_categories.toArray(),
    db.stock_movements.toArray(),
    db.units.toArray(),
    db.products.toArray(),
    db.stock_writeoffs.toArray(),
    getSetting('cutover_date'),
  ])

  const estimatedHpp = Boolean(cutoverDate && range.startDate < cutoverDate)
  const customerById = new Map(customers.map((customer) => [customer.id, customer.nama]))
  const saleItemsById = new Map<string, typeof saleItems>()
  for (const item of saleItems) {
    const items = saleItemsById.get(item.sale_id) ?? []
    items.push(item)
    saleItemsById.set(item.sale_id, items)
  }
  const salesRows = sales
    .filter((sale) => sale.status === 'completed' && inRange(sale.tanggal, range))
    .map((sale) => {
      const items = saleItemsById.get(sale.id) ?? []
      const itemDiscounts = items.reduce((sum, item) => sum + item.diskon, 0)
      const cogs = items.reduce((sum, item) => sum + item.hpp_total, 0)
      const discount = sale.diskon + itemDiscounts
      const gross = sale.total + discount
      return {
        id: sale.id,
        date: sale.tanggal,
        number: sale.nomor_nota,
        customer: customerById.get(sale.customer_id ?? '') ?? 'Pelanggan umum',
        gross,
        discount,
        revenue: sale.total,
        cogs,
        grossProfit: sale.total - cogs,
        estimatedHpp: Boolean(cutoverDate && sale.tanggal < cutoverDate),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
  const salesGross = salesRows.reduce((sum, row) => sum + row.gross, 0)
  const salesDiscount = salesRows.reduce((sum, row) => sum + row.discount, 0)
  const salesRevenue = salesRows.reduce((sum, row) => sum + row.revenue, 0)
  const salesCogs = salesRows.reduce((sum, row) => sum + row.cogs, 0)
  const salesGrossProfit = salesRevenue - salesCogs

  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier.nama]))
  const purchaseItemsById = new Map<string, typeof purchaseItems>()
  for (const item of purchaseItems) {
    const items = purchaseItemsById.get(item.purchase_id) ?? []
    items.push(item)
    purchaseItemsById.set(item.purchase_id, items)
  }
  const purchaseRows = purchases
    .filter((purchase) => purchase.status === 'completed' && inRange(purchase.tanggal, range))
    .map((purchase) => {
      const items = purchaseItemsById.get(purchase.id) ?? []
      const itemDiscounts = items.reduce((sum, item) => sum + item.diskon, 0)
      return {
        id: purchase.id,
        date: purchase.tanggal,
        number: purchase.nomor_nota,
        supplier: supplierById.get(purchase.supplier_id ?? '') ?? 'Supplier tidak tersedia',
        gross: purchase.subtotal + itemDiscounts,
        discount: purchase.diskon + itemDiscounts,
        freight: purchase.biaya_angkut,
        net: purchase.total,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
  const purchaseTotals = purchaseRows.reduce(
    (totals, row) => ({
      gross: totals.gross + row.gross,
      discount: totals.discount + row.discount,
      freight: totals.freight + row.freight,
      net: totals.net + row.net,
    }),
    { gross: 0, discount: 0, freight: 0, net: 0 },
  )

  const productById = new Map(products.map((product) => [product.id, product]))
  const unitById = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  const movementRows = movements
    .filter((movement) => inRange(movement.tanggal, range))
    .map((movement) => {
      const product = productById.get(movement.product_id)
      return {
        ...movement,
        productName: product?.nama ?? 'Produk tidak ditemukan',
        productCode: product?.kode ?? '',
        baseUnitSymbol: product ? (unitById.get(product.base_unit_id) ?? '') : '',
      }
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at))
  const expenseCategoryById = new Map(
    expenseCategories.map((category) => [category.id, category.nama]),
  )
  const expenseRows = expenses
    .filter((expense) => expense.status === 'completed' && inRange(expense.tanggal, range))
    .map((expense) => ({
      id: expense.id,
      date: expense.tanggal,
      number: expense.nomor_transaksi,
      category: expenseCategoryById.get(expense.expense_category_id) ?? 'Kategori tidak ditemukan',
      description: expense.keterangan,
      amount: expense.nominal,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))

  const expiredLots = expiryLots.filter(
    (lot) => lot.expiry_date && lot.daysToExpiry !== null && lot.daysToExpiry < 0,
  )
  const nearExpiryLots = expiryLots.filter(
    (lot) => lot.expiry_date && lot.daysToExpiry !== null && lot.daysToExpiry >= 0,
  )
  const quarantinedLots = expiryLots.filter(
    (lot) => lot.status === 'quarantined' || !lot.expiry_date,
  )
  const riskLots = [...expiredLots, ...nearExpiryLots, ...quarantinedLots].filter(
    (lot, index, all) => all.findIndex((entry) => entry.id === lot.id) === index,
  )
  const completedWriteoffs = writeoffs
    .filter((writeoff) => writeoff.status === 'completed' && inRange(writeoff.tanggal, range))
    .map((writeoff) => ({
      id: writeoff.id,
      date: writeoff.tanggal,
      number: writeoff.nomor,
      reason: writeoffReasonLabels[writeoff.alasan] ?? writeoff.alasan,
      totalCost: writeoff.total_cost,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))

  return {
    range,
    sales: {
      gross: salesGross,
      discount: salesDiscount,
      revenue: salesRevenue,
      cogs: salesCogs,
      grossProfit: salesGrossProfit,
      grossMargin: salesRevenue > 0 ? (salesGrossProfit / salesRevenue) * 100 : 0,
      count: salesRows.length,
      rows: salesRows,
    },
    purchases: {
      ...purchaseTotals,
      count: purchaseRows.length,
      rows: purchaseRows,
    },
    stock: {
      products: stockRows,
      totalProducts: stockRows.length,
      totalBaseQuantity: stockRows.reduce((sum, row) => sum + row.lotStock, 0),
      inventoryValue: stockRows.reduce((sum, row) => sum + row.inventoryValue, 0),
      lowStockCount: stockRows.filter(
        (row) => row.lotStock > 0 && row.lotStock <= row.product.min_stock_base,
      ).length,
      outOfStockCount: stockRows.filter((row) => row.lotStock === 0).length,
      expiredLotCount: expiredLots.length,
      nearExpiryLotCount: nearExpiryLots.length,
      movements: movementRows,
    },
    expenses: {
      ...expenseReport,
      rows: expenseRows,
    },
    expiry: {
      lots: riskLots,
      expiredCount: expiredLots.length,
      nearExpiryCount: nearExpiryLots.length,
      quarantineCount: quarantinedLots.length,
      riskValue: riskLots.reduce((sum, lot) => sum + lot.remainingValue, 0),
      writeoffs: completedWriteoffs,
    },
    profitLoss,
    estimatedHpp,
    cutoverDate,
  }
}
