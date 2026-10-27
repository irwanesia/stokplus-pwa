<script setup lang="ts">
import { KeyRound, LockKeyhole, ShieldCheck } from '@lucide/vue'
import { ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { AUTO_LOCK_OPTIONS } from '@/db/settings'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'
import { isValidPin } from '@/utils/pin'

const session = useSessionStore()
const ui = useUiStore()

const autoLock = ref(session.settings.auto_lock_minutes)
const savingAutoLock = ref(false)
const currentPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const changingPin = ref(false)

async function saveAutoLock() {
  savingAutoLock.value = true

  try {
    await session.updateSettings({ auto_lock_minutes: Number(autoLock.value) })
    ui.notify('Auto-lock diperbarui.', 'success')
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Auto-lock gagal disimpan.', 'error')
  } finally {
    savingAutoLock.value = false
  }
}

async function changePin() {
  pinError.value = ''

  if (!isValidPin(currentPin.value) || !isValidPin(newPin.value)) {
    pinError.value = 'PIN lama dan PIN baru harus 6 digit.'
    return
  }

  if (newPin.value !== confirmPin.value) {
    pinError.value = 'Konfirmasi PIN baru tidak cocok.'
    return
  }

  if (newPin.value === currentPin.value) {
    pinError.value = 'PIN baru harus berbeda dari PIN lama.'
    return
  }

  changingPin.value = true

  try {
    const valid = await session.changePin(currentPin.value, newPin.value)

    if (!valid) {
      pinError.value = 'PIN saat ini salah.'
      return
    }

    currentPin.value = ''
    newPin.value = ''
    confirmPin.value = ''
    ui.notify('PIN berhasil diganti.', 'success')
  } catch (caught) {
    pinError.value = caught instanceof Error ? caught.message : 'PIN gagal diganti.'
  } finally {
    changingPin.value = false
  }
}

function lockNow() {
  session.lock()
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Keamanan"
      subtitle="PIN lokal dan batas waktu kunci otomatis."
      back-to="/pengaturan"
    />

    <AppCard title="Auto-lock" subtitle="Aplikasi terkunci setelah tidak ada aktivitas.">
      <label for="auto-lock" class="text-sm font-medium text-base-content/75">Batas waktu</label>
      <select
        id="auto-lock"
        v-model.number="autoLock"
        class="select select-bordered mt-2 min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
        :disabled="savingAutoLock"
        @change="saveAutoLock"
      >
        <option v-for="option in AUTO_LOCK_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <p class="mt-2 text-xs leading-5 text-base-content/65">
        Pilihan “Tidak pernah” menonaktifkan auto-lock. Aplikasi tetap meminta PIN setelah restart.
      </p>
    </AppCard>

    <AppCard title="Ganti PIN" subtitle="PIN 6 digit tidak dapat dipulihkan.">
      <form class="space-y-4" @submit.prevent="changePin">
        <FormField label="PIN saat ini" for-id="current-pin">
          <input
            id="current-pin"
            v-model="currentPin"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            maxlength="6"
            pattern="\d{6}"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100 tracking-[0.4em]"
          />
        </FormField>

        <FormField label="PIN baru" for-id="new-pin">
          <input
            id="new-pin"
            v-model="newPin"
            type="password"
            inputmode="numeric"
            autocomplete="new-password"
            maxlength="6"
            pattern="\d{6}"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100 tracking-[0.4em]"
          />
        </FormField>

        <FormField label="Ulangi PIN baru" for-id="confirm-pin" :error="pinError">
          <input
            id="confirm-pin"
            v-model="confirmPin"
            type="password"
            inputmode="numeric"
            autocomplete="new-password"
            maxlength="6"
            pattern="\d{6}"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100 tracking-[0.4em]"
          />
        </FormField>

        <AppButton type="submit" block :loading="changingPin">
          <KeyRound class="h-4 w-4" aria-hidden="true" />
          Ganti PIN
        </AppButton>
      </form>
    </AppCard>

    <div class="flex items-start gap-3 rounded-2xl border border-brand-border bg-base-100 p-4">
      <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
      <p class="text-sm leading-6 text-base-content/65">
        PIN disimpan sebagai hash PBKDF2 + salt di perangkat. Tidak ada PIN yang dikirim ke server.
      </p>
    </div>

    <AppButton variant="secondary" block @click="lockNow">
      <LockKeyhole class="h-4 w-4" aria-hidden="true" />
      Kunci sekarang
    </AppButton>
  </div>
</template>
