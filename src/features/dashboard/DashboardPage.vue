<script setup lang="ts">
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import BackupReminderBanner from '@/components/backup/BackupReminderBanner.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import {
  getDashboardData,
  getDashboardPeriodRange,
  type DashboardData,
  type DashboardPeriod,
  type DashboardPeriodRange,
} from '@/features/dashboard/repository'
import { useSessionStore } from '@/stores/session'
import { useBackupStore } from '@/stores/backup'
import { todayJakarta, formatDateId } from '@/utils/date'
import { formatNumberId, formatRupiah } from '@/utils/format'

const session = useSessionStore()
const backup = useBackupStore()
const today = todayJakarta()
const period = ref<DashboardPeriod>('month')
const customStart = ref(`${today.slice(0, 7)}-01`)
const customEnd = ref(today)
const dashboard = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')
let requestNumber = 0

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'custom', label: 'Custom' },
]

const range = computed<DashboardPeriodRange>(() =>
  getDashboardPeriodRange(period.value, today, {
    startDate: customStart.value,
    endDate: customEnd.value,
  }),
)
const periodLabel = computed(
  () => `${formatDateId(range.value.startDate)} – ${formatDateId(range.value.endDate)}`,
)
const greeting = computed(() => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Jakarta',
    }).format(new Date()),
  )
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
})
const chartMaximum = computed(() =>
  Math.max(1, ...(dashboard.value?.months.flatMap((month) => [month.revenue, month.cogs]) ?? [0])),
)
const statusLabel: Record<string, string> = {
  completed: 'Selesai',
  draft: 'Draft',
  cancelled: 'Batal',
}
const activityIcon = {
  sale: ReceiptText,
  purchase: ShoppingCart,
  expense: WalletCards,
  writeoff: AlertTriangle,
}

async function loadDashboard() {
  const request = ++requestNumber
  loading.value = true
  error.value = ''
  if (
    !range.value.startDate ||
    !range.value.endDate ||
    range.value.startDate > range.value.endDate
  ) {
    dashboard.value = null
    error.value = 'Tanggal awal tidak boleh melewati tanggal akhir.'
    loading.value = false
    return
  }
  try {
    const result = await getDashboardData(range.value, today)
    if (request === requestNumber) dashboard.value = result
  } catch (caught) {
    if (request === requestNumber) {
      dashboard.value = null
      error.value = caught instanceof Error ? caught.message : 'Dashboard gagal dimuat.'
    }
  } finally {
    if (request === requestNumber) loading.value = false
  }
}

watch([period, customStart, customEnd], () => void loadDashboard(), { immediate: true })
</script>

