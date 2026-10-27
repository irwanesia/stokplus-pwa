import { describe, expect, it } from 'vitest'

import {
  BackupError,
  backupFilename,
  canonicalStringify,
  createBackupFile,
  encryptBackupContent,
  inspectBackupFile,
} from '@/backup/codec'
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupCounts,
  type BackupPayload,
  type BackupTables,
} from '@/backup/types'
import { APP_VERSION } from '@/config'
import { DOMAIN_TABLE_NAMES, SCHEMA_VERSION } from '@/db/schema'

const now = '2026-10-25T03:04:05.000Z'

function validPayload(): BackupPayload {
  const tables = Object.fromEntries(
    DOMAIN_TABLE_NAMES.map((name) => [name, []]),
  ) as unknown as BackupTables

  tables.business_profile = [
    {
      id: 'main',
      nama_usaha: 'Frozen Food Bu Rina',
      nama_pemilik: 'Rina',
      alamat: 'Jl. Melati',
      telepon: '0812',
      catatan_laporan: '',
      created_at: now,
      updated_at: now,
    },
  ]
  tables.settings = [
    { key: 'pin_hash', value: 'hash', updated_at: now },
    { key: 'pin_salt', value: 'salt', updated_at: now },
    { key: 'pin_iterations', value: 210_000, updated_at: now },
  ]

  const counts = Object.fromEntries(
    DOMAIN_TABLE_NAMES.map((name) => [name, tables[name].length]),
  ) as unknown as BackupCounts

  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: now,
    cutoverDate: '2026-10-01',
    businessProfile: tables.business_profile[0] as BackupPayload['businessProfile'],
    tables,
    counts,
  }
}

describe('backup codec', () => {
  it('serializes keys deterministically and creates the expected filename', () => {
    expect(canonicalStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}')
    expect(backupFilename(new Date('2026-10-25T03:04:00.000Z'))).toBe(
      'stokplus-backup-20261025-1004.json',
    )
    expect(backupFilename(new Date('2026-10-25T03:04:00.000Z'), 'stokplus-safety-backup')).toBe(
      'stokplus-safety-backup-20261025-1004.json',
    )
  })

  it('validates a backup and returns a data preview', async () => {
    const file = await createBackupFile(validPayload())
    const inspected = await inspectBackupFile(JSON.stringify(file))

    expect(inspected.encrypted).toBe(false)
    expect(inspected.summary.businessName).toBe('Frozen Food Bu Rina')
    expect(inspected.summary.totalRows).toBe(4)
    expect(inspected.summary.schemaVersion).toBe(SCHEMA_VERSION)
    expect(inspected.payload.counts.business_profile).toBe(1)
  })

  it('rejects a changed checksum without exposing a payload', async () => {
    const file = await createBackupFile(validPayload())
    const raw = JSON.parse(JSON.stringify(file)) as Record<string, unknown>
    raw.checksum = '0'.repeat(64)

    await expect(inspectBackupFile(JSON.stringify(raw))).rejects.toMatchObject({
      code: 'CHECKSUM_MISMATCH',
    })
  })

  it('rejects the wrong app and schema version', async () => {
    const file = await createBackupFile(validPayload())
    const wrongApp = JSON.parse(JSON.stringify(file)) as Record<string, unknown>
    wrongApp.app = 'AplikasiLain'

    await expect(inspectBackupFile(JSON.stringify(wrongApp))).rejects.toMatchObject({
      code: 'WRONG_APP',
    })

    const wrongSchema = JSON.parse(JSON.stringify(file)) as Record<string, unknown>
    wrongSchema.schemaVersion = SCHEMA_VERSION + 1

    await expect(inspectBackupFile(JSON.stringify(wrongSchema))).rejects.toBeInstanceOf(BackupError)
    await expect(inspectBackupFile(JSON.stringify(wrongSchema))).rejects.toMatchObject({
      code: 'UNSUPPORTED_SCHEMA',
    })
  })

  it('encrypts and decrypts an optional passphrase backup', async () => {
    const file = await createBackupFile(validPayload())
    const encrypted = await encryptBackupContent(JSON.stringify(file), 'rahasia123')

    await expect(inspectBackupFile(encrypted)).rejects.toMatchObject({
      code: 'PASSPHRASE_REQUIRED',
    })
    await expect(inspectBackupFile(encrypted, 'passphrase-salah')).rejects.toMatchObject({
      code: 'DECRYPT_FAILED',
    })

    const inspected = await inspectBackupFile(encrypted, 'rahasia123')
    expect(inspected.encrypted).toBe(true)
    expect(inspected.payload.businessProfile?.nama_usaha).toBe('Frozen Food Bu Rina')

    const malformed = JSON.parse(encrypted) as {
      encryption: Record<string, unknown>
    }
    malformed.encryption.salt = 'bukan-base64!'
    await expect(inspectBackupFile(JSON.stringify(malformed), 'rahasia123')).rejects.toMatchObject({
      code: 'DECRYPT_FAILED',
    })
  })
})
