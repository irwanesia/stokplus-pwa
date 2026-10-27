import { db } from '@/db/dexie'
import { DOMAIN_TABLE_NAMES, type AuditLog, type PaymentMethod } from '@/db/schema'
import { nowIso } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

const LEGACY_TABLE_NAMES = [
  'product_categories',
  'units',
  'products',
  'suppliers',
  'customers',
  'expense_categories',
  'purchases',
  'purchase_details',
  'sales',
  'sale_details',
  'expenses',
  'stock_movements',
  'stock_opnames',
  'stock_opname_details',
] as const

const UUID_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

type LegacyTableName = (typeof LEGACY_TABLE_NAMES)[number]
type LegacyRow = Record<string, unknown>
type LegacyTables = Record<LegacyTableName, LegacyRow[]>

export interface LegacyExport {
  meta: {
    app: 'SMPP Laravel'
    version: '1.0'
    exported_at: string
    schema: 'mysql-2026-10'
    source_php: string
  }
  tables: LegacyTables
}

export interface MigrationPreview {
  source: LegacyExport
  counts: Record<LegacyTableName, number>
  totals: {
    sales: number
    purchases: number
    expenses: number
    stock: number
  }
}

export interface OpeningProductOption {
  trackExpiry: boolean
  expiryDate: string
}

export interface MigrationPlan {
  cutoverDate: string
  tables: Partial<Record<(typeof DOMAIN_TABLE_NAMES)[number], LegacyRow[]>>
  sourceCounts: Record<LegacyTableName, number>
  importedCounts: Record<string, number>
  totals: MigrationPreview['totals']
  quarantineCount: number
  stockReconciles: boolean
}

export interface MigrationResult extends Omit<MigrationPlan, 'tables'> {
  completedAt: string
  safetyBackupRequired: true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRows(value: unknown, table: LegacyTableName): LegacyRow[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`Tabel ${table} harus berupa daftar baris JSON.`)
  }
  return value
}

function numberValue(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} bukan angka yang valid.`)
  return parsed
}

function idValue(row: LegacyRow, label: string): number {
  const value = numberValue(row.id, `${label}.id`)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label}.id harus bilangan bulat positif.`)
  }
  return value
}

function dateValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new Error(`${label} harus memakai tanggal YYYY-MM-DD.`)
  }
  const date = value.slice(0, 10)
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`${label} bukan tanggal kalender yang valid.`)
  }
  return date
}

function statusValue(value: unknown, label: string): 'draft' | 'completed' | 'cancelled' {
  if (value !== 'draft' && value !== 'completed' && value !== 'cancelled') {
    throw new Error(`${label} memiliki status yang tidak didukung.`)
  }
  return value
}

function cleanText(value: unknown, fallback = ''): string {
  return typeof value === 'string'
    ? value
    : value === null || value === undefined
      ? fallback
      : String(value)
}

function activeStatus(value: unknown): 'active' | 'inactive' {
  if (value === true || value === 1 || value === '1') return 'active'
  if (value === false || value === 0 || value === '0') return 'inactive'
  throw new Error('Status master Laravel harus bernilai 0 atau 1.')
}

function paymentMethod(value: unknown): PaymentMethod {
  if (value === 'tunai' || value === 'transfer' || value === 'qris' || value === 'kredit') {
    return value
  }
  throw new Error(`Metode pembayaran ${String(value)} tidak didukung.`)
}

function assertRequiredText(row: LegacyRow, key: string, label: string): void {
  if (typeof row[key] !== 'string' || row[key].trim() === '') {
    throw new Error(`${label}.${key} wajib diisi.`)
  }
}

function assertUniqueField(rows: LegacyRow[], field: string, table: string): void {
  const seen = new Set<string>()
  for (const row of rows) {
    const value = cleanText(row[field]).trim()
    if (!value || seen.has(value)) {
      throw new Error(`Kolom ${table}.${field} kosong atau duplikat.`)
    }
    seen.add(value)
  }
}

function legacyDateTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value) return fallback
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback
}

function assertUniqueIds(rows: LegacyRow[], table: LegacyTableName): Set<number> {
  const ids = new Set<number>()
  for (const row of rows) {
    const id = idValue(row, table)
    if (ids.has(id)) throw new Error(`Tabel ${table} memiliki ID ${id} duplikat.`)
    ids.add(id)
  }
  return ids
}

function assertReference(value: unknown, ids: Set<number>, label: string, nullable = false): void {
  if ((value === null || value === undefined || value === '') && nullable) return
  const id = numberValue(value, label)
  if (!Number.isSafeInteger(id) || !ids.has(id)) {
    throw new Error(`Relasi ${label} menunjuk ke data yang tidak tersedia.`)
  }
}

