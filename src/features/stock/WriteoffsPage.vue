<script setup lang="ts">
import { AlertTriangle, Plus, Trash2, WalletCards } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import {
  cancelWriteoff,
  deleteWriteoffDraft,
  getStockOverview,
  getWriteoff,
  listWriteoffs,
  saveWriteoff,
} from '@/inventory/repository'
import type {
  StockProductRow,
  WriteoffDetail,
  WriteoffDraft,
  WriteoffListRow,
} from '@/inventory/types'
import { useUiStore } from '@/stores/ui'
import { todayJakarta, formatDateId } from '@/utils/date'
import { formatRupiah } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const rows = ref<WriteoffListRow[]>([])
const stock = ref<StockProductRow[]>([])
const detail = ref<WriteoffDetail | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const confirmOpen = ref(false)
const tanggal = ref(todayJakarta())
const alasan = ref<WriteoffDraft['alasan']>('expired')
const keterangan = ref('')
const items = ref<WriteoffDraft['items']>([])

const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const mode = computed(() =>
  route.name === 'stock-writeoff-create'
    ? 'create'
    : route.name === 'stock-writeoff-edit'
      ? 'edit'
      : route.name === 'stock-writeoff-detail'
        ? 'detail'
        : 'list',
)
const availableLots = computed(() =>
  stock.value.flatMap((row) => row.lots).filter((lot) => lot.qty_remaining_base > 0),
)
const allItems = computed(() =>
  items.value.map((item) => ({
    ...item,
    lot: availableLots.value.find((lot) => lot.id === item.lot_id),
  })),
)
const estimatedCost = computed(() =>
  allItems.value.reduce(
    (sum, item) =>
      sum + (item.lot ? Math.round(Number(item.qty_base) * item.lot.unit_cost_base) : 0),
    0,
  ),
)
const reasonLabels: Record<WriteoffDraft['alasan'], string> = {
  expired: 'Kedaluwarsa',
  damaged: 'Rusak',
  other: 'Lainnya',
}

