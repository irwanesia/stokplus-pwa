import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import { getSetting } from '@/db/settings'
import type { Product, ProductUnit, Sale, SaleItem, StockLot } from '@/db/schema'
import { toBaseQuantity } from '@/master/validation'
import { normalizePrefix } from '@/utils/numbering'
import { nowIso, todayJakarta } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

import type {
  SaleAvailableStock,
  SaleDetail,
  SaleDraft,
  SaleItemDraft,
  SaleListItem,
  SaleSaveOptions,
  SaleSaveResult,
} from './types'
import {
  computeSaleTotals,
  saleLineSubtotal,
  validateSaleHeader,
  validateSaleItem,
} from './validation'

interface ComputedLine {
  product: Product
  productUnit: ProductUnit
  qtyUnit: number
  qtyBase: number
  price: number
  discount: number
  subtotal: number
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function roundCost(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000
}

function ensureUniqueSaleNumber(number: string, id?: string): Promise<void> {
  return db.sales
    .where('nomor_nota')
    .equals(number)
    .first()
    .then((existing) => {
      if (existing && existing.id !== id) throw new Error(`Nomor nota ${number} sudah dipakai.`)
    })
}

export async function nextSaleNumber(date = todayJakarta()): Promise<string> {
  const prefix = normalizePrefix(await getSetting('prefix_sale'))
  const datePart = date.replaceAll('-', '')
  const pattern = new RegExp(`^${prefix}-${datePart}-(\\d+)$`)
  const rows = await db.sales.toArray()
  let max = 0

  for (const row of rows) {
    const match = pattern.exec(row.nomor_nota)
    if (match) max = Math.max(max, Number(match[1]))
  }

  return `${prefix}-${datePart}-${String(max + 1).padStart(4, '0')}`
}

function isSaleableLot(lot: StockLot, product: Product, today: string): boolean {
  if (lot.status !== 'active' || lot.qty_remaining_base <= 0) return false
  if (product.track_expiry) {
    return Boolean(lot.expiry_date && lot.expiry_date >= today)
  }
  return true
}

function sortLots(lots: StockLot[], trackExpiry: boolean): StockLot[] {
  return [...lots].sort((a, b) => {
    if (trackExpiry) {
      const expiryOrder = (a.expiry_date ?? '').localeCompare(b.expiry_date ?? '')
      if (expiryOrder !== 0) return expiryOrder
    }
    const receivedOrder = a.received_at.localeCompare(b.received_at)
    if (receivedOrder !== 0) return receivedOrder
    return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  })
}

async function buildLines(draft: SaleDraft): Promise<ComputedLine[]> {
  if (!draft.items.length) throw new Error('Minimal satu barang wajib ditambahkan.')

  const [customer, products, productUnits] = await Promise.all([
    draft.customer_id ? db.customers.get(draft.customer_id) : undefined,
    db.products.toArray(),
    db.product_units.toArray(),
  ])
  if (draft.customer_id && !customer) throw new Error('Pelanggan tidak ditemukan.')
  if (customer && customer.status !== 'active') {
    throw new Error('Pelanggan tidak aktif dan tidak dapat dipakai untuk penjualan baru.')
  }

  const productsById = new Map(products.map((product) => [product.id, product]))
  const unitsByProduct = new Map(
    productUnits.map((row) => [`${row.product_id}\u0000${row.unit_id}`, row]),
  )
  const lines: ComputedLine[] = []

  for (const [index, item] of draft.items.entries()) {
    const product = productsById.get(item.product_id)
    if (!product) throw new Error(`Produk baris ${index + 1} tidak ditemukan.`)
    if (product.status !== 'active') throw new Error(`Produk ${product.nama} tidak aktif.`)

    const productUnit = unitsByProduct.get(`${product.id}\u0000${item.unit_id}`)
    if (!productUnit) throw new Error(`Satuan produk ${product.nama} tidak ditemukan.`)
    if (productUnit.status !== 'active' || !productUnit.can_sell) {
      throw new Error(`Satuan ${product.nama} tidak aktif untuk penjualan.`)
    }

    const itemError = validateSaleItem(item)
    if (itemError) throw new Error(`${product.nama}: ${itemError}`)

    const qtyUnit = Number(item.qty_unit)
    const qtyBase = toBaseQuantity(qtyUnit, productUnit.conversion_qty)
    if (qtyBase === null || qtyBase <= 0) {
      throw new Error(`${product.nama}: qty base harus bilangan bulat lebih dari 0.`)
    }

    lines.push({
      product,
      productUnit,
      qtyUnit,
      qtyBase,
      price: Number(item.harga_jual_unit),
      discount: Number(item.diskon),
      subtotal: saleLineSubtotal(item.qty_unit, item.harga_jual_unit, item.diskon),
    })
  }

  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const headerError = validateSaleHeader(draft, { subtotal })
  if (headerError) throw new Error(headerError)
  return lines
}

export async function getAvailableSaleStock(productId: string): Promise<SaleAvailableStock> {
  const product = await db.products.get(productId)
  if (!product) throw new Error('Produk tidak ditemukan.')
  const today = todayJakarta()
  const lots = await db.stock_lots.where('product_id').equals(productId).toArray()
  const saleable = sortLots(
    lots.filter((lot) => isSaleableLot(lot, product, today)),
    product.track_expiry,
  )
  return {
    qty_base: saleable.reduce((sum, lot) => sum + lot.qty_remaining_base, 0),
    lots: saleable,
  }
}

export async function getDraftStockWarnings(items: SaleItemDraft[]): Promise<string[]> {
  const required = new Map<string, number>()
  for (const item of items) {
    const unit = await db.product_units
      .where('[product_id+unit_id]')
      .equals([item.product_id, item.unit_id])
      .first()
    if (!unit) continue
    const qtyBase = toBaseQuantity(Number(item.qty_unit), unit.conversion_qty)
    if (qtyBase !== null)
      required.set(item.product_id, (required.get(item.product_id) ?? 0) + qtyBase)
  }

  const warnings: string[] = []
  for (const [productId, qty] of required) {
    const [product, available] = await Promise.all([
      db.products.get(productId),
      getAvailableSaleStock(productId),
    ])
    if (product && available.qty_base < qty) {
      warnings.push(`${product.nama}: stok layak jual ${available.qty_base}, kebutuhan ${qty}.`)
    }
  }
  return warnings
}

async function saveSale(draft: SaleDraft, options: SaleSaveOptions): Promise<SaleSaveResult> {
  const now = nowIso()
  const existing = options.id ? await db.sales.get(options.id) : undefined
  if (existing && existing.status !== 'draft')
    throw new Error('Penjualan selesai atau batal tidak dapat diedit.')

  const saleId = existing?.id ?? uuidv7()
  const number = draft.nomor_nota.trim() || (await nextSaleNumber(draft.tanggal))
  await ensureUniqueSaleNumber(number, existing?.id)
  const normalizedDraft = { ...draft, nomor_nota: number }
  const lines = await buildLines(normalizedDraft)
  const totals = computeSaleTotals(lines, draft.diskon)
  const complete = Boolean(options.complete)
  const headerError = validateSaleHeader(normalizedDraft, { subtotal: totals.subtotal, complete })
  if (headerError) throw new Error(headerError)

  const sale: Sale = {
    id: saleId,
    nomor_nota: number,
    tanggal: draft.tanggal,
    customer_id: draft.customer_id || null,
    metode_pembayaran: draft.metode_pembayaran,
    subtotal: totals.subtotal,
    diskon: totals.diskon,
    total: totals.total,
    bayar: complete ? Number(draft.bayar) : Number(draft.bayar) || 0,
    hpp_total: 0,
    gross_profit: 0,
    status: complete ? 'completed' : 'draft',
    keterangan: clean(draft.keterangan),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }
  const itemRows: SaleItem[] = lines.map((line) => ({
    id: uuidv7(),
    sale_id: saleId,
    product_id: line.product.id,
    unit_id: line.productUnit.unit_id,
    qty_unit: line.qtyUnit,
    conversion_qty: line.productUnit.conversion_qty,
    qty_base: line.qtyBase,
    harga_jual_unit: line.price,
    diskon: line.discount,
    subtotal: line.subtotal,
    hpp_total: 0,
    gross_profit: 0,
    created_at: now,
  }))

  await db.transaction(
    'rw',
    [
      db.sales,
      db.sale_items,
      db.sale_lot_consumptions,
      db.stock_lots,
      db.stock_movements,
      db.products,
    ],
    async () => {
      if (existing) {
        await db.sales.put(sale)
        await db.sale_items.where('sale_id').equals(saleId).delete()
      } else {
        await db.sales.add(sale)
      }

      if (!complete) {
        await db.sale_items.bulkAdd(itemRows)
        return
      }

      const today = todayJakarta()
      const products = new Map<string, Product>()
      const initialStocks = new Map<string, number>()
      const currentLots = new Map<string, StockLot>()
      const allocations: Array<{
        item: SaleItem
        lot: StockLot
        qty: number
        totalCost: number
      }> = []

      for (const item of itemRows) {
        const product = products.get(item.product_id) ?? (await db.products.get(item.product_id))
        if (!product) throw new Error(`Produk ${item.product_id} tidak ditemukan.`)
        products.set(product.id, product)
        if (!initialStocks.has(product.id)) initialStocks.set(product.id, product.stock_base)

        const candidates = sortLots(
          (await db.stock_lots.where('product_id').equals(product.id).toArray())
            .map((lot) => currentLots.get(lot.id) ?? lot)
            .filter((lot) => isSaleableLot(lot, product, today)),
          product.track_expiry,
        )
        let remaining = item.qty_base
        let itemCost = 0

        for (const candidate of candidates) {
          if (remaining === 0) break
          const qty = Math.min(remaining, candidate.qty_remaining_base)
          const totalCost = roundCost(qty * candidate.unit_cost_base)
          const updatedLot: StockLot = {
            ...candidate,
            qty_remaining_base: candidate.qty_remaining_base - qty,
            status: candidate.qty_remaining_base === qty ? 'depleted' : 'active',
            updated_at: now,
          }
          currentLots.set(candidate.id, updatedLot)
          allocations.push({ item, lot: updatedLot, qty, totalCost })
          itemCost = roundCost(itemCost + totalCost)
          remaining -= qty
        }

        if (remaining > 0) {
          throw new Error(
            `${product.nama}: stok non-expired tidak cukup. Kekurangan ${remaining} unit base.`,
          )
        }

        item.hpp_total = itemCost
        item.gross_profit = roundCost(item.subtotal - itemCost)
        const productStock = product.stock_base
        if (productStock < item.qty_base) {
          throw new Error(`Stok ${product.nama} tidak cukup dan tidak boleh menjadi negatif.`)
        }
        products.set(product.id, {
          ...product,
          stock_base: productStock - item.qty_base,
          updated_at: now,
        })
      }

      const stockRemaining = new Map(initialStocks)
      const itemsById = new Map(itemRows.map((item) => [item.id, item]))

      for (const allocation of allocations) {
        const source = itemsById.get(allocation.item.id)
        if (!source) throw new Error('Data satuan penjualan tidak ditemukan.')
        const product = products.get(allocation.item.product_id)
        if (!product) throw new Error('Produk penjualan tidak ditemukan.')
        const stockBefore = stockRemaining.get(product.id)
        if (stockBefore === undefined || stockBefore < allocation.qty) {
          throw new Error(`Stok ${product.nama} tidak cukup dan tidak boleh menjadi negatif.`)
        }
        const stockAfter = stockBefore - allocation.qty
        stockRemaining.set(product.id, stockAfter)

        await db.stock_lots.put(allocation.lot)
        await db.stock_movements.add({
          id: uuidv7(),
          product_id: product.id,
          lot_id: allocation.lot.id,
          tanggal: draft.tanggal,
          tipe: 'sale_out',
          qty_unit: allocation.qty / source.conversion_qty,
          conversion_qty: source.conversion_qty,
          qty_base: allocation.qty,
          unit_cost_base: allocation.lot.unit_cost_base,
          stock_before_base: stockBefore,
          stock_after_base: stockAfter,
          ref_type: 'sale',
          ref_id: saleId,
          keterangan: `Penjualan ${number}`,
          created_at: now,
        })
      }

      for (const product of products.values()) {
        await db.products.update(product.id, { stock_base: product.stock_base, updated_at: now })
      }

      for (const allocation of allocations) {
        await db.sale_lot_consumptions.add({
          id: uuidv7(),
          sale_id: saleId,
          sale_item_id: allocation.item.id,
          lot_id: allocation.lot.id,
          qty_base: allocation.qty,
          unit_cost_base: allocation.lot.unit_cost_base,
          total_cost: allocation.totalCost,
          created_at: now,
        })
      }

      const hppTotal = roundCost(itemRows.reduce((sum, item) => sum + item.hpp_total, 0))
      sale.hpp_total = hppTotal
      sale.gross_profit = roundCost(sale.total - hppTotal)
      await db.sales.put(sale)
      await db.sale_items.bulkAdd(itemRows)
    },
  )

  await writeAuditLog({
    action: complete ? 'sale_completed' : existing ? 'sale_updated' : 'sale_created',
    entity: 'sales',
    entity_id: saleId,
    payload: {
      nomor_nota: number,
      customer_id: sale.customer_id,
      total: sale.total,
      item_count: itemRows.length,
    },
  })

  return {
    id: saleId,
    nomor_nota: number,
    status: sale.status,
    mode: complete ? 'completed' : existing ? 'updated' : 'created',
  }
}

export async function saveSaleAction(
  draft: SaleDraft,
  options: SaleSaveOptions = {},
): Promise<SaleSaveResult> {
  return saveSale(draft, options)
}

export async function listSales(): Promise<SaleListItem[]> {
  const [sales, items] = await Promise.all([db.sales.toArray(), db.sale_items.toArray()])
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.sale_id, (counts.get(item.sale_id) ?? 0) + 1)
  return sales
    .map((sale) => ({ ...sale, item_count: counts.get(sale.id) ?? 0 }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at))
}

