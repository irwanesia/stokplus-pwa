import { DOMAIN_TABLE_NAMES, SCHEMA_VERSION } from '@/db/schema'
import { base64ToBytes, bytesToBase64 } from '@/utils/base64'
import { PBKDF2_ITERATIONS } from '@/utils/pin'

import {
  BACKUP_APP,
  BACKUP_ENCRYPTED_FORMAT,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupCounts,
  type BackupEncryptionMeta,
  type BackupFile,
  type BackupInspection,
  type BackupPayload,
  type BackupSummary,
  type BackupTables,
  type EncryptedBackupEnvelope,
} from './types'

export type BackupErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_FORMAT'
  | 'WRONG_APP'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_TABLES'
  | 'INCOMPLETE_BACKUP'
  | 'CHECKSUM_MISMATCH'
  | 'INVALID_ENVELOPE'
  | 'PASSPHRASE_REQUIRED'
  | 'DECRYPT_FAILED'

export class BackupError extends Error {
  readonly code: BackupErrorCode

  constructor(code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) {
      throw new Error('root is not an object')
    }
    return parsed
  } catch {
    throw new BackupError('INVALID_JSON', 'File bukan JSON backup yang valid.')
  }
}

function assertBaseMetadata(raw: Record<string, unknown>, expectedFormat: string) {
  if (raw.app !== BACKUP_APP) {
    throw new BackupError('WRONG_APP', 'File ini bukan backup aplikasi StokPlus.')
  }

  if (raw.format !== expectedFormat) {
    throw new BackupError('INVALID_FORMAT', 'Format file backup tidak dikenali.')
  }

  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupError('INVALID_FORMAT', 'Versi format backup tidak didukung.')
  }

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new BackupError(
      'UNSUPPORTED_SCHEMA',
      `Backup memakai schema v${String(raw.schemaVersion)}, sedangkan aplikasi ini memakai v${SCHEMA_VERSION}.`,
    )
  }
}

function readTables(raw: Record<string, unknown>): BackupTables {
  if (!isRecord(raw.tables)) {
    throw new BackupError('INVALID_TABLES', 'Struktur tabel backup tidak valid.')
  }

  const tables = {} as BackupTables

  for (const name of DOMAIN_TABLE_NAMES) {
    const rows = raw.tables[name]
    if (!Array.isArray(rows) || !rows.every((row) => isRecord(row))) {
      throw new BackupError('INVALID_TABLES', `Tabel ${name} pada backup tidak valid.`)
    }
    tables[name] = rows
  }

  return tables
}

function readCounts(raw: Record<string, unknown>): BackupCounts {
  if (!isRecord(raw.counts)) {
    throw new BackupError('INVALID_TABLES', 'Jumlah baris backup tidak valid.')
  }

  const counts = {} as BackupCounts

  for (const name of DOMAIN_TABLE_NAMES) {
    const count = raw.counts[name]
    if (!Number.isInteger(count) || Number(count) < 0) {
      throw new BackupError('INVALID_TABLES', `Jumlah baris ${name} tidak valid.`)
    }
    counts[name] = Number(count)
  }

  return counts
}

function assertCountsMatch(tables: BackupTables, counts: BackupCounts) {
  for (const name of DOMAIN_TABLE_NAMES) {
    if (tables[name].length !== counts[name]) {
      throw new BackupError('INVALID_TABLES', `Jumlah baris ${name} tidak cocok dengan isi file.`)
    }
  }
}

function assertCompleteBackup(tables: BackupTables) {
  const profiles = tables.business_profile as Record<string, unknown>[]
  const hasProfile = profiles.some(
    (profile) =>
      profile.id === 'main' &&
      typeof profile.nama_usaha === 'string' &&
      profile.nama_usaha.trim().length > 0,
  )

  if (!hasProfile) {
    throw new BackupError('INCOMPLETE_BACKUP', 'Backup tidak berisi profil usaha yang lengkap.')
  }

  const settings = tables.settings as Record<string, unknown>[]
  const values = new Map(settings.map((row) => [String(row.key), row.value]))
  const pinHash = values.get('pin_hash')
  const pinSalt = values.get('pin_salt')
  const pinIterations = values.get('pin_iterations')

  if (
    typeof pinHash !== 'string' ||
    !pinHash ||
    typeof pinSalt !== 'string' ||
    !pinSalt ||
    typeof pinIterations !== 'number' ||
    pinIterations <= 0
  ) {
    throw new BackupError('INCOMPLETE_BACKUP', 'Backup tidak berisi PIN lokal yang lengkap.')
  }
}

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
    .join(',')}}`
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function checksumForPayload(payload: unknown): Promise<string> {
  return sha256Hex(canonicalStringify(payload))
}

export async function createBackupFile(payload: BackupPayload): Promise<BackupFile> {
  const checksum = await checksumForPayload(payload)
  return { ...payload, checksum }
}

export function countTransactionRows(tables: BackupTables): number {
  const rows = [
    ...(tables.sales as Record<string, unknown>[]),
    ...(tables.purchases as Record<string, unknown>[]),
    ...(tables.expenses as Record<string, unknown>[]),
  ]

  return rows.filter((row) => row.status === 'completed').length
}

export function summaryFromPayload(payload: BackupPayload): BackupSummary {
  const profiles = payload.tables.business_profile as Record<string, unknown>[]
  const profile = profiles.find((row) => row.id === 'main')
  const businessName =
    (profile && typeof profile.nama_usaha === 'string' ? profile.nama_usaha : '') ||
    payload.businessProfile?.nama_usaha ||
    'Tanpa nama'

  return {
    appVersion: payload.appVersion,
    exportedAt: payload.exportedAt,
    schemaVersion: payload.schemaVersion,
    cutoverDate: payload.cutoverDate,
    businessName,
    counts: payload.counts,
    totalRows: Object.values(payload.counts).reduce((total, count) => total + count, 0),
    transactionCount: countTransactionRows(payload.tables),
  }
}

export function backupFilename(date = new Date(), prefix = 'stokplus-backup'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${prefix}-${values.year}${values.month}${values.day}-${values.hour}${values.minute}.json`
}

