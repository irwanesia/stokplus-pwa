<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import { ref } from 'vue'

import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import PinPad from '@/components/ui/PinPad.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const pin = ref('')
const error = ref('')
const verifying = ref(false)
const helpOpen = ref(false)

async function handleComplete(value: string) {
  if (verifying.value) {
    return
  }

  verifying.value = true
  error.value = ''

  try {
    const valid = await session.unlock(value)
    if (!valid) {
      error.value = 'PIN salah. Coba lagi.'
      pin.value = ''
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Tidak dapat membuka aplikasi.'
    pin.value = ''
  } finally {
    verifying.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-base-200">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
    >
      <header class="flex items-center gap-3">
        <span class="monogram" aria-hidden="true">S+</span>
        <div>
          <p class="text-sm font-semibold tracking-tight">StokPlus</p>
          <p class="text-[11px] text-base-content/65">Terkunci</p>
        </div>
      </header>

      <main class="flex flex-1 flex-col justify-center py-8">
        <div class="text-center">
          <span
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy text-white ring-1 ring-brand-copper/40"
            aria-hidden="true"
          >
            <KeyRound class="h-6 w-6" />
          </span>
          <h1 class="mt-4 text-2xl font-semibold tracking-tight text-brand-navy">Masukkan PIN</h1>
          <p class="mt-1 text-sm leading-6 text-base-content/65">
            {{ session.profile?.nama_usaha || 'Buka StokPlus untuk melanjutkan.' }}
          </p>
        </div>

        <div class="surface-card mt-7 p-5">
          <PinPad
            v-model="pin"
            label="PIN 6 digit"
            :error="error"
            :disabled="verifying"
            @complete="handleComplete"
          />
        </div>

        <button
          type="button"
          class="mx-auto mt-5 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-base-content/65 transition hover:text-brand-copper"
          @click="helpOpen = true"
        >
          Lupa PIN?
        </button>
      </main>

      <footer class="text-center text-[11px] leading-5 text-base-content/65">
        PIN disimpan sebagai hash lokal. Tidak ada pemulihan PIN tanpa menghapus data.
      </footer>
    </div>

    <AppBottomSheet
      v-model="helpOpen"
      title="Lupa PIN?"
      description="PIN tidak dapat dipulihkan dari server karena tidak ada server."
    >
      <p class="text-sm leading-6 text-base-content/70">
        PIN tidak dapat dipulihkan. Hapus data situs StokPlus dari pengaturan browser, lalu mulai
        onboarding ulang. Tindakan ini menghapus seluruh data lokal.
      </p>
      <div class="mt-4 rounded-2xl border border-warning/25 bg-warning/10 p-4">
        <p class="text-sm font-semibold text-warning">Backup tidak memulihkan PIN yang lupa</p>
        <p class="mt-1 text-xs leading-5 text-base-content/65">
          File backup berisi PIN hash dari saat backup dibuat. Restore dari onboarding hanya bisa
          dibuka dengan PIN yang tersimpan di file tersebut. Tanpa backup, atau jika PIN backup juga
          lupa, data tidak dapat diakses.
        </p>
      </div>
      <AppButton block class="mt-5" @click="helpOpen = false">Mengerti</AppButton>
    </AppBottomSheet>
  </div>
</template>
