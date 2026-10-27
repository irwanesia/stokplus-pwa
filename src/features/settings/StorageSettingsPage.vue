<script setup lang="ts">
import { Database, HardDrive, ShieldCheck } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useUiStore } from '@/stores/ui'
import {
  formatBytes,
  getStorageInfo,
  requestPersistentStorage,
  type StorageInfo,
} from '@/utils/storage'

const ui = useUiStore()
const info = ref<StorageInfo | null>(null)
const loading = ref(true)
const error = ref('')
const requesting = ref(false)

const percent = computed(() => Math.round(info.value?.percent ?? 0))
const progressTone = computed(() => {
  if (percent.value >= 90) return 'bg-error'
  if (percent.value >= 75) return 'bg-warning'
  return 'bg-brand-copper'
})

async function refresh() {
  loading.value = true
  error.value = ''

  try {
    info.value = await getStorageInfo()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Gagal membaca storage.'
  } finally {
    loading.value = false
  }
}

async function requestPersistent() {
  requesting.value = true

  try {
    const granted = await requestPersistentStorage()
    await refresh()
    ui.notify(
      granted
        ? 'Persistent storage aktif. Data lebih tahan terhadap pembersihan otomatis.'
        : 'Browser belum memberikan persistent storage. Data tetap tersimpan selama storage tersedia.',
      granted ? 'success' : 'warning',
      5000,
    )
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Permintaan storage gagal.', 'error')
  } finally {
    requesting.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Storage"
      subtitle="Pemakaian data lokal dan izin penyimpanan."
      back-to="/pengaturan"
    />

    <AppCard title="Pemakaian storage">
      <div v-if="loading" class="space-y-3" aria-busy="true">
        <div class="h-4 w-2/3 animate-pulse rounded bg-base-300" />
        <div class="h-2 w-full animate-pulse rounded-full bg-base-300" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-base-300" />
      </div>

      <div v-else-if="error" class="rounded-xl bg-error/10 p-3 text-sm text-error" role="alert">
        {{ error }}
      </div>

      <div v-else-if="info && !info.supported" class="text-sm leading-6 text-base-content/65">
        Browser ini tidak menyediakan Storage API. Data tetap disimpan di IndexedDB selama browser
        tidak membersihkan data situs.
      </div>

      <div v-else-if="info">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-3xl font-semibold tracking-tight text-brand-navy">
              {{ formatBytes(info.usage) }}
            </p>
            <p class="mt-1 text-xs text-base-content/65">
              dari kuota {{ formatBytes(info.quota) }}
            </p>
          </div>
          <span class="text-sm font-semibold text-brand-copper">{{ percent }}%</span>
        </div>

        <div
          class="mt-3 h-2 overflow-hidden rounded-full bg-base-300"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Pemakaian storage"
        >
          <div
            class="h-full rounded-full transition-all"
            :class="progressTone"
            :style="{ width: `${percent}%` }"
          />
        </div>

        <p v-if="percent >= 75" class="mt-3 text-xs leading-5 text-warning">
          Pemakaian storage sudah tinggi. Backup dan pembersihan data akan membantu.
        </p>
      </div>

      <AppButton variant="secondary" block class="mt-4" :loading="loading" @click="refresh">
        <Database class="h-4 w-4" aria-hidden="true" />
        Perbarui informasi
      </AppButton>
    </AppCard>

    <AppCard title="Persistent storage">
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <HardDrive class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">
            {{
              info?.supported === false
                ? 'Tidak didukung'
                : info?.persisted
                  ? 'Sudah aktif'
                  : 'Belum aktif'
            }}
          </p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Persistent storage meminta browser untuk tidak menghapus data situs secara otomatis.
            Browser tetap bisa menolak permintaan.
          </p>
        </div>
      </div>

      <AppButton
        block
        class="mt-4"
        :disabled="info?.persisted || !info?.supported"
        :loading="requesting"
        @click="requestPersistent"
      >
        <ShieldCheck class="h-4 w-4" aria-hidden="true" />
        {{
          info?.supported === false
            ? 'Persistent storage tidak didukung'
            : info?.persisted
              ? 'Persistent storage aktif'
              : 'Minta persistent storage'
        }}
      </AppButton>
    </AppCard>

    <p class="px-1 text-xs leading-5 text-base-content/65">
      Buat backup JSON secara berkala dan simpan di luar perangkat. Membersihkan data situs akan
      menghapus IndexedDB tanpa konfirmasi aplikasi.
    </p>
  </div>
</template>
