<script setup lang="ts">
import { RefreshCw, WifiOff, X } from '@lucide/vue'
import { computed, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import { usePwaStore } from '@/stores/pwa'

const pwa = usePwaStore()
const applying = ref(false)

const visible = computed(() => pwa.needRefresh || pwa.offlineReady)

async function applyUpdate() {
  applying.value = true

  try {
    await pwa.applyUpdate()
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <Transition name="toast">
    <aside
      v-if="visible"
      class="no-print fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[65] mx-auto max-w-[420px]"
      role="status"
      aria-live="polite"
    >
      <div class="surface-card overflow-hidden border-brand-navy/15 p-4 shadow-xl">
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
            aria-hidden="true"
          >
            <RefreshCw v-if="pwa.needRefresh" class="h-5 w-5" />
            <WifiOff v-else class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">
              {{ pwa.needRefresh ? 'Versi baru tersedia' : 'Siap dipakai offline' }}
            </p>
            <p class="mt-1 text-xs leading-5 text-base-content/65">
              {{
                pwa.needRefresh
                  ? 'Muat ulang untuk memakai versi terbaru. Data lokal tetap tersimpan di perangkat ini.'
                  : 'App shell StokPlus sudah tersimpan. Transaksi tetap bisa dilakukan tanpa internet.'
              }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm h-11 min-h-11 w-11 shrink-0 rounded-full p-0"
            aria-label="Tutup pemberitahuan"
            @click="pwa.needRefresh ? pwa.dismissUpdate() : pwa.dismissOfflineReady()"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="mt-3 flex gap-2">
          <AppButton v-if="pwa.needRefresh" class="flex-1" :loading="applying" @click="applyUpdate">
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
            Muat ulang
          </AppButton>
          <AppButton v-else variant="secondary" class="flex-1" @click="pwa.dismissOfflineReady()">
            Mengerti
          </AppButton>
          <AppButton
            v-if="pwa.needRefresh"
            variant="ghost"
            :disabled="applying"
            @click="pwa.dismissUpdate()"
          >
            Nanti
          </AppButton>
        </div>
      </div>
    </aside>
  </Transition>
</template>
