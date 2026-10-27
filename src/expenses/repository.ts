import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import { getSetting } from '@/db/settings'
import type { Expense } from '@/db/schema'
import { normalizePrefix } from '@/utils/numbering'
import { nowIso, todayJakarta } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

import type {
  ExpenseDraft,
  ExpenseListItem,
  ExpenseReport,
  ExpenseSaveOptions,
  ExpenseSaveResult,
  ProfitLossSummary,
} from './types'
import { computeProfitLoss, validateExpenseDraft, validateReportPeriod } from './validation'

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function ensureValidPeriod(startDate: string, endDate: string): void {
  const error = validateReportPeriod(startDate, endDate)
  if (error) throw new Error(error)
}

function inPeriod(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate
}

export async function nextExpenseNumber(date = todayJakarta()): Promise<string> {
  const prefix = normalizePrefix(await getSetting('prefix_expense'))
  const datePart = date.replaceAll('-', '')
  const pattern = new RegExp(`^${prefix}-${datePart}-(\\d+)$`)
  const rows = await db.expenses.toArray()
  let max = 0
  for (const row of rows) {
    const match = pattern.exec(row.nomor_transaksi)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}-${datePart}-${String(max + 1).padStart(4, '0')}`
}

async function ensureUniqueNumber(number: string, id?: string): Promise<void> {
  const existing = await db.expenses.where('nomor_transaksi').equals(number).first()
  if (existing && existing.id !== id) {
    throw new Error(`Nomor transaksi ${number} sudah dipakai.`)
  }
}

export async function saveExpense(
  draft: ExpenseDraft,
  options: ExpenseSaveOptions = {},
): Promise<ExpenseSaveResult> {
  const error = validateExpenseDraft(draft)
  if (error) throw new Error(error)

  const existing = options.id ? await db.expenses.get(options.id) : undefined
  if (options.id && !existing) throw new Error('Beban tidak ditemukan.')
  if (existing && existing.status !== 'draft') {
    throw new Error('Beban selesai atau batal tidak dapat diedit.')
  }

  const category = await db.expense_categories.get(draft.expense_category_id)
  if (!category) throw new Error('Kategori beban tidak ditemukan.')
  if (category.status !== 'active') throw new Error('Kategori beban tidak aktif.')

  const now = nowIso()
  const number = draft.nomor_transaksi.trim() || (await nextExpenseNumber(draft.tanggal))
  await ensureUniqueNumber(number, existing?.id)
  const complete = Boolean(options.complete)
  const expense: Expense = {
    id: existing?.id ?? uuidv7(),
    nomor_transaksi: number,
    tanggal: draft.tanggal,
    expense_category_id: category.id,
    keterangan: clean(draft.keterangan),
    nominal: Number(draft.nominal),
    metode_pembayaran: draft.metode_pembayaran,
    status: complete ? 'completed' : 'draft',
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.expenses.put(expense)
  await writeAuditLog({
    action: complete ? 'expense_completed' : existing ? 'expense_updated' : 'expense_created',
    entity: 'expenses',
    entity_id: expense.id,
    payload: {
      nomor_transaksi: number,
      expense_category_id: expense.expense_category_id,
      nominal: expense.nominal,
      status: expense.status,
    },
  })

  return {
    id: expense.id,
    nomor_transaksi: number,
    status: expense.status,
    mode: complete ? 'completed' : existing ? 'updated' : 'created',
  }
}

export async function listExpenses(): Promise<ExpenseListItem[]> {
  const [expenses, categories] = await Promise.all([
    db.expenses.toArray(),
    db.expense_categories.toArray(),
  ])
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  return expenses
    .map((expense) => ({
      ...expense,
      category: categoryById.get(expense.expense_category_id) ?? null,
    }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at))
}

export async function getExpense(id: string): Promise<ExpenseListItem | null> {
  const expense = await db.expenses.get(id)
  if (!expense) return null
  const category = await db.expense_categories.get(expense.expense_category_id)
  return { ...expense, category: category ?? null }
}

export async function deleteExpenseDraft(id: string): Promise<void> {
  const expense = await db.expenses.get(id)
  if (!expense) throw new Error('Beban tidak ditemukan.')
  if (expense.status !== 'draft') throw new Error('Hanya draft yang dapat dihapus.')
  await db.expenses.delete(id)
  await writeAuditLog({
    action: 'expense_deleted',
    entity: 'expenses',
    entity_id: id,
    payload: { nomor_transaksi: expense.nomor_transaksi },
  })
}

export async function cancelExpense(id: string): Promise<void> {
  const expense = await db.expenses.get(id)
  if (!expense) throw new Error('Beban tidak ditemukan.')
  if (expense.status !== 'completed') {
    throw new Error('Hanya beban selesai yang dapat dibatalkan.')
  }
  await db.expenses.put({ ...expense, status: 'cancelled', updated_at: nowIso() })
  await writeAuditLog({
    action: 'expense_cancelled',
    entity: 'expenses',
    entity_id: id,
    payload: { nomor_transaksi: expense.nomor_transaksi, nominal: expense.nominal },
  })
}

export async function getProfitLoss(
  startDate: string,
  endDate: string,
): Promise<ProfitLossSummary> {
  ensureValidPeriod(startDate, endDate)
  const [sales, saleItems, expenses, writeoffs, opnames, opnameItems] = await Promise.all([
    db.sales.toArray(),
    db.sale_items.toArray(),
    db.expenses.toArray(),
    db.stock_writeoffs.toArray(),
    db.stock_opnames.toArray(),
    db.stock_opname_items.toArray(),
  ])
  const completedSales = sales.filter(
    (sale) => sale.status === 'completed' && inPeriod(sale.tanggal, startDate, endDate),
  )
  const completedSaleIds = new Set(completedSales.map((sale) => sale.id))
  const cogs = saleItems
    .filter((item) => completedSaleIds.has(item.sale_id))
    .reduce((sum, item) => sum + item.hpp_total, 0)
  const completedExpenses = expenses.filter(
    (expense) => expense.status === 'completed' && inPeriod(expense.tanggal, startDate, endDate),
  )
  const completedWriteoffs = writeoffs.filter(
    (writeoff) => writeoff.status === 'completed' && inPeriod(writeoff.tanggal, startDate, endDate),
  )
  const completedOpnameIds = new Set(
    opnames
      .filter(
        (opname) => opname.status === 'completed' && inPeriod(opname.tanggal, startDate, endDate),
      )
      .map((opname) => opname.id),
  )
  const inventoryLoss =
    completedWriteoffs.reduce((sum, writeoff) => sum + writeoff.total_cost, 0) +
    opnameItems
      .filter((item) => completedOpnameIds.has(item.opname_id))
      .reduce((sum, item) => sum + item.diff_cost, 0)
  const summary = computeProfitLoss({
    revenue: completedSales.reduce((sum, sale) => sum + sale.total, 0),
    cogs,
    inventoryLoss,
    operatingExpenses: completedExpenses.reduce((sum, expense) => sum + expense.nominal, 0),
  })

  return {
    startDate,
    endDate,
    ...summary,
    completedSaleCount: completedSales.length,
    completedExpenseCount: completedExpenses.length,
  }
}

export async function getExpenseReport(startDate: string, endDate: string): Promise<ExpenseReport> {
  ensureValidPeriod(startDate, endDate)
  const [expenses, categories] = await Promise.all([
    db.expenses.toArray(),
    db.expense_categories.toArray(),
  ])
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const grouped = new Map<string, { name: string; total: number; count: number }>()
  const rows = expenses.filter(
    (expense) => expense.status === 'completed' && inPeriod(expense.tanggal, startDate, endDate),
  )
  for (const expense of rows) {
    const category = categoryById.get(expense.expense_category_id)
    const name = category?.nama ?? 'Kategori tidak ditemukan'
    const current = grouped.get(expense.expense_category_id) ?? { name, total: 0, count: 0 }
    current.total += expense.nominal
    current.count += 1
    grouped.set(expense.expense_category_id, current)
  }

  return {
    startDate,
    endDate,
    total: rows.reduce((sum, expense) => sum + expense.nominal, 0),
    count: rows.length,
    items: [...grouped.entries()]
      .map(([categoryId, value]) => ({
        categoryId,
        categoryName: value.name,
        total: value.total,
        count: value.count,
      }))
      .sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName, 'id')),
  }
}
