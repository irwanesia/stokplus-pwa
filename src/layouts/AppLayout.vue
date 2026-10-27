<script setup lang="ts">
import { LockKeyhole } from '@lucide/vue'
import { watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import AppBottomNav from '@/components/navigation/AppBottomNav.vue'
import PwaOfflineBanner from '@/components/pwa/PwaOfflineBanner.vue'
import { APP_VERSION } from '@/config'
import { usePwaStore } from '@/stores/pwa'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const session = useSessionStore()
const pwa = usePwaStore()
const ui = useUiStore()

watch(
  () => pwa.isOnline,
  (online, wasOnline) => {
    if (online && wasOnline === false) {
      ui.notify('Kembali online. Data lokal tetap tersimpan di perangkat ini.', 'success', 4000)
    }
  },
)
</script>

<template>
  <div class="min-h-dvh bg-base-200">
    <a
      href="#main-content"
      class="sr-only z-[70] rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Lewati ke konten
    </a>

    <header
      class="no-print safe-top sticky top-0 z-30 border-b border-brand-border bg-base-100/90 backdrop-blur"
    >
      <div class="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-5 py-3">
        <RouterLink
          to="/"
          class="flex min-w-0 items-center gap-3"
          aria-label="StokPlus — kembali ke dashboard"
        >
          <span class="monogram" aria-hidden="true">S+</span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold tracking-tight">StokPlus</span>
            <span class="block truncate text-[11px] text-base-content/65">
              {{ session.profile?.nama_usaha || 'Lebih dari sekadar stok.' }}
            </span>
          </span>
        </RouterLink>

        <div class="flex shrink-0 items-center gap-1.5">
          <span
            class="badge rounded-full border-brand-copper/20 bg-brand-copper/10 px-3 py-3 text-[11px] font-semibold text-brand-copper"
          >
            v{{ APP_VERSION }}
          </span>
          <button
            type="button"
            class="btn btn-ghost btn-sm h-11 min-h-11 w-11 rounded-full p-0 text-base-content/65"
            aria-label="Kunci aplikasi"
            @click="session.lock()"
          >
            <LockKeyhole class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <PwaOfflineBanner />

    <main id="main-content" class="safe-bottom px-5 pt-5" tabindex="-1">
      <RouterView />
    </main>

    <div class="no-print">
      <AppBottomNav />
    </div>
  </div>
</template>
