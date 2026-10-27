import type { ProductUnitDraft } from './types'

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeBarcode(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized : null
}

export function validateCode(value: string, label = 'Kode'): string | null {
  if (!value.trim()) {
    return `${label} wajib diisi.`
  }

  if (!CODE_PATTERN.test(normalizeCode(value))) {
    return `${label} harus 2–20 karakter huruf, angka, atau tanda hubung.`
  }

  return null
}

export function validateRequiredName(value: string, label = 'Nama'): string | null {
  if (!normalizeName(value)) {
    return `${label} wajib diisi.`
  }

  return null
}

export function validateInteger(
  value: unknown,
  label: string,
  options: { min?: number; max?: number } = {},
): string | null {
  const numberValue = Number(value)
  const min = options.min ?? 0

  if (!Number.isFinite(numberValue)) {
    return `${label} harus berupa angka.`
  }

  if (!Number.isInteger(numberValue)) {
    return `${label} harus bilangan bulat.`
  }

  if (numberValue < min) {
    return `${label} minimal ${min}.`
  }

  if (options.max !== undefined && numberValue > options.max) {
    return `${label} maksimal ${options.max}.`
  }

  return null
}

export function validateNonNegativeNumber(value: unknown, label: string): string | null {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return `${label} harus berupa angka.`
  }

  if (numberValue < 0) {
    return `${label} tidak boleh negatif.`
  }

  return null
}

export function validateDate(value: string, label = 'Tanggal'): string | null {
  if (!DATE_PATTERN.test(value.trim())) {
    return `${label} wajib diisi dengan format YYYY-MM-DD.`
  }

  const parsed = new Date(`${value}T00:00:00+07:00`)

  if (Number.isNaN(parsed.getTime())) {
    return `${label} tidak valid.`
  }

  const [year, month, day] = value.split('-').map(Number)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return `${label} tidak valid.`
  }

  return null
}

/**
 * Qty base wajib bilangan bulat. Contoh: 0,5 kg × 1.000 = 500 gram.
 * Konversi pecahan atau hasil pecahan ditolak.
 */
export function toBaseQuantity(qtyUnit: unknown, conversionQty: unknown): number | null {
  const qty = Number(qtyUnit)
  const conversion = Number(conversionQty)

  if (!Number.isFinite(qty) || !Number.isFinite(conversion) || conversion <= 0) {
    return null
  }

  const result = qty * conversion
  return Number.isInteger(result) ? result : null
}

export function unitRowError(
  row: ProductUnitDraft,
  baseUnitId: string,
  existingUnitIds: string[] = [],
): string | null {
  if (!row.unit_id) {
    return 'Satuan wajib dipilih.'
  }

  if (row.unit_id !== baseUnitId && existingUnitIds.includes(row.unit_id)) {
    return 'Satuan yang sama tidak boleh dipilih dua kali.'
  }

  const conversionError = validateInteger(row.conversion_qty, 'Konversi', { min: 1 })
  if (conversionError) {
    return conversionError
  }

  if (row.unit_id === baseUnitId && Number(row.conversion_qty) !== 1) {
    return 'Base unit wajib memiliki konversi 1.'
  }

  const purchasePriceError = validateNonNegativeNumber(row.harga_beli_default, 'Harga beli default')
  if (purchasePriceError) {
    return purchasePriceError
  }

  const salePriceError = validateNonNegativeNumber(row.harga_jual, 'Harga jual')
  if (salePriceError) {
    return salePriceError
  }

  if (row.is_default_purchase && !row.can_purchase) {
    return 'Default beli hanya boleh untuk satuan yang bisa dibeli.'
  }

  if (row.is_default_sale && !row.can_sell) {
    return 'Default jual hanya boleh untuk satuan yang bisa dijual.'
  }

  return null
}

export function validateProductUnits(rows: ProductUnitDraft[], baseUnitId: string): string | null {
  if (!baseUnitId) {
    return 'Base unit wajib dipilih.'
  }

  if (rows.length === 0) {
    return 'Minimal satu satuan produk wajib diisi.'
  }

  const baseRows = rows.filter((row) => row.unit_id === baseUnitId)

  if (baseRows.length !== 1) {
    return 'Harus ada tepat satu baris base unit dengan konversi 1.'
  }

  if (!baseRows[0]?.is_base) {
    return 'Base unit wajib ditandai sebagai base.'
  }

  const duplicateIds = new Set<string>()
  const seen = new Set<string>()

  for (const row of rows) {
    if (!row.unit_id) {
      return 'Satuan wajib dipilih.'
    }

    if (seen.has(row.unit_id)) {
      return 'Satu produk tidak boleh memiliki dua baris dengan satuan yang sama.'
    }
    seen.add(row.unit_id)

    const rowError = unitRowError(row, baseUnitId, [...duplicateIds])
    if (rowError) {
      return rowError
    }

    duplicateIds.add(row.unit_id)
  }

  const purchaseDefaults = rows.filter((row) => row.is_default_purchase)
  if (purchaseDefaults.length > 1) {
    return 'Hanya boleh ada satu default beli.'
  }

  const saleDefaults = rows.filter((row) => row.is_default_sale)
  if (saleDefaults.length > 1) {
    return 'Hanya boleh ada satu default jual.'
  }

  if (rows.some((row) => row.can_purchase) && purchaseDefaults.length !== 1) {
    return 'Pilih satu default beli untuk satuan yang bisa dibeli.'
  }

  if (rows.some((row) => row.can_sell) && saleDefaults.length !== 1) {
    return 'Pilih satu default jual untuk satuan yang bisa dijual.'
  }

  return null
}

export function nextCode(prefix: string, codes: string[], width = 3): string {
  const normalizedPrefix = normalizeCode(prefix)
  const pattern = new RegExp(`^${escapeRegExp(normalizedPrefix)}-(\\d+)$`)
  let max = 0

  for (const code of codes) {
    const match = pattern.exec(normalizeCode(code))
    if (match) {
      max = Math.max(max, Number(match[1]))
    }
  }

  return `${normalizedPrefix}-${String(max + 1).padStart(width, '0')}`
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
