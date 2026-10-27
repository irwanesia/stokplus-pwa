import type { MasterStatus } from '@/db/schema'

export interface ProductUnitDraft {
  id?: string
  unit_id: string
  conversion_qty: number
  is_base: boolean
  can_purchase: boolean
  can_sell: boolean
  is_default_purchase: boolean
  is_default_sale: boolean
  harga_beli_default: number
  harga_jual: number
  barcode: string
  status: MasterStatus
}

export interface ProductDraft {
  kode: string
  nama: string
  kategori_id: string
  base_unit_id: string
  track_expiry: boolean
  expiry_alert_days: number | null
  min_stock_base: number
  status: MasterStatus
  units: ProductUnitDraft[]
  opening_stock_base: number
  opening_expiry_date: string
  opening_lot_code: string
}

export interface ProductCategoryDraft {
  kode: string
  nama: string
  deskripsi: string
  status: MasterStatus
}

export interface UnitDraft {
  nama: string
  simbol: string
  status: MasterStatus
}

export interface PartnerDraft {
  kode: string
  nama: string
  telepon: string
  alamat: string
  catatan: string
  status: MasterStatus
}

export interface ExpenseCategoryDraft {
  kode: string
  nama: string
  deskripsi: string
  status: MasterStatus
}

export type MasterDeleteMode = 'deleted' | 'inactive'

export interface ProductActivity {
  hasActivity: boolean
  lots: number
  movements: number
  purchases: number
  sales: number
  opnames: number
  writeoffs: number
}

export interface MasterCounts {
  categories: number
  units: number
  products: number
  suppliers: number
  customers: number
  expenseCategories: number
}
