<script setup lang="ts">
import { CalendarDays, ChevronRight, Plus, ReceiptText, Search } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import type { RecordStatus } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useSaleStore } from '@/stores/sales'
import { formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

type StatusFilter = 'all' | RecordStatus

const master = useMasterStore()
const sales = useSaleStore()
const router = useRouter()
const search = ref('')
const status = ref<StatusFilter>('all')

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
]

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')
  return sales.sales.filter((sale) => {
    if (status.value !== 'all' && sale.status !== status.value) return false
    if (!term) return true
    return [sale.nomor_nota, customerName(sale.customer_id)].some((value) =>
      value.toLocaleLowerCase('id').includes(term),
    )
  })
})

function customerName(id: string | null): string {
  if (!id) return 'Umum'
  return master.customers.find((customer) => customer.id === id)?.nama ?? 'Pelanggan'
}

function openCreate() {
  void router.push('/transaksi/penjualan/baru')
}

onMounted(async () => {
  try {
    await Promise.all([sales.load(), master.load()])
  } catch {
    // Store state exposes load errors.
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Penjualan"
      subtitle="Catat barang keluar, pembayaran, dan HPP dari lot yang terjual."
      back-to="/transaksi"
    />

    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <label for="sale-search" class="sr-only">Cari penjualan</label>
        <div class="relative min-w-0 flex-1">
          <Search
            class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-base-content/35"
            aria-hidden="true"
          />
          <input
            id="sale-search"
            v-model="search"
            type="search"
            class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 pl-9"
            placeholder="Cari nomor nota atau pelanggan"
            autocomplete="off"
          />
        </div>
        <AppButton size="sm" class="shrink-0" aria-label="Tambah" @click="openCreate">
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span class="hidden min-[380px]:inline">Tambah</span>
        </AppButton>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="btn btn-xs min-h-8 rounded-full border px-3 font-medium normal-case"
            :class="
              status === filter.value
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-brand-border bg-base-100 text-base-content/65'
            "
            :aria-pressed="status === filter.value"
            @click="status = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
        <p class="shrink-0 text-[11px] tabular text-base-content/65">
          {{ filtered.length }}/{{ sales.sales.length }} data
        </p>
      </div>
    </div>

    <div v-if="sales.loading && !sales.loaded" class="space-y-3" aria-busy="true">
      <div
        v-for="index in 3"
        :key="index"
        class="h-28 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>
    <p v-else-if="sales.error" class="rounded-2xl bg-error/10 p-4 text-sm text-error">
      {{ sales.error }}
    </p>
    <EmptyState
      v-else-if="filtered.length === 0"
      title="Belum ada penjualan"
      description="Penjualan draft tidak mengurangi stok. Lot dikonsumsi saat transaksi diselesaikan."
    >
      <template #icon>
        <ReceiptText class="h-8 w-8" aria-hidden="true" />
      </template>
      <template #action>
        <AppButton @click="openCreate">
          <Plus class="h-4 w-4" aria-hidden="true" />
          Tambah penjualan
        </AppButton>
      </template>
    </EmptyState>
    <div v-else class="space-y-3">
      <RouterLink
        v-for="sale in filtered"
        :key="sale.id"
        :to="`/transaksi/penjualan/${sale.id}`"
        class="surface-card block p-4 transition active:scale-[0.995]"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/8 text-brand-navy"
            aria-hidden="true"
          >
            <ReceiptText class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ sale.nomor_nota }}</p>
                <p class="mt-0.5 truncate text-xs text-base-content/65">
                  {{ customerName(sale.customer_id) }}
                </p>
              </div>
              <StatusChip :status="sale.status" />
            </div>
            <div class="mt-3 flex items-end justify-between gap-3">
              <p class="flex items-center gap-1.5 text-[11px] text-base-content/65">
                <CalendarDays class="h-3.5 w-3.5" aria-hidden="true" />
                {{ formatDateId(sale.tanggal) }} · {{ sale.item_count }} barang
              </p>
              <p class="text-base font-semibold tabular text-brand-navy">
                {{ formatRupiah(sale.total) }}
              </p>
            </div>
          </div>
          <ChevronRight class="mt-3 h-4 w-4 shrink-0 text-base-content/30" aria-hidden="true" />
        </div>
      </RouterLink>
    </div>
  </div>
</template>
