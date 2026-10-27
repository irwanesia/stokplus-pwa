import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { writeAuditLog } from '@/db/audit'
import { db } from '@/db/dexie'
import { seedSampleData, type SampleDataCounts } from '@/db/sampleData'
import type { BusinessProfile } from '@/db/schema'
import {
  DEFAULT_SETTINGS,
  ensureSettingsDefaults,
  getSettings,
  hasPinConfigured,
  saveSettings,
  type AppSettings,
} from '@/db/settings'
import { nowIso } from '@/utils/date'
import { PBKDF2_ITERATIONS, generatePinSalt, hashPin, isValidPin, verifyPin } from '@/utils/pin'
import { requestPersistentStorage } from '@/utils/storage'

export type SessionStatus = 'loading' | 'onboarding' | 'locked' | 'unlocked' | 'error'

export interface OnboardingInput {
  profile: Pick<
    BusinessProfile,
    'nama_usaha' | 'nama_pemilik' | 'alamat' | 'telepon' | 'catatan_laporan'
  >
  pin: string
  sampleData: boolean
}

export interface ProfileInput {
  nama_usaha: string
  nama_pemilik: string
  alamat: string
  telepon: string
  catatan_laporan: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
}

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('loading')
  const profile = ref<BusinessProfile | null>(null)
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const error = ref('')

  const autoLockMinutes = computed(() => {
    const value = Number(settings.value.auto_lock_minutes)
    return Number.isFinite(value) && value > 0 ? value : 0
  })

  const isConfigured = computed(() => Boolean(profile.value && hasPinConfigured(settings.value)))

  async function initialize() {
    status.value = 'loading'
    error.value = ''

    try {
      await db.open()
      await ensureSettingsDefaults()
      settings.value = await getSettings()
      profile.value = (await db.business_profile.get('main')) ?? null

      if (!profile.value || !hasPinConfigured(settings.value)) {
        status.value = 'onboarding'
      } else {
        status.value = 'locked'
      }
    } catch (caught) {
      error.value = errorMessage(caught)
      status.value = 'error'
    }
  }

  async function completeOnboarding(input: OnboardingInput) {
    const namaUsaha = input.profile.nama_usaha.trim()

    if (!namaUsaha) {
      throw new Error('Nama usaha wajib diisi.')
    }

    if (!isValidPin(input.pin)) {
      throw new Error('PIN harus 6 digit.')
    }

    const now = nowIso()
    const salt = generatePinSalt()
    const pinHash = await hashPin(input.pin, salt)
    const nextProfile: BusinessProfile = {
      id: 'main',
      nama_usaha: namaUsaha,
      nama_pemilik: input.profile.nama_pemilik.trim(),
      alamat: input.profile.alamat.trim(),
      telepon: input.profile.telepon.trim(),
      catatan_laporan: input.profile.catatan_laporan.trim(),
      created_at: now,
      updated_at: now,
    }

    await db.transaction('rw', [db.business_profile, db.settings], async () => {
      await db.business_profile.put(nextProfile)
      await db.settings.bulkPut([
        { key: 'pin_hash', value: pinHash, updated_at: now },
        { key: 'pin_salt', value: salt, updated_at: now },
        { key: 'pin_iterations', value: PBKDF2_ITERATIONS, updated_at: now },
        { key: 'onboarding_completed_at', value: now, updated_at: now },
        { key: 'schema_version', value: DEFAULT_SETTINGS.schema_version, updated_at: now },
      ])
    })

    profile.value = nextProfile
    settings.value = await getSettings()
    status.value = 'unlocked'

    await writeAuditLog({
      action: 'setup_completed',
      entity: 'business_profile',
      entity_id: 'main',
      payload: { nama_usaha: nextProfile.nama_usaha, sample_data: input.sampleData },
    })

    let sampleWarning = ''

    if (input.sampleData) {
      try {
        await seedSampleDataAction()
      } catch (caught) {
        sampleWarning = errorMessage(caught)
      }
    }

    void requestPersistentStorage().catch(() => false)

    return { sampleWarning }
  }

  async function unlock(pin: string): Promise<boolean> {
    if (!hasPinConfigured(settings.value)) {
      throw new Error('PIN belum diatur. Selesaikan onboarding terlebih dahulu.')
    }

    const valid = await verifyPin(
      pin,
      settings.value.pin_salt,
      settings.value.pin_hash,
      settings.value.pin_iterations,
    )

    if (valid) {
      status.value = 'unlocked'
    }

    return valid
  }

  function lock() {
    if (status.value === 'unlocked') {
      status.value = 'locked'
    }
  }

  async function refreshSettings() {
    settings.value = await getSettings()
  }

  async function updateProfile(input: ProfileInput) {
    if (!profile.value) {
      throw new Error('Profil usaha belum tersedia.')
    }

    const namaUsaha = input.nama_usaha.trim()
    if (!namaUsaha) {
      throw new Error('Nama usaha wajib diisi.')
    }

    const nextProfile: BusinessProfile = {
      ...profile.value,
      nama_usaha: namaUsaha,
      nama_pemilik: input.nama_pemilik.trim(),
      alamat: input.alamat.trim(),
      telepon: input.telepon.trim(),
      catatan_laporan: input.catatan_laporan.trim(),
      updated_at: nowIso(),
    }

    await db.business_profile.put(nextProfile)
    profile.value = nextProfile

    await writeAuditLog({
      action: 'profile_updated',
      entity: 'business_profile',
      entity_id: 'main',
      payload: { nama_usaha: nextProfile.nama_usaha },
    })
  }

  async function updateSettings(patch: Partial<AppSettings>) {
    await saveSettings(patch)
    settings.value = await getSettings()

    await writeAuditLog({
      action: 'settings_updated',
      entity: 'settings',
      payload: { keys: Object.keys(patch) },
    })
  }

  async function changePin(currentPin: string, newPin: string): Promise<boolean> {
    if (!hasPinConfigured(settings.value)) {
      throw new Error('PIN belum diatur.')
    }

    const valid = await verifyPin(
      currentPin,
      settings.value.pin_salt,
      settings.value.pin_hash,
      settings.value.pin_iterations,
    )

    if (!valid) {
      return false
    }

    if (!isValidPin(newPin)) {
      throw new Error('PIN baru harus 6 digit.')
    }

    const salt = generatePinSalt()
    const pinHash = await hashPin(newPin, salt)

    await saveSettings({
      pin_hash: pinHash,
      pin_salt: salt,
      pin_iterations: PBKDF2_ITERATIONS,
    })
    settings.value = await getSettings()

    await writeAuditLog({
      action: 'pin_changed',
      entity: 'settings',
      entity_id: 'pin',
    })

    return true
  }

  async function seedSampleDataAction(): Promise<SampleDataCounts> {
    const counts = await seedSampleData()
    settings.value = await getSettings()

    await writeAuditLog({
      action: 'sample_data_seeded',
      entity: 'settings',
      entity_id: 'sample_data',
      payload: counts,
    })

    return counts
  }

  async function resetApplication() {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear()
      }
    })

    await ensureSettingsDefaults()
    settings.value = await getSettings()
    profile.value = null
    error.value = ''
    status.value = 'onboarding'

    await writeAuditLog({
      action: 'app_reset',
      entity: 'app',
      note: 'Seluruh data lokal dihapus dan onboarding dimulai ulang.',
    })
  }

  return {
    status,
    profile,
    settings,
    error,
    autoLockMinutes,
    isConfigured,
    initialize,
    completeOnboarding,
    unlock,
    lock,
    refreshSettings,
    updateProfile,
    updateSettings,
    changePin,
    seedSampleDataAction,
    resetApplication,
  }
})
