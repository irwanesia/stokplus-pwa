import type { PaymentMethod, Purchase, PurchaseItem, StockLot } from '@/db/schema'

export interface PurchaseItemDraft {
  id?: string
  product_id: string
  unit_id: string
  qty_unit: number
  harga_beli_unit: number
  diskon: number
  expiry_date: string
  lot_code: string
}

export interface PurchaseDraft {
  nomor_nota: string
  tanggal: string
  supplier_id: string
  metode_pembayaran: PaymentMethod
  diskon: number
  biaya_angkut: number
  bayar: number
  keterangan: string
  items: PurchaseItemDraft[]
}

export interface PurchaseLineTotals {
  subtotal: number
  diskon_header: number
  biaya_angkut: number
  total_lot: number
  unit_cost_base: number
}

export interface PurchaseTotals {
  subtotal: number
  diskon: number
  biaya_angkut: number
  total: number
}

export interface PurchaseSaveOptions {
  id?: string
  complete?: boolean
}

export interface PurchaseSaveResult {
  id: string
  nomor_nota: string
  status: Purchase['status']
  mode: 'created' | 'updated' | 'completed'
}

export interface PurchaseDetail {
  purchase: Purchase
  items: PurchaseItem[]
  lots: StockLot[]
}

export interface PurchaseListItem extends Purchase {
  item_count: number
}
