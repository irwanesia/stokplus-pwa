import { db } from '@/db/dexie'
import type { RecordStatus } from '@/db/schema'
import { getProfitLoss } from '@/expenses/repository'
import { getExpiryLots, getStockOverview } from '@/inventory/repository'
import { todayJakarta } from '@/utils/date'

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface DashboardPeriodRange {
  startDate: string
  endDate: string
}

export interface DashboardActivity {
  id: string
  title: string
  subtitle: string
  date: string
  createdAt: string
  amount: number
  status: RecordStatus
  kind: 'sale' | 'purchase' | 'expense' | 'writeoff'
  to: string
}

export interface DashboardMonth {
  key: string
  label: string
  revenue: number
  cogs: number
}

export interface DashboardData {
  range: DashboardPeriodRange
  profitLoss: Awaited<ReturnType<typeof getProfitLoss>>
  stock: Awaited<ReturnType<typeof getStockOverview>>
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  expiredLotCount: number
  nearExpiryLotCount: number
  quarantineLotCount: number
  activities: DashboardActivity[]
  months: DashboardMonth[]
  hasTransactions: boolean
}

const DAY_MS = 86_400_000

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getDashboardPeriodRange(
  period: DashboardPeriod,
  today = todayJakarta(),
  customRange?: DashboardPeriodRange,
): DashboardPeriodRange {
  if (period === 'custom') {
    return {
      startDate: customRange?.startDate ?? today,
      endDate: customRange?.endDate ?? today,
    }
  }
  if (period === 'today') return { startDate: today, endDate: today }

  const current = new Date(`${today}T00:00:00Z`)
  if (period === 'week') {
    const dayOfWeek = current.getUTCDay() || 7
    const start = new Date(current.getTime() - (dayOfWeek - 1) * DAY_MS)
    return { startDate: dateString(start), endDate: today }
  }
  if (period === 'month') return { startDate: `${today.slice(0, 7)}-01`, endDate: today }
  return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today }
}

function getLastSixMonths(today: string): DashboardMonth[] {
  const current = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - (5 - offset), 1),
    )
    return {
      key: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(date),
      revenue: 0,
      cogs: 0,
    }
  })
}

export async function getDashboardData(
  range: DashboardPeriodRange,
  today = todayJakarta(),
): Promise<DashboardData> {
  if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
    throw new Error('Rentang tanggal dashboard tidak valid.')
  }
  const [profitLoss, stock, expiryLots, sales, saleItems, purchases, expenses, writeoffs] =
    await Promise.all([
      getProfitLoss(range.startDate, range.endDate),
      getStockOverview(),
      getExpiryLots(),
      db.sales.toArray(),
      db.sale_items.toArray(),
      db.purchases.toArray(),
      db.expenses.toArray(),
      db.stock_writeoffs.toArray(),
    ])

  const months = getLastSixMonths(today)
  const monthByKey = new Map(months.map((month) => [month.key, month]))
  const completedSales = sales.filter(
    (sale) => sale.status === 'completed' && sale.tanggal >= months[0]!.key + '-01',
  )
  const saleById = new Map(completedSales.map((sale) => [sale.id, sale]))
  for (const sale of completedSales) {
    const month = monthByKey.get(sale.tanggal.slice(0, 7))
    if (month) month.revenue += sale.total
  }
  for (const item of saleItems) {
    const sale = saleById.get(item.sale_id)
    const month = sale ? monthByKey.get(sale.tanggal.slice(0, 7)) : undefined
    if (month) month.cogs += item.hpp_total
  }

  const withinRange = (date: string) => date >= range.startDate && date <= range.endDate
  const activities: DashboardActivity[] = [
    ...sales
      .filter((row) => withinRange(row.tanggal))
      .map((row) => ({
        id: row.id,
        title: row.nomor_nota,
        subtitle: 'Penjualan',
        date: row.tanggal,
        createdAt: row.created_at,
        amount: row.total,
        status: row.status,
        kind: 'sale' as const,
        to: `/transaksi/penjualan/${row.id}`,
      })),
    ...purchases
      .filter((row) => withinRange(row.tanggal))
      .map((row) => ({
        id: row.id,
        title: row.nomor_nota,
        subtitle: 'Pembelian',
        date: row.tanggal,
        createdAt: row.created_at,
        amount: row.total,
        status: row.status,
        kind: 'purchase' as const,
        to: `/transaksi/pembelian/${row.id}`,
      })),
    ...expenses
      .filter((row) => withinRange(row.tanggal))
      .map((row) => ({
        id: row.id,
        title: row.keterangan || row.nomor_transaksi,
        subtitle: row.nomor_transaksi,
        date: row.tanggal,
        createdAt: row.created_at,
        amount: row.nominal,
        status: row.status,
        kind: 'expense' as const,
        to: `/transaksi/beban/${row.id}`,
      })),
    ...writeoffs
      .filter((row) => withinRange(row.tanggal))
      .map((row) => ({
        id: row.id,
        title: row.nomor,
        subtitle: 'Write-off',
        date: row.tanggal,
        createdAt: row.created_at,
        amount: row.total_cost,
        status: row.status,
        kind: 'writeoff' as const,
        to: `/stok/writeoff/${row.id}`,
      })),
  ]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 5)

  const expiredLotCount = expiryLots.filter(
    (lot) => lot.expiry_date !== null && lot.daysToExpiry !== null && lot.daysToExpiry < 0,
  ).length
  const nearExpiryLotCount = expiryLots.filter(
    (lot) => lot.expiry_date !== null && lot.daysToExpiry !== null && lot.daysToExpiry >= 0,
  ).length
  const quarantineLotCount = expiryLots.filter((lot) => lot.status === 'quarantined').length

  return {
    range,
    profitLoss,
    stock,
    lowStockCount: stock.filter(
      (row) => row.lotStock > 0 && row.lotStock <= row.product.min_stock_base,
    ).length,
    outOfStockCount: stock.filter((row) => row.lotStock === 0).length,
    inventoryValue: stock.reduce((sum, row) => sum + row.inventoryValue, 0),
    expiredLotCount,
    nearExpiryLotCount,
    quarantineLotCount,
    activities,
    months,
    hasTransactions:
      profitLoss.completedSaleCount > 0 ||
      profitLoss.completedExpenseCount > 0 ||
      activities.length > 0,
  }
}
