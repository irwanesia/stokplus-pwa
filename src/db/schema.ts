export const SCHEMA_VERSION = 2

export type RecordStatus = 'draft' | 'completed' | 'cancelled'
export type MasterStatus = 'active' | 'inactive'
export type LotStatus = 'active' | 'depleted' | 'quarantined'
export type PaymentMethod = 'tunai' | 'transfer' | 'qris' | 'kredit'
export type LotSource = 'purchase' | 'opening' | 'opname_surplus' | 'import'
export type WriteoffReason = 'expired' | 'damaged' | 'other'

export type StockMovementType =
  | 'opening'
  | 'purchase_in'
  | 'purchase_cancel'
  | 'sale_out'
  | 'sale_cancel'
  | 'opname_shortage'
  | 'opname_surplus'
  | 'writeoff_expired'
  | 'writeoff_damaged'
  | 'writeoff_other'
  | 'writeoff_cancel'
  | 'import_opening'

export interface MetaRecord {
  key: string
  value: unknown
  updated_at: string
}

export interface BusinessProfile {
  id: 'main'
  nama_usaha: string
  nama_pemilik: string
  alamat: string
  telepon: string
  catatan_laporan: string
  created_at: string
  updated_at: string
}

export interface SettingRecord {
  key: string
  value: unknown
  updated_at: string
}