function phpVersionSupported(version: string): boolean {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10))
  const required = [8, 3, 36]
  for (let index = 0; index < required.length; index += 1) {
    const current = parts[index] ?? 0
    if (current > required[index]) return true
    if (current < required[index]) return false
  }
  return true
}

function validateLegacyTables(value: unknown): LegacyTables {
  if (!isRecord(value)) throw new Error('Properti tables pada file migrasi tidak valid.')
  const tables = {} as LegacyTables
  for (const name of LEGACY_TABLE_NAMES) tables[name] = asRows(value[name], name)

  const ids = Object.fromEntries(
    LEGACY_TABLE_NAMES.map((name) => [name, assertUniqueIds(tables[name], name)]),
  ) as Record<LegacyTableName, Set<number>>

  for (const [table, field] of [
    ['product_categories', 'kode'],
    ['units', 'nama'],
    ['products', 'kode'],
    ['suppliers', 'kode'],
    ['customers', 'kode'],
    ['expense_categories', 'kode'],
    ['purchases', 'nomor_nota'],
    ['sales', 'nomor_nota'],
    ['expenses', 'nomor_transaksi'],
    ['stock_opnames', 'nomor_opname'],
  ] as const) {
    assertUniqueField(tables[table], field, table)
    for (const row of tables[table]) {
      assertRequiredText(row, field, table)
    }
  }
  for (const row of [
    ...tables.product_categories,
    ...tables.products,
    ...tables.suppliers,
    ...tables.customers,
    ...tables.expense_categories,
  ]) {
    assertRequiredText(row, 'nama', 'master')
    activeStatus(row.status)
  }
  for (const row of tables.units) {
    assertRequiredText(row, 'nama', 'units')
    activeStatus(row.status)
  }
  for (const row of tables.products) {
    assertReference(row.kategori_id, ids.product_categories, 'products.kategori_id')
    assertReference(row.satuan_id, ids.units, 'products.satuan_id')
    const stock = numberValue(row.stock, 'products.stock')
    if (!Number.isSafeInteger(stock) || stock < 0)
      throw new Error('Stok produk harus bilangan bulat nonnegatif.')
    numberValue(row.harga_beli, 'products.harga_beli')
    numberValue(row.harga_jual, 'products.harga_jual')
  }
  for (const row of tables.purchases) {
    assertReference(row.supplier_id, ids.suppliers, 'purchases.supplier_id', true)
    statusValue(row.status, 'purchases.status')
    dateValue(row.tanggal, 'purchases.tanggal')
    paymentMethod(row.metode_pembayaran)
    numberValue(row.total, 'purchases.total')
    numberValue(row.diskon ?? 0, 'purchases.diskon')
    numberValue(row.bayar ?? 0, 'purchases.bayar')
  }
  for (const row of tables.purchase_details) {
    assertReference(row.purchase_id, ids.purchases, 'purchase_details.purchase_id')
    assertReference(row.product_id, ids.products, 'purchase_details.product_id')
    const qty = numberValue(row.qty, 'purchase_details.qty')
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Jumlah item pembelian harus bilangan bulat positif.')
    }
    const expected =
      qty * numberValue(row.harga_beli, 'purchase_details.harga_beli') -
      numberValue(row.diskon ?? 0, 'purchase_details.diskon')
    if (Math.abs(expected - numberValue(row.subtotal, 'purchase_details.subtotal')) > 0.02) {
      throw new Error('Subtotal item pembelian tidak cocok dengan qty, harga, dan diskon.')
    }
  }
  for (const row of tables.sales) {
    assertReference(row.customer_id, ids.customers, 'sales.customer_id', true)
    statusValue(row.status, 'sales.status')
    dateValue(row.tanggal, 'sales.tanggal')
    paymentMethod(row.metode_pembayaran)
    numberValue(row.total, 'sales.total')
    numberValue(row.diskon ?? 0, 'sales.diskon')
    numberValue(row.bayar ?? 0, 'sales.bayar')
  }
  for (const row of tables.sale_details) {
    assertReference(row.sale_id, ids.sales, 'sale_details.sale_id')
    assertReference(row.product_id, ids.products, 'sale_details.product_id')
    const qty = numberValue(row.qty, 'sale_details.qty')
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Jumlah item penjualan harus bilangan bulat positif.')
    }
    const expected =
      qty * numberValue(row.harga_jual, 'sale_details.harga_jual') -
      numberValue(row.diskon ?? 0, 'sale_details.diskon')
    if (Math.abs(expected - numberValue(row.subtotal, 'sale_details.subtotal')) > 0.02) {
      throw new Error('Subtotal item penjualan tidak cocok dengan qty, harga, dan diskon.')
    }
  }
  for (const row of tables.expenses) {
    assertReference(row.expense_category_id, ids.expense_categories, 'expenses.expense_category_id')
    statusValue(row.status, 'expenses.status')
    dateValue(row.tanggal, 'expenses.tanggal')
    paymentMethod(row.metode_pembayaran)
    numberValue(row.nominal, 'expenses.nominal')
  }
  for (const row of tables.stock_movements) {
    assertReference(row.product_id, ids.products, 'stock_movements.product_id')
  }
  for (const row of tables.stock_opname_details) {
    assertReference(row.stock_opname_id, ids.stock_opnames, 'stock_opname_details.stock_opname_id')
    assertReference(row.product_id, ids.products, 'stock_opname_details.product_id')
  }

  for (const [headers, details, foreignKey, label] of [
    [tables.purchases, tables.purchase_details, 'purchase_id', 'Pembelian'],
    [tables.sales, tables.sale_details, 'sale_id', 'Penjualan'],
  ] as const) {
    const detailGroups = groupById(details, foreignKey)
    for (const header of headers) {
      const id = idValue(header, label)
      const lineTotal = (detailGroups.get(id) ?? []).reduce(
        (sum, detail) => sum + numberValue(detail.subtotal, `${label}.detail.subtotal`),
        0,
      )
      if (Math.abs(lineTotal - numberValue(header.total, `${label}.total`)) > 0.02) {
        throw new Error(
          `${label} ${cleanText(header.nomor_nota)} tidak cocok dengan total rinciannya.`,
        )
      }
    }
  }

  return tables
}