export async function getSaleDetail(id: string): Promise<SaleDetail | null> {
  const sale = await db.sales.get(id)
  if (!sale) return null
  const [items, consumptions] = await Promise.all([
    db.sale_items.where('sale_id').equals(id).toArray(),
    db.sale_lot_consumptions.where('sale_id').equals(id).toArray(),
  ])
  const lotIds = [...new Set(consumptions.map((row) => row.lot_id))]
  const lots = (await Promise.all(lotIds.map((lotId) => db.stock_lots.get(lotId)))).filter(
    (lot): lot is StockLot => Boolean(lot),
  )
  return {
    sale,
    items: items.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    consumptions,
    lots,
  }
}

export async function deleteSaleDraft(id: string): Promise<void> {
  const sale = await db.sales.get(id)
  if (!sale) throw new Error('Penjualan tidak ditemukan.')
  if (sale.status !== 'draft') throw new Error('Hanya draft yang dapat dihapus.')

  await db.transaction('rw', [db.sales, db.sale_items], async () => {
    await db.sale_items.where('sale_id').equals(id).delete()
    await db.sales.delete(id)
  })
  await writeAuditLog({
    action: 'sale_deleted',
    entity: 'sales',
    entity_id: id,
    payload: { nomor_nota: sale.nomor_nota },
  })
}