export interface ProductCategory {
  id: string
  legacy_id?: number
  kode: string
  nama: string
  deskripsi: string
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Unit {
  id: string
  legacy_id?: number
  nama: string
  simbol: string | null
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Product {
  id: string
  legacy_id?: number
  kode: string
  nama: string
  kategori_id: string
  base_unit_id: string
  track_expiry: boolean
  expiry_alert_days: number | null
  min_stock_base: number
  stock_base: number
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProductUnit {
  id: string
  legacy_id?: number
  product_id: string
  unit_id: string
  conversion_qty: number
  is_base: boolean
  can_purchase: boolean
  can_sell: boolean
  is_default_purchase: boolean
  is_default_sale: boolean
  harga_beli_default: number
  harga_jual: number
  barcode: string | null
  status: MasterStatus
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  legacy_id?: number
  kode: string
  nama: string
  telepon: string
  alamat: string
  catatan: string
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Customer {
  id: string
  legacy_id?: number
  kode: string
  nama: string
  telepon: string
  alamat: string
  catatan: string
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ExpenseCategory {
  id: string
  legacy_id?: number
  kode: string
  nama: string
  deskripsi: string
  status: MasterStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Purchase {
  id: string
  legacy_id?: number
  nomor_nota: string
  tanggal: string
  supplier_id: string | null
  metode_pembayaran: PaymentMethod
  subtotal: number
  diskon: number
  biaya_angkut: number
  total: number
  bayar: number
  status: RecordStatus
  keterangan: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PurchaseItem {
  id: string
  legacy_id?: number
  purchase_id: string
  product_id: string
  unit_id: string
  qty_unit: number
  conversion_qty: number
  qty_base: number
  harga_beli_unit: number
  diskon: number
  subtotal: number
  expiry_date: string | null
  lot_code: string
  unit_cost_base: number
  lot_id: string | null
  created_at: string
}

export interface Sale {
  id: string
  legacy_id?: number
  nomor_nota: string
  tanggal: string
  customer_id: string | null
  metode_pembayaran: PaymentMethod
  subtotal: number
  diskon: number
  total: number
  bayar: number
  hpp_total: number
  gross_profit: number
  status: RecordStatus
  keterangan: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SaleItem {
  id: string
  legacy_id?: number
  hpp_is_estimated?: boolean
  sale_id: string
  product_id: string
  unit_id: string
  qty_unit: number
  conversion_qty: number
  qty_base: number
  harga_jual_unit: number
  diskon: number
  subtotal: number
  hpp_total: number
  gross_profit: number
  created_at: string
}

export interface SaleLotConsumption {
  id: string
  sale_id: string
  sale_item_id: string
  lot_id: string
  qty_base: number
  unit_cost_base: number
  total_cost: number
  created_at: string
}

export interface StockLot {
  id: string
  product_id: string
  purchase_id: string | null
  purchase_item_id: string | null
  lot_code: string
  received_at: string
  expiry_date: string | null
  qty_received_base: number
  qty_remaining_base: number
  unit_cost_base: number
  source: LotSource
  status: LotStatus
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  lot_id: string | null
  tanggal: string
  tipe: StockMovementType
  qty_unit: number
  conversion_qty: number
  qty_base: number
  unit_cost_base: number
  stock_before_base: number
  stock_after_base: number
  ref_type: string
  ref_id: string
  keterangan: string
  created_at: string
}

export interface StockOpname {
  id: string
  legacy_id?: number
  nomor: string
  tanggal: string
  status: RecordStatus
  keterangan: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StockOpnameItem {
  id: string
  legacy_id?: number
  opname_id: string
  product_id: string
  unit_id: string
  qty_unit: number
  conversion_qty: number
  system_qty_base: number
  physical_qty_base: number
  diff_base: number
  diff_cost: number
  expiry_date?: string | null
  created_at: string
}

export interface StockWriteoff {
  id: string
  nomor: string
  tanggal: string
  alasan: WriteoffReason
  keterangan: string
  total_cost: number
  status: RecordStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StockWriteoffItem {
  id: string
  writeoff_id: string
  product_id: string
  lot_id: string
  qty_base: number
  unit_cost_base: number
  total_cost: number
  expiry_date: string | null
  lot_status_before?: LotStatus
  keterangan: string
  created_at: string
}

export interface Expense {
  id: string
  legacy_id?: number
  nomor_transaksi: string
  tanggal: string
  expense_category_id: string
  keterangan: string
  nominal: number
  metode_pembayaran: PaymentMethod
  status: RecordStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AuditLog {
  id: string
  timestamp: string
  action: string
  entity: string
  entity_id: string | null
  payload: unknown
  note: string
}

/**
 * Schema domain dari PRD 9.3. `app_meta` adalah tabel internal
 * untuk metadata teknis dan tetap dipertahankan saat upgrade v1 → v2.
 */
export const DOMAIN_STORES = {
  business_profile: 'id',
  settings: 'key',
  product_categories: 'id, &kode, nama, status, deleted_at',
  units: 'id, &nama, status, deleted_at',
  products: 'id, &kode, kategori_id, base_unit_id, track_expiry, status, deleted_at',
  product_units: 'id, product_id, unit_id, &[product_id+unit_id], barcode, status',
  suppliers: 'id, &kode, nama, status, deleted_at',
  customers: 'id, &kode, nama, status, deleted_at',
  expense_categories: 'id, &kode, nama, status, deleted_at',
  purchases: 'id, &nomor_nota, tanggal, supplier_id, status, [tanggal+status], deleted_at',
  purchase_items: 'id, purchase_id, product_id, lot_id',
  sales: 'id, &nomor_nota, tanggal, customer_id, status, [tanggal+status], deleted_at',
  sale_items: 'id, sale_id, product_id',
  sale_lot_consumptions: 'id, sale_id, sale_item_id, lot_id, [lot_id+created_at]',
  stock_lots:
    'id, product_id, purchase_id, expiry_date, status, [product_id+expiry_date], [product_id+status], lot_code',
  stock_movements: 'id, product_id, lot_id, tanggal, tipe, [product_id+tanggal], [ref_type+ref_id]',
  stock_opnames: 'id, &nomor, tanggal, status, deleted_at',
  stock_opname_items: 'id, opname_id, product_id',
  stock_writeoffs: 'id, &nomor, tanggal, status, deleted_at',
  stock_writeoff_items: 'id, writeoff_id, product_id, lot_id',
  expenses:
    'id, &nomor_transaksi, tanggal, expense_category_id, status, [tanggal+status], deleted_at',
  audit_logs: 'id, timestamp, action, entity',
} as const

export const ALL_STORES = {
  app_meta: 'key',
  ...DOMAIN_STORES,
} as const

export const DOMAIN_TABLE_NAMES = Object.keys(DOMAIN_STORES) as (keyof typeof DOMAIN_STORES)[]
