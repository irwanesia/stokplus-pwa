<script setup lang="ts">
import { AlertTriangle, CheckCircle2, FileJson, KeyRound, ShieldAlert, Upload } from '@lucide/vue'
import { computed, ref, shallowRef, useId } from 'vue'
import { useRouter } from 'vue-router'

import { BackupError, inspectBackupFile } from '@/backup/codec'
import type { BackupInspection } from '@/backup/types'
import FormField from '@/components/forms/FormField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useBackupStore } from '@/stores/backup'
import { useUiStore } from '@/stores/ui'
import { formatDateTimeId } from '@/utils/date'
import { formatBytes } from '@/utils/storage'

withDefaults(defineProps<{ onboarding?: boolean }>(), {
  onboarding: false,
})

const router = useRouter()
const backup = useBackupStore()
const ui = useUiStore()

const fileInputId = useId()
const passphraseId = useId()
const confirmId = useId()

const fileContent = ref('')
const selectedFileName = ref('')
const selectedFileSize = ref(0)
const passphrase = ref('')
const needsPassphrase = ref(false)
const inspection = shallowRef<BackupInspection | null>(null)
const error = ref('')
const loading = ref(false)
const restoring = ref(false)
const confirmText = ref('')

const canRestore = computed(
  () =>
    Boolean(inspection.value) &&
    confirmText.value.trim().toUpperCase() === 'PULIHKAN' &&
    !restoring.value,
)

const selectedCounts = computed(() => {
  const counts = inspection.value?.summary.counts
  if (!counts) return []

  return [
    { label: 'Produk', value: counts.products },
    { label: 'Lot stok', value: counts.stock_lots },
    { label: 'Penjualan', value: counts.sales },
    { label: 'Pembelian', value: counts.purchases },
    { label: 'Beban', value: counts.expenses },
    { label: 'Write-off', value: counts.stock_writeoffs },
  ]
})

function resetState() {
  fileContent.value = ''
  selectedFileName.value = ''
  selectedFileSize.value = 0
  passphrase.value = ''
  needsPassphrase.value = false
  inspection.value = null
  error.value = ''
  confirmText.value = ''
}

async function inspectFile() {
  if (!fileContent.value) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    inspection.value = await inspectBackupFile(fileContent.value, passphrase.value || undefined)
    needsPassphrase.value = false
  } catch (caught) {
    inspection.value = null

    if (caught instanceof BackupError) {
      if (caught.code === 'PASSPHRASE_REQUIRED') {
        needsPassphrase.value = true
      } else if (caught.code === 'DECRYPT_FAILED') {
        needsPassphrase.value = true
        error.value = caught.message
      } else {
        error.value = caught.message
      }
    } else {
      error.value = caught instanceof Error ? caught.message : 'File backup gagal dibaca.'
    }
  } finally {
    loading.value = false
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  resetState()
  selectedFileName.value = file.name
  selectedFileSize.value = file.size

  try {
    fileContent.value = await file.text()
    await inspectFile()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'File backup gagal dibaca.'
  }
}

async function openEncryptedFile() {
  if (!passphrase.value) {
    error.value = 'Masukkan passphrase backup.'
    return
  }

  await inspectFile()
}

