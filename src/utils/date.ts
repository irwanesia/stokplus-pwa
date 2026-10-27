export const TIME_ZONE = 'Asia/Jakarta'

export function nowIso(): string {
  return new Date().toISOString()
}

export function todayJakarta(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatDateId(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(`${value}T00:00:00+07:00`)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: TIME_ZONE,
  }).format(date)
}

export function formatDateTimeId(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date)
}
