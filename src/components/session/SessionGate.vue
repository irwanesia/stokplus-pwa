<script setup lang="ts">
import { LoaderCircle, RefreshCw } from '@lucide/vue'
import { onMounted, watch } from 'vue'

import LockScreen from '@/features/lock/LockScreen.vue'
import OnboardingPage from '@/features/onboarding/OnboardingPage.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAutoLock } from '@/composables/useAutoLock'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const autoLock = useAutoLock(() => session.lock())

onMounted(() => {
  void session.initialize()
})

watch(
  () => [session.status, session.autoLockMinutes] as const,
  ([status, minutes]) => {
    if (status === 'unlocked') {
      autoLock.start(minutes)
    } else {
      autoLock.stop()
    }
  },
  { immediate: true },
)
</script>

<template>
  <ToastHost />

  <div v-if="session.status === 'loading'" class="flex min-h-dvh items-center justify-center px-6">
    <div class="text-center">
      <span class="monogram mx-auto h-14 w-14 text-base" aria-hidden="true">S+</span>
      <p class="mt-4 text-sm font-medium text-base-content/65">Menyiapkan data lokal…</p>
      <LoaderCircle
        class="mx-auto mt-3 h-5 w-5 animate-spin text-brand-copper"
        aria-hidden="true"
      />
    </div>
  </div>

  <div
    v-else-if="session.status === 'error'"
    class="flex min-h-dvh items-center justify-center px-6"
  >
    <div class="surface-card w-full max-w-md p-6 text-center">
      <span class="monogram mx-auto h-14 w-14 text-base" aria-hidden="true">S+</span>
      <h1 class="mt-4 text-xl font-semibold tracking-tight">Database lokal tidak dapat dibuka</h1>
      <p class="mt-2 text-sm leading-6 text-base-content/65">
        Pastikan browser mengizinkan penyimpanan lokal, lalu coba lagi.
      </p>
      <p v-if="session.error" class="mt-3 rounded-xl bg-error/10 p-3 text-xs text-error">
        {{ session.error }}
      </p>
      <button
        type="button"
        class="btn btn-primary mt-5 min-h-11 w-full rounded-[var(--radius-control)] font-semibold normal-case"
        @click="session.initialize()"
      >
        <RefreshCw class="h-4 w-4" aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  </div>

  <OnboardingPage v-else-if="session.status === 'onboarding'" />
  <LockScreen v-else-if="session.status === 'locked'" />
  <AppLayout v-else-if="session.status === 'unlocked'" />
</template>
