import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db/dexie'
import {
  DEFAULT_SETTINGS,
  ensureSettingsDefaults,
  getSettings,
  hasPinConfigured,
  saveSettings,
} from '@/db/settings'

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('settings repository', () => {
  it('seeds defaults and returns typed values', async () => {
    await ensureSettingsDefaults()
    const settings = await getSettings()

    expect(settings).toMatchObject(DEFAULT_SETTINGS)
    expect(settings.schema_version).toBe(2)
    expect(settings.auto_lock_minutes).toBe(5)
    expect(settings.expiry_alert_default_days).toBe(30)
    expect(hasPinConfigured(settings)).toBe(false)
  })

  it('updates individual settings without wiping others', async () => {
    await ensureSettingsDefaults()
    await saveSettings({ auto_lock_minutes: 15, prefix_sale: 'JUAL' })

    const settings = await getSettings()
    expect(settings.auto_lock_minutes).toBe(15)
    expect(settings.prefix_sale).toBe('JUAL')
    expect(settings.prefix_purchase).toBe('PB')
  })

  it('detects a configured PIN', async () => {
    await ensureSettingsDefaults()
    await saveSettings({ pin_hash: 'hash', pin_salt: 'salt', pin_iterations: 210000 })

    expect(hasPinConfigured(await getSettings())).toBe(true)
  })
})
