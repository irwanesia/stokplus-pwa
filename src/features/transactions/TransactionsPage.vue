<script setup lang="ts">
import { ChevronRight, ClipboardList, ReceiptText, ShoppingCart, WalletCards } from '@lucide/vue'
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import { usePurchaseStore } from '@/stores/purchases'
import { useSaleStore } from '@/stores/sales'
import { useExpenseStore } from '@/stores/expenses'
import { formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

const purchases = usePurchaseStore()
const sales = useSaleStore()
const expenses = useExpenseStore()

const completedCount = computed(
  () => sales.sales.filter((row) => row.status === 'completed').length,
)
const draftCount = computed(() => sales.sales.filter((row) => row.status === 'draft').length)
const recentSales = computed(() => sales.sales.slice(0, 3))
const recentPurchases = computed(() => purchases.purchases.slice(0, 3))
const recentExpenses = computed(() => expenses.expenses.slice(0, 3))

onMounted(async () => {
  try {
    await Promise.all([purchases.load(), sales.load(), expenses.load()])
  } catch {
    // Error is exposed by the store.
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Transaksi"
      subtitle="Pembelian, penjualan, dan beban operasional dalam satu tempat."
    />

    <section class="hero-card p-5 text-white">
      <div class="relative z-10">
        <p class="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
          Phase 6–8 · Transaksi
        </p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight">Penjualan dengan HPP akurat</h2>
        <p class="mt-1 max-w-sm text-sm leading-6 text-white/65">
          Selesaikan penjualan untuk mengonsumsi lot FEFO/FIFO dan menghitung laba kotor.
        </p>

        <div class="mt-5 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <p class="text-xl font-semibold tabular">{{ sales.sales.length }}</p>
            <p class="mt-0.5 text-[10px] text-white/55">Total</p>
          </div>
          <div class="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <p class="text-xl font-semibold tabular">{{ completedCount }}</p>
            <p class="mt-0.5 text-[10px] text-white/55">Selesai</p>
          </div>
          <div class="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <p class="text-xl font-semibold tabular">{{ draftCount }}</p>
            <p class="mt-0.5 text-[10px] text-white/55">Draft</p>
          </div>
        </div>
      </div>
    </section>

    <p
      v-if="purchases.error || sales.error || expenses.error"
      class="rounded-2xl bg-error/10 p-4 text-sm leading-6 text-error"
      role="alert"
    >
      {{ [purchases.error, sales.error, expenses.error].filter(Boolean).join(' ') }}
    </p>

    <div class="space-y-3">
      <RouterLink
        to="/transaksi/pembelian"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <ShoppingCart class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="text-sm font-semibold">Pembelian</span>
            <span
              class="badge badge-sm rounded-full border-status-completed/20 bg-status-completed/10 text-status-completed"
            >
              Aktif
            </span>
          </span>
          <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
            Multi-satuan, lot, expiry, diskon, biaya angkut, dan HPP.
          </span>
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        to="/transaksi/penjualan"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/8 text-brand-navy"
          aria-hidden="true"
        >
          <ReceiptText class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="text-sm font-semibold">Penjualan</span>
            <span
              class="badge badge-sm rounded-full border-brand-border bg-base-200 text-base-content/65"
            >
              Aktif
            </span>
          </span>
          <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
            Multi-satuan, FEFO/FIFO, COGS, pembayaran, dan pembatalan.
          </span>
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
      </RouterLink>

      <RouterLink
        to="/transaksi/beban"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/8 text-brand-navy"
          aria-hidden="true"
        >
          <WalletCards class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="text-sm font-semibold">Beban operasional</span>
            <span
              class="badge badge-sm rounded-full border-brand-border bg-base-200 text-base-content/65"
            >
              Aktif
            </span>
          </span>
          <span class="mt-0.5 flex items-center gap-1 text-xs leading-5 text-base-content/65">
            Beban mengurangi laba bersih, tidak mengubah HPP atau stok.
          </span>
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
      </RouterLink>
    </div>

    <section v-if="recentSales.length" class="space-y-1">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-sm font-semibold">Penjualan terakhir</h2>
        <RouterLink
          to="/transaksi/penjualan"
          class="text-xs font-semibold text-brand-copper underline underline-offset-2"
        >
          Lihat semua
        </RouterLink>
      </div>

      <RouterLink
        v-for="sale in recentSales"
        :key="sale.id"
        :to="`/transaksi/penjualan/${sale.id}`"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-base-content/65"
          aria-hidden="true"
        >
          <ClipboardList class="h-4 w-4" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">{{ sale.nomor_nota }}</span>
          <span class="mt-0.5 block text-xs text-base-content/65">
            {{ formatDateId(sale.tanggal) }} · {{ sale.item_count }} barang
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-sm font-semibold tabular">{{ formatRupiah(sale.total) }}</span>
          <StatusChip :status="sale.status" />
        </span>
      </RouterLink>
    </section>

    <section v-if="recentPurchases.length" class="space-y-1">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-sm font-semibold">Pembelian terakhir</h2>
        <RouterLink
          to="/transaksi/pembelian"
          class="text-xs font-semibold text-brand-copper underline underline-offset-2"
        >
          Lihat semua
        </RouterLink>
      </div>
      <RouterLink
        v-for="purchase in recentPurchases"
        :key="purchase.id"
        :to="`/transaksi/pembelian/${purchase.id}`"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">{{ purchase.nomor_nota }}</span>
          <span class="mt-0.5 block text-xs text-base-content/65">
            {{ formatDateId(purchase.tanggal) }} · {{ purchase.item_count }} barang
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-sm font-semibold tabular">{{ formatRupiah(purchase.total) }}</span>
          <StatusChip :status="purchase.status" />
        </span>
      </RouterLink>
    </section>

    <section v-if="recentExpenses.length" class="space-y-1">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-sm font-semibold">Beban terakhir</h2>
        <RouterLink
          to="/transaksi/beban"
          class="text-xs font-semibold text-brand-copper underline underline-offset-2"
        >
          Lihat semua
        </RouterLink>
      </div>
      <RouterLink
        v-for="expense in recentExpenses"
        :key="expense.id"
        :to="`/transaksi/beban/${expense.id}`"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">
            {{ expense.category?.nama ?? expense.nomor_transaksi }}
          </span>
          <span class="mt-0.5 block truncate text-xs text-base-content/65">
            {{ formatDateId(expense.tanggal) }} · {{ expense.keterangan }}
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-sm font-semibold tabular">{{ formatRupiah(expense.nominal) }}</span>
          <StatusChip :status="expense.status" />
        </span>
      </RouterLink>
    </section>
  </div>
</template>
