import { describe, expect, it } from 'vitest'

import {
  computeProfitLoss,
  validateExpenseDraft,
  validateReportPeriod,
} from '@/expenses/validation'
import type { ExpenseDraft } from '@/expenses/types'

const validDraft: ExpenseDraft = {
  nomor_transaksi: '',
  tanggal: '2026-10-26',
  expense_category_id: 'category-electric',
  keterangan: 'Tagihan listrik freezer',
  nominal: 800_000,
  metode_pembayaran: 'transfer',
}

describe('expense validation and P&L formula', () => {
  it('requires category, description, positive integer amount and valid payment method', () => {
    expect(validateExpenseDraft(validDraft)).toBeNull()
    expect(validateExpenseDraft({ ...validDraft, expense_category_id: '' })).toBe(
      'Kategori beban wajib dipilih.',
    )
    expect(validateExpenseDraft({ ...validDraft, keterangan: '  ' })).toBe(
      'Keterangan beban wajib diisi.',
    )
    expect(validateExpenseDraft({ ...validDraft, nominal: 0 })).toBe('Nominal minimal 1.')
    expect(validateExpenseDraft({ ...validDraft, nominal: 12.5 })).toBe(
      'Nominal harus bilangan bulat.',
    )
    expect(validateExpenseDraft({ ...validDraft, metode_pembayaran: 'invalid' as never })).toBe(
      'Metode pembayaran tidak valid.',
    )
  })

  it('rejects reversed report dates', () => {
    expect(validateReportPeriod('2026-10-27', '2026-10-26')).toBe(
      'Tanggal awal tidak boleh melewati tanggal akhir.',
    )
    expect(validateReportPeriod('2026-10-01', '2026-10-31')).toBeNull()
  })

  it('keeps COGS separate from operating expenses', () => {
    expect(
      computeProfitLoss({
        revenue: 1_000_000,
        cogs: 650_000,
        inventoryLoss: 50_000,
        operatingExpenses: 100_000,
      }),
    ).toEqual({
      revenue: 1_000_000,
      cogs: 650_000,
      grossProfit: 350_000,
      inventoryLoss: 50_000,
      operatingExpenses: 100_000,
      netProfit: 200_000,
    })
  })
})
