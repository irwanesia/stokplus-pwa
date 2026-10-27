<script setup lang="ts">
import {
  ChevronRight,
  CircleAlert,
  Package,
  Ruler,
  Tags,
  Truck,
  Users,
  WalletCards,
} from '@lucide/vue'
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useMasterStore } from '@/stores/master'

const master = useMasterStore()

const activeProductCount = computed(
  () => master.products.filter((product) => product.status === 'active').length,
)
const activeSupplierCount = computed(
  () => master.suppliers.filter((supplier) => supplier.status === 'active').length,
)
const activeCustomerCount = computed(
  () => master.customers.filter((customer) => customer.status === 'active').length,
)
const activeExpenseCategoryCount = computed(
  () => master.expenseCategories.filter((category) => category.status === 'active').length,
)

const links = computed(() => [
  {
    to: '/master/produk',
    title: 'Produk',
    description: 'Multi-satuan, expiry, stok awal, dan minimum stok.',
    count: master.counts.products,
    active: activeProductCount.value,
    icon: Package,
  },
  {
    to: '/master/kategori',
    title: 'Kategori produk',
    description: 'Pengelompokan produk dan prefix kode otomatis.',
    count: master.counts.categories,
    active: master.categories.filter((category) => category.status === 'active').length,
    icon: Tags,
  },
  {
    to: '/master/satuan',
    title: 'Satuan global',
    description: 'Gram, kg, pcs, pack, dus, ml, liter, dan lainnya.',
    count: master.counts.units,
    active: master.activeUnits.length,
    icon: Ruler,
  },
  {
    to: '/master/supplier',
    title: 'Supplier',
    description: 'Daftar pemasok untuk pembelian.',
    count: master.counts.suppliers,
    active: activeSupplierCount.value,
    icon: Truck,
  },
  {
    to: '/master/pelanggan',
    title: 'Pelanggan',
    description: 'Pelanggan penjualan; boleh kosong untuk walk-in.',
    count: master.counts.customers,
    active: activeCustomerCount.value,
    icon: Users,
  },
  {
    to: '/master/kategori-beban',
    title: 'Kategori beban',
    description: 'Listrik, sewa, freezer, operasional, dan lainnya.',
    count: master.counts.expenseCategories,
    active: activeExpenseCategoryCount.value,
    icon: WalletCards,
  },
])

onMounted(async () => {
  try {
    await master.load()
  } catch {
    // Error is exposed by the store and rendered below.
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Master data"
      subtitle="Data referensi untuk pembelian, penjualan, stok, expiry, dan beban."
      back-to="/lainnya"
    />

    <div
      v-if="master.loading && !master.loaded"
      class="grid gap-3"
      aria-busy="true"
      aria-label="Memuat master data"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-20 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>

    <AppCard v-else-if="master.error" title="Master data gagal dimuat">
      <p class="text-sm leading-6 text-error">{{ master.error }}</p>
    </AppCard>

    <template v-else>
      <div
        v-if="master.counts.categories === 0 || master.counts.units === 0"
        class="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4"
      >
        <CircleAlert class="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
        <div class="min-w-0 text-sm leading-6 text-base-content/70">
          <p class="font-semibold text-base-content">Siapkan fondasi dulu</p>
          <p class="mt-1">
            Buat minimal satu
            <RouterLink
              to="/master/kategori"
              class="font-semibold text-brand-copper underline underline-offset-2"
            >
              kategori produk
            </RouterLink>
            dan satu
            <RouterLink
              to="/master/satuan"
              class="font-semibold text-brand-copper underline underline-offset-2"
            >
              satuan global
            </RouterLink>
            sebelum menambah produk.
          </p>
        </div>
      </div>

      <AppCard tone="muted">
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-2xl font-semibold tabular text-brand-navy">
              {{ master.counts.products }}
            </p>
            <p class="mt-0.5 text-[11px] text-base-content/65">Produk</p>
          </div>
          <div class="border-x border-brand-border">
            <p class="text-2xl font-semibold tabular text-brand-navy">{{ master.counts.units }}</p>
            <p class="mt-0.5 text-[11px] text-base-content/65">Satuan</p>
          </div>
          <div>
            <p class="text-2xl font-semibold tabular text-brand-navy">
              {{ master.counts.suppliers + master.counts.customers }}
            </p>
            <p class="mt-0.5 text-[11px] text-base-content/65">Mitra</p>
          </div>
        </div>
      </AppCard>

      <div class="space-y-3">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
        >
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-copper/10 text-brand-copper"
            aria-hidden="true"
          >
            <component :is="link.icon" class="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold">{{ link.title }}</span>
              <span class="badge badge-sm rounded-full border-brand-border bg-base-200 tabular">
                {{ link.count }}
              </span>
            </span>
            <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
              {{ link.description }}
            </span>
            <span class="mt-1 block text-[11px] text-base-content/65">
              {{ link.active }} aktif
            </span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
        </RouterLink>
      </div>

      <p class="px-1 text-xs leading-5 text-base-content/65">
        Hapus hanya menghapus data yang belum dipakai. Data yang sudah dipakai transaksi tetap
        tersimpan dan dinonaktifkan.
      </p>
    </template>
  </div>
</template>