function calculateTotals(tables: LegacyTables): MigrationPreview['totals'] {
  const completedTotal = (rows: LegacyRow[]) =>
    rows.reduce((sum, row) => {
      if (row.status !== 'completed') return sum
      return sum + numberValue(row.total, 'total') - numberValue(row.diskon ?? 0, 'diskon')
    }, 0)
  return {
    sales: completedTotal(tables.sales),
    purchases: completedTotal(tables.purchases),
    expenses: tables.expenses.reduce(
      (sum, row) =>
        sum + (row.status === 'completed' ? numberValue(row.nominal, 'expenses.nominal') : 0),
      0,
    ),
    stock: tables.products.reduce((sum, row) => sum + numberValue(row.stock, 'products.stock'), 0),
  }
}

export function inspectLegacyExport(content: string): MigrationPreview {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('File migrasi bukan JSON yang valid.')
  }
  if (!isRecord(parsed) || !isRecord(parsed.meta)) {
    throw new Error('Metadata file migrasi tidak ditemukan.')
  }
  const meta = parsed.meta
  if (
    meta.app !== 'SMPP Laravel' ||
    meta.version !== '1.0' ||
    meta.schema !== 'mysql-2026-10' ||
    typeof meta.exported_at !== 'string' ||
    typeof meta.source_php !== 'string'
  ) {
    throw new Error('Format export Laravel tidak didukung.')
  }
  if (!phpVersionSupported(meta.source_php)) {
    throw new Error('Export dibuat dengan PHP lama. Patch ke PHP 8.3.36+ lalu buat ulang export.')
  }

  const tables = validateLegacyTables(parsed.tables)
  const counts = Object.fromEntries(
    LEGACY_TABLE_NAMES.map((name) => [name, tables[name].length]),
  ) as Record<LegacyTableName, number>
  return {
    source: { meta: meta as LegacyExport['meta'], tables },
    counts,
    totals: calculateTotals(tables),
  }
}

