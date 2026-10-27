<script setup lang="ts">
import { AlertTriangle, CalendarDays } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import { getExpiryLots } from '@/inventory/repository'
import type { StockLotRow } from '@/inventory/types'
import { formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

type ExpiryFilter = 'all' | 'expired' | 'soon' | 'unknown'
const lots = ref<StockLotRow[]>([])
const loading = ref(true)
const error = ref('')
const filter = ref<ExpiryFilter>('all')
const route = useRoute()

const filtered = computed(() =>
  lots.value.filter((lot) => {
    if (filter.value === 'expired') return lot.daysToExpiry !== null && lot.daysToExpiry < 0
    if (filter.value === 'soon') return lot.daysToExpiry !== null && lot.daysToExpiry >= 0
    if (filter.value === 'unknown') return lot.status === 'quarantined' || !lot.expiry_date
    return true
  }),
)

onMounted(async () => {
  const initialFilter = route.query.filter
  if (initialFilter === 'expired' || initialFilter === 'soon' || initialFilter === 'unknown') {
    filter.value = initialFilter
  }
  try {
    lots.value = await getExpiryLots()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Daftar expiry gagal dimuat.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Expiry & lot"
      subtitle="Lot kedaluwarsa, mendekati expiry, dan karantina."
      back-to="/stok"
    />
    <div
      class="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter expiry"
    >
      <button
        v-for="item in [
          { value: 'all', label: 'Semua' },
          { value: 'expired', label: 'Expired' },
          { value: 'soon', label: 'Mendekati' },
          { value: 'unknown', label: 'Tanpa expiry' },
        ] as const"
        :key="item.value"
        type="button"
        class="btn btn-xs min-h-8 shrink-0 rounded-full border px-3 font-medium whitespace-nowrap normal-case"
        :class="
          filter === item.value
            ? 'border-brand-navy bg-brand-navy text-white'
            : 'border-brand-border bg-base-100 text-base-content/65'
        "
        :aria-pressed="filter === item.value"
        @click="filter = item.value"
      >
        {{ item.label }}
      </button>
    </div>
    <p v-if="error" class="rounded-2xl bg-error/10 p-4 text-sm text-error" role="alert">
      {{ error }}
    </p>
    <div
      v-else-if="loading"
      class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
    />
    <AppCard v-else-if="!filtered.length">
      <p class="text-sm text-base-content/65">Tidak ada lot pada kategori expiry ini.</p>
    </AppCard>
    <div v-else class="space-y-3">
      <AppCard v-for="lot in filtered" :key="lot.id">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ lot.productName }}</p>
            <p class="mt-0.5 text-xs text-base-content/65">
              {{ lot.productCode }} · {{ lot.lot_code }}
            </p>
          </div>
          <StatusChip
            :status="
              lot.status === 'quarantined'
                ? 'quarantine'
                : (lot.daysToExpiry ?? 999) < 0
                  ? 'expired'
                  : 'warning'
            "
            :label="
              lot.status === 'quarantined'
                ? 'Karantina'
                : !lot.expiry_date
                  ? 'Tanpa expiry'
                  : (lot.daysToExpiry ?? 999) < 0
                    ? 'Expired'
                    : `Sisa ${lot.daysToExpiry} hari`
            "
          />
        </div>
        <div class="mt-3 flex items-center justify-between gap-2 text-xs">
          <span class="flex items-center gap-1.5 text-base-content/65">
            <CalendarDays class="h-3.5 w-3.5" aria-hidden="true" />
            {{ formatDateId(lot.expiry_date) }} · {{ lot.qty_remaining_base }}
            {{ lot.baseUnitSymbol }}
          </span>
          <span class="font-semibold tabular">{{ formatRupiah(lot.remainingValue) }}</span>
        </div>
        <div
          v-if="(lot.daysToExpiry ?? 0) < 0 || lot.status === 'quarantined'"
          class="mt-3 flex items-start gap-2 rounded-xl bg-status-warning/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
          Lot expired atau karantina tidak dapat dipakai untuk penjualan.
        </div>
        <RouterLink
          :to="`/stok/writeoff/baru?lot_id=${lot.id}`"
          class="btn btn-secondary btn-sm mt-3 min-h-10 w-full rounded-[var(--radius-control)] normal-case"
        >
          Catat write-off
        </RouterLink>
      </AppCard>
    </div>
  </div>
</template>
