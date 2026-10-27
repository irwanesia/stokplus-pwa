<script setup lang="ts">
import { Download, Printer } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { formatDateId, todayJakarta } from '@/utils/date'
import { formatQty, formatRupiah } from '@/utils/format'
import { useSessionStore } from '@/stores/session'

import { exportReport } from './export'
import {
  getReportRange,
  getReportsData,
  type ReportKind,
  type ReportPeriod,
  type ReportRange,
  type ReportsData,
} from './repository'

const session = useSessionStore()
const todayString = todayJakarta()
const period = ref<ReportPeriod>('month')
const customStart = ref(`${todayString.slice(0, 7)}-01`)
const customEnd = ref(todayString)
const selectedReport = ref<ReportKind>('profit-loss')
const data = ref<ReportsData | null>(null)
const loading = ref(false)
const error = ref('')
const exporting = ref(false)
let requestId = 0

const reportRange = computed<ReportRange>(() =>
  getReportRange(period.value, todayString, {
    startDate: customStart.value,
    endDate: customEnd.value,
  }),
)
const periodLabel = computed(
  () => `${formatDateId(reportRange.value.startDate)} – ${formatDateId(reportRange.value.endDate)}`,
)
const periods: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'custom', label: 'Custom' },
]
const reportTabs: Array<{ value: ReportKind; label: string }> = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'purchases', label: 'Pembelian' },
  { value: 'stock', label: 'Stok' },
  { value: 'expenses', label: 'Beban' },
  { value: 'expiry', label: 'Expiry' },
  { value: 'profit-loss', label: 'Laba/rugi' },
]
const hasRows = computed(() => {
  if (!data.value) return false
  if (selectedReport.value === 'sales') return data.value.sales.rows.length > 0
  if (selectedReport.value === 'purchases') return data.value.purchases.rows.length > 0
  if (selectedReport.value === 'stock') return data.value.stock.products.length > 0
  if (selectedReport.value === 'expenses') return data.value.expenses.rows.length > 0
  if (selectedReport.value === 'expiry')
    return data.value.expiry.lots.length > 0 || data.value.expiry.writeoffs.length > 0
  return (
    data.value.profitLoss.completedSaleCount > 0 ||
    data.value.profitLoss.completedExpenseCount > 0 ||
    data.value.profitLoss.inventoryLoss !== 0
  )
})

async function loadReports() {
  const request = ++requestId
  loading.value = true
  error.value = ''
  data.value = null
  try {
    const result = await getReportsData(reportRange.value)
    if (request === requestId) data.value = result
  } catch (caught) {
    if (request === requestId) {
      error.value = caught instanceof Error ? caught.message : 'Laporan gagal dimuat.'
    }
  } finally {
    if (request === requestId) loading.value = false
  }
}

watch(
  [() => reportRange.value.startDate, () => reportRange.value.endDate],
  () => {
    void loadReports()
  },
  { immediate: true },
)

async function downloadCurrentReport() {
  if (!data.value) return
  exporting.value = true
  error.value = ''
  try {
    await exportReport(data.value, selectedReport.value, session.profile)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Export laporan gagal.'
  } finally {
    exporting.value = false
  }
}

function printReport() {
  window.print()
}

const movementLabels: Record<string, string> = {
  opening: 'Stok awal',
  purchase_in: 'Pembelian masuk',
  purchase_cancel: 'Pembatalan pembelian',
  sale_out: 'Penjualan keluar',
  sale_cancel: 'Pembatalan penjualan',
  opname_shortage: 'Opname kurang',
  opname_surplus: 'Opname lebih',
  writeoff_expired: 'Write-off expired',
  writeoff_damaged: 'Write-off rusak',
  writeoff_other: 'Write-off lainnya',
  writeoff_cancel: 'Pembatalan write-off',
  import_opening: 'Stok awal impor',
}
</script>

