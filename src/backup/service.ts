import { APP_VERSION } from '@/config'
import { db } from '@/db/dexie'
import { DOMAIN_TABLE_NAMES, SCHEMA_VERSION, type BusinessProfile } from '@/db/schema'
import { ensureSettingsDefaults, getSetting, getSettings, saveSettings } from '@/db/settings'
import { writeAuditLog } from '@/db/audit'
import { nowIso } from '@/utils/date'

import {
  backupFilename,
  countTransactionRows,
  createBackupFile,
  encryptBackupContent,
} from './codec'
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupCounts,
  type BackupCreateOptions,
  type BackupCreateResult,
  type BackupPayload,
  type BackupReminderStatus,
  type BackupStats,
  type BackupTables,
  type RestoreBackupOptions,
  type RestoreBackupResult,
  type SafetyBackup,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const BULK_CHUNK_SIZE = 500

async function readDomainTables(): Promise<BackupTables> {
  const entries = await Promise.all(
    DOMAIN_TABLE_NAMES.map(async (name) => [name, await db.table(name).toArray()] as const),
  )

  return Object.fromEntries(entries) as BackupTables
}

function countsForTables(tables: BackupTables): BackupCounts {
  const counts = {} as BackupCounts

  for (const name of DOMAIN_TABLE_NAMES) {
    counts[name] = tables[name].length
  }

  return counts
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const tables = await readDomainTables()
  const profiles = tables.business_profile as BusinessProfile[]
  const businessProfile = profiles.find((profile) => profile.id === 'main') ?? null
  const exportedAt = nowIso()
  const cutoverDate = await getSetting('cutover_date')

  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt,
    cutoverDate,
    businessProfile,
    tables,
    counts: countsForTables(tables),
  }
}

export async function prepareBackup(options: BackupCreateOptions): Promise<BackupCreateResult> {
  const payload = await buildBackupPayload()
  const file = await createBackupFile(payload)
  const plainContent = JSON.stringify(file)
  const content = options.encrypt
    ? await encryptBackupContent(plainContent, options.passphrase ?? '')
    : plainContent
  const size = new Blob([content]).size

  return {
    payload,
    file,
    content,
    filename: backupFilename(new Date(payload.exportedAt)),
    size,
    encrypted: options.encrypt,
    transactionCount: countTransactionRows(payload.tables),
  }
}

async function replaceAllTables(tables: BackupTables): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of DOMAIN_TABLE_NAMES) {
      await db.table(name).clear()
    }

    for (const name of DOMAIN_TABLE_NAMES) {
      const rows = tables[name]
      for (let index = 0; index < rows.length; index += BULK_CHUNK_SIZE) {
        await db.table(name).bulkPut(rows.slice(index, index + BULK_CHUNK_SIZE))
      }
    }
  })
}

async function createSafetyBackup(): Promise<SafetyBackup> {
  const payload = await buildBackupPayload()
  const file = await createBackupFile(payload)

  return {
    file,
    content: JSON.stringify(file),
    filename: backupFilename(new Date(), 'stokplus-safety-backup'),
  }
}

export async function restoreBackup(
  payload: BackupPayload,
  options: RestoreBackupOptions = {},
): Promise<RestoreBackupResult> {
  const current = await buildBackupPayload()
  const hasExistingProfile = current.tables.business_profile.some(
    (profile) => (profile as { id?: string }).id === 'main',
  )
  const safetyBackup = hasExistingProfile ? await createSafetyBackup() : null

  if (safetyBackup && options.onSafetyBackup) {
    try {
      await options.onSafetyBackup(safetyBackup)
    } catch {
      // Safety data remains in memory for rollback even if download is blocked.
    }
  }

  try {
    await replaceAllTables(payload.tables)
    await ensureSettingsDefaults()

    const transactionCount = countTransactionRows(payload.tables)
    await saveSettings({
      last_backup_at: payload.exportedAt,
      last_backup_size: options.fileSize ?? 0,
      last_backup_transaction_count: transactionCount,
      backup_encryption_default: options.encrypted ?? false,
    })

    await writeAuditLog({
      action: 'backup_restored',
      entity: 'backup',
      payload: {
        exportedAt: payload.exportedAt,
        counts: payload.counts,
        safetyBackup: safetyBackup?.filename ?? null,
      },
      note: 'Seluruh data dipulihkan dari file backup.',
    })

    return {
      counts: payload.counts,
      transactionCount,
      safetyBackup,
    }
  } catch (error) {
    if (safetyBackup) {
      try {
        await replaceAllTables(safetyBackup.file.tables)
        await ensureSettingsDefaults()
      } catch (rollbackError) {
        const original = error instanceof Error ? error.message : String(error)
        const rollback =
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        throw new Error(`Restore gagal dan rollback gagal: ${original}; ${rollback}`, {
          cause: rollbackError,
        })
      }
    }

    throw error
  }
}

async function countTransactionsSince(since: number | null): Promise<number> {
  const [sales, purchases, expenses] = await Promise.all([
    db.sales.toArray(),
    db.purchases.toArray(),
    db.expenses.toArray(),
  ])

  const rows = [...sales, ...purchases, ...expenses]
  return rows.filter((row) => {
    if (row.status !== 'completed') {
      return false
    }

    if (since === null) {
      return true
    }

    const createdAt = new Date(row.created_at).getTime()
    return Number.isFinite(createdAt) && createdAt > since
  }).length
}

export async function getBackupReminderStatus(now = new Date()): Promise<BackupReminderStatus> {
  const settings = await getSettings()
  const lastBackupAt = settings.last_backup_at
  const lastBackupDate = lastBackupAt ? new Date(lastBackupAt) : null
  const hasValidLastBackup = Boolean(lastBackupDate && Number.isFinite(lastBackupDate.getTime()))
  const daysSince =
    hasValidLastBackup && lastBackupDate
      ? Math.max(0, Math.floor((now.getTime() - lastBackupDate.getTime()) / DAY_MS))
      : null
  const since = hasValidLastBackup && lastBackupDate ? lastBackupDate.getTime() : null
  const transactionCount = await countTransactionsSince(since)

  let reason: BackupReminderStatus['reason'] = null
  if (settings.onboarding_completed_at) {
    if (!hasValidLastBackup) {
      reason = 'never'
    } else if (daysSince !== null && daysSince >= 7) {
      reason = 'age'
    } else if (transactionCount >= 50) {
      reason = 'transactions'
    }
  }

  return {
    shouldRemind: reason !== null,
    reason,
    daysSince,
    transactionCount,
    lastBackupAt,
    lastBackupSize: settings.last_backup_size,
  }
}

export async function getBackupStats(): Promise<BackupStats> {
  const counts = {} as BackupCounts

  for (const name of DOMAIN_TABLE_NAMES) {
    counts[name] = await db.table(name).count()
  }

  const [sales, purchases, expenses] = await Promise.all([
    db.sales.toArray(),
    db.purchases.toArray(),
    db.expenses.toArray(),
  ])
  const transactionCount = [...sales, ...purchases, ...expenses].filter(
    (row) => row.status === 'completed',
  ).length

  return {
    counts,
    totalRows: Object.values(counts).reduce((total, count) => total + count, 0),
    transactionCount,
  }
}
