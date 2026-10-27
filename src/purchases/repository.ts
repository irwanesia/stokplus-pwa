import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import { getSetting } from '@/db/settings'
import type { Product, ProductUnit, Purchase, PurchaseItem } from '@/db/schema'
import { toBaseQuantity, validateInteger } from '@/master/validation'
import { normalizePrefix } from '@/utils/numbering'
import { nowIso, todayJakarta } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

import type {
  PurchaseDetail,
  PurchaseDraft,
  PurchaseListItem,
  PurchaseSaveOptions,
  PurchaseSaveResult,
} from './types'
import {
  allocatePurchaseCosts,
  computePurchaseTotals,
  lineSubtotal,
  validateExpiryForProduct,
  validatePurchaseHeader,
  validatePurchaseItem,
} from './validation'

interface ComputedLine {
  product: Product
  productUnit: ProductUnit
  qtyUnit: number
  conversionQty: number
  qtyBase: number
  hargaBeliUnit: number
  diskon: number
  subtotal: number
  expiryDate: string | null
  lotCode: string
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeLotCode(value: string): string {
  return value.trim().toUpperCase()
}

function autoLotCode(nomorNota: string, lineNumber: number): string {
  return `LOT-${nomorNota}-${lineNumber}`
}

function ensureUniquePurchaseNumber(number: string, id?: string): Promise<void> {
  return db.purchases
    .where('nomor_nota')
    .equals(number)
    .first()
    .then((existing) => {
      if (existing && existing.id !== id) {
        throw new Error(`Nomor nota ${number} sudah dipakai.`)
      }
    })
}

export async function nextPurchaseNumber(date = todayJakarta()): Promise<string> {
  const prefix = normalizePrefix(await getSetting('prefix_purchase'))
  const datePart = date.replaceAll('-', '')
  const pattern = new RegExp(`^${prefix}-${datePart}-(\\d+)$`)
  const rows = await db.purchases.toArray()
  let max = 0

  for (const row of rows) {
    const match = pattern.exec(row.nomor_nota)
    if (match) {
      max = Math.max(max, Number(match[1]))
    }
  }

  return `${prefix}-${datePart}-${String(max + 1).padStart(4, '0')}`
}

export function suggestLotCode(nomorNota: string, lineNumber: number): string {
  return autoLotCode(nomorNota, lineNumber)
}

async function buildLines(draft: PurchaseDraft): Promise<{ lines: ComputedLine[] }> {
  if (!draft.items.length) {
    throw new Error('Minimal satu barang wajib ditambahkan.')
  }

  const [supplier, products, productUnits, lots] = await Promise.all([
    db.suppliers.get(draft.supplier_id),
    db.products.toArray(),
    db.product_units.toArray(),
    db.stock_lots.toArray(),
  ])

  if (!supplier) {
    throw new Error('Supplier tidak ditemukan.')
  }

  if (supplier.status !== 'active') {
    throw new Error('Supplier tidak aktif dan tidak dapat dipakai untuk pembelian baru.')
  }

  const productsById = new Map(products.map((product) => [product.id, product]))
  const unitByProductUnit = new Map(
    productUnits.map((row) => [`${row.product_id}\u0000${row.unit_id}`, row]),
  )
  const usedLotKeys = new Set(
    lots.map((lot) => `${lot.product_id}\u0000${normalizeLotCode(lot.lot_code)}`),
  )
  const lines: ComputedLine[] = []

  for (const [index, item] of draft.items.entries()) {
    const product = productsById.get(item.product_id)
    if (!product) {
      throw new Error(`Produk baris ${index + 1} tidak ditemukan.`)
    }

    if (product.status !== 'active') {
      throw new Error(`Produk ${product.nama} tidak aktif.`)
    }

    const row = unitByProductUnit.get(`${product.id}\u0000${item.unit_id}`)
    if (!row) {
      throw new Error(`Satuan produk ${product.nama} tidak ditemukan.`)
    }

    if (row.status !== 'active' || !row.can_purchase) {
      throw new Error(`Satuan ${product.nama} tidak aktif untuk pembelian.`)
    }

    const quantityError = validatePurchaseItem(item)
    if (quantityError) {
      throw new Error(`${product.nama}: ${quantityError}`)
    }

    const qtyUnit = Number(item.qty_unit)
    const qtyBase = toBaseQuantity(qtyUnit, row.conversion_qty)

    if (qtyBase === null) {
      throw new Error(
        `${product.nama}: qty base harus bilangan bulat. Periksa qty dan konversi satuan.`,
      )
    }

    if (qtyBase <= 0) {
      throw new Error(`${product.nama}: qty base harus lebih dari 0.`)
    }

    const hargaError = validateInteger(item.harga_beli_unit, 'Harga beli', { min: 0 })
    if (hargaError) {
      throw new Error(`${product.nama}: ${hargaError}`)
    }

    const expiryError = validateExpiryForProduct(product.track_expiry, item.expiry_date)
    if (expiryError) {
      throw new Error(`${product.nama}: ${expiryError}`)
    }

    const lotCode = normalizeLotCode(item.lot_code) || autoLotCode(draft.nomor_nota, index + 1)
    const lotKey = `${product.id}\u0000${lotCode}`

    if (usedLotKeys.has(lotKey)) {
      throw new Error(`Lot code ${lotCode} sudah dipakai untuk produk ${product.nama}.`)
    }
    usedLotKeys.add(lotKey)

    lines.push({
      product,
      productUnit: row,
      qtyUnit,
      conversionQty: row.conversion_qty,
      qtyBase,
      hargaBeliUnit: Number(item.harga_beli_unit),
      diskon: Number(item.diskon),
      subtotal: lineSubtotal(item.qty_unit, item.harga_beli_unit, item.diskon),
      expiryDate: product.track_expiry ? item.expiry_date : null,
      lotCode,
    })
  }

  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const headerError = validatePurchaseHeader(draft, { subtotal })

  if (headerError) {
    throw new Error(headerError)
  }

  return { lines }
}

async function saveDraftPurchase(
  draft: PurchaseDraft,
  options: PurchaseSaveOptions,
): Promise<PurchaseSaveResult> {
  const now = nowIso()
  const existing = options.id ? await db.purchases.get(options.id) : undefined

  if (existing && existing.status !== 'draft') {
    throw new Error('Pembelian selesai atau batal tidak dapat diedit.')
  }

  const purchaseId = existing?.id ?? uuidv7()
  const nomorNota = draft.nomor_nota.trim() || (await nextPurchaseNumber(draft.tanggal))
  await ensureUniquePurchaseNumber(nomorNota, existing?.id)

  const { lines } = await buildLines({ ...draft, nomor_nota: nomorNota })
  const totals = computePurchaseTotals(lines, draft.diskon, draft.biaya_angkut)
  const complete = Boolean(options.complete)
  const headerError = validatePurchaseHeader(draft, {
    subtotal: totals.subtotal,
    complete,
  })
  if (headerError) throw new Error(headerError)

  const purchase: Purchase = {
    id: purchaseId,
    nomor_nota: nomorNota,
    tanggal: draft.tanggal,
    supplier_id: draft.supplier_id,
    metode_pembayaran: draft.metode_pembayaran,
    subtotal: totals.subtotal,
    diskon: totals.diskon,
    biaya_angkut: totals.biaya_angkut,
    total: totals.total,
    bayar: complete ? Number(draft.bayar) : Number(draft.bayar) || 0,
    status: complete ? 'completed' : 'draft',
    keterangan: clean(draft.keterangan),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  const allocation = complete
    ? allocatePurchaseCosts(
        lines.map((line) => ({
          subtotal: line.subtotal,
          qty_base: line.qtyBase,
        })),
        totals.diskon,
        totals.biaya_angkut,
      )
    : null
  const itemRows: PurchaseItem[] = lines.map((line, index) => ({
    id: uuidv7(),
    purchase_id: purchaseId,
    product_id: line.product.id,
    unit_id: line.productUnit.unit_id,
    qty_unit: line.qtyUnit,
    conversion_qty: line.conversionQty,
    qty_base: line.qtyBase,
    harga_beli_unit: line.hargaBeliUnit,
    diskon: line.diskon,
    subtotal: line.subtotal,
    expiry_date: line.expiryDate,
    lot_code: line.lotCode,
    unit_cost_base: allocation?.lines[index]?.unit_cost_base ?? 0,
    lot_id: null,
    created_at: now,
  }))

  await db.transaction(
    'rw',
    [db.purchases, db.purchase_items, db.stock_lots, db.stock_movements, db.products],
    async () => {
      if (existing) {
        await db.purchases.put(purchase)
        await db.purchase_items.where('purchase_id').equals(purchaseId).delete()
      } else {
        await db.purchases.add(purchase)
      }

      if (!complete) {
        await db.purchase_items.bulkAdd(itemRows)
        return
      }

      const stockByProduct = new Map<string, number>()
      for (const line of lines) {
        stockByProduct.set(
          line.product.id,
          stockByProduct.get(line.product.id) ?? line.product.stock_base,
        )
      }

      for (const [index, line] of lines.entries()) {
        const item = itemRows[index]
        const lineTotals = allocation!.lines[index]
        if (!item || !lineTotals) throw new Error('Alokasi HPP gagal dihitung.')

        const lotId = uuidv7()
        item.lot_id = lotId
        item.unit_cost_base = lineTotals.unit_cost_base

        await db.stock_lots.add({
          id: lotId,
          product_id: line.product.id,
          purchase_id: purchaseId,
          purchase_item_id: item.id,
          lot_code: line.lotCode,
          received_at: draft.tanggal,
          expiry_date: line.expiryDate,
          qty_received_base: line.qtyBase,
          qty_remaining_base: line.qtyBase,
          unit_cost_base: lineTotals.unit_cost_base,
          source: 'purchase',
          status: 'active',
          created_at: now,
          updated_at: now,
        })

        const stockBefore = stockByProduct.get(line.product.id) ?? 0
        const stockAfter = stockBefore + line.qtyBase
        stockByProduct.set(line.product.id, stockAfter)

        await db.products.update(line.product.id, {
          stock_base: stockAfter,
          updated_at: now,
        })

        await db.stock_movements.add({
          id: uuidv7(),
          product_id: line.product.id,
          lot_id: lotId,
          tanggal: draft.tanggal,
          tipe: 'purchase_in',
          qty_unit: line.qtyUnit,
          conversion_qty: line.conversionQty,
          qty_base: line.qtyBase,
          unit_cost_base: lineTotals.unit_cost_base,
          stock_before_base: stockBefore,
          stock_after_base: stockAfter,
          ref_type: 'purchase',
          ref_id: purchaseId,
          keterangan: `Pembelian ${nomorNota}`,
          created_at: now,
        })
      }

      await db.purchase_items.bulkAdd(itemRows)
    },
  )

  await writeAuditLog({
    action: complete ? 'purchase_completed' : existing ? 'purchase_updated' : 'purchase_created',
    entity: 'purchases',
    entity_id: purchaseId,
    payload: {
      nomor_nota: nomorNota,
      supplier_id: purchase.supplier_id,
      total: purchase.total,
      item_count: itemRows.length,
    },
  })

  return {
    id: purchaseId,
    nomor_nota: nomorNota,
    status: purchase.status,
    mode: complete ? 'completed' : existing ? 'updated' : 'created',
  }
}

export async function savePurchase(
  draft: PurchaseDraft,
  options: PurchaseSaveOptions = {},
): Promise<PurchaseSaveResult> {
  if (!options.complete) {
    return saveDraftPurchase(draft, options)
  }

  const existing = options.id ? await db.purchases.get(options.id) : undefined

  if (existing && existing.status !== 'draft') {
    throw new Error('Hanya draft yang dapat diselesaikan.')
  }

  return saveDraftPurchase(draft, { ...options, complete: true })
}

export async function listPurchases(): Promise<PurchaseListItem[]> {
  const [purchases, items] = await Promise.all([
    db.purchases.toArray(),
    db.purchase_items.toArray(),
  ])
  const countByPurchase = new Map<string, number>()

  for (const item of items) {
    countByPurchase.set(item.purchase_id, (countByPurchase.get(item.purchase_id) ?? 0) + 1)
  }

  return purchases
    .map((purchase) => ({
      ...purchase,
      item_count: countByPurchase.get(purchase.id) ?? 0,
    }))
    .sort((a, b) => {
      const byDate = b.tanggal.localeCompare(a.tanggal)
      if (byDate !== 0) return byDate
      return b.created_at.localeCompare(a.created_at)
    })
}

export async function getPurchaseDetail(id: string): Promise<PurchaseDetail | null> {
  const purchase = await db.purchases.get(id)
  if (!purchase) return null

  const [items, lots] = await Promise.all([
    db.purchase_items.where('purchase_id').equals(id).toArray(),
    db.stock_lots.where('purchase_id').equals(id).toArray(),
  ])

  return {
    purchase,
    items: items.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    lots,
  }
}

export async function deletePurchaseDraft(id: string): Promise<void> {
  const purchase = await db.purchases.get(id)
  if (!purchase) throw new Error('Pembelian tidak ditemukan.')
  if (purchase.status !== 'draft') {
    throw new Error('Hanya draft yang dapat dihapus.')
  }

  await db.transaction('rw', [db.purchases, db.purchase_items], async () => {
    await db.purchase_items.where('purchase_id').equals(id).delete()
    await db.purchases.delete(id)
  })

  await writeAuditLog({
    action: 'purchase_deleted',
    entity: 'purchases',
    entity_id: id,
    payload: { nomor_nota: purchase.nomor_nota },
  })
}

export async function cancelPurchase(id: string): Promise<void> {
  const now = nowIso()

  await db.transaction(
    'rw',
    [
      db.purchases,
      db.purchase_items,
      db.stock_lots,
      db.stock_movements,
      db.products,
      db.sale_lot_consumptions,
      db.stock_writeoff_items,
    ],
    async () => {
      const purchase = await db.purchases.get(id)
      if (!purchase) throw new Error('Pembelian tidak ditemukan.')
      if (purchase.status !== 'completed') {
        throw new Error('Hanya pembelian selesai yang dapat dibatalkan.')
      }

      const items = await db.purchase_items.where('purchase_id').equals(id).toArray()
      if (!items.length) throw new Error('Item pembelian tidak ditemukan.')

      const lots = await Promise.all(
        items.map((item) => (item.lot_id ? db.stock_lots.get(item.lot_id) : undefined)),
      )

      for (const [index, lot] of lots.entries()) {
        const item = items[index]
        if (!item || !lot) {
          throw new Error('Lot pembelian tidak ditemukan.')
        }

        const [saleUsage, writeoffUsage] = await Promise.all([
          db.sale_lot_consumptions.where('lot_id').equals(lot.id).count(),
          db.stock_writeoff_items.where('lot_id').equals(lot.id).count(),
        ])

        if (
          lot.qty_remaining_base !== lot.qty_received_base ||
          lot.status === 'depleted' ||
          saleUsage > 0 ||
          writeoffUsage > 0
        ) {
          throw new Error('Pembelian tidak dapat dibatalkan karena sebagian lot sudah terpakai.')
        }
      }

      const stockByProduct = new Map<string, number>()
      for (const item of items) {
        const product = await db.products.get(item.product_id)
        if (!product) throw new Error('Produk pembelian tidak ditemukan.')

        const before = stockByProduct.get(product.id) ?? product.stock_base
        const after = before - item.qty_base

        if (after < 0) {
          throw new Error(`Stok ${product.nama} tidak cukup untuk membatalkan pembelian.`)
        }

        stockByProduct.set(product.id, after)
      }

      for (const [index, item] of items.entries()) {
        const lot = lots[index]
        if (!lot) continue

        await db.stock_lots.put({
          ...lot,
          qty_remaining_base: 0,
          status: 'depleted',
          updated_at: now,
        })

        const product = await db.products.get(item.product_id)
        if (!product) continue

        const stockBefore = product.stock_base
        const stockAfter = stockBefore - item.qty_base

        await db.products.update(product.id, { stock_base: stockAfter, updated_at: now })

        await db.stock_movements.add({
          id: uuidv7(),
          product_id: item.product_id,
          lot_id: lot.id,
          tanggal: purchase.tanggal,
          tipe: 'purchase_cancel',
          qty_unit: item.qty_unit,
          conversion_qty: item.conversion_qty,
          qty_base: item.qty_base,
          unit_cost_base: item.unit_cost_base,
          stock_before_base: stockBefore,
          stock_after_base: stockAfter,
          ref_type: 'purchase',
          ref_id: purchase.id,
          keterangan: `Batal pembelian ${purchase.nomor_nota}`,
          created_at: now,
        })
      }

      await db.purchases.put({
        ...purchase,
        status: 'cancelled',
        updated_at: now,
      })
    },
  )

  const purchase = await db.purchases.get(id)
  await writeAuditLog({
    action: 'purchase_cancelled',
    entity: 'purchases',
    entity_id: id,
    payload: { nomor_nota: purchase?.nomor_nota ?? null },
  })
}
