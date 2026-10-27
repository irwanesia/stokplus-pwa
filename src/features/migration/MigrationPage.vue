<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Database, FileUp, Package, ShieldAlert } from '@lucide/vue'
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'

import { db } from '@/db/dexie'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useBackupStore } from '@/stores/backup'
import { formatRupiah } from '@/utils/format'
import { todayJakarta } from '@/utils/date'

import {
  buildMigrationPlan,
  commitMigration,
  inspectLegacyExport,
  type MigrationPlan,
  type MigrationPreview,
  type MigrationResult,
  type OpeningProductOption,
} from './service'

const backup = useBackupStore()
const fileInput = ref<HTMLInputElement | null>(null)
const filename = ref('')
const preview = shallowRef<MigrationPreview | null>(null)
const plan = shallowRef<MigrationPlan | null>(null)
const result = shallowRef<MigrationResult | null>(null)
const cutoverDate = ref(todayJakarta())
const options = reactive<Record<number, OpeningProductOption>>({})
const confirmText = ref('')
const loadingFile = ref(false)
const preparing = ref(false)
const importing = ref(false)
const error = ref('')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const migrationProducts = computed(() => preview.value?.source.tables.products ?? [])
const stockProducts = computed(() => migrationProducts.value.filter((row) => Number(row.stock) > 0))
const canImport = computed(
  () =>
    Boolean(plan.value) && confirmText.value.trim().toUpperCase() === 'MIGRASI' && !importing.value,
)

watch([cutoverDate, options], () => {
  plan.value = null
})

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  preview.value = null
  plan.value = null
  result.value = null
  error.value = ''
  filename.value = file.name
  loadingFile.value = true
  try {
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas 100 MB.')
    }
    const inspected = inspectLegacyExport(await file.text())
    preview.value = inspected
    for (const product of inspected.source.tables.products) {
      const id = Number(product.id)
      options[id] = { trackExpiry: true, expiryDate: '' }
    }
  } catch (caught) {
    filename.value = ''
    error.value = caught instanceof Error ? caught.message : 'File export gagal dibaca.'
  } finally {
    loadingFile.value = false
  }
}

async function preparePlan() {
  if (!preview.value || !cutoverDate.value) return
  preparing.value = true
  error.value = ''
  try {
    plan.value = await buildMigrationPlan(preview.value, cutoverDate.value, options)
    confirmText.value = ''
  } catch (caught) {
    plan.value = null
    error.value = caught instanceof Error ? caught.message : 'Preview migrasi gagal dibuat.'
  } finally {
    preparing.value = false
  }
}

async function loadLatestResult() {
  const log = await db.audit_logs
    .where('action')
    .equals('laravel_migration_imported')
    .reverse()
    .first()
  if (!log || !isRecord(log.payload)) return
  const payload = log.payload
  if (
    typeof payload.cutoverDate !== 'string' ||
    !isRecord(payload.sourceCounts) ||
    !isRecord(payload.importedCounts) ||
    !isRecord(payload.totals)
  ) {
    return
  }
  result.value = {
    cutoverDate: payload.cutoverDate,
    sourceCounts: payload.sourceCounts as MigrationResult['sourceCounts'],
    importedCounts: payload.importedCounts as MigrationResult['importedCounts'],
    totals: payload.totals as MigrationResult['totals'],
    quarantineCount: Number(payload.quarantineCount),
    stockReconciles: payload.stockReconciles === true,
    completedAt: log.timestamp,
    safetyBackupRequired: true,
  }
}

