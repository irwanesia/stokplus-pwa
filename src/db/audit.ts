import { db } from './dexie'
import type { AuditLog } from './schema'
import { nowIso } from '@/utils/date'
import { uuidv7 } from '@/utils/id'

export const MAX_AUDIT_LOGS = 1000

export interface AuditInput {
  action: string
  entity: string
  entity_id?: string | null
  payload?: unknown
  note?: string
}

export async function writeAuditLog(input: AuditInput): Promise<AuditLog> {
  const entry: AuditLog = {
    id: uuidv7(),
    timestamp: nowIso(),
    action: input.action,
    entity: input.entity,
    entity_id: input.entity_id ?? null,
    payload: input.payload ?? null,
    note: input.note ?? '',
  }

  await db.transaction('rw', db.audit_logs, async () => {
    await db.audit_logs.add(entry)

    const count = await db.audit_logs.count()
    if (count > MAX_AUDIT_LOGS) {
      const excess = count - MAX_AUDIT_LOGS
      const oldestIds = await db.audit_logs.orderBy('timestamp').limit(excess).primaryKeys()
      await db.audit_logs.bulkDelete(oldestIds)
    }
  })

  return entry
}

export async function listAuditLogs(limit = 20): Promise<AuditLog[]> {
  return db.audit_logs.orderBy('timestamp').reverse().limit(limit).toArray()
}

export async function clearAuditLogs(): Promise<void> {
  await db.audit_logs.clear()
}