async function restore() {
  if (!canRestore.value || !inspection.value) {
    return
  }

  restoring.value = true
  error.value = ''

  try {
    await backup.restore(inspection.value.payload, {
      fileSize: inspection.value.fileSize,
      encrypted: inspection.value.encrypted,
    })
    ui.notify('Backup berhasil dipulihkan. Aplikasi dikunci.', 'success', 5000)
    await router.replace('/')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Restore gagal.'
  } finally {
    restoring.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-2xl border border-error/20 bg-error/10 p-4">
      <div class="flex items-start gap-3">
        <ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
        <div>
          <p class="text-sm font-semibold text-error">Restore mengganti seluruh data</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Data saat ini diganti dengan isi file backup. PIN di dalam backup juga menjadi PIN
            aplikasi setelah restore.
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-brand-border bg-base-100 p-4">
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <FileJson class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">Pilih file backup</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            File JSON dari StokPlus, terenkripsi maupun tidak.
          </p>
        </div>
      </div>

      <label
        :for="fileInputId"
        class="btn btn-secondary mt-4 min-h-11 w-full rounded-[var(--radius-control)] font-semibold normal-case"
      >
        <Upload class="h-4 w-4" aria-hidden="true" />
        Pilih file backup
      </label>
      <input
        :id="fileInputId"
        type="file"
        accept=".json,application/json"
        class="sr-only"
        @change="handleFileChange"
      />

      <div v-if="selectedFileName" class="mt-3 rounded-xl bg-base-200/70 px-3 py-2.5">
        <p class="truncate text-sm font-medium">{{ selectedFileName }}</p>
        <p class="mt-0.5 text-xs text-base-content/65">
          {{ formatBytes(selectedFileSize) }}
          <span v-if="inspection?.encrypted">· terenkripsi</span>
        </p>
      </div>
    </div>

    <div
      v-if="error"
      class="flex items-start gap-3 rounded-2xl border border-error/20 bg-error/10 p-4"
      role="alert"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
      <p class="text-sm leading-5 text-error">{{ error }}</p>
    </div>

    <div v-if="loading" class="rounded-2xl border border-brand-border bg-base-100 p-4">
      <div class="flex items-center gap-3" aria-busy="true">
        <span class="loading loading-spinner loading-sm text-brand-copper" aria-hidden="true" />
        <p class="text-sm text-base-content/65">Memeriksa file backup…</p>
      </div>
    </div>

    <div
      v-if="needsPassphrase && !inspection"
      class="rounded-2xl border border-brand-border bg-base-100 p-4"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <KeyRound class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">Backup terenkripsi</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Masukkan passphrase yang dipakai saat membuat backup.
          </p>
        </div>
      </div>

      <form class="mt-4" @submit.prevent="openEncryptedFile">
        <FormField label="Passphrase" :for-id="passphraseId">
          <input
            :id="passphraseId"
            v-model="passphrase"
            type="password"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="off"
            placeholder="Passphrase backup"
          />
        </FormField>

        <AppButton type="submit" block class="mt-3" :loading="loading">
          <KeyRound class="h-4 w-4" aria-hidden="true" />
          Buka file backup
        </AppButton>
      </form>
    </div>

    <template v-if="inspection">
      <div class="rounded-2xl border border-status-completed/25 bg-status-completed/10 p-4">
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-brand-navy">Backup valid dan siap dipulihkan</p>
            <p class="mt-1 text-xs leading-5 text-base-content/65">
              {{ inspection.summary.businessName }} · diekspor
              {{ formatDateTimeId(inspection.summary.exportedAt) }}
            </p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-brand-border bg-base-100 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">Isi backup</p>
            <p class="mt-1 text-xs text-base-content/65">
              Schema v{{ inspection.summary.schemaVersion }} · aplikasi v{{
                inspection.summary.appVersion
              }}
            </p>
          </div>
          <span class="badge badge-ghost rounded-full text-xs">
            {{ inspection.summary.totalRows.toLocaleString('id-ID') }} baris
          </span>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-2">
          <div
            v-for="item in selectedCounts"
            :key="item.label"
            class="rounded-xl bg-base-200/70 px-3 py-2.5"
          >
            <dt class="text-[11px] text-base-content/65">{{ item.label }}</dt>
            <dd class="tabular mt-0.5 text-lg font-semibold text-brand-navy">
              {{ item.value.toLocaleString('id-ID') }}
            </dd>
          </div>
        </dl>

        <p class="mt-3 text-xs leading-5 text-base-content/65">
          {{ inspection.summary.transactionCount.toLocaleString('id-ID') }} transaksi selesai
          tercatat di backup.
        </p>
      </div>

      <div class="rounded-2xl border border-brand-border bg-base-100 p-4">
        <div class="flex items-start gap-3">
          <ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
          <p class="text-xs leading-5 text-base-content/65">
            Sebelum data diganti, aplikasi membuat dan mengunduh backup keamanan otomatis jika sudah
            ada profil usaha. Jika restore gagal, data lama tetap dipertahankan.
          </p>
        </div>

        <FormField label="Ketik PULIHKAN untuk konfirmasi" :for-id="confirmId" class="mt-4">
          <input
            :id="confirmId"
            v-model="confirmText"
            type="text"
            class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            autocomplete="off"
            placeholder="PULIHKAN"
          />
        </FormField>

        <AppButton
          variant="danger"
          block
          class="mt-4"
          :disabled="!canRestore"
          :loading="restoring"
          @click="restore"
        >
          Pulihkan semua data
        </AppButton>
      </div>
    </template>

    <p v-if="onboarding" class="px-1 text-center text-xs leading-5 text-base-content/65">
      Setelah restore, aplikasi dikunci dan meminta PIN dari file backup.
    </p>
  </div>
</template>