async function uuidV5(name: string): Promise<string> {
  const namespace = UUID_NAMESPACE.replaceAll('-', '')
  const namespaceBytes = new Uint8Array(
    namespace.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  )
  const nameBytes = new TextEncoder().encode(name)
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length)
  input.set(namespaceBytes)
  input.set(nameBytes, namespaceBytes.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', input))
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function legacyId(table: string, value: unknown): Promise<string> {
  return uuidV5(`${table}:${String(value)}`)
}

function groupById(rows: LegacyRow[], key: string): Map<number, LegacyRow[]> {
  const grouped = new Map<number, LegacyRow[]>()
  for (const row of rows) {
    const id = numberValue(row[key], key)
    const group = grouped.get(id) ?? []
    group.push(row)
    grouped.set(id, group)
  }
  return grouped
}

function money(value: unknown, label: string): number {
  return numberValue(value ?? 0, label)
}

function roundCost(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function transactionDate(row: LegacyRow, cutoverDate: string, label: string): string {
  const date = dateValue(row.tanggal, `${label}.tanggal`)
  if (date > cutoverDate) {
    throw new Error(`${label} ${cleanText(row.nomor_nota)} bertanggal setelah tanggal cutover.`)
  }
  return date
}

export async function buildMigrationPlan(
  preview: MigrationPreview,
  cutoverDate: string,
  productOptions: Record<number, OpeningProductOption>,
): Promise<MigrationPlan> {
  const cutover = dateValue(cutoverDate, 'Tanggal cutover')
  const source = preview.source.tables
  const createdAt = nowIso()
  const rowsByTable = Object.fromEntries(
    LEGACY_TABLE_NAMES.map((table) => [table, groupById(source[table], 'id')]),
  )
  const categoryIds = new Map<number, string>()
  const unitIds = new Map<number, string>()
  const productIds = new Map<number, string>()
  const supplierIds = new Map<number, string>()
  const customerIds = new Map<number, string>()
  const expenseCategoryIds = new Map<number, string>()
  const purchaseIds = new Map<number, string>()
  const purchaseItemIds = new Map<number, string>()
  const saleIds = new Map<number, string>()
  const saleItemIds = new Map<number, string>()
  const opnameIds = new Map<number, string>()
  const opnameItemIds = new Map<number, string>()

  for (const [table, target] of [
    ['product_categories', categoryIds],
    ['units', unitIds],
    ['products', productIds],
    ['suppliers', supplierIds],
    ['customers', customerIds],
    ['expense_categories', expenseCategoryIds],
    ['purchases', purchaseIds],
    ['purchase_details', purchaseItemIds],
    ['sales', saleIds],
    ['sale_details', saleItemIds],
    ['stock_opnames', opnameIds],
    ['stock_opname_details', opnameItemIds],
  ] as const) {
    for (const id of rowsByTable[table].keys()) target.set(id, await legacyId(table, id))
  }

  const purchaseDetailsByPurchase = groupById(source.purchase_details, 'purchase_id')
  const saleDetailsBySale = groupById(source.sale_details, 'sale_id')
  const purchaseById = new Map(source.purchases.map((row) => [idValue(row, 'purchases'), row]))
  const saleById = new Map(source.sales.map((row) => [idValue(row, 'sales'), row]))
  const productById = new Map(source.products.map((row) => [idValue(row, 'products'), row]))
  const costNumerator = new Map<number, number>()
  const costDenominator = new Map<number, number>()
  const lastPurchaseCost = new Map<number, { date: string; cost: number }>()

  for (const purchase of source.purchases) {
    if (purchase.status !== 'completed') continue
    const purchaseId = idValue(purchase, 'purchases')
    const details = purchaseDetailsByPurchase.get(purchaseId) ?? []
    const subtotal = details.reduce(
      (sum, row) => sum + money(row.subtotal, 'purchase_details.subtotal'),
      0,
    )
    const headerDiscount = money(purchase.diskon, 'purchases.diskon')
    for (const detail of details) {
      const productId = numberValue(detail.product_id, 'purchase_details.product_id')
      const qty = numberValue(detail.qty, 'purchase_details.qty')
      if (qty <= 0) throw new Error('Jumlah item pembelian harus lebih dari nol.')
      const lineTotal = money(detail.subtotal, 'purchase_details.subtotal')
      const share = subtotal > 0 ? (lineTotal / subtotal) * headerDiscount : 0
      const unitCost = Math.max(0, (lineTotal - share) / qty)
      costNumerator.set(productId, (costNumerator.get(productId) ?? 0) + unitCost * qty)
      costDenominator.set(productId, (costDenominator.get(productId) ?? 0) + qty)
      const purchaseDate = dateValue(purchase.tanggal, 'purchases.tanggal')
      const last = lastPurchaseCost.get(productId)
      if (!last || purchaseDate >= last.date)
        lastPurchaseCost.set(productId, { date: purchaseDate, cost: unitCost })
    }
  }

  const openingCost = new Map<number, number>()
  for (const [productId, product] of productById) {
    const denominator = costDenominator.get(productId) ?? 0
    openingCost.set(
      productId,
      roundCost(
        denominator > 0
          ? (costNumerator.get(productId) ?? 0) / denominator
          : (lastPurchaseCost.get(productId)?.cost ??
              money(product.harga_beli, 'products.harga_beli')),
      ),
    )
  }

  const expiryByProduct = new Map<number, string | null>()
  const tables: MigrationPlan['tables'] = {
    product_categories: await Promise.all(
      source.product_categories.map(async (row) => ({
        id: categoryIds.get(idValue(row, 'product_categories')),
        legacy_id: idValue(row, 'product_categories'),
        kode: cleanText(row.kode),
        nama: cleanText(row.nama),
        deskripsi: cleanText(row.deskripsi),
        status: activeStatus(row.status),
        created_at: legacyDateTime(row.created_at, createdAt),
        updated_at: legacyDateTime(row.updated_at, createdAt),
        deleted_at: null,
      })),
    ),
    units: await Promise.all(
      source.units.map(async (row) => ({
        id: unitIds.get(idValue(row, 'units')),
        legacy_id: idValue(row, 'units'),
        nama: cleanText(row.nama),
        simbol: cleanText(row.simbol) || null,
        status: activeStatus(row.status),
        created_at: legacyDateTime(row.created_at, createdAt),
        updated_at: legacyDateTime(row.updated_at, createdAt),
        deleted_at: null,
      })),
    ),
    suppliers: await Promise.all(
      source.suppliers.map(async (row) => ({
        id: supplierIds.get(idValue(row, 'suppliers')),
        legacy_id: idValue(row, 'suppliers'),
        kode: cleanText(row.kode),
        nama: cleanText(row.nama),
        telepon: cleanText(row.telepon),
        alamat: cleanText(row.alamat),
        catatan: '',
        status: activeStatus(row.status),
        created_at: legacyDateTime(row.created_at, createdAt),
        updated_at: legacyDateTime(row.updated_at, createdAt),
        deleted_at: null,
      })),
    ),
    customers: await Promise.all(
      source.customers.map(async (row) => ({
        id: customerIds.get(idValue(row, 'customers')),
        legacy_id: idValue(row, 'customers'),
        kode: cleanText(row.kode),
        nama: cleanText(row.nama),
        telepon: cleanText(row.telepon),
        alamat: cleanText(row.alamat),
        catatan: '',
        status: activeStatus(row.status),
        created_at: legacyDateTime(row.created_at, createdAt),
        updated_at: legacyDateTime(row.updated_at, createdAt),
        deleted_at: null,
      })),
    ),
    expense_categories: await Promise.all(
      source.expense_categories.map(async (row) => ({
        id: expenseCategoryIds.get(idValue(row, 'expense_categories')),
        legacy_id: idValue(row, 'expense_categories'),
        kode: cleanText(row.kode),
        nama: cleanText(row.nama),
        deskripsi: cleanText(row.deskripsi),
        status: activeStatus(row.status),
        created_at: legacyDateTime(row.created_at, createdAt),
        updated_at: legacyDateTime(row.updated_at, createdAt),
        deleted_at: null,
      })),
    ),
    products: await Promise.all(
      source.products.map(async (row) => {
        const id = idValue(row, 'products')
        const option = productOptions[id] ?? { trackExpiry: true, expiryDate: '' }
        const stock = numberValue(row.stock, 'products.stock')
        if (stock < 0) throw new Error(`Stok produk ${cleanText(row.nama)} tidak boleh negatif.`)
        const expiryDate = option.expiryDate
          ? dateValue(option.expiryDate, `Expiry ${cleanText(row.nama)}`)
          : null
        if (expiryDate && expiryDate < cutover) {
          throw new Error(`Expiry produk ${cleanText(row.nama)} tidak boleh sebelum cutover.`)
        }
        expiryByProduct.set(id, expiryDate)
        return {
          id: productIds.get(id),
          legacy_id: id,
          kode: cleanText(row.kode),
          nama: cleanText(row.nama),
          kategori_id: categoryIds.get(numberValue(row.kategori_id, 'products.kategori_id')),
          base_unit_id: unitIds.get(numberValue(row.satuan_id, 'products.satuan_id')),
          track_expiry: option.trackExpiry,
          expiry_alert_days: 30,
          min_stock_base: numberValue(row.min_stock ?? 0, 'products.min_stock'),
          stock_base: stock,
          status: activeStatus(row.status),
          created_at: legacyDateTime(row.created_at, createdAt),
          updated_at: legacyDateTime(row.updated_at, createdAt),
          deleted_at: null,
        }
      }),
    ),
    product_units: await Promise.all(
      source.products.map(async (row) => {
        const id = idValue(row, 'products')
        return {
          id: await legacyId('product_units', `${id}:base`),
          legacy_id: id,
          product_id: productIds.get(id),
          unit_id: unitIds.get(numberValue(row.satuan_id, 'products.satuan_id')),
          conversion_qty: 1,
          is_base: true,
          can_purchase: true,
          can_sell: true,
          is_default_purchase: true,
          is_default_sale: true,
          harga_beli_default: money(row.harga_beli, 'products.harga_beli'),
          harga_jual: money(row.harga_jual, 'products.harga_jual'),
          barcode: null,
          status: activeStatus(row.status),
          created_at: legacyDateTime(row.created_at, createdAt),
          updated_at: legacyDateTime(row.updated_at, createdAt),
        }
      }),
    ),
    purchases: await Promise.all(
      source.purchases.map(async (row) => {
        const id = idValue(row, 'purchases')
        const details = purchaseDetailsByPurchase.get(id) ?? []
        const subtotal = details.reduce(
          (sum, detail) => sum + money(detail.subtotal, 'purchase_details.subtotal'),
          0,
        )
        const discount = money(row.diskon, 'purchases.diskon')
        const date = transactionDate(row, cutover, `Pembelian ${cleanText(row.nomor_nota)}`)
        return {
          id: purchaseIds.get(id),
          legacy_id: id,
          nomor_nota: cleanText(row.nomor_nota),
          tanggal: date,
          supplier_id: row.supplier_id
            ? supplierIds.get(numberValue(row.supplier_id, 'purchases.supplier_id'))
            : null,
          metode_pembayaran: paymentMethod(row.metode_pembayaran),
          subtotal,
          diskon: discount,
          biaya_angkut: 0,
          total: subtotal - discount,
          bayar: money(row.bayar, 'purchases.bayar'),
          status: statusValue(row.status, 'purchases.status'),
          keterangan: cleanText(row.keterangan),
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
          updated_at: legacyDateTime(row.updated_at, `${date}T00:00:00.000Z`),
          deleted_at: null,
        }
      }),
    ),
    purchase_items: await Promise.all(
      source.purchase_details.map(async (row) => {
        const id = idValue(row, 'purchase_details')
        const purchaseId = numberValue(row.purchase_id, 'purchase_details.purchase_id')
        const productId = numberValue(row.product_id, 'purchase_details.product_id')
        const qty = numberValue(row.qty, 'purchase_details.qty')
        const subtotal = money(row.subtotal, 'purchase_details.subtotal')
        const discount = money(row.diskon, 'purchase_details.diskon')
        const date = dateValue(purchaseById.get(purchaseId)?.tanggal, 'purchases.tanggal')
        return {
          id: purchaseItemIds.get(id),
          legacy_id: id,
          purchase_id: purchaseIds.get(purchaseId),
          product_id: productIds.get(productId),
          unit_id: unitIds.get(
            numberValue(productById.get(productId)?.satuan_id, 'products.satuan_id'),
          ),
          qty_unit: qty,
          conversion_qty: 1,
          qty_base: qty,
          harga_beli_unit: money(row.harga_beli, 'purchase_details.harga_beli'),
          diskon: discount,
          subtotal,
          expiry_date: null,
          lot_code: `LEGACY-${id}`,
          unit_cost_base: openingCost.get(productId) ?? 0,
          lot_id: null,
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
        }
      }),
    ),
    sales: await Promise.all(
      source.sales.map(async (row) => {
        const id = idValue(row, 'sales')
        const details = saleDetailsBySale.get(id) ?? []
        const subtotal = details.reduce(
          (sum, detail) => sum + money(detail.subtotal, 'sale_details.subtotal'),
          0,
        )
        const discount = money(row.diskon, 'sales.diskon')
        const hpp = details.reduce((sum, detail) => {
          const productId = numberValue(detail.product_id, 'sale_details.product_id')
          return sum + money(detail.qty, 'sale_details.qty') * (openingCost.get(productId) ?? 0)
        }, 0)
        const date = transactionDate(row, cutover, `Penjualan ${cleanText(row.nomor_nota)}`)
        return {
          id: saleIds.get(id),
          legacy_id: id,
          nomor_nota: cleanText(row.nomor_nota),
          tanggal: date,
          customer_id: row.customer_id
            ? customerIds.get(numberValue(row.customer_id, 'sales.customer_id'))
            : null,
          metode_pembayaran: paymentMethod(row.metode_pembayaran),
          subtotal,
          diskon: discount,
          total: subtotal - discount,
          bayar: money(row.bayar, 'sales.bayar'),
          hpp_total: roundCost(hpp),
          gross_profit: roundCost(subtotal - discount - hpp),
          status: statusValue(row.status, 'sales.status'),
          keterangan: cleanText(row.keterangan),
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
          updated_at: legacyDateTime(row.updated_at, `${date}T00:00:00.000Z`),
          deleted_at: null,
        }
      }),
    ),
    sale_items: await Promise.all(
      source.sale_details.map(async (row) => {
        const id = idValue(row, 'sale_details')
        const productId = numberValue(row.product_id, 'sale_details.product_id')
        const saleId = numberValue(row.sale_id, 'sale_details.sale_id')
        const qty = numberValue(row.qty, 'sale_details.qty')
        const hpp = roundCost(qty * (openingCost.get(productId) ?? 0))
        const subtotal = money(row.subtotal, 'sale_details.subtotal')
        const date = dateValue(saleById.get(saleId)?.tanggal, 'sales.tanggal')
        return {
          id: saleItemIds.get(id),
          legacy_id: id,
          sale_id: saleIds.get(saleId),
          product_id: productIds.get(productId),
          unit_id: unitIds.get(
            numberValue(productById.get(productId)?.satuan_id, 'products.satuan_id'),
          ),
          qty_unit: qty,
          conversion_qty: 1,
          qty_base: qty,
          harga_jual_unit: money(row.harga_jual, 'sale_details.harga_jual'),
          diskon: money(row.diskon, 'sale_details.diskon'),
          subtotal,
          hpp_total: hpp,
          gross_profit: roundCost(subtotal - hpp),
          hpp_is_estimated: true,
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
        }
      }),
    ),
    expenses: await Promise.all(
      source.expenses.map(async (row) => {
        const id = idValue(row, 'expenses')
        const date = transactionDate(row, cutover, `Beban ${cleanText(row.nomor_transaksi)}`)
        return {
          id: await legacyId('expenses', id),
          legacy_id: id,
          nomor_transaksi: cleanText(row.nomor_transaksi),
          tanggal: date,
          expense_category_id: expenseCategoryIds.get(
            numberValue(row.expense_category_id, 'expenses.expense_category_id'),
          ),
          keterangan: cleanText(row.keterangan),
          nominal: money(row.nominal, 'expenses.nominal'),
          metode_pembayaran: paymentMethod(row.metode_pembayaran),
          status: statusValue(row.status, 'expenses.status'),
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
          updated_at: legacyDateTime(row.updated_at, `${date}T00:00:00.000Z`),
          deleted_at: null,
        }
      }),
    ),
    stock_opnames: await Promise.all(
      source.stock_opnames.map(async (row) => {
        const id = idValue(row, 'stock_opnames')
        const date = transactionDate(
          { tanggal: row.tanggal },
          cutover,
          `Opname ${cleanText(row.nomor_opname)}`,
        )
        return {
          id: opnameIds.get(id),
          legacy_id: id,
          nomor: cleanText(row.nomor_opname),
          tanggal: date,
          status: 'completed',
          keterangan: cleanText(row.keterangan),
          created_at: legacyDateTime(row.created_at, `${date}T00:00:00.000Z`),
          updated_at: legacyDateTime(row.updated_at, `${date}T00:00:00.000Z`),
          deleted_at: null,
        }
      }),
    ),
    stock_opname_items: await Promise.all(
      source.stock_opname_details.map(async (row) => {
        const id = idValue(row, 'stock_opname_details')
        const productId = numberValue(row.product_id, 'stock_opname_details.product_id')
        const opnameId = numberValue(row.stock_opname_id, 'stock_opname_details.stock_opname_id')
        return {
          id: opnameItemIds.get(id),
          legacy_id: id,
          opname_id: opnameIds.get(opnameId),
          product_id: productIds.get(productId),
          unit_id: unitIds.get(
            numberValue(productById.get(productId)?.satuan_id, 'products.satuan_id'),
          ),
          qty_unit: numberValue(row.stock_fisik, 'stock_opname_details.stock_fisik'),
          conversion_qty: 1,
          system_qty_base: numberValue(row.stock_sistem, 'stock_opname_details.stock_sistem'),
          physical_qty_base: numberValue(row.stock_fisik, 'stock_opname_details.stock_fisik'),
          diff_base: numberValue(row.selisih, 'stock_opname_details.selisih'),
          diff_cost: 0,
          created_at: legacyDateTime(row.created_at, createdAt),
        }
      }),
    ),
  }

  const productRows = tables.products ?? []
  const openingLots: LegacyRow[] = []
  const openingMovements: LegacyRow[] = []
  let quarantineCount = 0
  for (const row of productRows) {
    const productId = idValue({ id: row.legacy_id }, 'products')
    const stock = numberValue(row.stock_base, 'mapped product stock')
    if (stock <= 0) continue
    const option = productOptions[productId] ?? { trackExpiry: true, expiryDate: '' }
    const expiryDate = expiryByProduct.get(productId) ?? null
    const quarantined = option.trackExpiry && !expiryDate
    if (quarantined) quarantineCount += 1
    const id = await legacyId('stock_lots', productId)
    const unitCost = openingCost.get(productId) ?? 0
    const receivedAt = `${cutover}T00:00:00.000+07:00`
    openingLots.push({
      id,
      product_id: productIds.get(productId),
      purchase_id: null,
      purchase_item_id: null,
      lot_code: `OPEN-${cleanText(row.kode, String(productId))}`,
      received_at: receivedAt,
      expiry_date: expiryDate,
      qty_received_base: stock,
      qty_remaining_base: stock,
      unit_cost_base: unitCost,
      source: 'import',
      status: quarantined ? 'quarantined' : 'active',
      created_at: createdAt,
      updated_at: createdAt,
    })
    openingMovements.push({
      id: await legacyId('stock_movements', `opening:${productId}`),
      product_id: productIds.get(productId),
      lot_id: id,
      tanggal: cutover,
      tipe: 'import_opening',
      qty_unit: stock,
      conversion_qty: 1,
      qty_base: stock,
      unit_cost_base: unitCost,
      stock_before_base: 0,
      stock_after_base: stock,
      ref_type: 'migration',
      ref_id: 'laravel-import',
      keterangan: 'Opening lot hasil migrasi Laravel.',
      created_at: createdAt,
    })
  }
  tables.stock_lots = openingLots
  tables.stock_movements = openingMovements

  const importedCounts = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, rows?.length ?? 0]),
  )
  importedCounts.stock_movements = openingMovements.length
  const openingQtyByProduct = new Map<string, number>()
  for (const lot of openingLots) {
    const productId = String(lot.product_id)
    openingQtyByProduct.set(
      productId,
      (openingQtyByProduct.get(productId) ?? 0) + Number(lot.qty_remaining_base),
    )
  }
  const plan: MigrationPlan = {
    cutoverDate: cutover,
    tables,
    sourceCounts: preview.counts,
    importedCounts,
    totals: preview.totals,
    quarantineCount,
    stockReconciles: productRows.every(
      (row) => Number(row.stock_base) === (openingQtyByProduct.get(String(row.id)) ?? 0),
    ),
  }
  return plan
}

