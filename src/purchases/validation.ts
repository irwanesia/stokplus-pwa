import type { PaymentMethod } from '@/db/schema'

import type { PurchaseDraft, PurchaseLineTotals, PurchaseTotals } from './types'
import { validateDate, validateInteger } from '@/master/validation'

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
]

export function roundRupiah(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

/** HPP per base disimpan dengan 4 angka desimal sesuai PRD. */
export function roundUnitCost(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000
}

export function hasAtMostDecimals(value: number, decimals: number): boolean {
  if (!Number.isFinite(value)) return false
  const factor = 10 ** decimals
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-8
}

export function lineSubtotal(qtyUnit: unknown, hargaBeliUnit: unknown, diskon: unknown): number {
  const gross = Number(qtyUnit) * Number(hargaBeliUnit)
  return roundRupiah(gross - Number(diskon))
}

export function computePurchaseTotals(
  lines: Array<{ subtotal: number }>,
  diskon: unknown,
  biayaAngkut: unknown,
): PurchaseTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const headerDiscount = Number(diskon) || 0
  const freight = Number(biayaAngkut) || 0

  return {
    subtotal,
    diskon: headerDiscount,
    biaya_angkut: freight,
    total: subtotal - headerDiscount + freight,
  }
}

export function allocatePurchaseCosts(
  lines: Array<{ subtotal: number; qty_base: number }>,
  diskon: unknown,
  biayaAngkut: unknown,
): { totals: PurchaseTotals; lines: PurchaseLineTotals[] } {
  const totals = computePurchaseTotals(lines, diskon, biayaAngkut)

  return {
    totals,
    lines: lines.map((line) => {
      let discountShare = 0
      let freightShare = 0

      if (totals.subtotal > 0) {
        discountShare = (totals.diskon * line.subtotal) / totals.subtotal
        freightShare = (totals.biaya_angkut * line.subtotal) / totals.subtotal
      }

      const totalLot = line.subtotal - discountShare + freightShare
      const unitCost = line.qty_base > 0 ? totalLot / line.qty_base : 0

      return {
        subtotal: line.subtotal,
        diskon_header: roundRupiah(discountShare),
        biaya_angkut: roundRupiah(freightShare),
        total_lot: roundRupiah(totalLot),
        unit_cost_base: roundUnitCost(unitCost),
      }
    }),
  }
}

export function validatePurchaseHeader(
  draft: Pick<
    PurchaseDraft,
    'tanggal' | 'supplier_id' | 'metode_pembayaran' | 'diskon' | 'biaya_angkut' | 'bayar'
  >,
  options: { subtotal: number; complete?: boolean },
): string | null {
  const dateError = validateDate(draft.tanggal, 'Tanggal pembelian')
  if (dateError) return dateError

  if (!draft.supplier_id) {
    return 'Supplier wajib dipilih.'
  }

  if (!PAYMENT_METHODS.some((method) => method.value === draft.metode_pembayaran)) {
    return 'Metode pembayaran tidak valid.'
  }

  const diskonError = validateInteger(draft.diskon, 'Diskon header', { min: 0 })
  if (diskonError) return diskonError

  if (Number(draft.diskon) > options.subtotal) {
    return 'Diskon header tidak boleh melebihi subtotal.'
  }

  const freightError = validateInteger(draft.biaya_angkut, 'Biaya angkut', { min: 0 })
  if (freightError) return freightError

  const total = options.subtotal - Number(draft.diskon) + Number(draft.biaya_angkut)

  if (options.subtotal === 0 && (Number(draft.diskon) > 0 || Number(draft.biaya_angkut) > 0)) {
    return 'Jika subtotal 0, diskon header dan biaya angkut harus 0.'
  }

  const bayarError = validateInteger(draft.bayar, 'Jumlah bayar', { min: 0 })
  if (bayarError) return bayarError

  if (options.complete) {
    if (Number(draft.bayar) < total) {
      return 'Jumlah bayar kurang dari total pembelian.'
    }
  }

  return null
}

export function validatePurchaseItem(item: {
  qty_unit: unknown
  harga_beli_unit: unknown
  diskon: unknown
}): string | null {
  const qty = Number(item.qty_unit)

  if (!Number.isFinite(qty) || qty <= 0) {
    return 'Qty harus lebih dari 0.'
  }

  if (!hasAtMostDecimals(qty, 3)) {
    return 'Qty maksimal 3 angka desimal.'
  }

  const price = Number(item.harga_beli_unit)

  if (!Number.isFinite(price) || price < 0) {
    return 'Harga beli tidak boleh negatif.'
  }

  const discountError = validateInteger(item.diskon, 'Diskon item', { min: 0 })
  if (discountError) return discountError

  const gross = qty * price
  if (Number(item.diskon) > gross) {
    return 'Diskon item tidak boleh melebihi nilai qty × harga.'
  }

  return null
}

export function validateExpiryForProduct(trackExpiry: boolean, expiryDate: string): string | null {
  if (!trackExpiry) return null

  if (!expiryDate.trim()) {
    return 'Expiry wajib diisi untuk produk yang memakai tracking expiry.'
  }

  return validateDate(expiryDate, 'Expiry')
}