function addItem(lotId = '') {
  const unused = availableLots.value.find(
    (lot) => !items.value.some((item) => item.lot_id === lot.id),
  )
  const selected = availableLots.value.find((lot) => lot.id === lotId) ?? unused
  if (selected) items.value.push({ lot_id: selected.id, qty_base: 1, keterangan: '' })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [nextRows, nextStock] = await Promise.all([listWriteoffs(), getStockOverview()])
    rows.value = nextRows
    stock.value = nextStock
    if (mode.value === 'detail' || mode.value === 'edit') {
      detail.value = await getWriteoff(id.value)
      if (!detail.value) throw new Error('Write-off tidak ditemukan.')
      if (mode.value === 'edit') {
        if (detail.value.status !== 'draft') {
          await router.replace(`/stok/writeoff/${id.value}`)
          return
        }
        tanggal.value = detail.value.tanggal
        alasan.value = detail.value.alasan
        keterangan.value = detail.value.keterangan
        items.value = detail.value.items.map((item) => ({
          lot_id: item.lot_id,
          qty_base: item.qty_base,
          keterangan: item.keterangan,
        }))
      }
    } else if (mode.value === 'create') {
      const lotId = typeof route.query.lot_id === 'string' ? route.query.lot_id : ''
      if (lotId) addItem(lotId)
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Data write-off gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function save(complete: boolean) {
  saving.value = true
  error.value = ''
  try {
    const result = await saveWriteoff(
      {
        tanggal: tanggal.value,
        alasan: alasan.value,
        keterangan: keterangan.value,
        items: items.value,
      },
      { id: mode.value === 'edit' ? id.value : undefined, complete },
    )
    ui.notify(complete ? 'Write-off selesai dicatat.' : 'Draft write-off disimpan.', 'success')
    await router.push(`/stok/writeoff/${result.id}`)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Write-off gagal disimpan.'
  } finally {
    saving.value = false
  }
}

async function confirmAction() {
  if (!detail.value) return
  saving.value = true
  error.value = ''
  try {
    if (detail.value.status === 'draft') {
      await deleteWriteoffDraft(detail.value.id)
      ui.notify('Draft write-off dihapus.', 'success')
      await router.push('/stok/writeoff')
    } else {
      await cancelWriteoff(detail.value.id)
      confirmOpen.value = false
      ui.notify('Write-off dibatalkan dan lot dipulihkan.', 'success')
      await load()
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Aksi write-off gagal.'
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
          ? 'Buat write-off'
          : mode === 'edit'
            ? 'Ubah draft write-off'
            : mode === 'detail'
              ? 'Detail write-off'
              : 'Write-off'
      "
      :subtitle="detail?.nomor ?? 'Catat stok expired, rusak, atau tidak layak jual.'"
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
        to="/stok/writeoff/baru"
        class="btn btn-primary min-h-11 w-full rounded-[var(--radius-control)] normal-case"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />Buat write-off
      </RouterLink>
      <AppCard v-if="!rows.length">
        <p class="text-sm text-base-content/65">Belum ada write-off. Draft tidak mengubah stok.</p>
      </AppCard>
      <RouterLink
        v-for="row in rows"
        :key="row.id"
        :to="`/stok/writeoff/${row.id}`"
        class="surface-card block p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ row.nomor }}</p>
            <p class="mt-1 text-xs text-base-content/65">
              {{ formatDateId(row.tanggal) }} · {{ reasonLabels[row.alasan] }} ·
              {{ row.itemCount }} lot
            </p>
          </div>
          <StatusChip :status="row.status" />
        </div>
        <p class="mt-3 text-right text-sm font-bold tabular">{{ formatRupiah(row.total_cost) }}</p>
      </RouterLink>
    </template>

    <template v-else-if="mode === 'create' || mode === 'edit'">
      <div
        class="flex items-start gap-2 rounded-2xl bg-status-warning/10 p-4 text-xs leading-5 text-base-content/65"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
        Draft tidak mengubah stok. Penyelesaian mengurangi lot yang dipilih dan memasukkan nilai HPP
        ke kerugian persediaan.
      </div>
      <AppCard title="Informasi write-off">
        <div class="grid grid-cols-2 gap-3">
          <label class="form-control">
            <span class="label-text mb-1.5 text-xs font-medium">Tanggal</span>
            <input
              v-model="tanggal"
              type="date"
              class="input input-bordered min-h-11 rounded-[var(--radius-control)]"
            />
          </label>
          <label class="form-control">
            <span class="label-text mb-1.5 text-xs font-medium">Alasan</span>
            <select
              v-model="alasan"
              class="select select-bordered min-h-11 rounded-[var(--radius-control)]"
            >
              <option value="expired">Kedaluwarsa</option>
              <option value="damaged">Rusak</option>
              <option value="other">Lainnya</option>
            </select>
          </label>
        </div>
        <label class="form-control mt-3">
          <span class="label-text mb-1.5 text-xs font-medium">Keterangan (opsional)</span>
          <textarea
            v-model="keterangan"
            rows="2"
            class="textarea textarea-bordered rounded-[var(--radius-control)]"
          />
        </label>
      </AppCard>
      <AppCard
        title="Lot yang dihapus"
        subtitle="Qty dalam satuan base; setiap lot tidak boleh melebihi stok tersisa."
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="mb-3 rounded-xl border border-brand-border p-3 last:mb-0"
        >
          <label class="form-control">
            <span class="label-text mb-1.5 text-xs font-medium">Produk · lot</span>
            <select
              v-model="item.lot_id"
              class="select select-bordered min-h-11 rounded-[var(--radius-control)]"
            >
              <option value="" disabled>Pilih lot tersedia</option>
              <option
                v-for="lot in availableLots.filter(
                  (row) =>
                    row.id === item.lot_id ||
                    !items.some(
                      (other, otherIndex) => otherIndex !== index && other.lot_id === row.id,
                    ),
                )"
                :key="lot.id"
                :value="lot.id"
              >
                {{ lot.productName }} · {{ lot.lot_code }} · sisa {{ lot.qty_remaining_base }}
                {{ lot.baseUnitSymbol }} · {{ formatRupiah(lot.unit_cost_base) }}/base
              </option>
            </select>
          </label>
          <div class="mt-2 flex items-end gap-2">
            <label class="form-control min-w-0 flex-1">
              <span class="label-text mb-1.5 text-xs font-medium">Qty base</span>
              <input
                v-model.number="item.qty_base"
                type="number"
                min="1"
                step="1"
                class="input input-bordered min-h-11 rounded-[var(--radius-control)]"
              />
            </label>
            <button
              type="button"
              class="btn btn-ghost min-h-11 text-error"
              aria-label="Hapus lot"
              @click="removeItem(index)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-secondary btn-sm mt-3 min-h-10 w-full rounded-[var(--radius-control)] normal-case"
          :disabled="availableLots.length <= items.length"
          @click="addItem()"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />Tambah lot
        </button>
        <div class="mt-4 flex justify-between border-t border-brand-border pt-3 text-sm">
          <span class="font-semibold">Estimasi kerugian</span>
          <span class="font-bold tabular">{{ formatRupiah(estimatedCost) }}</span>
        </div>
      </AppCard>
      <div class="grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :loading="saving" @click="save(false)"
          >Simpan draft</AppButton
        >
        <AppButton :loading="saving" @click="save(true)">Selesaikan</AppButton>
      </div>
    </template>

    <template v-else-if="mode === 'detail' && detail">
      <AppCard
        :title="detail.nomor"
        :subtitle="`${formatDateId(detail.tanggal)} · ${reasonLabels[detail.alasan]}`"
      >
        <StatusChip :status="detail.status" />
        <p v-if="detail.keterangan" class="mt-3 text-sm">{{ detail.keterangan }}</p>
        <div class="mt-4 space-y-3">
          <div
            v-for="item in detail.items"
            :key="item.id"
            class="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3 last:border-0"
          >
            <div>
              <p class="text-sm font-semibold">{{ item.productName }}</p>
              <p class="mt-0.5 text-xs text-base-content/65">
                {{ item.lotCode }} · {{ item.qty_base }} {{ item.baseUnitSymbol }} ×
                {{ formatRupiah(item.unit_cost_base) }}
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold tabular">
              {{ formatRupiah(item.total_cost) }}
            </p>
          </div>
        </div>
        <div class="mt-3 flex justify-between border-t border-brand-border pt-3">
          <span class="font-semibold">Total kerugian</span
          ><span class="font-bold tabular">{{ formatRupiah(detail.total_cost) }}</span>
        </div>
      </AppCard>
      <RouterLink
        v-if="detail.status === 'draft'"
        :to="`/stok/writeoff/${detail.id}/ubah`"
        class="btn btn-secondary min-h-11 w-full rounded-[var(--radius-control)] normal-case"
        >Ubah draft</RouterLink
      >
      <AppButton
        v-if="detail.status !== 'cancelled'"
        variant="danger"
        block
        @click="confirmOpen = true"
      >
        <WalletCards class="h-4 w-4" aria-hidden="true" />{{
          detail.status === 'draft' ? 'Hapus draft' : 'Batalkan write-off'
        }}
      </AppButton>
    </template>

    <AppBottomSheet
      v-model="confirmOpen"
      :title="detail?.status === 'draft' ? 'Hapus draft write-off?' : 'Batalkan write-off?'"
      description="Pembatalan write-off memulihkan qty ke lot dan membuat movement pembalik."
    >
      <div class="flex gap-3">
        <AppButton variant="ghost" block @click="confirmOpen = false">Kembali</AppButton>
        <AppButton variant="danger" block :loading="saving" @click="confirmAction">
          {{ detail?.status === 'draft' ? 'Hapus draft' : 'Batalkan' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
