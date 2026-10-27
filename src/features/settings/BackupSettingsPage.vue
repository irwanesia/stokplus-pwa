<script setup lang="ts">
import { CloudUpload, FileJson, KeyRound, RotateCcw, ShieldCheck } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { getBackupStats } from '@/backup/service'
import type { BackupStats } from '@/backup/types'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useBackupStore } from '@/stores/backup'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'
import { formatDateTimeId } from '@/utils/date'
import { formatBytes } from '@/utils/storage'

const session = useSessionStore()
const backup = useBackupStore()
const ui = useUiStore()

const encrypt = ref(session.settings.backup_encryption_default)
const passphrase = ref('')
const confirmPassphrase = ref('')
const creating = ref(false)
const error = ref('')
const stats = ref<BackupStats | null>(null)
const lastFile = ref<{ name: string; size: number; encrypted: boolean } | null>(null)

const lastBackupAt = computed(() => session.settings.last_backup_at)
const lastBackupSize = computed(() => session.settings.last_backup_size)
const lastBackupTransactions = computed(() => session.settings.last_backup_transaction_count)

onMounted(async () => {
  try {
    stats.value = await getBackupStats()
  } catch {
    stats.value = null
  }
})

async function createBackup() {
  error.value = ''

  if (encrypt.value) {
    if (passphrase.value.length < 8) {
      error.value = 'Passphrase backup minimal 8 karakter.'
      return
    }

    if (passphrase.value !== confirmPassphrase.value) {
      error.value = 'Konfirmasi passphrase tidak cocok.'
      return
    }
  }

  creating.value = true

  try {
    const result = await backup.createBackup({
      encrypt: encrypt.value,
      passphrase: encrypt.value ? passphrase.value : undefined,
    })

    lastFile.value = {
      name: result.filename,
      size: result.size,
      encrypted: result.encrypted,
    }
    passphrase.value = ''
    confirmPassphrase.value = ''
    ui.notify(
      result.encrypted
        ? 'Backup terenkripsi berhasil dibuat dan diunduh.'
        : 'Backup berhasil dibuat dan diunduh.',
      'success',
      5000,
    )
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Backup gagal dibuat.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Backup"
      subtitle="Simpan salinan data lokal, termasuk lot dan expiry."
      back-to="/pengaturan"
    />

    <AppCard tone="muted">
      <p class="text-[10px] font-semibold tracking-[0.18em] text-base-content/65 uppercase">
        Backup terakhir
      </p>
      <p class="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
        {{ lastBackupAt ? formatDateTimeId(lastBackupAt) : 'Belum pernah backup' }}
      </p>

      <dl class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-base-100/70 px-3 py-2.5">
          <dt class="text-[11px] text-base-content/65">Ukuran file</dt>
          <dd class="tabular mt-0.5 text-sm font-semibold">
            {{ lastBackupSize > 0 ? formatBytes(lastBackupSize) : '—' }}
          </dd>
        </div>
        <div class="rounded-xl bg-base-100/70 px-3 py-2.5">
          <dt class="text-[11px] text-base-content/65">Transaksi saat backup</dt>
          <dd class="tabular mt-0.5 text-sm font-semibold">
            {{ lastBackupAt ? lastBackupTransactions.toLocaleString('id-ID') : '—' }}
          </dd>
        </div>
      </dl>

      <p v-if="stats" class="mt-3 text-xs leading-5 text-base-content/65">
        Data saat ini: {{ stats.totalRows.toLocaleString('id-ID') }} baris ·
        {{ stats.transactionCount.toLocaleString('id-ID') }} transaksi selesai.
      </p>
    </AppCard>

    <AppCard title="Buat backup" subtitle="File JSON akan diunduh ke perangkat.">
      <label
        for="backup-encrypt"
        class="flex items-start justify-between gap-4 rounded-2xl border border-brand-border bg-base-200/50 p-3"
      >
        <span class="min-w-0">
          <span class="block text-sm font-semibold">Enkripsi dengan passphrase</span>
          <span class="mt-1 block text-xs leading-5 text-base-content/65">
            Opsional. File tetap menjadi JSON, tetapi isinya tidak dapat dibaca tanpa passphrase.
          </span>
        </span>
        <input
          id="backup-encrypt"
          v-model="encrypt"
          type="checkbox"
          class="toggle toggle-sm mt-0.5 shrink-0"
        />
      </label>

      <div v-if="encrypt" class="mt-4 space-y-4">
        <FormField label="Passphrase backup" for-id="backup-passphrase" hint="Minimal 8 karakter.">
          <input
            id="backup-passphrase"
            v-model="passphrase"
            type="password"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="new-password"
          />
        </FormField>

        <FormField label="Ulangi passphrase" for-id="backup-passphrase-confirm">
          <input
            id="backup-passphrase-confirm"
            v-model="confirmPassphrase"
            type="password"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="new-password"
          />
        </FormField>

        <div class="flex items-start gap-3 rounded-xl bg-warning/10 p-3">
          <KeyRound class="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p class="text-xs leading-5 text-base-content/65">
            Passphrase tidak disimpan di aplikasi dan tidak dapat dipulihkan jika lupa.
          </p>
        </div>
      </div>

      <div
        v-if="error"
        class="mt-4 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error"
        role="alert"
      >
        {{ error }}
      </div>

      <AppButton block class="mt-4" :loading="creating" @click="createBackup">
        <CloudUpload class="h-4 w-4" aria-hidden="true" />
        {{ encrypt ? 'Buat backup terenkripsi' : 'Buat backup sekarang' }}
      </AppButton>

      <div v-if="lastFile" class="mt-3 rounded-xl bg-status-completed/10 p-3">
        <div class="flex items-start gap-2">
          <FileJson class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold">{{ lastFile.name }}</p>
            <p class="mt-0.5 text-[11px] text-base-content/65">
              {{ formatBytes(lastFile.size) }} · {{ lastFile.encrypted ? 'terenkripsi' : 'JSON' }}
            </p>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard title="Pulihkan data" subtitle="Ganti seluruh data dengan file backup.">
      <p class="text-sm leading-6 text-base-content/65">
        Restore memvalidasi file, menampilkan pratinjau jumlah data, lalu membuat backup keamanan
        sebelum mengganti data.
      </p>
      <RouterLink
        to="/pengaturan/restore"
        class="btn btn-secondary mt-4 min-h-11 w-full rounded-[var(--radius-control)] font-semibold normal-case"
      >
        <RotateCcw class="h-4 w-4" aria-hidden="true" />
        Buka restore
      </RouterLink>
    </AppCard>

    <div class="flex items-start gap-3 rounded-2xl border border-brand-border bg-base-100 p-4">
      <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
      <p class="text-sm leading-6 text-base-content/65">
        Backup mencakup profil, pengaturan, produk, lot stok, expiry, penjualan, pembelian, beban,
        opname, write-off, dan audit log. File berisi data usaha dan PIN hash; simpan di tempat
        aman.
      </p>
    </div>
  </div>
</template>
