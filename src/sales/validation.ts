import type { PaymentMethod } from '@/db/schema'
import { validateDate, validateInteger } from '@/master/validation'

import type { SaleDraft } from './types'

export const SALE_PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
]

export function hasAtMostThreeDecimals(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-8
}

export function saleLineSubtotal(qtyUnit: unknown, price: unknown, discount: unknown): number {
  return Math.round(Number(qtyUnit) * Number(price) - Number(discount))
}

export function computeSaleTotals(
  lines: Array<{ subtotal: number }>,
  discount: unknown,
): { subtotal: number; diskon: number; total: number } {
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const diskon = Number(discount) || 0

  return { subtotal, diskon, total: subtotal - diskon }
}

export function validateSaleHeader(
  draft: Pick<SaleDraft, 'tanggal' | 'metode_pembayaran' | 'diskon' | 'bayar'>,
  options: { subtotal: number; complete?: boolean },
): string | null {
  const dateError = validateDate(draft.tanggal, 'Tanggal penjualan')
  if (dateError) return dateError

  if (!SALE_PAYMENT_METHODS.some((method) => method.value === draft.metode_pembayaran)) {
    return 'Metode pembayaran tidak valid.'
  }

  const discountError = validateInteger(draft.diskon, 'Diskon header', { min: 0 })
  if (discountError) return discountError
  if (Number(draft.diskon) > options.subtotal) {
    return 'Diskon header tidak boleh melebihi subtotal.'
  }

  const total = options.subtotal - Number(draft.diskon)
  if (total < 0) return 'Total penjualan tidak boleh negatif.'

  const paidError = validateInteger(draft.bayar, 'Jumlah bayar', { min: 0 })
  if (paidError) return paidError

  if (options.complete && Number(draft.bayar) < total) {
    return 'Jumlah bayar kurang dari total penjualan.'
  }
  if (options.complete && draft.metode_pembayaran !== 'tunai' && Number(draft.bayar) !== total) {
    return 'Pembayaran non-tunai harus sama dengan total penjualan.'
  }

  return null
}

export function validateSaleItem(item: {
  qty_unit: unknown
  harga_jual_unit: unknown
  diskon: unknown
}): string | null {
  const qty = Number(item.qty_unit)
  if (!Number.isFinite(qty) || qty <= 0) return 'Qty harus lebih dari 0.'
  if (!hasAtMostThreeDecimals(qty)) return 'Qty maksimal 3 angka desimal.'

  const priceError = validateInteger(item.harga_jual_unit, 'Harga jual', { min: 0 })
  if (priceError) return priceError

  const discountError = validateInteger(item.diskon, 'Diskon item', { min: 0 })
  if (discountError) return discountError
  if (Number(item.diskon) > qty * Number(item.harga_jual_unit)) {
    return 'Diskon item tidak boleh melebihi nilai qty × harga.'
  }

  return null
}
