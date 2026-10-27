import type { PaymentMethod, Sale, SaleItem, SaleLotConsumption, StockLot } from '@/db/schema'

export interface SaleItemDraft {
  product_id: string
  unit_id: string
  qty_unit: number
  harga_jual_unit: number
  diskon: number
}

export interface SaleDraft {
  nomor_nota: string
  tanggal: string
  customer_id: string
  metode_pembayaran: PaymentMethod
  diskon: number
  bayar: number
  keterangan: string
  items: SaleItemDraft[]
}

export interface SaleSaveOptions {
  id?: string
  complete?: boolean
}

export interface SaleSaveResult {
  id: string
  nomor_nota: string
  status: Sale['status']
  mode: 'created' | 'updated' | 'completed'
}

export interface SaleListItem extends Sale {
  item_count: number
}

export interface SaleDetail {
  sale: Sale
  items: SaleItem[]
  consumptions: SaleLotConsumption[]
  lots: StockLot[]
}

export interface SaleAvailableStock {
  qty_base: number
  lots: StockLot[]
}