const REPLACED_TABLES: Array<(typeof DOMAIN_TABLE_NAMES)[number]> = [
  'product_categories',
  'units',
  'products',
  'product_units',
  'suppliers',
  'customers',
  'expense_categories',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'sale_lot_consumptions',
  'stock_lots',
  'stock_movements',
  'stock_opnames',
  'stock_opname_items',
  'stock_writeoffs',
  'stock_writeoff_items',
  'expenses',
]

export async function commitMigration(plan: MigrationPlan): Promise<MigrationResult> {
  if (!plan.stockReconciles) throw new Error('Rekonsiliasi stok gagal. Data tidak diubah.')
  const completedAt = nowIso()
  const log: AuditLog = {
    id: uuidv7(),
    timestamp: completedAt,
    action: 'laravel_migration_imported',
    entity: 'migration',
    entity_id: null,
    payload: {
      cutoverDate: plan.cutoverDate,
      sourceCounts: plan.sourceCounts,
      importedCounts: plan.importedCounts,
      totals: plan.totals,
      quarantineCount: plan.quarantineCount,
      stockReconciles: plan.stockReconciles,
    },
    note: 'Import data historis Laravel dan pembentukan opening lot berhasil.',
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of REPLACED_TABLES) await db.table(table).clear()
    for (const [table, rows] of Object.entries(plan.tables)) {
      if (!rows || rows.length === 0) continue
      await db.table(table).bulkPut(rows)
    }
    await db.settings.put({
      key: 'cutover_date',
      value: plan.cutoverDate,
      updated_at: completedAt,
    })
    await db.audit_logs.add(log)
    const excess = (await db.audit_logs.count()) - 1000
    if (excess > 0) {
      const ids = await db.audit_logs.orderBy('timestamp').limit(excess).primaryKeys()
      await db.audit_logs.bulkDelete(ids)
    }
  })

  return {
    cutoverDate: plan.cutoverDate,
    sourceCounts: plan.sourceCounts,
    importedCounts: plan.importedCounts,
    totals: plan.totals,
    quarantineCount: plan.quarantineCount,
    stockReconciles: plan.stockReconciles,
    completedAt,
    safetyBackupRequired: true,
  }
}
