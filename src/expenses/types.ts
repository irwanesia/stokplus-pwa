import type { Expense, ExpenseCategory, PaymentMethod } from '@/db/schema'

export interface ExpenseDraft {
  nomor_transaksi: string
  tanggal: string
  expense_category_id: string
  keterangan: string
  nominal: number
  metode_pembayaran: PaymentMethod
}

export interface ExpenseSaveOptions {
  id?: string
  complete?: boolean
}

export interface ExpenseSaveResult {
  id: string
  nomor_transaksi: string
  status: Expense['status']
  mode: 'created' | 'updated' | 'completed'
}

export interface ExpenseListItem extends Expense {
  category: ExpenseCategory | null
}

export interface ProfitLossSummary {
  startDate: string
  endDate: string
  revenue: number
  cogs: number
  grossProfit: number
  inventoryLoss: number
  operatingExpenses: number
  netProfit: number
  completedSaleCount: number
  completedExpenseCount: number
}

export interface ExpenseReportItem {
  categoryId: string
  categoryName: string
  total: number
  count: number
}

export interface ExpenseReport {
  startDate: string
  endDate: string
  total: number
  count: number
  items: ExpenseReportItem[]
}
