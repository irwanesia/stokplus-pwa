<script setup lang="ts">
import { Info, ScrollText } from '@lucide/vue'
import { onMounted, ref } from 'vue'

import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { APP_VERSION } from '@/config'
import { listAuditLogs } from '@/db/audit'
import type { AuditLog } from '@/db/schema'
import { SCHEMA_VERSION } from '@/db/dexie'
import { useSessionStore } from '@/stores/session'
import { formatDateTimeId } from '@/utils/date'

const session = useSessionStore()
const logs = ref<AuditLog[]>([])
const loadingLogs = ref(true)

const actionLabels: Record<string, string> = {
  setup_completed: 'Setup selesai',
  profile_updated: 'Profil diperbarui',
  settings_updated: 'Pengaturan diperbarui',
  pin_changed: 'PIN diganti',
  sample_data_seeded: 'Data contoh diisi',
  backup_created: 'Backup dibuat',
  backup_restored: 'Backup dipulihkan',
  app_reset: 'Aplikasi direset',
  master_created: 'Master data ditambahkan',
  master_updated: 'Master data diperbarui',
  master_deleted: 'Master data dihapus',
  master_deactivated: 'Master data dinonaktifkan',
  opening_stock_created: 'Stok awal dibuat',
}

function actionLabel(action: string): string {
  return actionLabels[action] ?? action
}

onMounted(async () => {
  logs.value = await listAuditLogs(20)
  loadingLogs.value = false
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Tentang aplikasi"
      subtitle="Versi, schema lokal, dan audit aktivitas."
      back-to="/pengaturan"
    />

    <AppCard>
      <div class="flex items-start gap-3">
        <span class="monogram" aria-hidden="true">S+</span>
        <div class="min-w-0">
          <p class="text-base font-semibold">StokPlus</p>
          <p class="text-xs text-base-content/65">Lebih dari sekadar stok.</p>
        </div>
      </div>

      <dl class="mt-5 space-y-3 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-base-content/65">Versi aplikasi</dt>
          <dd class="tabular font-semibold">{{ APP_VERSION }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-base-content/65">Schema Dexie</dt>
          <dd class="tabular font-semibold">v{{ SCHEMA_VERSION }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-base-content/65">Nama usaha</dt>
          <dd class="max-w-[60%] truncate text-right font-semibold">
            {{ session.profile?.nama_usaha || '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-base-content/65">Zona waktu</dt>
          <dd class="font-semibold">Asia/Jakarta</dd>
        </div>
      </dl>
    </AppCard>

    <AppCard title="Privasi & data" subtitle="Local-first, tanpa server.">
      <div class="flex items-start gap-3">
        <Info class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
        <p class="text-sm leading-6 text-base-content/65">
          Semua data disimpan di IndexedDB perangkat ini. Tidak ada akun email, API, atau
          sinkronisasi cloud pada MVP.
        </p>
      </div>
    </AppCard>

    <AppCard title="Audit log" subtitle="20 aktivitas terakhir, maksimal 1.000 entri.">
      <div v-if="loadingLogs" class="space-y-2" aria-busy="true">
        <div class="h-12 animate-pulse rounded-xl bg-base-200" />
        <div class="h-12 animate-pulse rounded-xl bg-base-200" />
      </div>

      <div v-else-if="logs.length === 0" class="text-sm text-base-content/65">
        Belum ada aktivitas tercatat.
      </div>

      <ol v-else class="space-y-2">
        <li
          v-for="log in logs"
          :key="log.id"
          class="rounded-xl border border-brand-border bg-base-200/50 p-3"
        >
          <div class="flex items-start gap-3">
            <ScrollText class="mt-0.5 h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ actionLabel(log.action) }}</p>
              <p class="mt-0.5 text-[11px] text-base-content/65">
                {{ formatDateTimeId(log.timestamp) }} · {{ log.entity }}
              </p>
              <p v-if="log.note" class="mt-1 text-xs leading-5 text-base-content/65">
                {{ log.note }}
              </p>
            </div>
          </div>
        </li>
      </ol>
    </AppCard>
  </div>
</template>
