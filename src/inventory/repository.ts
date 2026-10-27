import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import type {
  Product,
  StockLot,
  StockOpname,
  StockOpnameItem,
  StockWriteoff,
  StockWriteoffItem,
} from '@/db/schema'
import { getSetting } from '@/db/settings'
import { todayJakarta, nowIso } from '@/utils/date'
import { uuidv7 } from '@/utils/id'
import { normalizePrefix } from '@/utils/numbering'

import type {
  StockLedger,
  StockProductRow,
  StocktakeDetail,
  StocktakeDraft,
  StocktakeListRow,
  StockLotRow,
  WriteoffDetail,
  WriteoffDraft,
  WriteoffListRow,
} from './types'
import { validateStocktakeDraft, validateWriteoffDraft } from './validation'

const DAY_MS = 86_400_000

function roundCost(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function dateDifference(date: string, today = todayJakarta()): number {
  const target = new Date(`${date}T00:00:00+07:00`).getTime()
  const current = new Date(`${today}T00:00:00+07:00`).getTime()
  return Math.round((target - current) / DAY_MS)
}

function compareLots(a: StockLot, b: StockLot): number {
  return (
    (a.expiry_date ?? '9999-12-31').localeCompare(b.expiry_date ?? '9999-12-31') ||
    a.received_at.localeCompare(b.received_at) ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id)
  )
}

function toLotRow(
  lot: StockLot,
  products: Map<string, Product>,
  unitSymbols: Map<string, string>,
): StockLotRow {
  const product = products.get(lot.product_id)
  const daysToExpiry = lot.expiry_date ? dateDifference(lot.expiry_date) : null
  return {
    ...lot,
    productName: product?.nama ?? 'Produk tidak ditemukan',
    productCode: product?.kode ?? '',
    baseUnitSymbol: product ? (unitSymbols.get(product.base_unit_id) ?? '') : '',
    remainingValue: Math.round(lot.qty_remaining_base * lot.unit_cost_base),
    daysToExpiry,
  }
}

export async function getStockOverview(): Promise<StockProductRow[]> {
  const [products, lots, units, productUnits] = await Promise.all([
    db.products.toArray(),
    db.stock_lots.toArray(),
    db.units.toArray(),
    db.product_units.toArray(),
  ])
  const productById = new Map(products.map((product) => [product.id, product]))
  const unitSymbols = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  const lotsByProduct = new Map<string, StockLot[]>()
  for (const lot of lots) {
    const rows = lotsByProduct.get(lot.product_id) ?? []
    rows.push(lot)
    lotsByProduct.set(lot.product_id, rows)
  }

  return products
    .filter((product) => !product.deleted_at)
    .map((product) => {
      const productLots = (lotsByProduct.get(product.id) ?? []).sort(compareLots)
      const lotStock = productLots.reduce((sum, lot) => sum + lot.qty_remaining_base, 0)
      const displayUnit = productUnits.find(
        (unit) =>
          unit.product_id === product.id &&
          unit.status === 'active' &&
          unit.can_sell &&
          unit.is_default_sale,
      )
      return {
        product,
        baseUnitSymbol: unitSymbols.get(product.base_unit_id) ?? '',
        displayStock: displayUnit
          ? {
              qty: lotStock / displayUnit.conversion_qty,
              unitSymbol: unitSymbols.get(displayUnit.unit_id) ?? '',
            }
          : null,
        lots: productLots.map((lot) => toLotRow(lot, productById, unitSymbols)),
        lotStock,
        stockDifference: product.stock_base - lotStock,
        inventoryValue: Math.round(
          productLots.reduce((sum, lot) => sum + lot.qty_remaining_base * lot.unit_cost_base, 0),
        ),
      }
    })
    .sort((a, b) => a.product.nama.localeCompare(b.product.nama, 'id'))
}

