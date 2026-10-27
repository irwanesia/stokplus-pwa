<script setup lang="ts">
import { CalendarClock, Package, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import ConfirmActionSheet from '@/components/master/ConfirmActionSheet.vue'
import MasterToolbar from '@/components/master/MasterToolbar.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Product } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useUiStore } from '@/stores/ui'
import { formatQty } from '@/utils/format'

type StatusFilter = 'all' | 'active' | 'inactive'

const master = useMasterStore()
const ui = useUiStore()
const router = useRouter()

const search = ref('')
const status = ref<StatusFilter>('all')
const deleteOpen = ref(false)
const deleteTarget = ref<Product | null>(null)
const deleting = ref(false)

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')

  return master.products.filter((product) => {
    if (status.value !== 'all' && product.status !== status.value) return false
    if (!term) return true
    const category = master.categoryName(product.kategori_id)
    return [product.kode, product.nama, category].some((value) =>
      value.toLocaleLowerCase('id').includes(term),
    )
  })
})

onMounted(async () => {
  try {
    await master.load()
  } catch {
    // Rendered by the store error state.
  }
})

function unitsCount(productId: string): number {
  return master.productUnits.filter((row) => row.product_id === productId).length
}

function openCreate() {
  void router.push('/master/produk/baru')
}

function askDelete(product: Product) {
  deleteTarget.value = product
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  deleting.value = true

  try {
    const mode = await master.removeProductAction(target.id)
    deleteOpen.value = false
    ui.notify(
      mode === 'deleted'
        ? 'Produk dihapus.'
        : 'Produk masih memiliki stok, lot, atau transaksi dan sudah dinonaktifkan.',
      mode === 'deleted' ? 'success' : 'warning',
      5000,
    )
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Produk gagal dihapus.', 'error', 5000)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Produk"
      subtitle="Multi-satuan, expiry, stok awal, dan minimum stok."
      back-to="/master"
    />

    <MasterToolbar
      v-model="search"
      v-model:status="status"
      :total="master.products.length"
      :filtered="filtered.length"
      add-label="Tambah"
      placeholder="Cari kode, nama, atau kategori"
      @add="openCreate"
    />

    <div
      v-if="master.loaded && (master.categories.length === 0 || master.units.length === 0)"
      class="rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm leading-6 text-base-content/70"
    >
      <p class="font-semibold text-base-content">Lengkapi kategori dan satuan dulu.</p>
      <p class="mt-1">
        <RouterLink
          to="/master/kategori"
          class="font-semibold text-brand-copper underline underline-offset-2"
        >
          Kategori produk
        </RouterLink>
        dan
        <RouterLink
          to="/master/satuan"
          class="font-semibold text-brand-copper underline underline-offset-2"
        >
          satuan global
        </RouterLink>
        wajib tersedia sebelum membuat produk.
      </p>
    </div>

    <div v-if="master.loading && !master.loaded" class="space-y-3" aria-busy="true">
      <div
        v-for="index in 3"
        :key="index"
        class="h-28 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>

    <p v-else-if="master.error" class="rounded-2xl bg-error/10 p-4 text-sm text-error">
      {{ master.error }}
    </p>

    <EmptyState
      v-else-if="filtered.length === 0"
      title="Belum ada produk"
      description="Buat produk dengan base unit terkecil, lalu tambahkan satuan pack, dus, atau kg."
    >
      <template #icon>
        <Package class="h-8 w-8" aria-hidden="true" />
      </template>
      <template #action>
        <AppButton @click="openCreate">
          <Plus class="h-4 w-4" aria-hidden="true" />
          Tambah produk
        </AppButton>
      </template>
    </EmptyState>

    <div v-else class="space-y-3">
      <article v-for="product in filtered" :key="product.id" class="surface-card p-4">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="badge badge-sm rounded-full border-brand-navy/15 bg-brand-navy/10 font-semibold text-brand-navy"
              >
                {{ product.kode }}
              </span>
              <span
                class="badge badge-sm rounded-full border"
                :class="
                  product.status === 'active'
                    ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
                    : 'border-brand-border bg-base-200 text-base-content/65'
                "
              >
                {{ product.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
              <span
                v-if="product.track_expiry"
                class="badge badge-sm gap-1 rounded-full border-brand-copper/20 bg-brand-copper/10 text-brand-copper"
              >
                <CalendarClock class="h-3 w-3" aria-hidden="true" />
                Expiry {{ product.expiry_alert_days ?? 30 }} hari
              </span>
            </div>

            <h2 class="mt-1.5 text-base font-semibold">{{ product.nama }}</h2>
            <p class="mt-0.5 text-xs text-base-content/65">
              {{ master.categoryName(product.kategori_id) }} · {{ unitsCount(product.id) }} satuan
            </p>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <div class="rounded-xl bg-base-200/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-base-content/65">Stok</p>
                <p class="mt-0.5 text-sm font-semibold tabular">
                  {{ formatQty(product.stock_base, master.unitSymbol(product.base_unit_id)) }}
                </p>
              </div>
              <div class="rounded-xl bg-base-200/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-base-content/65">Minimum</p>
                <p class="mt-0.5 text-sm font-semibold tabular">
                  {{ formatQty(product.min_stock_base, master.unitSymbol(product.base_unit_id)) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-1">
            <RouterLink
              :to="`/master/produk/${product.id}`"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0"
              :aria-label="`Edit produk ${product.nama}`"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
              :aria-label="`Hapus produk ${product.nama}`"
              @click="askDelete(product)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <ConfirmActionSheet
      v-model="deleteOpen"
      :title="`Hapus produk ${deleteTarget?.nama ?? ''}?`"
      description="Produk yang sudah memiliki stok, lot, atau transaksi tidak dihapus, tetapi dinonaktifkan. Base unit dan konversi tetap terkunci."
      confirm-label="Hapus / nonaktifkan"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