export async function cancelSale(id: string): Promise<void> {
  const now = nowIso()
  await db.transaction(
    'rw',
    [
      db.sales,
      db.sale_items,
      db.sale_lot_consumptions,
      db.stock_lots,
      db.stock_movements,
      db.products,
    ],
    async () => {
      const sale = await db.sales.get(id)
      if (!sale) throw new Error('Penjualan tidak ditemukan.')
      if (sale.status !== 'completed')
        throw new Error('Hanya penjualan selesai yang dapat dibatalkan.')
      const [items, consumptions] = await Promise.all([
        db.sale_items.where('sale_id').equals(id).toArray(),
        db.sale_lot_consumptions.where('sale_id').equals(id).toArray(),
      ])
      if (!items.length || !consumptions.length) {
        throw new Error('Konsumsi lot penjualan tidak ditemukan; pembatalan dihentikan.')
      }

      const itemsById = new Map(items.map((item) => [item.id, item]))
      const consumptionTotals = new Map<string, { qty: number; cost: number }>()
      for (const consumption of consumptions) {
        const totals = consumptionTotals.get(consumption.sale_item_id) ?? { qty: 0, cost: 0 }
        totals.qty += consumption.qty_base
        totals.cost = roundCost(totals.cost + consumption.total_cost)
        consumptionTotals.set(consumption.sale_item_id, totals)
      }
      for (const item of items) {
        const totals = consumptionTotals.get(item.id)
        if (!totals || totals.qty !== item.qty_base || totals.cost !== item.hpp_total) {
          throw new Error(
            'Data konsumsi lot tidak cocok dengan item penjualan; pembatalan dihentikan.',
          )
        }
      }
      if (roundCost(items.reduce((sum, item) => sum + item.hpp_total, 0)) !== sale.hpp_total) {
        throw new Error('Total HPP penjualan tidak cocok dengan item; pembatalan dihentikan.')
      }

      const productStocks = new Map<string, number>()
      for (const item of items) {
        const product = await db.products.get(item.product_id)
        if (!product) throw new Error(`Produk ${item.product_id} tidak ditemukan.`)
        if (!productStocks.has(product.id)) productStocks.set(product.id, product.stock_base)
      }

      for (const consumption of consumptions) {
        const item = itemsById.get(consumption.sale_item_id)
        const lot = await db.stock_lots.get(consumption.lot_id)
        if (!item || !lot) throw new Error('Lot penjualan tidak ditemukan; pembatalan dihentikan.')
        const remaining = lot.qty_remaining_base + consumption.qty_base
        if (remaining > lot.qty_received_base) {
          throw new Error(`Pemulihan lot ${lot.lot_code} melebihi qty yang diterima.`)
        }
        await db.stock_lots.put({
          ...lot,
          qty_remaining_base: remaining,
          status: 'active',
          updated_at: now,
        })

        const stockBefore = productStocks.get(item.product_id)
        if (stockBefore === undefined) throw new Error('Stok produk tidak ditemukan.')
        const stockAfter = stockBefore + consumption.qty_base
        productStocks.set(item.product_id, stockAfter)
        await db.stock_movements.add({
          id: uuidv7(),
          product_id: item.product_id,
          lot_id: lot.id,
          tanggal: sale.tanggal,
          tipe: 'sale_cancel',
          qty_unit: consumption.qty_base / item.conversion_qty,
          conversion_qty: item.conversion_qty,
          qty_base: consumption.qty_base,
          unit_cost_base: consumption.unit_cost_base,
          stock_before_base: stockBefore,
          stock_after_base: stockAfter,
          ref_type: 'sale',
          ref_id: sale.id,
          keterangan: `Batal penjualan ${sale.nomor_nota}`,
          created_at: now,
        })
      }

      for (const [productId, stock] of productStocks) {
        await db.products.update(productId, { stock_base: stock, updated_at: now })
      }
      await db.sales.put({ ...sale, status: 'cancelled', updated_at: now })
    },
  )

  const sale = await db.sales.get(id)
  await writeAuditLog({
    action: 'sale_cancelled',
    entity: 'sales',
    entity_id: id,
    payload: { nomor_nota: sale?.nomor_nota ?? null },
  })
}
