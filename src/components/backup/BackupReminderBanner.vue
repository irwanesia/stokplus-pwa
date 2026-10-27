<script setup lang="ts">
import { AlertTriangle, CloudUpload, X } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useBackupStore } from '@/stores/backup'

const backup = useBackupStore()
const dismissed = ref(false)

const message = computed(() => {
  const status = backup.reminder

  if (!status) {
    return ''
  }

  if (status.reason === 'never') {
    return 'Data belum pernah dibackup. Simpan salinan sekarang agar aman.'
  }

  if (status.reason === 'age') {
    return `Backup terakhir ${status.daysSince} hari lalu. Saatnya membuat backup baru.`
  }

  return `${status.transactionCount} transaksi sejak backup terakhir. Buat backup baru.`
})

onMounted(() => {
  void backup.refreshReminder().catch(() => undefined)
})
</script>

<template>
  <aside
    v-if="backup.reminder?.shouldRemind && !dismissed"
    class="flex items-start gap-3 rounded-2xl border border-brand-copper/25 bg-brand-copper/10 p-4"
    aria-label="Pengingat backup"
  >
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/15 text-brand-copper"
      aria-hidden="true"
    >
      <AlertTriangle class="h-5 w-5" />
    </span>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-brand-navy">Pengingat backup</p>
      <p class="mt-1 text-xs leading-5 text-base-content/65">{{ message }}</p>
      <RouterLink
        to="/pengaturan/backup"
        class="btn btn-sm mt-3 rounded-full bg-brand-navy px-3 text-xs font-semibold text-white hover:bg-brand-navy/90"
      >
        <CloudUpload class="h-3.5 w-3.5" aria-hidden="true" />
        Backup sekarang
      </RouterLink>
    </div>

    <button
      type="button"
      class="btn btn-ghost btn-xs h-8 w-8 shrink-0 rounded-full p-0"
      aria-label="Tutup pengingat backup"
      @click="dismissed = true"
    >
      <X class="h-4 w-4" aria-hidden="true" />
    </button>
  </aside>
</template>