export async function getExpiryLots(): Promise<StockLotRow[]> {
  const [products, lots, units] = await Promise.all([
    db.products.toArray(),
    db.stock_lots.toArray(),
    db.units.toArray(),
  ])
  const productById = new Map(products.map((product) => [product.id, product]))
  const unitSymbols = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  return lots
    .filter((lot) => lot.qty_remaining_base > 0)
    .map((lot) => toLotRow(lot, productById, unitSymbols))
    .filter((lot) => {
      const product = productById.get(lot.product_id)
      if (!product?.track_expiry) return false
      if (lot.status === 'quarantined' || !lot.expiry_date) return true
      return (lot.daysToExpiry ?? Infinity) <= (product.expiry_alert_days ?? 30)
    })
    .sort((a, b) => (a.expiry_date ?? '9999-12-31').localeCompare(b.expiry_date ?? '9999-12-31'))
}

export async function getStockLedger(productId: string): Promise<StockLedger | null> {
  const [product, units, lots, movements] = await Promise.all([
    db.products.get(productId),
    db.units.toArray(),
    db.stock_lots.where('product_id').equals(productId).toArray(),
    db.stock_movements.where('product_id').equals(productId).toArray(),
  ])
  if (!product) return null
  const unitSymbols = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  const productById = new Map([[product.id, product]])
  return {
    product,
    baseUnitSymbol: unitSymbols.get(product.base_unit_id) ?? '',
    lots: lots.sort(compareLots).map((lot) => toLotRow(lot, productById, unitSymbols)),
    movements: movements.sort(
      (a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at),
    ),
  }
}

