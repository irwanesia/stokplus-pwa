import { db } from './dexie'
import { SCHEMA_VERSION } from './schema'
import { PBKDF2_ITERATIONS } from '@/utils/pin'
import { nowIso } from '@/utils/date'

export interface AppSettings {
  auto_lock_minutes: number
  prefix_sale: string
  prefix_purchase: string
  prefix_expense: string
  prefix_opname: string
  prefix_writeoff: string
  expiry_alert_default_days: number
  cutover_date: string
  pin_hash: string
  pin_salt: string
  pin_iterations: number
  schema_version: number
  sample_data_seeded: boolean
  onboarding_completed_at: string
  last_backup_at: string
  last_backup_size: number
  last_backup_transaction_count: number
  backup_encryption_default: boolean
  historical_cogs_method: string
  hpp_policy: string
}

export type SettingKey = keyof AppSettings

export const DEFAULT_SETTINGS: AppSettings = {
  auto_lock_minutes: 5,
  prefix_sale: 'PJ',
  prefix_purchase: 'PB',
  prefix_expense: 'BB',
  prefix_opname: 'OP',
  prefix_writeoff: 'WO',
  expiry_alert_default_days: 30,
  cutover_date: '',
  pin_hash: '',
  pin_salt: '',
  pin_iterations: PBKDF2_ITERATIONS,
  schema_version: SCHEMA_VERSION,
  sample_data_seeded: false,
  onboarding_completed_at: '',
  last_backup_at: '',
  last_backup_size: 0,
  last_backup_transaction_count: 0,
  backup_encryption_default: false,
  historical_cogs_method: 'weighted_average',
  hpp_policy: 'fefo_fifo',
}

export const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 menit' },
  { value: 5, label: '5 menit' },
  { value: 15, label: '15 menit' },
  { value: 0, label: 'Tidak pernah' },
] as const

export const PREFIX_KEYS = [
  'prefix_sale',
  'prefix_purchase',
  'prefix_expense',
  'prefix_opname',
  'prefix_writeoff',
] as const

export const PREFIX_LABELS: Record<(typeof PREFIX_KEYS)[number], string> = {
  prefix_sale: 'Penjualan',
  prefix_purchase: 'Pembelian',
  prefix_expense: 'Beban',
  prefix_opname: 'Opname',
  prefix_writeoff: 'Write-off',
}

export function hasPinConfigured(settings: AppSettings): boolean {
  return Boolean(settings.pin_hash && settings.pin_salt && settings.pin_iterations > 0)
}

export async function ensureSettingsDefaults(): Promise<void> {
  const existing = await db.settings.toArray()
  const existingKeys = new Set(existing.map((record) => record.key))
  const now = nowIso()
  const rows = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({
      key,
      value,
      updated_at: now,
    }))

  if (rows.length > 0) {
    await db.settings.bulkPut(rows)
  }

  const schemaVersion = existing.find((record) => record.key === 'schema_version')
  if (!schemaVersion || schemaVersion.value !== SCHEMA_VERSION) {
    await db.settings.put({
      key: 'schema_version',
      value: SCHEMA_VERSION,
      updated_at: now,
    })
  }
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray()
  const values = new Map(rows.map((record) => [record.key, record.value]))
  const result = { ...DEFAULT_SETTINGS }

  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (values.has(key)) {
      ;(result as Record<SettingKey, unknown>)[key] = values.get(key)
    }
  }

  return result
}

export async function getSetting<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
  const record = await db.settings.get(key)
  return (record?.value as AppSettings[K] | undefined) ?? DEFAULT_SETTINGS[key]
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const now = nowIso()
  const rows = Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      value,
      updated_at: now,
    }))

  if (rows.length > 0) {
    await db.settings.bulkPut(rows)
  }
}
