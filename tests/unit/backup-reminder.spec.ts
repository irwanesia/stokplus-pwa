import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getBackupReminderStatus } from '@/backup/service'
import { db } from '@/db/dexie'
import type { Sale } from '@/db/schema'
import { ensureSettingsDefaults, saveSettings } from '@/db/settings'

const now = '2026-10-25T03:04:00.000Z'
const day = 24 * 60 * 60 * 1000

function sale(index: number, createdAt: string): Sale {
  return {
    id: `sale-${index}`,
    nomor_nota: `PJ-${index}`,
    tanggal: '2026-10-25',
    customer_id: null,
    metode_pembayaran: 'tunai',
    subtotal: 1_000,
    diskon: 0,
    total: 1_000,
    bayar: 1_000,
    hpp_total: 700,
    gross_profit: 300,
    status: 'completed',
    keterangan: '',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  }
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
  await ensureSettingsDefaults()
  await saveSettings({ onboarding_completed_at: now })
})

afterAll(async () => {
  db.close()
  await db.delete()
})

describe('backup reminder', () => {
  it('reminds when no backup has ever been made', async () => {
    const status = await getBackupReminderStatus()

    expect(status.shouldRemind).toBe(true)
    expect(status.reason).toBe('never')
    expect(status.daysSince).toBeNull()
  })

  it('does not remind for a recent backup with few transactions', async () => {
    await saveSettings({ last_backup_at: new Date().toISOString() })

    const status = await getBackupReminderStatus()

    expect(status.shouldRemind).toBe(false)
    expect(status.reason).toBeNull()
  })

  it('reminds after seven days', async () => {
    await saveSettings({
      last_backup_at: new Date(Date.now() - 8 * day).toISOString(),
    })

    const status = await getBackupReminderStatus()

    expect(status.shouldRemind).toBe(true)
    expect(status.reason).toBe('age')
    expect(status.daysSince).toBeGreaterThanOrEqual(8)
  })

  it('reminds after fifty completed transactions since the last backup', async () => {
    await saveSettings({
      last_backup_at: new Date(Date.now() - day).toISOString(),
    })
    const createdAt = new Date().toISOString()
    await db.sales.bulkAdd(Array.from({ length: 50 }, (_, index) => sale(index + 1, createdAt)))

    const status = await getBackupReminderStatus()

    expect(status.shouldRemind).toBe(true)
    expect(status.reason).toBe('transactions')
    expect(status.transactionCount).toBe(50)
  })
})