<template>
  <div class="page-stack">
    <BackupReminderBanner />

    <section class="hero-card overflow-hidden p-5 text-white">
      <div class="relative z-10">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-bold ring-1 ring-white/20"
              aria-hidden="true"
            >
              S+
            </span>
            <div class="min-w-0">
              <p class="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                {{ greeting }}
              </p>
              <h1 class="truncate text-lg font-semibold tracking-tight">StokPlus</h1>
              <p v-if="session.profile?.nama_usaha" class="truncate text-[11px] text-white/65">
                {{ session.profile.nama_usaha }}
              </p>
            </div>
          </div>
          <span
            class="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/75"
            :aria-label="
              backup.reminder?.shouldRemind
                ? 'Status backup: perlu backup'
                : backup.reminder
                  ? 'Status backup: aman'
                  : 'Memeriksa status backup'
            "
          >
            <AlertTriangle
              v-if="backup.reminder?.shouldRemind"
              class="h-3.5 w-3.5 text-status-warning"
              aria-hidden="true"
            />
            <ShieldCheck
              v-else-if="backup.reminder"
              class="h-3.5 w-3.5 text-status-normal"
              aria-hidden="true"
            />
            <span>
              {{
                backup.reminder?.shouldRemind
                  ? 'Perlu backup'
                  : backup.reminder
                    ? 'Backup aman'
                    : 'Memeriksa backup'
              }}
            </span>
          </span>
        </div>

        <p class="mt-6 text-xs font-medium text-white/60">Penjualan bersih · {{ periodLabel }}</p>
        <p class="mt-1 text-3xl font-bold tracking-tight tabular">
          {{ formatRupiah(dashboard?.profitLoss.revenue ?? 0) }}
        </p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p class="text-[10px] text-white/55">Laba kotor</p>
            <p class="mt-1 text-base font-semibold tabular">
              {{ formatRupiah(dashboard?.profitLoss.grossProfit ?? 0) }}
            </p>
          </div>
          <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p class="text-[10px] text-white/55">Laba bersih</p>
            <p class="mt-1 text-base font-semibold tabular">
              {{ formatRupiah(dashboard?.profitLoss.netProfit ?? 0) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <AppCard title="Periode" :subtitle="periodLabel">
      <div
        class="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto"
        role="group"
        aria-label="Filter periode dashboard"
      >
        <button
          v-for="option in periodOptions"
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

    <p v-if="error" class="rounded-2xl bg-error/10 p-4 text-sm text-error" role="alert">
      {{ error }}
    </p>
    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="h-40 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
      <div class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>

    <template v-else-if="dashboard">
      <section class="grid grid-cols-2 gap-3" aria-label="Ringkasan KPI">
        <AppCard title="Penjualan" padded>
          <p class="text-lg font-bold tabular">{{ formatRupiah(dashboard.profitLoss.revenue) }}</p>
          <p class="mt-1 text-[11px] text-base-content/65">
            Bersih · {{ dashboard.profitLoss.completedSaleCount }} nota
          </p>
        </AppCard>
        <AppCard title="HPP / COGS" padded>
          <p class="text-lg font-bold tabular">{{ formatRupiah(dashboard.profitLoss.cogs) }}</p>
          <p class="mt-1 text-[11px] text-base-content/65">Dari lot terjual</p>
        </AppCard>
        <AppCard title="Beban operasional" padded>
          <p class="text-lg font-bold tabular">
            {{ formatRupiah(dashboard.profitLoss.operatingExpenses) }}
          </p>
          <p class="mt-1 text-[11px] text-base-content/65">
            {{ dashboard.profitLoss.completedExpenseCount }} transaksi
          </p>
        </AppCard>
        <AppCard title="Laba bersih" padded>
          <p
            class="text-lg font-bold tabular"
            :class="dashboard.profitLoss.netProfit < 0 ? 'text-error' : 'text-brand-navy'"
          >
            {{ formatRupiah(dashboard.profitLoss.netProfit) }}
          </p>
          <p class="mt-1 text-[11px] text-base-content/65">Setelah rugi stok & beban</p>
        </AppCard>
      </section>

      <AppCard
        title="Penjualan vs HPP"
        subtitle="6 bulan terakhir · tidak mengikuti filter periode"
      >
        <div class="mb-3 flex flex-wrap gap-4 text-[11px] text-base-content/65">
          <span class="flex items-center gap-1.5"
            ><i class="h-2.5 w-2.5 rounded-full bg-brand-navy" />Penjualan</span
          >
          <span class="flex items-center gap-1.5"
            ><i class="h-2.5 w-2.5 rounded-full bg-brand-copper" />HPP</span
          >
        </div>
        <div
          class="grid grid-cols-6 gap-2"
          role="img"
          aria-label="Grafik batang penjualan dan HPP enam bulan"
        >
          <div v-for="month in dashboard.months" :key="month.key" class="min-w-0 text-center">
            <div
              class="flex h-28 items-end justify-center gap-1 rounded-lg bg-base-200/50 px-1 pt-2"
            >
              <span
                class="w-2 rounded-t bg-brand-navy"
                :style="{
                  height: `${Math.max(month.revenue ? 4 : 0, (month.revenue / chartMaximum) * 100)}%`,
                }"
                :title="`Penjualan ${month.label}: ${formatRupiah(month.revenue)}`"
              />
              <span
                class="w-2 rounded-t bg-brand-copper"
                :style="{
                  height: `${Math.max(month.cogs ? 4 : 0, (month.cogs / chartMaximum) * 100)}%`,
                }"
                :title="`HPP ${month.label}: ${formatRupiah(month.cogs)}`"
              />
            </div>
            <p class="mt-1.5 truncate text-[10px] font-medium text-base-content/65">
              {{ month.label }}
            </p>
            <p class="truncate text-[9px] tabular text-base-content/65">
              {{ formatNumberId(month.revenue) }}
            </p>
          </div>
        </div>
      </AppCard>

      <AppCard title="Ringkasan stok" subtitle="Saldo stok berbasis lot dan kondisi persediaan">
        <div class="grid grid-cols-2 gap-2">
          <RouterLink to="/stok?filter=low" class="rounded-xl bg-base-200/70 p-3">
            <p class="flex items-center gap-1.5 text-[11px] text-base-content/65">
              <Package class="h-3.5 w-3.5" />Menipis
            </p>
            <p class="mt-1 text-lg font-bold tabular">{{ dashboard.lowStockCount }} produk</p>
          </RouterLink>
          <RouterLink to="/stok?filter=out" class="rounded-xl bg-base-200/70 p-3">
            <p class="flex items-center gap-1.5 text-[11px] text-base-content/65">
              <Boxes class="h-3.5 w-3.5" />Habis
            </p>
            <p class="mt-1 text-lg font-bold tabular">{{ dashboard.outOfStockCount }} produk</p>
          </RouterLink>
          <RouterLink
            to="/stok"
            class="col-span-2 flex items-center justify-between rounded-xl bg-base-200/70 p-3"
          >
            <span class="flex items-center gap-1.5 text-[11px] text-base-content/65"
              ><CircleDollarSign class="h-3.5 w-3.5" />Nilai persediaan</span
            >
            <span class="text-sm font-bold tabular">{{
              formatRupiah(dashboard.inventoryValue)
            }}</span>
          </RouterLink>
          <RouterLink
            to="/stok/expiry?filter=expired"
            class="rounded-xl border border-error/15 bg-error/5 p-3"
          >
            <p class="text-[11px] text-base-content/65">Lot expired</p>
            <p class="mt-1 text-lg font-bold tabular text-error">
              {{ dashboard.expiredLotCount }} lot
            </p>
          </RouterLink>
          <RouterLink
            to="/stok/expiry?filter=soon"
            class="rounded-xl border border-status-warning/15 bg-status-warning/5 p-3"
          >
            <p class="text-[11px] text-base-content/65">Hampir expiry</p>
            <p class="mt-1 text-lg font-bold tabular">{{ dashboard.nearExpiryLotCount }} lot</p>
          </RouterLink>
        </div>
        <p v-if="dashboard.quarantineLotCount" class="mt-3 text-xs text-status-warning">
          {{ dashboard.quarantineLotCount }} lot karantina tanpa expiry juga perlu diperiksa.
        </p>
      </AppCard>

      <AppCard title="Aksi cepat" subtitle="Catat transaksi tanpa berpindah menu dahulu.">
        <div class="grid grid-cols-3 gap-2">
          <RouterLink
            to="/transaksi/penjualan/baru"
            class="btn btn-primary min-h-11 rounded-[var(--radius-control)] px-2 text-xs normal-case"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />Penjualan
          </RouterLink>
          <RouterLink
            to="/transaksi/pembelian/baru"
            class="btn btn-secondary min-h-11 rounded-[var(--radius-control)] px-2 text-xs normal-case"
          >
            <ShoppingCart class="h-4 w-4" aria-hidden="true" />Pembelian
          </RouterLink>
          <RouterLink
            to="/transaksi/beban/baru"
            class="btn min-h-11 rounded-[var(--radius-control)] border border-brand-navy bg-base-100 px-2 text-xs text-brand-navy normal-case hover:bg-base-200"
          >
            <WalletCards class="h-4 w-4" aria-hidden="true" />Beban
          </RouterLink>
        </div>
      </AppCard>

      <AppCard title="Aktivitas terbaru" :subtitle="`5 transaksi dalam periode · ${periodLabel}`">
        <div v-if="dashboard.activities.length" class="space-y-3">
          <RouterLink
            v-for="activity in dashboard.activities"
            :key="`${activity.kind}-${activity.id}`"
            :to="activity.to"
            class="flex items-center gap-3 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-brand-navy"
            >
              <component :is="activityIcon[activity.kind]" class="h-4 w-4" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ activity.title }}</span>
              <span class="mt-0.5 block truncate text-xs text-base-content/65">
                {{ activity.subtitle }} · {{ formatDateId(activity.date) }}
              </span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1">
              <span class="text-xs font-semibold tabular">{{ formatRupiah(activity.amount) }}</span>
              <StatusChip :status="activity.status" :label="statusLabel[activity.status]" />
            </span>
          </RouterLink>
        </div>
        <div v-else class="py-3 text-center">
          <ClipboardList class="mx-auto h-8 w-8 text-base-content/25" aria-hidden="true" />
          <p class="mt-2 text-sm font-semibold">Belum ada aktivitas pada periode ini</p>
          <p class="mt-1 text-xs text-base-content/65">
            Transaksi yang selesai akan tampil di sini.
          </p>
        </div>
      </AppCard>

      <AppCard
        v-if="!dashboard.hasTransactions"
        tone="muted"
        title="Mulai catat usaha"
        subtitle="Ringkasan transaksi periode ini masih kosong."
      >
        <RouterLink
          to="/transaksi/penjualan/baru"
          class="btn btn-primary min-h-11 w-full rounded-[var(--radius-control)] normal-case"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />Catat penjualan pertama
        </RouterLink>
      </AppCard>
    </template>
  </div>
</template>
