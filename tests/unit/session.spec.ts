import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { listAuditLogs } from '@/db/audit'
import { db } from '@/db/dexie'
import { useSessionStore } from '@/stores/session'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterAll(async () => {
  db.close()
  await db.delete()
})

const profile = {
  nama_usaha: 'Frozen Food Bu Rina',
  nama_pemilik: 'Rina',
  alamat: 'Jl. Melati No. 1',
  telepon: '08123456789',
  catatan_laporan: 'Terima kasih.',
}

describe('session store', () => {
  it('validates onboarding, hashes the PIN, locks on restart, and unlocks', async () => {
    const session = useSessionStore()
    await session.initialize()

    expect(session.status).toBe('onboarding')
    await expect(
      session.completeOnboarding({
        profile: { ...profile, nama_usaha: ' ' },
        pin: '123456',
        sampleData: false,
      }),
    ).rejects.toThrow('Nama usaha wajib diisi.')
    await expect(
      session.completeOnboarding({ profile, pin: '12345', sampleData: false }),
    ).rejects.toThrow('PIN harus 6 digit.')

    const result = await session.completeOnboarding({
      profile,
      pin: '123456',
      sampleData: false,
    })

    expect(result.sampleWarning).toBe('')
    expect(session.status).toBe('unlocked')
    expect(session.profile?.nama_usaha).toBe(profile.nama_usaha)
    expect(session.settings.pin_hash).not.toBe('123456')
    expect(session.settings.pin_salt).not.toBe('')
    expect(session.settings.pin_iterations).toBeGreaterThan(0)

    const setupLog = (await listAuditLogs()).find((log) => log.action === 'setup_completed')
    expect(setupLog).toBeDefined()

    await session.initialize()
    expect(session.status).toBe('locked')

    expect(await session.unlock('111111')).toBe(false)
    expect(session.status).toBe('locked')
    expect(await session.unlock('123456')).toBe(true)
    expect(session.status).toBe('unlocked')
  })

  it('changes the PIN and rejects the old PIN afterwards', async () => {
    const session = useSessionStore()
    await session.initialize()
    await session.completeOnboarding({ profile, pin: '123456', sampleData: false })

    expect(await session.changePin('000000', '654321')).toBe(false)
    expect(await session.changePin('123456', '654321')).toBe(true)

    session.lock()
    expect(await session.unlock('123456')).toBe(false)
    expect(await session.unlock('654321')).toBe(true)
  })

  it('updates profile and settings with audit entries', async () => {
    const session = useSessionStore()
    await session.initialize()
    await session.completeOnboarding({ profile, pin: '123456', sampleData: false })

    await session.updateProfile({ ...profile, nama_usaha: 'Frozen Food Rina' })
    await session.updateSettings({ auto_lock_minutes: 15, prefix_sale: 'JUAL' })

    expect(session.profile?.nama_usaha).toBe('Frozen Food Rina')
    expect(session.autoLockMinutes).toBe(15)
    expect(session.settings.prefix_sale).toBe('JUAL')

    const actions = (await listAuditLogs()).map((log) => log.action)
    expect(actions).toContain('profile_updated')
    expect(actions).toContain('settings_updated')
  })

  it('seeds sample data and resets the application', async () => {
    const session = useSessionStore()
    await session.initialize()
    const result = await session.completeOnboarding({
      profile,
      pin: '123456',
      sampleData: true,
    })

    expect(result.sampleWarning).toBe('')
    expect(session.settings.sample_data_seeded).toBe(true)
    expect(await db.products.count()).toBeGreaterThan(0)

    await session.resetApplication()

    expect(session.status).toBe('onboarding')
    expect(session.profile).toBeNull()
    expect(await db.products.count()).toBe(0)
    expect(await db.settings.get('pin_hash')).toMatchObject({ value: '' })

    const logs = await listAuditLogs()
    expect(logs.some((log) => log.action === 'app_reset')).toBe(true)
  })
})
