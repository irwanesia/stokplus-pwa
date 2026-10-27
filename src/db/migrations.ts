import type { Transaction } from 'dexie'

import { SCHEMA_VERSION, type SettingRecord } from './schema'

/**
 * v1 hanya berisi `app_meta`. Upgrade v2 menambahkan seluruh tabel domain.
 * Dexie mempertahankan tabel yang masih ada di schema baru; `app_meta` sengaja
 * dipertahankan sebagai metadata teknis.
 */
export async function migrateToV2(tx: Transaction) {
  const now = new Date().toISOString()
  const settings = tx.table<SettingRecord, string>('settings')

  await settings.put({
    key: 'schema_version',
    value: SCHEMA_VERSION,
    updated_at: now,
  })
}
