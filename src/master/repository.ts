import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import type {
  Customer,
  ExpenseCategory,
  Product,
  ProductCategory,
  ProductUnit,
  StockLot,
  StockMovement,
  Supplier,
  Unit,
} from '@/db/schema'
import { nowIso, todayJakarta } from '@/utils/date'
import { uuidv7 } from '@/utils/id'
import type {
  ExpenseCategoryDraft,
  MasterCounts,
  MasterDeleteMode,
  PartnerDraft,
  ProductActivity,
  ProductCategoryDraft,
  ProductDraft,
  ProductUnitDraft,
  UnitDraft,
} from './types'
import {
  nextCode,
  normalizeBarcode,
  normalizeCode,
  normalizeName,
  toBaseQuantity,
  unitRowError,
  validateCode,
  validateDate,
  validateInteger,
  validateProductUnits,
  validateRequiredName,
} from './validation'

export interface ProductSaveResult {
  id: string
  mode: 'created' | 'updated'
}

function clean(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function sortByName<T extends { nama: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
}

function emptyActivity(): ProductActivity {
  return {
    hasActivity: false,
    lots: 0,
    movements: 0,
    purchases: 0,
    sales: 0,
    opnames: 0,
    writeoffs: 0,
  }
}

export async function getProductActivity(productId: string): Promise<ProductActivity> {
  const [lots, movements, purchases, sales, opnames, writeoffs] = await Promise.all([
    db.stock_lots.where('product_id').equals(productId).count(),
    db.stock_movements.where('product_id').equals(productId).count(),
    db.purchase_items.where('product_id').equals(productId).count(),
    db.sale_items.where('product_id').equals(productId).count(),
    db.stock_opname_items.where('product_id').equals(productId).count(),
    db.stock_writeoff_items.where('product_id').equals(productId).count(),
  ])

  return {
    hasActivity: lots + movements + purchases + sales + opnames + writeoffs > 0,
    lots,
    movements,
    purchases,
    sales,
    opnames,
    writeoffs,
  }
}

async function assertCategoryCodeUnique(code: string, exceptId?: string): Promise<void> {
  const normalized = normalizeCode(code)
  const rows = await db.product_categories.toArray()
  if (rows.some((row) => row.id !== exceptId && normalizeCode(row.kode) === normalized)) {
    throw new Error('Kode kategori sudah dipakai.')
  }
}

async function assertProductCodeUnique(code: string, exceptId?: string): Promise<void> {
  const normalized = normalizeCode(code)
  const rows = await db.products.toArray()
  if (rows.some((row) => row.id !== exceptId && normalizeCode(row.kode) === normalized)) {
    throw new Error('Kode produk sudah dipakai.')
  }
}

async function assertPartnerCodeUnique(
  table: 'suppliers' | 'customers' | 'expense_categories',
  code: string,
  exceptId?: string,
): Promise<void> {
  const normalized = normalizeCode(code)
  const rows = await db.table(table).toArray()
  if (rows.some((row) => row.id !== exceptId && normalizeCode(String(row.kode)) === normalized)) {
    throw new Error('Kode sudah dipakai.')
  }
}

async function assertUnitNameUnique(name: string, exceptId?: string): Promise<void> {
  const normalized = normalizeName(name).toLocaleLowerCase('id')
  const rows = await db.units.toArray()
  if (
    rows.some(
      (row) =>
        row.id !== exceptId && normalizeName(row.nama).toLocaleLowerCase('id') === normalized,
    )
  ) {
    throw new Error('Nama satuan sudah dipakai.')
  }
}

export async function listMasterCounts(): Promise<MasterCounts> {
  const [categories, units, products, suppliers, customers, expenseCategories] = await Promise.all([
    db.product_categories.count(),
    db.units.count(),
    db.products.count(),
    db.suppliers.count(),
    db.customers.count(),
    db.expense_categories.count(),
  ])

  return { categories, units, products, suppliers, customers, expenseCategories }
}

export async function listCategories(): Promise<ProductCategory[]> {
  return sortByName(await db.product_categories.toArray())
}

export async function listUnits(): Promise<Unit[]> {
  return sortByName(await db.units.toArray())
}

export async function listProducts(): Promise<Product[]> {
  return sortByName(await db.products.toArray())
}

export async function listProductUnits(): Promise<ProductUnit[]> {
  return db.product_units.toArray()
}

export async function listSuppliers(): Promise<Supplier[]> {
  return sortByName(await db.suppliers.toArray())
}

export async function listCustomers(): Promise<Customer[]> {
  return sortByName(await db.customers.toArray())
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return sortByName(await db.expense_categories.toArray())
}

export async function generateProductCode(categoryId: string): Promise<string> {
  const category = await db.product_categories.get(categoryId)
  if (!category) {
    throw new Error('Kategori produk tidak ditemukan.')
  }

  const products = await db.products.toArray()
  return nextCode(
    category.kode,
    products.map((product) => product.kode),
  )
}

export async function suggestPartnerCode(
  table: 'suppliers' | 'customers' | 'expense_categories',
): Promise<string> {
  const prefix = table === 'suppliers' ? 'SUP' : table === 'customers' ? 'CUST' : 'BB'
  const rows = await db.table(table).toArray()
  return nextCode(
    prefix,
    rows.map((row) => String(row.kode)),
  )
}

export async function saveCategory(
  input: ProductCategoryDraft,
  id?: string,
): Promise<ProductCategory> {
  const codeError = validateCode(input.kode, 'Kode kategori')
  if (codeError) throw new Error(codeError)

  const nameError = validateRequiredName(input.nama, 'Nama kategori')
  if (nameError) throw new Error(nameError)

  const existing = id ? await db.product_categories.get(id) : undefined
  if (id && !existing) throw new Error('Kategori tidak ditemukan.')

  const code = normalizeCode(input.kode)
  await assertCategoryCodeUnique(code, id)
  const now = nowIso()
  const row: ProductCategory = {
    id: existing?.id ?? uuidv7(),
    kode: code,
    nama: normalizeName(input.nama),
    deskripsi: clean(input.deskripsi),
    status: input.status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.product_categories.put(row)
  await writeAuditLog({
    action: existing ? 'master_updated' : 'master_created',
    entity: 'product_categories',
    entity_id: row.id,
    payload: { kode: row.kode, nama: row.nama },
  })

  return row
}

export async function saveUnit(input: UnitDraft, id?: string): Promise<Unit> {
  const nameError = validateRequiredName(input.nama, 'Nama satuan')
  if (nameError) throw new Error(nameError)

  const existing = id ? await db.units.get(id) : undefined
  if (id && !existing) throw new Error('Satuan tidak ditemukan.')

  await assertUnitNameUnique(input.nama, id)
  const now = nowIso()
  const row: Unit = {
    id: existing?.id ?? uuidv7(),
    nama: normalizeName(input.nama),
    simbol: clean(input.simbol) || null,
    status: input.status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.units.put(row)
  await writeAuditLog({
    action: existing ? 'master_updated' : 'master_created',
    entity: 'units',
    entity_id: row.id,
    payload: { nama: row.nama, simbol: row.simbol },
  })

  return row
}

async function savePartner(
  table: 'suppliers' | 'customers',
  prefix: 'SUP' | 'CUST',
  input: PartnerDraft,
  id?: string,
): Promise<Supplier | Customer> {
  const nameError = validateRequiredName(input.nama, 'Nama')
  if (nameError) throw new Error(nameError)

  const existing = id ? await db.table(table).get(id) : undefined
  if (id && !existing) throw new Error('Data tidak ditemukan.')

  const rows = await db.table(table).toArray()
  const code =
    normalizeCode(input.kode) ||
    nextCode(
      prefix,
      rows.map((row) => String(row.kode)),
    )
  const codeError = validateCode(code, 'Kode')
  if (codeError) throw new Error(codeError)
  await assertPartnerCodeUnique(table, code, id)

  const now = nowIso()
  const row = {
    id: existing?.id ?? uuidv7(),
    kode: code,
    nama: normalizeName(input.nama),
    telepon: clean(input.telepon),
    alamat: clean(input.alamat),
    catatan: clean(input.catatan),
    status: input.status,
    created_at: typeof existing?.created_at === 'string' ? existing.created_at : now,
    updated_at: now,
    deleted_at: null,
  } as Supplier | Customer

  await db.table(table).put(row)
  await writeAuditLog({
    action: existing ? 'master_updated' : 'master_created',
    entity: table,
    entity_id: row.id,
    payload: { kode: row.kode, nama: row.nama },
  })

  return row
}

export async function saveSupplier(input: PartnerDraft, id?: string): Promise<Supplier> {
  return savePartner('suppliers', 'SUP', input, id) as Promise<Supplier>
}

export async function saveCustomer(input: PartnerDraft, id?: string): Promise<Customer> {
  return savePartner('customers', 'CUST', input, id) as Promise<Customer>
}

export async function saveExpenseCategory(
  input: ExpenseCategoryDraft,
  id?: string,
): Promise<ExpenseCategory> {
  const nameError = validateRequiredName(input.nama, 'Nama kategori beban')
  if (nameError) throw new Error(nameError)

  const existing = id ? await db.expense_categories.get(id) : undefined
  if (id && !existing) throw new Error('Kategori beban tidak ditemukan.')

  const rows = await db.expense_categories.toArray()
  const code =
    normalizeCode(input.kode) ||
    nextCode(
      'BB',
      rows.map((row) => row.kode),
    )
  const codeError = validateCode(code, 'Kode')
  if (codeError) throw new Error(codeError)
  await assertPartnerCodeUnique('expense_categories', code, id)

  const now = nowIso()
  const row: ExpenseCategory = {
    id: existing?.id ?? uuidv7(),
    kode: code,
    nama: normalizeName(input.nama),
    deskripsi: clean(input.deskripsi),
    status: input.status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.expense_categories.put(row)
  await writeAuditLog({
    action: existing ? 'master_updated' : 'master_created',
    entity: 'expense_categories',
    entity_id: row.id,
    payload: { kode: row.kode, nama: row.nama },
  })

  return row
}

async function normalizeProductUnits(
  draft: ProductDraft,
  productId: string,
  existingRows: ProductUnit[],
  activity: ProductActivity,
): Promise<{ rows: ProductUnit[]; removedIds: string[] }> {
  const unitRows = await db.units.toArray()
  const unitsById = new Map(unitRows.map((unit) => [unit.id, unit]))
  const existingByUnit = new Map(existingRows.map((row) => [row.unit_id, row]))
  const baseUnit = unitsById.get(draft.base_unit_id)

  if (!baseUnit) {
    throw new Error('Base unit tidak ditemukan.')
  }

  if (activity.hasActivity && existingRows.length > 0) {
    const previousProduct = await db.products.get(productId)
    if (previousProduct && previousProduct.base_unit_id !== draft.base_unit_id) {
      throw new Error(
        'Base unit tidak dapat diubah setelah produk memiliki stok, lot, atau transaksi.',
      )
    }
  }

  if (draft.units.length === 0) {
    throw new Error('Minimal satu satuan produk wajib diisi.')
  }

  const inputUnitIds = new Set<string>()
  for (const row of draft.units) {
    if (inputUnitIds.has(row.unit_id)) {
      throw new Error('Satu produk tidak boleh memiliki dua baris dengan satuan yang sama.')
    }
    inputUnitIds.add(row.unit_id)

    const unit = unitsById.get(row.unit_id)
    if (!unit) {
      throw new Error('Satuan produk tidak ditemukan.')
    }

    if (unit.status !== 'active' && !existingByUnit.has(row.unit_id)) {
      throw new Error(`Satuan ${unit.nama} tidak aktif dan tidak dapat dipakai.`)
    }
  }

  const baseRow = draft.units.find((row) => row.unit_id === draft.base_unit_id)
  if (!baseRow) {
    throw new Error('Base unit wajib memiliki baris satuan dengan konversi 1.')
  }

  const now = nowIso()
  const rows: ProductUnit[] = draft.units.map((inputRow) => {
    const existing = existingByUnit.get(inputRow.unit_id)
    const conversion = Number(inputRow.conversion_qty)
    const isBase = inputRow.unit_id === draft.base_unit_id
    const isActive = isBase || inputRow.status === 'active'
    const canPurchase = isActive && Boolean(inputRow.can_purchase)
    const canSell = isActive && Boolean(inputRow.can_sell)

    if (activity.hasActivity && existing && existing.conversion_qty !== conversion) {
      throw new Error(
        `Konversi satuan ${unitsById.get(inputRow.unit_id)?.nama ?? ''} tidak dapat diubah setelah produk memiliki transaksi atau lot.`,
      )
    }

    if (isBase && conversion !== 1) {
      throw new Error('Base unit wajib memiliki konversi 1.')
    }

    return {
      id: existing?.id ?? uuidv7(),
      product_id: productId,
      unit_id: inputRow.unit_id,
      conversion_qty: conversion,
      is_base: isBase,
      can_purchase: canPurchase,
      can_sell: canSell,
      is_default_purchase: canPurchase && Boolean(inputRow.is_default_purchase),
      is_default_sale: canSell && Boolean(inputRow.is_default_sale),
      harga_beli_default: Number(inputRow.harga_beli_default) || 0,
      harga_jual: Number(inputRow.harga_jual) || 0,
      barcode: normalizeBarcode(inputRow.barcode),
      status: isActive ? 'active' : 'inactive',
      created_at: existing?.created_at ?? now,
      updated_at: now,
    }
  })

  for (const row of rows) {
    if (row.unit_id === draft.base_unit_id && row.status !== 'active') {
      throw new Error('Base unit wajib berstatus aktif.')
    }
  }

  const saleCandidates = rows.filter((row) => row.can_sell)
  if (saleCandidates.length > 0 && saleCandidates.every((row) => !row.is_default_sale)) {
    saleCandidates[0]!.is_default_sale = true
  }

  const purchaseCandidates = rows.filter((row) => row.can_purchase)
  if (
    purchaseCandidates.length > 0 &&
    purchaseCandidates.every((row) => !row.is_default_purchase)
  ) {
    purchaseCandidates[0]!.is_default_purchase = true
  }

  const normalizedDraftRows: ProductUnitDraft[] = rows.map((row) => ({
    id: row.id,
    unit_id: row.unit_id,
    conversion_qty: row.conversion_qty,
    is_base: row.is_base,
    can_purchase: row.can_purchase,
    can_sell: row.can_sell,
    is_default_purchase: row.is_default_purchase,
    is_default_sale: row.is_default_sale,
    harga_beli_default: row.harga_beli_default,
    harga_jual: row.harga_jual,
    barcode: row.barcode ?? '',
    status: row.status,
  }))

  const unitError = validateProductUnits(normalizedDraftRows, draft.base_unit_id)
  if (unitError) {
    throw new Error(unitError)
  }

  for (const row of normalizedDraftRows) {
    const rowError = unitRowError(row, draft.base_unit_id)
    if (rowError) throw new Error(rowError)
  }

  const removedIds: string[] = []
  for (const existing of existingRows) {
    if (inputUnitIds.has(existing.unit_id)) continue

    if (existing.is_base) {
      throw new Error('Base unit tidak dapat dihapus.')
    }

    if (activity.hasActivity) {
      throw new Error(
        'Satuan produk tidak dapat dihapus setelah produk memiliki transaksi atau lot. Nonaktifkan satuan tersebut.',
      )
    }

    const [purchaseUsage, saleUsage] = await Promise.all([
      db.purchase_items
        .filter((item) => item.product_id === productId && item.unit_id === existing.unit_id)
        .count(),
      db.sale_items
        .filter((item) => item.product_id === productId && item.unit_id === existing.unit_id)
        .count(),
    ])

    if (purchaseUsage + saleUsage > 0) {
      throw new Error('Satuan sudah dipakai transaksi. Nonaktifkan satuan, jangan dihapus.')
    }

    removedIds.push(existing.id)
  }

  const barcodeOwners = new Map<string, string>()
  const allRows = await db.product_units.toArray()
  for (const row of allRows) {
    if (!row.barcode) continue
    barcodeOwners.set(row.barcode, row.id)
  }

  const currentRowIds = new Set(rows.map((row) => row.id))
  const seenBarcodes = new Set<string>()

  for (const row of rows) {
    if (!row.barcode) continue

    if (seenBarcodes.has(row.barcode)) {
      throw new Error(`Barcode ${row.barcode} dipakai lebih dari satu satuan.`)
    }
    seenBarcodes.add(row.barcode)

    const owner = barcodeOwners.get(row.barcode)
    if (owner && !currentRowIds.has(owner)) {
      throw new Error(`Barcode ${row.barcode} sudah dipakai produk lain.`)
    }
  }

  return { rows, removedIds }
}

export async function saveProduct(draft: ProductDraft, id?: string): Promise<ProductSaveResult> {
  const nameError = validateRequiredName(draft.nama, 'Nama produk')
  if (nameError) throw new Error(nameError)

  if (!draft.kategori_id) throw new Error('Kategori produk wajib dipilih.')
  if (!draft.base_unit_id) throw new Error('Base unit wajib dipilih.')

  const category = await db.product_categories.get(draft.kategori_id)
  if (!category) throw new Error('Kategori produk tidak ditemukan.')
  if (!id && category.status !== 'active') {
    throw new Error('Kategori produk tidak aktif.')
  }

  const baseUnit = await db.units.get(draft.base_unit_id)
  if (!baseUnit) throw new Error('Base unit tidak ditemukan.')
  if (!id && baseUnit.status !== 'active') {
    throw new Error('Base unit tidak aktif.')
  }

  const minStockError = validateInteger(draft.min_stock_base, 'Minimum stok', { min: 0 })
  if (minStockError) throw new Error(minStockError)

  if (!id) {
    const openingError = validateInteger(draft.opening_stock_base, 'Stok awal', { min: 0 })
    if (openingError) throw new Error(openingError)
  } else if (Number(draft.opening_stock_base) > 0) {
    throw new Error('Stok awal hanya dapat diisi saat membuat produk baru.')
  }

  if (draft.track_expiry) {
    const alertError = validateInteger(draft.expiry_alert_days ?? 30, 'Batas peringatan expiry', {
      min: 0,
      max: 3650,
    })
    if (alertError) throw new Error(alertError)
  }

  const openingStock = id ? 0 : Number(draft.opening_stock_base) || 0
  const openingExpiry = draft.track_expiry ? clean(draft.opening_expiry_date) : ''

  if (draft.track_expiry && openingStock > 0) {
    if (!openingExpiry) {
      throw new Error('Expiry wajib diisi untuk produk ber-expiry yang memiliki stok awal.')
    }
    const expiryError = validateDate(openingExpiry, 'Expiry stok awal')
    if (expiryError) throw new Error(expiryError)
  }

  const existing = id ? await db.products.get(id) : undefined
  if (id && !existing) throw new Error('Produk tidak ditemukan.')

  const activity = existing ? await getProductActivity(existing.id) : emptyActivity()
  const existingRows = existing
    ? await db.product_units.where('product_id').equals(existing.id).toArray()
    : []
  const productId = existing?.id ?? uuidv7()

  const code = normalizeCode(draft.kode) || (await generateProductCode(draft.kategori_id))
  const codeError = validateCode(code, 'Kode produk')
  if (codeError) throw new Error(codeError)
  await assertProductCodeUnique(code, id)

  const units = await normalizeProductUnits(draft, productId, existingRows, activity)
  const now = nowIso()
  let openedLotId: string | null = null

  const product: Product = {
    id: productId,
    kode: code,
    nama: normalizeName(draft.nama),
    kategori_id: draft.kategori_id,
    base_unit_id: draft.base_unit_id,
    track_expiry: draft.track_expiry,
    expiry_alert_days: draft.track_expiry ? Number(draft.expiry_alert_days ?? 30) : null,
    min_stock_base: Number(draft.min_stock_base) || 0,
    stock_base: existing?.stock_base ?? 0,
    status: draft.status,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction(
    'rw',
    [db.products, db.product_units, db.stock_lots, db.stock_movements],
    async () => {
      await db.products.put(product)
      await db.product_units.bulkPut(units.rows)
      if (units.removedIds.length > 0) {
        await db.product_units.bulkDelete(units.removedIds)
      }

      if (openingStock > 0) {
        const baseRow = units.rows.find((row) => row.unit_id === draft.base_unit_id)
        const unitCost = Math.max(0, Number(baseRow?.harga_beli_default ?? 0))
        const today = todayJakarta()
        const lot: StockLot = {
          id: uuidv7(),
          product_id: product.id,
          purchase_id: null,
          purchase_item_id: null,
          lot_code:
            clean(draft.opening_lot_code) || `OPEN-${product.kode}-${today.replaceAll('-', '')}`,
          received_at: today,
          expiry_date: openingExpiry || null,
          qty_received_base: openingStock,
          qty_remaining_base: openingStock,
          unit_cost_base: unitCost,
          source: 'opening',
          status: 'active',
          created_at: now,
          updated_at: now,
        }
        const movement: StockMovement = {
          id: uuidv7(),
          product_id: product.id,
          lot_id: lot.id,
          tanggal: today,
          tipe: 'opening',
          qty_unit: openingStock,
          conversion_qty: 1,
          qty_base: openingStock,
          unit_cost_base: unitCost,
          stock_before_base: 0,
          stock_after_base: openingStock,
          ref_type: 'product',
          ref_id: product.id,
          keterangan: 'Stok awal saat produk dibuat.',
          created_at: now,
        }

        product.stock_base = openingStock
        await db.products.put(product)
        await db.stock_lots.add(lot)
        await db.stock_movements.add(movement)
        openedLotId = lot.id
      }
    },
  )

  await writeAuditLog({
    action: existing ? 'master_updated' : 'master_created',
    entity: 'products',
    entity_id: product.id,
    payload: {
      kode: product.kode,
      nama: product.nama,
      units: units.rows.length,
      opening_stock_base: openingStock,
    },
  })

  if (openedLotId) {
    await writeAuditLog({
      action: 'opening_stock_created',
      entity: 'stock_lots',
      entity_id: openedLotId,
      payload: {
        product_id: product.id,
        qty_base: openingStock,
        expiry_date: openingExpiry || null,
      },
    })
  }

  return { id: product.id, mode: existing ? 'updated' : 'created' }
}

export async function removeCategory(id: string): Promise<MasterDeleteMode> {
  const category = await db.product_categories.get(id)
  if (!category) throw new Error('Kategori tidak ditemukan.')

  const used = await db.products.where('kategori_id').equals(id).count()
  if (used > 0) {
    await db.product_categories.put({
      ...category,
      status: 'inactive',
      updated_at: nowIso(),
    })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'product_categories',
      entity_id: id,
      note: 'Kategori masih dipakai produk sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.product_categories.delete(id)
  await writeAuditLog({
    action: 'master_deleted',
    entity: 'product_categories',
    entity_id: id,
    payload: { kode: category.kode, nama: category.nama },
  })
  return 'deleted'
}

export async function removeUnit(id: string): Promise<MasterDeleteMode> {
  const unit = await db.units.get(id)
  if (!unit) throw new Error('Satuan tidak ditemukan.')

  const [baseUsage, productUnitUsage] = await Promise.all([
    db.products.where('base_unit_id').equals(id).count(),
    db.product_units.where('unit_id').equals(id).count(),
  ])

  if (baseUsage + productUnitUsage > 0) {
    await db.units.put({
      ...unit,
      status: 'inactive',
      updated_at: nowIso(),
    })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'units',
      entity_id: id,
      note: 'Satuan masih dipakai produk sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.units.delete(id)
  await writeAuditLog({
    action: 'master_deleted',
    entity: 'units',
    entity_id: id,
    payload: { nama: unit.nama },
  })
  return 'deleted'
}

export async function removeSupplier(id: string): Promise<MasterDeleteMode> {
  const supplier = await db.suppliers.get(id)
  if (!supplier) throw new Error('Supplier tidak ditemukan.')

  const used = await db.purchases.where('supplier_id').equals(id).count()
  if (used > 0) {
    await db.suppliers.put({ ...supplier, status: 'inactive', updated_at: nowIso() })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'suppliers',
      entity_id: id,
      note: 'Supplier masih dipakai pembelian sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.suppliers.delete(id)
  await writeAuditLog({
    action: 'master_deleted',
    entity: 'suppliers',
    entity_id: id,
    payload: { kode: supplier.kode, nama: supplier.nama },
  })
  return 'deleted'
}

export async function removeCustomer(id: string): Promise<MasterDeleteMode> {
  const customer = await db.customers.get(id)
  if (!customer) throw new Error('Pelanggan tidak ditemukan.')

  const used = await db.sales.where('customer_id').equals(id).count()
  if (used > 0) {
    await db.customers.put({ ...customer, status: 'inactive', updated_at: nowIso() })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'customers',
      entity_id: id,
      note: 'Pelanggan masih dipakai penjualan sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.customers.delete(id)
  await writeAuditLog({
    action: 'master_deleted',
    entity: 'customers',
    entity_id: id,
    payload: { kode: customer.kode, nama: customer.nama },
  })
  return 'deleted'
}

export async function removeExpenseCategory(id: string): Promise<MasterDeleteMode> {
  const category = await db.expense_categories.get(id)
  if (!category) throw new Error('Kategori beban tidak ditemukan.')

  const used = await db.expenses.where('expense_category_id').equals(id).count()
  if (used > 0) {
    await db.expense_categories.put({
      ...category,
      status: 'inactive',
      updated_at: nowIso(),
    })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'expense_categories',
      entity_id: id,
      note: 'Kategori beban masih dipakai sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.expense_categories.delete(id)
  await writeAuditLog({
    action: 'master_deleted',
    entity: 'expense_categories',
    entity_id: id,
    payload: { kode: category.kode, nama: category.nama },
  })
  return 'deleted'
}

export async function removeProduct(id: string): Promise<MasterDeleteMode> {
  const product = await db.products.get(id)
  if (!product) throw new Error('Produk tidak ditemukan.')

  const activity = await getProductActivity(id)
  if (activity.hasActivity) {
    await db.products.put({ ...product, status: 'inactive', updated_at: nowIso() })
    await writeAuditLog({
      action: 'master_deactivated',
      entity: 'products',
      entity_id: id,
      note: 'Produk masih memiliki stok, lot, atau transaksi sehingga dinonaktifkan.',
    })
    return 'inactive'
  }

  await db.transaction('rw', [db.products, db.product_units], async () => {
    await db.product_units.where('product_id').equals(id).delete()
    await db.products.delete(id)
  })

  await writeAuditLog({
    action: 'master_deleted',
    entity: 'products',
    entity_id: id,
    payload: { kode: product.kode, nama: product.nama },
  })
  return 'deleted'
}

export async function previewBaseQuantity(
  productId: string,
  unitId: string,
  qtyUnit: number,
): Promise<number> {
  const row = await db.product_units
    .where('[product_id+unit_id]')
    .equals([productId, unitId])
    .first()

  if (!row) throw new Error('Satuan produk tidak ditemukan.')

  const baseQty = toBaseQuantity(qtyUnit, row.conversion_qty)
  if (baseQty === null) {
    throw new Error('Qty base harus bilangan bulat. Gunakan satuan yang lebih kecil.')
  }

  return baseQty
}
