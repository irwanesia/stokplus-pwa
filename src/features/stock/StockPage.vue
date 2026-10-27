<script setup lang="ts">
import { AlertTriangle, Search } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import { getStockOverview } from '@/inventory/repository'
import type { StockProductRow } from '@/inventory/types'
import { formatQty, formatRupiah } from '@/utils/format'

type StockFilter = 'all' | 'low' | 'out' | 'expired' | 'quarantine'

const products = ref<StockProductRow[]>([])
const route = useRoute()
const loading = ref(true)
const error = ref('')
const search = ref('')
const filter = ref<StockFilter>('all')

const mismatches = computed(() => products.value.filter((row) => row.stockDifference !== 0))
const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')
  return products.value.filter(({ product, lotStock, lots }) => {
    if (filter.value === 'low' && !(lotStock > 0 && lotStock <= product.min_stock_base))
      return false
    if (filter.value === 'out' && lotStock !== 0) return false
    if (
      filter.value === 'expired' &&
      !lots.some((lot) => lot.qty_remaining_base > 0 && (lot.daysToExpiry ?? 0) < 0)
    )
      return false
    if (
      filter.value === 'quarantine' &&
      !lots.some((lot) => lot.qty_remaining_base > 0 && lot.status === 'quarantined')
    )
      return false
    return !term || `${product.nama} ${product.kode}`.toLocaleLowerCase('id').includes(term)
  })
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    products.value = await getStockOverview()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Data stok gagal dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
onMounted(() => {
  const initialFilter = route.query.filter
  if (
    initialFilter === 'low' ||
    initialFilter === 'out' ||
    initialFilter === 'expired' ||
    initialFilter === 'quarantine'
  ) {
    filter.value = initialFilter
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader title="Stok" subtitle="Saldo stok, lot, nilai persediaan, dan rekonsiliasi." />

    <div class="grid grid-cols-3 gap-2">
      <RouterLink
        to="/stok/expiry"
        class="surface-card flex min-h-20 flex-col justify-center px-3 py-3 text-center"
      >
        <span class="text-xs font-semibold">Expiry</span>
        <span class="mt-1 text-[10px] text-base-content/65">Lot & write-off</span>
      </RouterLink>
      <RouterLink
        to="/stok/opname"
        class="surface-card flex min-h-20 flex-col justify-center px-3 py-3 text-center"
      >
        <span class="text-xs font-semibold">Opname</span>
        <span class="mt-1 text-[10px] text-base-content/65">Stok fisik</span>
      </RouterLink>
      <RouterLink
        to="/stok/writeoff"
        class="surface-card flex min-h-20 flex-col justify-center px-3 py-3 text-center"
      >
        <span class="text-xs font-semibold">Write-off</span>
        <span class="mt-1 text-[10px] text-base-content/65">Kerugian stok</span>
      </RouterLink>
    </div>

    <div
      v-if="mismatches.length"
      class="flex items-start gap-3 rounded-2xl border border-error/20 bg-error/10 p-4"
      role="alert"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
      <div class="min-w-0">
        <p class="text-sm font-semibold">Ditemukan selisih stok</p>
        <p class="mt-1 text-xs leading-5 text-base-content/65">
          {{ mismatches.length }} produk memiliki saldo produk yang berbeda dari jumlah lot. Periksa
          kartu stok sebelum membuat opname.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <AppCard title="Produk" padded>
        <p class="text-2xl font-bold tabular">{{ products.length }}</p>
      </AppCard>
      <AppCard title="Nilai persediaan" padded>
        <p class="text-lg font-bold tabular">
          {{ formatRupiah(products.reduce((sum, row) => sum + row.inventoryValue, 0)) }}
        </p>
      </AppCard>
    </div>

    <label class="relative block">
      <span class="sr-only">Cari stok</span>
      <Search
        class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-base-content/35"
        aria-hidden="true"
      />
      <input
        v-model="search"
        type="search"
        class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 pl-9"
        placeholder="Cari nama atau kode produk"
      />
    </label>
    <div
      class="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto"
      role="group"
      aria-label="Filter stok"
    >
      <button
        v-for="item in [
          { value: 'all', label: 'Semua' },
          { value: 'low', label: 'Menipis' },
          { value: 'out', label: 'Habis' },
          { value: 'expired', label: 'Expired' },
          { value: 'quarantine', label: 'Karantina' },
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
    <div v-else-if="loading" class="space-y-3" aria-busy="true">
      <div
        v-for="n in 3"
        :key="n"
        class="h-24 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>
    <AppCard v-else-if="!filtered.length">
      <p class="text-sm text-base-content/65">Tidak ada produk pada filter ini.</p>
    </AppCard>
    <div v-else class="space-y-3">
      <RouterLink
        v-for="row in filtered"
        :key="row.product.id"
        :to="`/stok/produk/${row.product.id}`"
        class="surface-card block p-4 transition active:scale-[0.995]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ row.product.nama }}</p>
            <p class="mt-0.5 text-xs text-base-content/65">{{ row.product.kode }}</p>
          </div>
          <StatusChip
            :status="
              row.lotStock === 0
                ? 'expired'
                : row.lotStock <= row.product.min_stock_base
                  ? 'warning'
                  : 'normal'
            "
            :label="
              row.lotStock === 0
                ? 'Habis'
                : row.lotStock <= row.product.min_stock_base
                  ? 'Menipis'
                  : 'Normal'
            "
          />
        </div>
        <div class="mt-3 flex items-end justify-between gap-3">
          <p class="text-xl font-bold tabular text-brand-navy">
            {{ row.lotStock }}
            <span class="text-xs font-medium text-base-content/65">{{ row.baseUnitSymbol }}</span>
          </p>
          <p v-if="row.displayStock" class="mt-0.5 text-[11px] text-base-content/65">
            {{ formatQty(row.displayStock.qty, row.displayStock.unitSymbol) }} setara
          </p>
          <div class="text-right">
            <p class="text-sm font-semibold tabular">{{ formatRupiah(row.inventoryValue) }}</p>
            <p class="text-[10px] text-base-content/65">
              {{ row.lots.length }} lot · nilai persediaan
            </p>
          </div>
        </div>
        <p v-if="row.stockDifference !== 0" class="mt-2 text-xs font-semibold text-error">
          Selisih rekonsiliasi: {{ row.stockDifference }} {{ row.baseUnitSymbol }}
        </p>
      </RouterLink>
    </div>
  </div>
</template>
