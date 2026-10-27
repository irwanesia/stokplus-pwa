import { beforeEach, describe, expect, it } from 'vitest'

import { listAuditLogs, writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('audit log', () => {
  it('writes a structured entry', async () => {
    const entry = await writeAuditLog({
      action: 'setup_completed',
      entity: 'business_profile',
      entity_id: 'main',
      payload: { nama_usaha: 'Toko' },
      note: 'Setup pertama',
    })

    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await db.audit_logs.get(entry.id)).toMatchObject({
      action: 'setup_completed',
      entity: 'business_profile',
      note: 'Setup pertama',
    })
  })

  it('lists newest entries first', async () => {
    await db.audit_logs.bulkAdd([
      {
        id: 'older',
        timestamp: '2026-10-24T01:00:00.000Z',
        action: 'older',
        entity: 'test',
        entity_id: null,
        payload: null,
        note: '',
      },
      {
        id: 'newer',
        timestamp: '2026-10-24T02:00:00.000Z',
        action: 'newer',
        entity: 'test',
        entity_id: null,
        payload: null,
        note: '',
      },
    ])

    const logs = await listAuditLogs(10)
    expect(logs.map((log) => log.id)).toEqual(['newer', 'older'])
  })
})