<template>
  <div class="page-stack">
    <div class="no-print">
      <PageHeader title="Laporan" subtitle="Ringkasan usaha, stok, dan transaksi per periode." />
    </div>

    <section class="print-report space-y-5">
      <header class="hidden border-b border-black pb-3 print:block">
        <h1 class="text-xl font-bold">{{ session.profile?.nama_usaha || 'StokPlus' }}</h1>
        <p class="text-sm">
          Laporan {{ reportTabs.find((item) => item.value === selectedReport)?.label }}
        </p>
        <p class="text-xs">Periode: {{ periodLabel }}</p>
      </header>

      <AppCard class="no-print" title="Periode laporan" :subtitle="periodLabel">
        <div
          class="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto"
          role="group"
          aria-label="Periode laporan"
        >
          <button
            v-for="option in periods"
            :key="option.value"
            type="button"
            class="btn btn-xs min-h-8 shrink-0 rounded-full border px-3 font-medium whitespace-nowrap normal-case"
            :class="
              period === option.value
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-brand-border bg-base-100 text-base-content/65'
            "
            :aria-pressed="period === option.value"
            @click="period = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div v-if="period === 'custom'" class="mt-3 grid grid-cols-2 gap-3">
          <label class="form-control min-w-0">
            <span class="label-text mb-1.5 text-xs font-medium">Dari tanggal</span>
            <input
              v-model="customStart"
              type="date"
              class="input input-bordered min-h-11 w-full min-w-0 rounded-[var(--radius-control)]"
              aria-label="Dari tanggal"
            />
          </label>
          <label class="form-control min-w-0">
            <span class="label-text mb-1.5 text-xs font-medium">Sampai tanggal</span>
            <input
              v-model="customEnd"
              type="date"
              class="input input-bordered min-h-11 w-full min-w-0 rounded-[var(--radius-control)]"
              aria-label="Sampai tanggal"
            />
          </label>
        </div>
      </AppCard>

      <div class="no-print flex items-center justify-between gap-3">
        <div
          class="no-scrollbar flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Jenis laporan"
        >
          <button
            v-for="item in reportTabs"
            :key="item.value"
            type="button"
            role="tab"
            class="btn btn-xs min-h-9 shrink-0 rounded-full border px-3 font-medium whitespace-nowrap normal-case"
            :class="
              selectedReport === item.value
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-brand-border bg-base-100 text-base-content/65'
            "
            :aria-selected="selectedReport === item.value"
            @click="selectedReport = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="btn btn-sm min-h-9 rounded-full border-brand-border px-3 normal-case"
            aria-label="Cetak laporan"
            @click="printReport"
          >
            <Printer class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only sm:not-sr-only">Cetak</span>
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary min-h-9 rounded-full px-3 normal-case"
            :disabled="!data || loading || exporting"
            @click="downloadCurrentReport"
          >
            <Download class="h-4 w-4" aria-hidden="true" />
            {{ exporting ? 'Menyiapkan…' : 'Excel' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="no-print rounded-2xl bg-error/10 p-4 text-sm text-error" role="alert">
        {{ error }}
      </p>
      <div
        v-if="loading"
        class="h-56 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
        aria-busy="true"
      />

      <template v-else-if="data">
        <p
          v-if="
            data.estimatedHpp && (selectedReport === 'sales' || selectedReport === 'profit-loss')
          "
          class="rounded-xl border border-status-warning/20 bg-status-warning/10 p-3 text-xs text-base-content/70"
        >
          HPP estimasi historis: periode ini mencakup tanggal sebelum cutover
          {{ formatDateId(data.cutoverDate) }}.
        </p>

        <template v-if="selectedReport === 'sales'">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AppCard title="Penjualan kotor" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.sales.gross) }}
              </p></AppCard
            >
            <AppCard title="Diskon" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.sales.discount) }}
              </p></AppCard
            >
            <AppCard title="Penjualan bersih" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.sales.revenue) }}
              </p></AppCard
            >
            <AppCard title="HPP / COGS" padded
              ><p class="text-lg font-bold tabular">{{ formatRupiah(data.sales.cogs) }}</p></AppCard
            >
            <AppCard title="Laba kotor" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.sales.grossProfit) }}
              </p></AppCard
            >
            <AppCard title="Margin kotor" padded
              ><p class="text-lg font-bold tabular">
                {{ data.sales.grossMargin.toFixed(1) }}%
              </p></AppCard
            >
          </div>
          <AppCard
            title="Transaksi penjualan"
            :subtitle="`${data.sales.count} transaksi · ${periodLabel}`"
          >
            <div v-if="data.sales.rows.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[760px]">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. nota</th>
                    <th>Pelanggan</th>
                    <th class="text-right">Kotor</th>
                    <th class="text-right">Diskon</th>
                    <th class="text-right">Bersih</th>
                    <th class="text-right">HPP</th>
                    <th class="text-right">Laba kotor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.sales.rows" :key="row.id">
                    <td>{{ formatDateId(row.date) }}</td>
                    <td>
                      {{ row.number
                      }}<span v-if="row.estimatedHpp" class="ml-1 text-[10px] text-status-warning"
                        >Estimasi</span
                      >
                    </td>
                    <td>{{ row.customer }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.gross) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.discount) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.revenue) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.cogs) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.grossProfit) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada transaksi penjualan selesai pada periode ini.
            </p>
          </AppCard>
        </template>

        <template v-else-if="selectedReport === 'purchases'">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AppCard title="Pembelian kotor" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.purchases.gross) }}
              </p></AppCard
            >
            <AppCard title="Diskon" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.purchases.discount) }}
              </p></AppCard
            >
            <AppCard title="Biaya angkut" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.purchases.freight) }}
              </p></AppCard
            >
            <AppCard title="Pembelian bersih" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.purchases.net) }}
              </p></AppCard
            >
            <AppCard title="Transaksi selesai" padded
              ><p class="text-lg font-bold tabular">{{ data.purchases.count }}</p></AppCard
            >
          </div>
          <AppCard
            title="Transaksi pembelian"
            :subtitle="`${data.purchases.count} transaksi · ${periodLabel}`"
          >
            <div v-if="data.purchases.rows.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[620px]">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. nota</th>
                    <th>Supplier</th>
                    <th class="text-right">Kotor</th>
                    <th class="text-right">Diskon</th>
                    <th class="text-right">Angkut</th>
                    <th class="text-right">Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.purchases.rows" :key="row.id">
                    <td>{{ formatDateId(row.date) }}</td>
                    <td>{{ row.number }}</td>
                    <td>{{ row.supplier }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.gross) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.discount) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.freight) }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.net) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada transaksi pembelian selesai pada periode ini.
            </p>
          </AppCard>
        </template>

        <template v-else-if="selectedReport === 'stock'">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AppCard title="Produk" padded
              ><p class="text-lg font-bold tabular">{{ data.stock.totalProducts }}</p></AppCard
            >
            <AppCard title="Qty base total" subtitle="Satuan produk campuran" padded
              ><p class="text-lg font-bold tabular">
                {{ formatQty(data.stock.totalBaseQuantity) }}
              </p></AppCard
            >
            <AppCard title="Nilai persediaan" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.stock.inventoryValue) }}
              </p></AppCard
            >
            <AppCard title="Menipis / habis" padded
              ><p class="text-lg font-bold tabular">
                {{ data.stock.lowStockCount }} / {{ data.stock.outOfStockCount }}
              </p></AppCard
            >
            <AppCard title="Expired / hampir expired" padded
              ><p class="text-lg font-bold tabular">
                {{ data.stock.expiredLotCount }} / {{ data.stock.nearExpiryLotCount }}
              </p></AppCard
            >
          </div>
          <AppCard title="Saldo per produk" subtitle="Snapshot stok saat ini">
            <div v-if="data.stock.products.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[620px]">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Produk</th>
                    <th class="text-right">Qty base</th>
                    <th>Satuan</th>
                    <th class="text-right">Nilai</th>
                    <th class="text-right">Lot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.stock.products" :key="row.product.id">
                    <td>{{ row.product.kode }}</td>
                    <td>{{ row.product.nama }}</td>
                    <td class="text-right tabular">{{ formatQty(row.lotStock) }}</td>
                    <td>{{ row.baseUnitSymbol }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.inventoryValue) }}</td>
                    <td class="text-right">{{ row.lots.length }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">Belum ada produk untuk ditampilkan.</p>
          </AppCard>
          <AppCard title="Mutasi pada periode">
            <div v-if="data.stock.movements.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[640px]">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Produk</th>
                    <th>Mutasi</th>
                    <th class="text-right">Qty base</th>
                    <th class="text-right">Saldo sesudah</th>
                    <th>Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.stock.movements" :key="row.id">
                    <td>{{ formatDateId(row.tanggal) }}</td>
                    <td>{{ row.productName }} · {{ row.productCode }}</td>
                    <td>{{ movementLabels[row.tipe] ?? row.tipe }}</td>
                    <td class="text-right tabular">{{ formatQty(row.qty_base) }}</td>
                    <td class="text-right tabular">{{ formatQty(row.stock_after_base) }}</td>
                    <td>{{ row.baseUnitSymbol }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada mutasi stok pada periode ini.
            </p>
          </AppCard>
          <AppCard title="Rincian lot dan expiry" subtitle="Lot aktif saat ini">
            <div v-if="data.stock.products.some((row) => row.lots.length)" class="overflow-x-auto">
              <table class="table table-sm min-w-[600px]">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kode lot</th>
                    <th>Expiry</th>
                    <th class="text-right">Sisa</th>
                    <th>Satuan</th>
                    <th class="text-right">Nilai</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="row in data.stock.products" :key="row.product.id"
                    ><tr v-for="lot in row.lots" :key="lot.id">
                      <td>{{ row.product.nama }}</td>
                      <td>{{ lot.lot_code }}</td>
                      <td>{{ formatDateId(lot.expiry_date) }}</td>
                      <td class="text-right tabular">{{ formatQty(lot.qty_remaining_base) }}</td>
                      <td>{{ row.baseUnitSymbol }}</td>
                      <td class="text-right tabular">{{ formatRupiah(lot.remainingValue) }}</td>
                      <td>{{ lot.status }}</td>
                    </tr></template
                  >
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">Belum ada lot persediaan.</p>
          </AppCard>
        </template>

        <template v-else-if="selectedReport === 'expenses'">
          <AppCard title="Total beban" padded>
            <p class="text-2xl font-bold tabular">{{ formatRupiah(data.expenses.total) }}</p>
            <p class="mt-1 text-xs text-base-content/65">
              {{ data.expenses.count }} transaksi selesai
            </p>
          </AppCard>
          <AppCard title="Rincian per kategori">
            <div v-if="data.expenses.items.length" class="space-y-3">
              <div
                v-for="item in data.expenses.items"
                :key="item.categoryId"
                class="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p class="text-sm font-semibold">{{ item.categoryName }}</p>
                  <p class="text-xs text-base-content/65">{{ item.count }} transaksi</p>
                </div>
                <p class="text-sm font-semibold tabular">{{ formatRupiah(item.total) }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada beban selesai pada periode ini.
            </p>
          </AppCard>
          <AppCard title="Transaksi beban">
            <div v-if="data.expenses.rows.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[560px]">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. transaksi</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th class="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.expenses.rows" :key="row.id">
                    <td>{{ formatDateId(row.date) }}</td>
                    <td>{{ row.number }}</td>
                    <td>{{ row.category }}</td>
                    <td>{{ row.description }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada transaksi beban selesai pada periode ini.
            </p>
          </AppCard>
        </template>

        <template v-else-if="selectedReport === 'expiry'">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AppCard title="Lot expired" padded
              ><p class="text-lg font-bold tabular text-error">
                {{ data.expiry.expiredCount }}
              </p></AppCard
            >
            <AppCard title="Hampir expired" padded
              ><p class="text-lg font-bold tabular">{{ data.expiry.nearExpiryCount }}</p></AppCard
            >
            <AppCard title="Lot karantina" padded
              ><p class="text-lg font-bold tabular">{{ data.expiry.quarantineCount }}</p></AppCard
            >
            <AppCard title="Nilai stok berisiko" padded
              ><p class="text-lg font-bold tabular">
                {{ formatRupiah(data.expiry.riskValue) }}
              </p></AppCard
            >
          </div>
          <AppCard title="Lot expiry" subtitle="Kondisi lot saat ini">
            <div v-if="data.expiry.lots.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[620px]">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kode lot</th>
                    <th>Expiry</th>
                    <th class="text-right">Sisa</th>
                    <th>Satuan</th>
                    <th class="text-right">Nilai</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lot in data.expiry.lots" :key="lot.id">
                    <td>{{ lot.productName }} · {{ lot.productCode }}</td>
                    <td>{{ lot.lot_code }}</td>
                    <td>{{ formatDateId(lot.expiry_date) }}</td>
                    <td class="text-right tabular">{{ formatQty(lot.qty_remaining_base) }}</td>
                    <td>{{ lot.baseUnitSymbol }}</td>
                    <td class="text-right tabular">{{ formatRupiah(lot.remainingValue) }}</td>
                    <td>
                      {{
                        lot.status === 'quarantined'
                          ? 'Karantina'
                          : (lot.daysToExpiry ?? 999) < 0
                            ? 'Expired'
                            : 'Hampir expired'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Tidak ada lot expired, hampir expired, atau karantina.
            </p>
          </AppCard>
          <AppCard title="Riwayat write-off" :subtitle="`Periode ${periodLabel}`">
            <div v-if="data.expiry.writeoffs.length" class="overflow-x-auto">
              <table class="table table-sm min-w-[480px]">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. write-off</th>
                    <th>Alasan</th>
                    <th class="text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.expiry.writeoffs" :key="row.id">
                    <td>{{ formatDateId(row.date) }}</td>
                    <td>{{ row.number }}</td>
                    <td>{{ row.reason }}</td>
                    <td class="text-right tabular">{{ formatRupiah(row.totalCost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada write-off selesai pada periode ini.
            </p>
          </AppCard>
        </template>

        <template v-else>
          <AppCard title="Laba / rugi" :subtitle="periodLabel">
            <dl class="space-y-3">
              <div class="flex justify-between gap-3 text-sm">
                <dt>Penjualan kotor</dt>
                <dd class="tabular">{{ formatRupiah(data.sales.gross) }}</dd>
              </div>
              <div class="flex justify-between gap-3 text-sm">
                <dt>(−) Diskon penjualan</dt>
                <dd class="tabular">− {{ formatRupiah(data.sales.discount) }}</dd>
              </div>
              <div
                class="flex justify-between gap-3 border-t border-brand-border pt-3 text-sm font-semibold"
              >
                <dt>Penjualan bersih</dt>
                <dd class="tabular">{{ formatRupiah(data.profitLoss.revenue) }}</dd>
              </div>
              <div class="flex justify-between gap-3 text-sm">
                <dt>(−) HPP / COGS</dt>
                <dd class="tabular">− {{ formatRupiah(data.profitLoss.cogs) }}</dd>
              </div>
              <div
                class="flex justify-between gap-3 border-t border-brand-border pt-3 text-sm font-semibold"
              >
                <dt>Laba kotor</dt>
                <dd class="tabular">{{ formatRupiah(data.profitLoss.grossProfit) }}</dd>
              </div>
              <div class="flex justify-between gap-3 text-sm">
                <dt>Kerugian persediaan</dt>
                <dd class="tabular">
                  {{ data.profitLoss.inventoryLoss < 0 ? '+ ' : '− '
                  }}{{ formatRupiah(Math.abs(data.profitLoss.inventoryLoss)) }}
                </dd>
              </div>
              <div class="flex justify-between gap-3 text-sm">
                <dt>(−) Beban operasional</dt>
                <dd class="tabular">− {{ formatRupiah(data.profitLoss.operatingExpenses) }}</dd>
              </div>
              <div
                class="flex justify-between gap-3 border-t border-brand-border pt-3 text-base font-bold"
              >
                <dt>Laba bersih</dt>
                <dd
                  class="tabular"
                  :class="data.profitLoss.netProfit < 0 ? 'text-error' : 'text-brand-navy'"
                >
                  {{ formatRupiah(data.profitLoss.netProfit) }}
                </dd>
              </div>
            </dl>
            <p class="mt-4 text-xs text-base-content/65">
              {{ data.profitLoss.completedSaleCount }} penjualan selesai ·
              {{ data.profitLoss.completedExpenseCount }} beban selesai
            </p>
          </AppCard>
          <AppCard
            title="Rincian beban"
            :subtitle="`${data.expenses.count} transaksi · ${periodLabel}`"
          >
            <div v-if="data.expenses.items.length" class="space-y-3">
              <div
                v-for="item in data.expenses.items"
                :key="item.categoryId"
                class="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p class="text-sm font-semibold">{{ item.categoryName }}</p>
                  <p class="text-xs text-base-content/65">{{ item.count }} transaksi</p>
                </div>
                <p class="text-sm font-semibold tabular">{{ formatRupiah(item.total) }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-base-content/65">
              Belum ada beban selesai pada periode ini. Draft dan beban batal tidak ikut dihitung.
            </p>
          </AppCard>
          <div class="rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4">
            <p class="text-sm font-semibold">HPP terpisah dari beban operasional</p>
            <p class="mt-1 text-xs leading-5 text-base-content/65">
              HPP diambil dari lot yang benar-benar terjual. Beban operasional hanya mengurangi laba
              bersih. Kerugian persediaan berasal dari write-off dan selisih opname selesai; surplus
              opname mengurangi total kerugian persediaan.
            </p>
          </div>
        </template>

        <p
          v-if="!hasRows"
          class="rounded-2xl bg-base-200 p-4 text-center text-sm text-base-content/65"
        >
          Belum ada data untuk laporan ini pada periode terpilih.
        </p>
      </template>
    </section>
  </div>
</template>