async function importData() {
  if (!canImport.value || !plan.value) return
  importing.value = true
  error.value = ''
  try {
    await backup.createBackup({ encrypt: false })
    result.value = await commitMigration(plan.value)
    preview.value = null
    plan.value = null
    filename.value = ''
    confirmText.value = ''
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'Import gagal. Data lama tetap dipertahankan.'
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  void loadLatestResult().catch((caught: unknown) => {
    error.value =
      caught instanceof Error ? caught.message : 'Laporan migrasi terakhir gagal dimuat.'
  })
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Migrasi Laravel"
      subtitle="Pindahkan data historis dan stok awal dari export SMPP Laravel."
      back-to="/pengaturan"
    />

    <div class="rounded-2xl border border-warning/30 bg-warning/10 p-4">
      <div class="flex items-start gap-3">
        <ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p class="text-sm font-semibold">Persiapan sumber wajib</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Backup database Laravel terlebih dahulu, hentikan transaksi yang sedang berjalan, dan
            gunakan PHP 8.3.36 atau lebih baru. Import akan mengganti master, transaksi, stok, dan
            ledger lokal; profil usaha, PIN, serta pengaturan aplikasi tetap dipertahankan.
          </p>
        </div>
      </div>
    </div>

    <AppCard
      title="1. Pilih file export"
      subtitle="File JSON dari php artisan stokplus:export-json."
    >
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label="Pilih file export Laravel"
        @change="handleFileChange"
      />
      <AppButton variant="secondary" block :loading="loadingFile" @click="openFilePicker">
        <FileUp class="h-4 w-4" aria-hidden="true" />
        Pilih file JSON
      </AppButton>
      <p v-if="filename" class="mt-3 break-all text-xs text-base-content/65">
        File terpilih: <strong>{{ filename }}</strong>
      </p>
      <div v-if="preview" class="mt-4 rounded-xl bg-base-200/60 p-3 text-xs leading-5">
        <p>Export: {{ preview.source.meta.exported_at }}</p>
        <p>PHP sumber: {{ preview.source.meta.source_php }}</p>
        <p>Skema sumber: {{ preview.source.meta.schema }}</p>
        <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <span>Kategori produk: {{ preview.counts.product_categories }}</span>
          <span>Produk: {{ preview.counts.products }}</span>
          <span>Pembelian: {{ preview.counts.purchases }}</span>
          <span>Penjualan: {{ preview.counts.sales }}</span>
          <span>Beban: {{ preview.counts.expenses }}</span>
          <span>Opname: {{ preview.counts.stock_opnames }}</span>
        </div>
        <div class="mt-3 border-t border-base-content/10 pt-2">
          <p>Nilai penjualan selesai: {{ formatRupiah(preview.totals.sales) }}</p>
          <p>Nilai pembelian selesai: {{ formatRupiah(preview.totals.purchases) }}</p>
          <p>Total beban selesai: {{ formatRupiah(preview.totals.expenses) }}</p>
          <p>Total stok sumber: {{ preview.totals.stock }} unit dasar campuran</p>
        </div>
      </div>
    </AppCard>

    <AppCard
      v-if="preview"
      title="2. Tanggal cutover"
      subtitle="Tanggal stok Laravel menjadi opening lot StokPlus."
    >
      <label class="form-control">
        <span class="label-text mb-1.5 text-xs font-medium">Tanggal cutover</span>
        <input
          v-model="cutoverDate"
          type="date"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
        />
      </label>
    </AppCard>

    <AppCard
      v-if="preview && migrationProducts.length"
      title="3. Opening lot & expiry"
      subtitle="Produk yang melacak expiry tanpa tanggal akan masuk quarantine dan tidak dapat dijual."
    >
      <div class="space-y-3">
        <div
          v-for="product in migrationProducts"
          :key="String(product.id)"
          class="rounded-xl border border-base-200 p-3"
        >
          <div class="flex items-start gap-3">
            <Package class="mt-0.5 h-4 w-4 shrink-0 text-brand-copper" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{{ product.nama }}</p>
              <p class="text-xs text-base-content/65">
                {{ product.kode }} · stok {{ product.stock }} · satuan dasar
              </p>
            </div>
          </div>
          <label class="mt-3 flex items-center gap-2 text-xs">
            <input
              v-model="options[Number(product.id)].trackExpiry"
              type="checkbox"
              class="checkbox checkbox-sm"
            />
            Produk melacak expiry
          </label>
          <label class="form-control mt-3">
            <span class="label-text mb-1.5 text-xs font-medium">Tanggal expiry (opsional)</span>
            <input
              v-model="options[Number(product.id)].expiryDate"
              type="date"
              :disabled="!options[Number(product.id)].trackExpiry"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            />
          </label>
        </div>
      </div>
    </AppCard>

    <AppButton
      v-if="preview"
      block
      :loading="preparing"
      :disabled="!cutoverDate"
      @click="preparePlan"
    >
      <Database class="h-4 w-4" aria-hidden="true" />
      Validasi & siapkan preview
    </AppButton>

    <AppCard v-if="plan" title="4. Rekonsiliasi preview">
      <div class="flex items-start gap-3">
        <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-semibold">Relasi sumber valid dan stok opening lot cocok.</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Cutover {{ plan.cutoverDate }} · {{ stockProducts.length }} produk dengan stok ·
            {{ plan.quarantineCount }} lot akan dikarantina.
          </p>
          <p class="mt-2 text-xs leading-5 text-base-content/65">
            Total penjualan {{ formatRupiah(plan.totals.sales) }} · pembelian
            {{ formatRupiah(plan.totals.purchases) }} · beban
            {{ formatRupiah(plan.totals.expenses) }}.
          </p>
        </div>
      </div>
      <p class="mt-4 text-xs leading-5 text-base-content/65">
        Transaksi Laravel dipertahankan untuk laporan historis. Riwayat stock movement lama tidak
        dimasukkan ke ledger aktif. HPP historis penjualan akan diberi penanda estimasi.
      </p>
      <div class="mt-4 rounded-xl border border-error/20 bg-error/10 p-3">
        <div class="flex items-start gap-2">
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
          <p class="text-xs leading-5 text-error">
            Import mengganti seluruh master, transaksi, lot, dan ledger yang ada. Backup pengaman
            akan diunduh sebelum perubahan. Ketik <strong>MIGRASI</strong> untuk melanjutkan.
          </p>
        </div>
        <input
          v-model="confirmText"
          type="text"
          autocomplete="off"
          placeholder="MIGRASI"
          aria-label="Ketik MIGRASI untuk mengonfirmasi"
          class="input input-bordered mt-3 min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
        />
      </div>
      <AppButton
        block
        variant="danger"
        class="mt-4"
        :loading="importing || backup.creating"
        :disabled="!canImport"
        @click="importData"
      >
        Import dan ganti data
      </AppButton>
    </AppCard>

    <p
      v-if="error"
      role="alert"
      class="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm leading-6 text-error"
    >
      {{ error }}
    </p>

    <AppCard v-if="result" title="Laporan migrasi terakhir">
      <div class="space-y-2 text-sm">
        <p class="font-semibold">Import berhasil · cutover {{ result.cutoverDate }}</p>
        <p class="text-xs text-base-content/65">Selesai: {{ result.completedAt }}</p>
        <p class="text-xs text-base-content/65">
          Stok per produk berhasil direkonsiliasi. {{ result.quarantineCount }} lot menunggu
          pelengkapan expiry.
        </p>
        <div class="rounded-xl bg-base-200/60 p-3 text-xs leading-5">
          <p>Produk: {{ result.importedCounts.products ?? 0 }}</p>
          <p>Penjualan: {{ result.importedCounts.sales ?? 0 }}</p>
          <p>Pembelian: {{ result.importedCounts.purchases ?? 0 }}</p>
          <p>Opening lot: {{ result.importedCounts.stock_lots ?? 0 }}</p>
          <p>Mutasi opening: {{ result.importedCounts.stock_movements ?? 0 }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>
