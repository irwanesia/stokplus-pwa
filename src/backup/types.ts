import type { BusinessProfile, DOMAIN_TABLE_NAMES } from '@/db/schema'

export const BACKUP_APP = 'StokPlus'
export const BACKUP_FORMAT = 'stokplus-backup'
export const BACKUP_ENCRYPTED_FORMAT = 'stokplus-backup-encrypted'
export const BACKUP_FORMAT_VERSION = 1

export type DomainTableName = (typeof DOMAIN_TABLE_NAMES)[number]
export type BackupTables = Record<DomainTableName, unknown[]>
export type BackupCounts = Record<DomainTableName, number>

export interface BackupPayload {
  app: typeof BACKUP_APP
  format: typeof BACKUP_FORMAT
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  cutoverDate: string
  businessProfile: BusinessProfile | null
  tables: BackupTables
  counts: BackupCounts
}

export interface BackupFile extends BackupPayload {
  checksum: string
}

export interface BackupEncryptionMeta {
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string
  iv: string
}

export interface EncryptedBackupEnvelope {
  app: typeof BACKUP_APP
  format: typeof BACKUP_ENCRYPTED_FORMAT
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  encryption: BackupEncryptionMeta
  ciphertext: string
}

export interface BackupSummary {
  appVersion: string
  exportedAt: string
  schemaVersion: number
  cutoverDate: string
  businessName: string
  counts: BackupCounts
  totalRows: number
  transactionCount: number
}

export interface BackupInspection {
  payload: BackupPayload
  summary: BackupSummary
  encrypted: boolean
  fileSize: number
}

export interface BackupCreateOptions {
  encrypt: boolean
  passphrase?: string
}

export interface BackupCreateResult {
  payload: BackupPayload
  file: BackupFile
  content: string
  filename: string
  size: number
  encrypted: boolean
  transactionCount: number
}

export interface SafetyBackup {
  file: BackupFile
  content: string
  filename: string
}

export interface RestoreBackupOptions {
  fileSize?: number
  encrypted?: boolean
  onSafetyBackup?: (backup: SafetyBackup) => void | Promise<void>
}

export interface RestoreBackupResult {
  counts: BackupCounts
  transactionCount: number
  safetyBackup: SafetyBackup | null
}

export type BackupReminderReason = 'never' | 'age' | 'transactions'

export interface BackupReminderStatus {
  shouldRemind: boolean
  reason: BackupReminderReason | null
  daysSince: number | null
  transactionCount: number
  lastBackupAt: string
  lastBackupSize: number
}

export interface BackupStats {
  counts: BackupCounts
  totalRows: number
  transactionCount: number
}