async function readPlainPayload(
  raw: Record<string, unknown>,
  fileSize: number,
  encrypted = false,
): Promise<BackupInspection> {
  assertBaseMetadata(raw, BACKUP_FORMAT)

  const tables = readTables(raw)
  const counts = readCounts(raw)
  assertCountsMatch(tables, counts)
  assertCompleteBackup(tables)

  const checksum = raw.checksum
  if (typeof checksum !== 'string') {
    throw new BackupError('CHECKSUM_MISMATCH', 'Checksum backup tidak ditemukan.')
  }

  const { checksum: _checksum, ...unsigned } = raw
  const expected = await checksumForPayload(unsigned)

  if (checksum !== expected) {
    throw new BackupError(
      'CHECKSUM_MISMATCH',
      'Checksum backup tidak cocok. File mungkin rusak atau sudah diubah.',
    )
  }

  const payload: BackupPayload = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: typeof unsigned.appVersion === 'string' ? unsigned.appVersion : 'unknown',
    exportedAt: typeof unsigned.exportedAt === 'string' ? unsigned.exportedAt : '',
    cutoverDate: typeof unsigned.cutoverDate === 'string' ? unsigned.cutoverDate : '',
    businessProfile: isRecord(unsigned.businessProfile)
      ? (unsigned.businessProfile as unknown as BackupPayload['businessProfile'])
      : null,
    tables,
    counts,
  }

  return {
    payload,
    summary: summaryFromPayload(payload),
    encrypted,
    fileSize,
  }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

async function deriveBackupKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function assertEncryptedEnvelope(raw: Record<string, unknown>): EncryptedBackupEnvelope {
  assertBaseMetadata(raw, BACKUP_ENCRYPTED_FORMAT)

  if (!isRecord(raw.encryption)) {
    throw new BackupError('INVALID_ENVELOPE', 'Struktur enkripsi backup tidak valid.')
  }

  const encryption = raw.encryption
  if (
    encryption.algorithm !== 'AES-GCM' ||
    encryption.kdf !== 'PBKDF2-SHA256' ||
    !Number.isInteger(encryption.iterations) ||
    Number(encryption.iterations) !== PBKDF2_ITERATIONS ||
    typeof encryption.salt !== 'string' ||
    !encryption.salt ||
    typeof encryption.iv !== 'string' ||
    !encryption.iv ||
    typeof raw.ciphertext !== 'string' ||
    !raw.ciphertext
  ) {
    throw new BackupError('INVALID_ENVELOPE', 'Struktur enkripsi backup tidak valid.')
  }

  return {
    app: BACKUP_APP,
    format: BACKUP_ENCRYPTED_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    encryption: encryption as unknown as BackupEncryptionMeta,
    ciphertext: raw.ciphertext,
  }
}

export async function encryptBackupContent(
  plainContent: string,
  passphrase: string,
): Promise<string> {
  if (passphrase.length < 8) {
    throw new Error('Passphrase backup minimal 8 karakter.')
  }

  const plain = parseJson(plainContent)
  const envelopeBase = assertEncryptedEnvelope({
    ...plain,
    format: BACKUP_ENCRYPTED_FORMAT,
    encryption: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: PBKDF2_ITERATIONS,
      salt: 'placeholder',
      iv: 'placeholder',
    },
    ciphertext: 'placeholder',
  })

  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await deriveBackupKey(passphrase, salt, PBKDF2_ITERATIONS)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plainContent),
  )

  const envelope: EncryptedBackupEnvelope = {
    app: envelopeBase.app,
    format: envelopeBase.format,
    formatVersion: envelopeBase.formatVersion,
    schemaVersion: envelopeBase.schemaVersion,
    appVersion: envelopeBase.appVersion,
    exportedAt: envelopeBase.exportedAt,
    encryption: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }

  return JSON.stringify(envelope)
}

async function decryptBackupContent(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): Promise<string> {
  try {
    const salt = base64ToBytes(envelope.encryption.salt)
    const iv = base64ToBytes(envelope.encryption.iv)
    const ciphertext = base64ToBytes(envelope.ciphertext)
    const key = await deriveBackupKey(passphrase, salt, envelope.encryption.iterations)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new BackupError('DECRYPT_FAILED', 'Passphrase salah atau file backup rusak.')
  }
}

export async function inspectBackupFile(
  content: string,
  passphrase?: string,
): Promise<BackupInspection> {
  const raw = parseJson(content)
  const fileSize = new TextEncoder().encode(content).length

  if (raw.format === BACKUP_ENCRYPTED_FORMAT) {
    const envelope = assertEncryptedEnvelope(raw)

    if (!passphrase) {
      throw new BackupError(
        'PASSPHRASE_REQUIRED',
        'File backup terenkripsi. Masukkan passphrase untuk membukanya.',
      )
    }

    const plainContent = await decryptBackupContent(envelope, passphrase)
    const plain = parseJson(plainContent)
    return readPlainPayload(plain, fileSize, true)
  }

  return readPlainPayload(raw, fileSize)
}
