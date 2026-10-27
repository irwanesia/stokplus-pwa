import type { ExpenseDraft, ProfitLossSummary } from './types'
import type { PaymentMethod } from '@/db/schema'
import { validateDate, validateInteger } from '@/master/validation'

export const EXPENSE_PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
]

export function validateExpenseDraft(draft: ExpenseDraft): string | null {
  const dateError = validateDate(draft.tanggal, 'Tanggal beban')
  if (dateError) return dateError
  if (!draft.expense_category_id) return 'Kategori beban wajib dipilih.'
  if (!draft.keterangan.trim()) return 'Keterangan beban wajib diisi.'

  const amountError = validateInteger(draft.nominal, 'Nominal', { min: 1 })
  if (amountError) return amountError

  if (!EXPENSE_PAYMENT_METHODS.some((method) => method.value === draft.metode_pembayaran)) {
    return 'Metode pembayaran tidak valid.'
  }
  return null
}

export function computeProfitLoss(input: {
  revenue: number
  cogs: number
  inventoryLoss?: number
  operatingExpenses: number
}): Pick<
  ProfitLossSummary,
  'revenue' | 'cogs' | 'grossProfit' | 'inventoryLoss' | 'operatingExpenses' | 'netProfit'
> {
  const inventoryLoss = input.inventoryLoss ?? 0
  const grossProfit = input.revenue - input.cogs
  return {
    revenue: input.revenue,
    cogs: input.cogs,
    grossProfit,
    inventoryLoss,
    operatingExpenses: input.operatingExpenses,
    netProfit: grossProfit - inventoryLoss - input.operatingExpenses,
  }
}

export function validateReportPeriod(startDate: string, endDate: string): string | null {
  if (startDate && validateDate(startDate, 'Tanggal awal')) {
    return validateDate(startDate, 'Tanggal awal')
  }
  if (endDate && validateDate(endDate, 'Tanggal akhir')) {
    return validateDate(endDate, 'Tanggal akhir')
  }
  if (startDate && endDate && startDate > endDate) {
    return 'Tanggal awal tidak boleh melewati tanggal akhir.'
  }
  return null
}
