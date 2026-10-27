import { todayJakarta } from './date'

export const PREFIX_PATTERN = /^[A-Z0-9]{2,5}$/

export function validatePrefix(value: string): string | null {
  const normalized = value.trim().toUpperCase()

  if (!PREFIX_PATTERN.test(normalized)) {
    return 'Prefix harus 2–5 karakter huruf/angka.'
  }

  return null
}

export function normalizePrefix(value: string): string {
  return value.trim().toUpperCase()
}

export function formatCounterPreview(prefix: string, date = new Date()): string {
  const datePart = todayJakarta(date).replaceAll('-', '')
  return `${normalizePrefix(prefix)}-${datePart}-0001`
}
