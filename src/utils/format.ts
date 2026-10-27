export function formatNumberId(
  value: number | null | undefined,
  maximumFractionDigits = 0,
): string {
  const numeric = Number(value ?? 0)

  if (!Number.isFinite(numeric)) {
    return '0'
  }

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits,
  }).format(numeric)
}

export function formatRupiah(value: number | null | undefined): string {
  return `Rp ${formatNumberId(value)}`
}

export function formatQty(value: number | null | undefined, symbol = ''): string {
  const formatted = formatNumberId(value, 3)
  return symbol ? `${formatted} ${symbol}` : formatted
}

export function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
