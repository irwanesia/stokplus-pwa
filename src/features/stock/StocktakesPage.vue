<script setup lang="ts">
import { AlertTriangle, Plus, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import {
  deleteStocktakeDraft,
  getStockOverview,
  getStocktake,
  listStocktakes,
  saveStocktake,
} from '@/inventory/repository'
import type {
  StockProductRow,
  StocktakeDetail,
  StocktakeDraft,
  StocktakeListRow,
} from '@/inventory/types'
import { useUiStore } from '@/stores/ui'
import { formatDateId, todayJakarta } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const rows = ref<StocktakeListRow[]>([])
const products = ref<StockProductRow[]>([])
const detail = ref<StocktakeDetail | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const confirmOpen = ref(false)
const tanggal = ref(todayJakarta())
const keterangan = ref('')
const items = ref<StocktakeDraft['items']>([])

const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const mode = computed(() =>
  route.name === 'stocktake-create'
    ? 'create'
    : route.name === 'stocktake-edit'
      ? 'edit'
      : route.name === 'stocktake-detail'
        ? 'detail'
        : 'list',
)
const itemViews = computed(() =>
  items.value.map((item) => ({
    ...item,
    source: item,
    product: products.value.find((row) => row.product.id === item.product_id),
  })),
)

function addItem() {
  const row = products.value.find(
    (product) => !items.value.some((item) => item.product_id === product.product.id),
  )
  if (row) {
    items.value.push({
      product_id: row.product.id,
      physical_qty_base: row.lotStock,
      expiry_date: '',
    })
  }
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function updateSelectedProduct(index: number) {
  const row = products.value.find(
    (product) => product.product.id === items.value[index]?.product_id,
  )
  if (row && items.value[index]) items.value[index].physical_qty_base = row.lotStock
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [nextRows, nextProducts] = await Promise.all([listStocktakes(), getStockOverview()])
    rows.value = nextRows
    products.value = nextProducts
    if (mode.value === 'detail' || mode.value === 'edit') {
      detail.value = await getStocktake(id.value)
      if (!detail.value) throw new Error('Sesi opname tidak ditemukan.')
      if (mode.value === 'edit') {
        if (detail.value.status !== 'draft') {
          await router.replace(`/stok/opname/${id.value}`)
          return
        }
        tanggal.value = detail.value.tanggal
        keterangan.value = detail.value.keterangan
        items.value = detail.value.items.map((item) => ({
          product_id: item.product_id,
          physical_qty_base: item.physical_qty_base,
          expiry_date: item.expiry_date,
        }))
      }
    } else if (mode.value === 'create') {
      addItem()
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Data opname gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function save(complete: boolean) {
  saving.value = true
  error.value = ''
  try {
    const result = await saveStocktake(
      { tanggal: tanggal.value, keterangan: keterangan.value, items: items.value },
      { id: mode.value === 'edit' ? id.value : undefined, complete },
    )
    ui.notify(
      complete ? 'Opname selesai dan stok disesuaikan.' : 'Draft opname disimpan.',
      'success',
    )
    await router.push(`/stok/opname/${result.id}`)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Opname gagal disimpan.'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!detail.value) return
  saving.value = true
  error.value = ''
  try {
    await deleteStocktakeDraft(detail.value.id)
    ui.notify('Draft opname dihapus.', 'success')
    await router.push('/stok/opname')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Draft opname gagal dihapus.'
  } finally {
    saving.value = false
  }
}

watch(() => route.fullPath, load, { immediate: true })
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :title="
        mode === 'create'
          ? 'Buat sesi opname'
          : mode === 'edit'
            ? 'Ubah draft opname'
            : mode === 'detail'
              ? 'Detail opname'
              : 'Stok opname'
      "
      :subtitle="detail?.nomor ?? 'Bandingkan stok sistem dengan stok fisik per produk.'"
      back-to="/stok"
    />
    <p v-if="error" class="rounded-2xl bg-error/10 p-4 text-sm text-error" role="alert">
      {{ error }}
    </p>
    <div
      v-if="loading"
      class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      aria-busy="true"
    />

    <template v-else-if="mode === 'list'">
      <RouterLink
        to="/stok/opname/baru"
        class="btn btn-primary min-h-11 w-full rounded-[var(--radius-control)] normal-case"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />Buat sesi opname
      </RouterLink>
      <AppCard v-if="!rows.length">
        <p class="text-sm text-base-content/65">
          Belum ada sesi opname. Draft belum mengubah saldo stok.
        </p>
      </AppCard>
      <RouterLink
        v-for="row in rows"
        :key="row.id"
        :to="`/stok/opname/${row.id}`"
        class="surface-card block p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ row.nomor }}</p>
            <p class="mt-1 text-xs text-base-content/65">
              {{ formatDateId(row.tanggal) }} · {{ row.itemCount }} produk
            </p>
          </div>
          <StatusChip :status="row.status" />
        </div>
        <p class="mt-3 text-right text-xs tabular text-base-content/65">
          Selisih qty base: {{ row.totalDifference }}
        </p>
      </RouterLink>
    </template>

    <template v-else-if="mode === 'create' || mode === 'edit'">
      <div
        class="flex items-start gap-2 rounded-2xl bg-status-warning/10 p-4 text-xs leading-5 text-base-content/65"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
        Draft belum mengubah stok. Finalisasi membaca ulang saldo lot; produk dengan selisih
        rekonsiliasi harus diperiksa dahulu.
      </div>
      <AppCard title="Informasi sesi">
        <label class="form-control">
          <span class="label-text mb-1.5 text-xs font-medium">Tanggal</span>
          <input
            v-model="tanggal"
            type="date"
            class="input input-bordered min-h-11 rounded-[var(--radius-control)]"
          />
        </label>
        <label class="form-control mt-3">
          <span class="label-text mb-1.5 text-xs font-medium">Catatan</span>
          <textarea
            v-model="keterangan"
            rows="2"
            class="textarea textarea-bordered rounded-[var(--radius-control)]"
          />
        </label>
      </AppCard>
      <AppCard title="Hitung fisik" subtitle="Masukkan jumlah aktual dalam satuan base.">
        <div
          v-for="(item, index) in itemViews"
          :key="item.product_id"
          class="mb-3 rounded-xl border border-brand-border p-3 last:mb-0"
        >
          <div class="flex items-start gap-2">
            <label class="form-control min-w-0 flex-1">
              <span class="label-text mb-1.5 text-xs font-medium">Produk</span>
              <select
                v-model="item.source.product_id"
                class="select select-bordered min-h-11 rounded-[var(--radius-control)]"
                @change="updateSelectedProduct(index)"
              >
                <option
                  v-for="row in products.filter(
                    (product) =>
                      product.product.id === item.product_id ||
                      !items.some(
                        (other, otherIndex) =>
                          otherIndex !== index && other.product_id === product.product.id,
                      ),
                  )"
                  :key="row.product.id"
                  :value="row.product.id"
                >
                  {{ row.product.nama }} · stok {{ row.lotStock }} {{ row.baseUnitSymbol }}
                </option>
              </select>
              <span class="mt-1 text-[11px] text-base-content/65">
                Sistem {{ item.product?.lotStock ?? 0 }} {{ item.product?.baseUnitSymbol }}
                <span v-if="item.product?.stockDifference">
                  · selisih rekonsiliasi {{ item.product.stockDifference }}</span
                >
              </span>
            </label>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-error"
              :aria-label="`Hapus ${item.product?.product.nama ?? 'produk'}`"
              @click="removeItem(index)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <label class="form-control mt-2">
            <span class="label-text mb-1.5 text-xs font-medium"
              >Stok fisik ({{ item.product?.baseUnitSymbol }})</span
            >
            <input
              v-model.number="item.source.physical_qty_base"
              type="number"
              min="0"
              step="1"
              class="input input-bordered min-h-11 rounded-[var(--radius-control)]"
            />
          </label>
          <p
            class="mt-2 text-xs"
            :class="
              Number(item.physical_qty_base) < (item.product?.lotStock ?? 0)
                ? 'text-error'
                : 'text-base-content/65'
            "
          >
            Selisih: {{ Number(item.physical_qty_base) - (item.product?.lotStock ?? 0) }}
            {{ item.product?.baseUnitSymbol }}
          </p>
          <label
            v-if="
              item.product?.product.track_expiry &&
              Number(item.physical_qty_base) > (item.product?.lotStock ?? 0)
            "
            class="form-control mt-2"
          >
            <span class="label-text mb-1.5 text-xs font-medium">Expiry lot surplus (opsional)</span>
            <input
              v-model="item.source.expiry_date"
              type="date"
              class="input input-bordered min-h-11 rounded-[var(--radius-control)]"
            />
            <span class="mt-1 text-[11px] text-base-content/65"
              >Jika tidak diketahui, lot tambahan akan dikarantina dan tidak dapat dijual.</span
            >
          </label>
        </div>
        <button
          type="button"
          class="btn btn-secondary btn-sm mt-3 min-h-10 w-full rounded-[var(--radius-control)] normal-case"
          :disabled="products.length <= items.length"
          @click="addItem"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />Tambah produk
        </button>
      </AppCard>
      <div class="grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :loading="saving" @click="save(false)"
          >Simpan draft</AppButton
        >
        <AppButton :loading="saving" @click="save(true)">Finalisasi</AppButton>
      </div>
    </template>

    <template v-else-if="mode === 'detail' && detail">
      <AppCard
        :title="detail.nomor"
        :subtitle="`${formatDateId(detail.tanggal)} · ${detail.items.length} produk`"
      >
        <StatusChip :status="detail.status" />
        <p v-if="detail.keterangan" class="mt-3 text-sm">{{ detail.keterangan }}</p>
        <div class="mt-4 space-y-3">
          <div
            v-for="item in detail.items"
            :key="item.id"
            class="border-b border-brand-border/60 pb-3 last:border-0 last:pb-0"
          >
            <p class="text-sm font-semibold">{{ item.productName }}</p>
            <div class="mt-1 flex justify-between gap-2 text-xs text-base-content/65">
              <span
                >Sistem {{ item.system_qty_base }} · Fisik {{ item.physical_qty_base }}
                {{ item.baseUnitSymbol }}</span
              >
              <span :class="item.diff_base < 0 ? 'text-error' : 'text-status-completed'">
                {{ item.diff_base > 0 ? '+' : '' }}{{ item.diff_base }}
              </span>
            </div>
            <p class="mt-1 text-xs font-semibold tabular">
              {{
                item.diff_base < 0
                  ? 'Kerugian'
                  : item.diff_base > 0
                    ? 'Pengurang kerugian'
                    : 'Nilai selisih'
              }}:
              {{ formatRupiah(Math.abs(item.diff_cost)) }}
            </p>
            <p
              v-if="
                item.diff_base > 0 &&
                item.productName &&
                detail.status === 'completed' &&
                item.expiry_date === ''
              "
              class="mt-1 text-[11px] text-status-warning"
            >
              Surplus tanpa expiry dibuat sebagai lot karantina.
            </p>
          </div>
        </div>
      </AppCard>
      <RouterLink
        v-if="detail.status === 'draft'"
        :to="`/stok/opname/${detail.id}/ubah`"
        class="btn btn-secondary min-h-11 w-full rounded-[var(--radius-control)] normal-case"
      >
        Ubah draft
      </RouterLink>
      <AppButton
        v-if="detail.status === 'draft'"
        variant="danger"
        block
        @click="confirmOpen = true"
      >
        Hapus draft
      </AppButton>
    </template>

    <AppBottomSheet
      v-model="confirmOpen"
      title="Hapus draft opname?"
      description="Draft akan dihapus. Tidak ada saldo stok yang berubah."
    >
      <div class="flex gap-3">
        <AppButton variant="ghost" block @click="confirmOpen = false">Kembali</AppButton>
        <AppButton variant="danger" block :loading="saving" @click="confirmDelete"
          >Hapus draft</AppButton
        >
      </div>
    </AppBottomSheet>
  </div>
</template>
