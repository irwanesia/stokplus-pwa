import { validateDate, validateInteger } from '@/master/validation'

import type { StocktakeDraft, WriteoffDraft } from './types'

export function validateWriteoffDraft(draft: WriteoffDraft): string | null {
  const dateError = validateDate(draft.tanggal, 'Tanggal write-off')
  if (dateError) return dateError
  if (!['expired', 'damaged', 'other'].includes(draft.alasan)) {
    return 'Alasan write-off tidak valid.'
  }
  if (!draft.items.length) return 'Minimal satu lot wajib ditambahkan.'
  const lotIds = new Set<string>()
  for (const [index, item] of draft.items.entries()) {
    if (!item.lot_id) return `Lot item ${index + 1} wajib dipilih.`
    if (lotIds.has(item.lot_id)) return 'Lot yang sama tidak boleh ditambahkan lebih dari sekali.'
    lotIds.add(item.lot_id)
    const qtyError = validateInteger(item.qty_base, `Qty item ${index + 1}`, { min: 1 })
    if (qtyError) return qtyError
  }
  return null
}

export function validateStocktakeDraft(draft: StocktakeDraft): string | null {
  const dateError = validateDate(draft.tanggal, 'Tanggal opname')
  if (dateError) return dateError
  if (!draft.items.length) return 'Pilih minimal satu produk untuk opname.'
  const productIds = new Set<string>()
  for (const [index, item] of draft.items.entries()) {
    if (!item.product_id) return `Produk item ${index + 1} wajib dipilih.`
    if (productIds.has(item.product_id)) {
      return 'Produk yang sama tidak boleh ditambahkan lebih dari sekali.'
    }
    productIds.add(item.product_id)
    const qtyError = validateInteger(item.physical_qty_base, `Stok fisik item ${index + 1}`, {
      min: 0,
    })
    if (qtyError) return qtyError
    if (item.expiry_date) {
      const expiryError = validateDate(item.expiry_date, `Expiry item ${index + 1}`)
      if (expiryError) return expiryError
    }
  }
  return null
}