export async function nextInventoryNumber(
  kind: 'writeoff' | 'opname',
  date = todayJakarta(),
): Promise<string> {
  const settingKey = kind === 'writeoff' ? 'prefix_writeoff' : 'prefix_opname'
  const fallback = kind === 'writeoff' ? 'WO' : 'OP'
  const prefix = normalizePrefix((await getSetting(settingKey)) || fallback)
  const datePart = date.replaceAll('-', '')
  const pattern = new RegExp(`^${prefix}-${datePart}-(\\d+)$`)
  const rows =
    kind === 'writeoff' ? await db.stock_writeoffs.toArray() : await db.stock_opnames.toArray()
  const currentMax = rows.reduce((max, row) => {
    const match = pattern.exec(row.nomor)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `${prefix}-${datePart}-${String(currentMax + 1).padStart(4, '0')}`
}

async function assertUniqueNumber(kind: 'writeoff' | 'opname', number: string, id?: string) {
  const existing =
    kind === 'writeoff'
      ? await db.stock_writeoffs.where('nomor').equals(number).first()
      : await db.stock_opnames.where('nomor').equals(number).first()
  if (existing && existing.id !== id) throw new Error(`Nomor ${number} sudah digunakan.`)
}

export async function listWriteoffs(): Promise<WriteoffListRow[]> {
  const [rows, items] = await Promise.all([
    db.stock_writeoffs.toArray(),
    db.stock_writeoff_items.toArray(),
  ])
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.writeoff_id, (counts.get(item.writeoff_id) ?? 0) + 1)
  return rows
    .map((row) => ({ ...row, itemCount: counts.get(row.id) ?? 0 }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at))
}

export async function getWriteoff(id: string): Promise<WriteoffDetail | null> {
  const row = await db.stock_writeoffs.get(id)
  if (!row) return null
  const [items, products, lots, units] = await Promise.all([
    db.stock_writeoff_items.where('writeoff_id').equals(id).toArray(),
    db.products.toArray(),
    db.stock_lots.toArray(),
    db.units.toArray(),
  ])
  const productById = new Map(products.map((product) => [product.id, product]))
  const lotById = new Map(lots.map((lot) => [lot.id, lot]))
  const symbols = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  return {
    ...row,
    items: items.map((item) => {
      const product = productById.get(item.product_id)
      return {
        ...item,
        productName: product?.nama ?? 'Produk tidak ditemukan',
        lotCode: lotById.get(item.lot_id)?.lot_code ?? 'Lot tidak ditemukan',
        baseUnitSymbol: product ? (symbols.get(product.base_unit_id) ?? '') : '',
      }
    }),
  }
}

export async function saveWriteoff(
  draft: WriteoffDraft,
  options: { id?: string; complete?: boolean } = {},
): Promise<StockWriteoff> {
  const validationError = validateWriteoffDraft(draft)
  if (validationError) throw new Error(validationError)
  const existing = options.id ? await db.stock_writeoffs.get(options.id) : undefined
  if (options.id && !existing) throw new Error('Write-off tidak ditemukan.')
  if (existing && existing.status !== 'draft')
    throw new Error('Write-off selesai atau batal tidak dapat diubah.')
  const number = existing?.nomor ?? (await nextInventoryNumber('writeoff', draft.tanggal))
  await assertUniqueNumber('writeoff', number, existing?.id)
  const id = existing?.id ?? uuidv7()
  const now = nowIso()
  const complete = Boolean(options.complete)
  const header: StockWriteoff = {
    id,
    nomor: number,
    tanggal: draft.tanggal,
    alasan: draft.alasan,
    keterangan: draft.keterangan.trim(),
    total_cost: 0,
    status: complete ? 'completed' : 'draft',
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction(
    'rw',
    [db.stock_writeoffs, db.stock_writeoff_items, db.stock_lots, db.products, db.stock_movements],
    async () => {
      let totalCost = 0
      const itemRows: StockWriteoffItem[] = []
      const stockByProduct = new Map<string, number>()
      if (existing) await db.stock_writeoff_items.where('writeoff_id').equals(id).delete()

      for (const item of draft.items) {
        const lot = await db.stock_lots.get(item.lot_id)
        if (!lot) throw new Error('Lot write-off tidak ditemukan.')
        if (lot.status === 'depleted' || item.qty_base > lot.qty_remaining_base) {
          throw new Error(`Qty write-off melebihi stok tersisa pada lot ${lot.lot_code}.`)
        }
        const product = await db.products.get(lot.product_id)
        if (!product) throw new Error('Produk lot tidak ditemukan.')
        const itemCost = Math.round(item.qty_base * lot.unit_cost_base)
        const itemRow: StockWriteoffItem = {
          id: uuidv7(),
          writeoff_id: id,
          product_id: product.id,
          lot_id: lot.id,
          qty_base: item.qty_base,
          unit_cost_base: lot.unit_cost_base,
          total_cost: itemCost,
          expiry_date: lot.expiry_date,
          lot_status_before: lot.status,
          keterangan: item.keterangan.trim(),
          created_at: now,
        }
        itemRows.push(itemRow)
        totalCost += itemCost

        if (complete) {
          const currentStock =
            stockByProduct.get(product.id) ?? (await db.products.get(product.id))?.stock_base
          if (currentStock === undefined || currentStock < item.qty_base) {
            throw new Error(`Stok produk ${product.nama} tidak cukup untuk write-off.`)
          }
          const stockAfter = currentStock - item.qty_base
          stockByProduct.set(product.id, stockAfter)
          await db.stock_lots.put({
            ...lot,
            qty_remaining_base: lot.qty_remaining_base - item.qty_base,
            status: lot.qty_remaining_base === item.qty_base ? 'depleted' : lot.status,
            updated_at: now,
          })
          await db.stock_movements.add({
            id: uuidv7(),
            product_id: product.id,
            lot_id: lot.id,
            tanggal: draft.tanggal,
            tipe:
              draft.alasan === 'expired'
                ? 'writeoff_expired'
                : draft.alasan === 'damaged'
                  ? 'writeoff_damaged'
                  : 'writeoff_other',
            qty_unit: item.qty_base,
            conversion_qty: 1,
            qty_base: item.qty_base,
            unit_cost_base: lot.unit_cost_base,
            stock_before_base: currentStock,
            stock_after_base: stockAfter,
            ref_type: 'writeoff',
            ref_id: id,
            keterangan: `${number}${item.keterangan ? ` · ${item.keterangan.trim()}` : ''}`,
            created_at: now,
          })
        }
      }

      header.total_cost = totalCost
      await db.stock_writeoffs.put(header)
      await db.stock_writeoff_items.bulkAdd(itemRows)
      for (const [productId, stock] of stockByProduct) {
        await db.products.update(productId, { stock_base: stock, updated_at: now })
      }
    },
  )

  await writeAuditLog({
    action: complete ? 'writeoff_completed' : existing ? 'writeoff_updated' : 'writeoff_created',
    entity: 'stock_writeoffs',
    entity_id: id,
    payload: { nomor: number, total_cost: header.total_cost, status: header.status },
  })
  return header
}

export async function deleteWriteoffDraft(id: string): Promise<void> {
  const row = await db.stock_writeoffs.get(id)
  if (!row) throw new Error('Write-off tidak ditemukan.')
  if (row.status !== 'draft') throw new Error('Hanya draft write-off yang dapat dihapus.')
  await db.transaction('rw', [db.stock_writeoffs, db.stock_writeoff_items], async () => {
    await db.stock_writeoff_items.where('writeoff_id').equals(id).delete()
    await db.stock_writeoffs.delete(id)
  })
  await writeAuditLog({
    action: 'writeoff_deleted',
    entity: 'stock_writeoffs',
    entity_id: id,
    payload: { nomor: row.nomor },
  })
}

export async function cancelWriteoff(id: string): Promise<void> {
  const now = nowIso()
  await db.transaction(
    'rw',
    [db.stock_writeoffs, db.stock_writeoff_items, db.stock_lots, db.products, db.stock_movements],
    async () => {
      const row = await db.stock_writeoffs.get(id)
      if (!row) throw new Error('Write-off tidak ditemukan.')
      if (row.status !== 'completed')
        throw new Error('Hanya write-off selesai yang dapat dibatalkan.')
      const items = await db.stock_writeoff_items.where('writeoff_id').equals(id).toArray()
      const stockByProduct = new Map<string, number>()
      for (const item of items) {
        const lot = await db.stock_lots.get(item.lot_id)
        const product = await db.products.get(item.product_id)
        if (!lot || !product) throw new Error('Lot atau produk write-off tidak ditemukan.')
        const currentStock =
          stockByProduct.get(product.id) ?? (await db.products.get(product.id))?.stock_base
        if (currentStock === undefined) throw new Error('Stok produk write-off tidak ditemukan.')
        const stockAfter = currentStock + item.qty_base
        stockByProduct.set(product.id, stockAfter)
        await db.stock_lots.put({
          ...lot,
          qty_remaining_base: lot.qty_remaining_base + item.qty_base,
          status: item.lot_status_before ?? 'active',
          updated_at: now,
        })
        await db.stock_movements.add({
          id: uuidv7(),
          product_id: product.id,
          lot_id: lot.id,
          tanggal: todayJakarta(),
          tipe: 'writeoff_cancel',
          qty_unit: item.qty_base,
          conversion_qty: 1,
          qty_base: item.qty_base,
          unit_cost_base: item.unit_cost_base,
          stock_before_base: currentStock,
          stock_after_base: stockAfter,
          ref_type: 'writeoff_cancel',
          ref_id: id,
          keterangan: `Pembatalan ${row.nomor}`,
          created_at: now,
        })
      }
      await db.stock_writeoffs.update(id, { status: 'cancelled', updated_at: now })
      for (const [productId, stock] of stockByProduct) {
        await db.products.update(productId, { stock_base: stock, updated_at: now })
      }
    },
  )
  await writeAuditLog({
    action: 'writeoff_cancelled',
    entity: 'stock_writeoffs',
    entity_id: id,
    payload: { nomor: (await db.stock_writeoffs.get(id))?.nomor },
  })
}

export async function listStocktakes(): Promise<StocktakeListRow[]> {
  const [rows, items] = await Promise.all([
    db.stock_opnames.toArray(),
    db.stock_opname_items.toArray(),
  ])
  const byOpname = new Map<string, StockOpnameItem[]>()
  for (const item of items) {
    const list = byOpname.get(item.opname_id) ?? []
    list.push(item)
    byOpname.set(item.opname_id, list)
  }
  return rows
    .map((row) => {
      const rowsForOpname = byOpname.get(row.id) ?? []
      return {
        ...row,
        itemCount: rowsForOpname.length,
        totalDifference: rowsForOpname.reduce((sum, item) => sum + Math.abs(item.diff_base), 0),
      }
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.created_at.localeCompare(a.created_at))
}

export async function getStocktake(id: string): Promise<StocktakeDetail | null> {
  const row = await db.stock_opnames.get(id)
  if (!row) return null
  const [items, products, units] = await Promise.all([
    db.stock_opname_items.where('opname_id').equals(id).toArray(),
    db.products.toArray(),
    db.units.toArray(),
  ])
  const productById = new Map(products.map((product) => [product.id, product]))
  const symbols = new Map(units.map((unit) => [unit.id, unit.simbol || unit.nama]))
  return {
    ...row,
    items: items.map((item) => {
      const product = productById.get(item.product_id)
      return {
        ...item,
        productName: product?.nama ?? 'Produk tidak ditemukan',
        baseUnitSymbol: product ? (symbols.get(product.base_unit_id) ?? '') : '',
        expiry_date: item.expiry_date ?? '',
      }
    }),
  }
}

async function costForNewStock(product: Product, lots: StockLot[]): Promise<number> {
  const remaining = lots.filter((lot) => lot.qty_remaining_base > 0)
  const remainingQty = remaining.reduce((sum, lot) => sum + lot.qty_remaining_base, 0)
  if (remainingQty > 0) {
    return roundCost(
      remaining.reduce((sum, lot) => sum + lot.qty_remaining_base * lot.unit_cost_base, 0) /
        remainingQty,
    )
  }
  const purchases = (await db.purchase_items.where('product_id').equals(product.id).toArray())
    .filter((item) => item.unit_cost_base > 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (purchases[0]) return purchases[0].unit_cost_base
  const baseUnit = await db.product_units
    .where('[product_id+unit_id]')
    .equals([product.id, product.base_unit_id])
    .first()
  return baseUnit?.harga_beli_default ?? 0
}

export async function saveStocktake(
  draft: StocktakeDraft,
  options: { id?: string; complete?: boolean } = {},
): Promise<StockOpname> {
  const validationError = validateStocktakeDraft(draft)
  if (validationError) throw new Error(validationError)
  const existing = options.id ? await db.stock_opnames.get(options.id) : undefined
  if (options.id && !existing) throw new Error('Sesi opname tidak ditemukan.')
  if (existing && existing.status !== 'draft')
    throw new Error('Opname selesai atau batal tidak dapat diubah.')
  const number = existing?.nomor ?? (await nextInventoryNumber('opname', draft.tanggal))
  await assertUniqueNumber('opname', number, existing?.id)
  const id = existing?.id ?? uuidv7()
  const now = nowIso()
  const complete = Boolean(options.complete)
  const header: StockOpname = {
    id,
    nomor: number,
    tanggal: draft.tanggal,
    status: complete ? 'completed' : 'draft',
    keterangan: draft.keterangan.trim(),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction(
    'rw',
    [
      db.stock_opnames,
      db.stock_opname_items,
      db.products,
      db.stock_lots,
      db.stock_movements,
      db.purchase_items,
      db.product_units,
    ],
    async () => {
      if (existing) await db.stock_opname_items.where('opname_id').equals(id).delete()
      const itemRows: StockOpnameItem[] = []
      for (const item of draft.items) {
        const product = await db.products.get(item.product_id)
        if (!product) throw new Error('Produk opname tidak ditemukan.')
        const lots = await db.stock_lots.where('product_id').equals(product.id).toArray()
        const lotStock = lots.reduce((sum, lot) => sum + lot.qty_remaining_base, 0)
        if (complete && lotStock !== product.stock_base) {
          throw new Error(
            `Stok ${product.nama} tidak konsisten: stok produk ${product.stock_base}, jumlah lot ${lotStock}. Periksa kartu stok sebelum finalisasi.`,
          )
        }
        const difference = item.physical_qty_base - lotStock
        let diffCost = 0
        const unitRow = await db.product_units
          .where('[product_id+unit_id]')
          .equals([product.id, product.base_unit_id])
          .first()
        if (!unitRow) throw new Error(`Base unit produk ${product.nama} tidak ditemukan.`)
        const itemRow: StockOpnameItem = {
          id: uuidv7(),
          opname_id: id,
          product_id: product.id,
          unit_id: product.base_unit_id,
          qty_unit: item.physical_qty_base,
          conversion_qty: 1,
          system_qty_base: lotStock,
          physical_qty_base: item.physical_qty_base,
          diff_base: difference,
          diff_cost: 0,
          expiry_date: item.expiry_date || null,
          created_at: now,
        }

        if (complete && difference < 0) {
          let shortage = -difference
          let stockCurrent = product.stock_base
          for (const lot of lots.filter((row) => row.qty_remaining_base > 0).sort(compareLots)) {
            if (shortage <= 0) break
            const qty = Math.min(shortage, lot.qty_remaining_base)
            const stockAfter = stockCurrent - qty
            diffCost += Math.round(qty * lot.unit_cost_base)
            await db.stock_lots.put({
              ...lot,
              qty_remaining_base: lot.qty_remaining_base - qty,
              status: lot.qty_remaining_base === qty ? 'depleted' : lot.status,
              updated_at: now,
            })
            await db.stock_movements.add({
              id: uuidv7(),
              product_id: product.id,
              lot_id: lot.id,
              tanggal: draft.tanggal,
              tipe: 'opname_shortage',
              qty_unit: qty,
              conversion_qty: 1,
              qty_base: qty,
              unit_cost_base: lot.unit_cost_base,
              stock_before_base: stockCurrent,
              stock_after_base: stockAfter,
              ref_type: 'opname',
              ref_id: id,
              keterangan: `Kekurangan ${number}`,
              created_at: now,
            })
            stockCurrent = stockAfter
            shortage -= qty
          }
          if (shortage > 0)
            throw new Error(`Stok lot ${product.nama} kurang ${shortage} unit base.`)
          await db.products.update(product.id, {
            stock_base: item.physical_qty_base,
            updated_at: now,
          })
        } else if (complete && difference > 0) {
          const unitCost = await costForNewStock(product, lots)
          diffCost -= Math.round(difference * unitCost)
          const lotId = uuidv7()
          const expiryDate = product.track_expiry ? item.expiry_date || null : null
          const surplusLot: StockLot = {
            id: lotId,
            product_id: product.id,
            purchase_id: null,
            purchase_item_id: null,
            lot_code: `OP-${number}-${product.id}`,
            received_at: draft.tanggal,
            expiry_date: expiryDate,
            qty_received_base: difference,
            qty_remaining_base: difference,
            unit_cost_base: unitCost,
            source: 'opname_surplus',
            status: product.track_expiry && !expiryDate ? 'quarantined' : 'active',
            created_at: now,
            updated_at: now,
          }
          await db.stock_lots.add(surplusLot)
          await db.stock_movements.add({
            id: uuidv7(),
            product_id: product.id,
            lot_id: lotId,
            tanggal: draft.tanggal,
            tipe: 'opname_surplus',
            qty_unit: difference,
            conversion_qty: 1,
            qty_base: difference,
            unit_cost_base: unitCost,
            stock_before_base: product.stock_base,
            stock_after_base: item.physical_qty_base,
            ref_type: 'opname',
            ref_id: id,
            keterangan: `Kelebihan ${number}`,
            created_at: now,
          })
          await db.products.update(product.id, {
            stock_base: item.physical_qty_base,
            updated_at: now,
          })
        }
        itemRow.diff_cost = diffCost
        itemRows.push(itemRow)
      }
      await db.stock_opnames.put(header)
      await db.stock_opname_items.bulkAdd(itemRows)
    },
  )

  const savedItems = await db.stock_opname_items.where('opname_id').equals(id).toArray()
  await writeAuditLog({
    action: complete ? 'stocktake_completed' : existing ? 'stocktake_updated' : 'stocktake_created',
    entity: 'stock_opnames',
    entity_id: id,
    payload: {
      nomor: number,
      item_count: draft.items.length,
      total_difference: savedItems.reduce((sum, item) => sum + item.diff_base, 0),
      status: header.status,
    },
  })
  return header
}

export async function deleteStocktakeDraft(id: string): Promise<void> {
  const row = await db.stock_opnames.get(id)
  if (!row) throw new Error('Sesi opname tidak ditemukan.')
  if (row.status !== 'draft') throw new Error('Hanya draft opname yang dapat dihapus.')
  await db.transaction('rw', [db.stock_opnames, db.stock_opname_items], async () => {
    await db.stock_opname_items.where('opname_id').equals(id).delete()
    await db.stock_opnames.delete(id)
  })
  await writeAuditLog({
    action: 'stocktake_deleted',
    entity: 'stock_opnames',
    entity_id: id,
    payload: { nomor: row.nomor },
  })
}

export async function getInventoryConsistency(): Promise<StockProductRow[]> {
  return (await getStockOverview()).filter((row) => row.stockDifference !== 0)
}
