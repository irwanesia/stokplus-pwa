<script setup lang="ts">
import { AlertTriangle, CheckCircle2, PackageCheck, Pencil, ReceiptText, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import type { SaleDetail } from '@/sales/types'
import { getSaleDetail } from '@/sales/repository'
import { useMasterStore } from '@/stores/master'
import { useSaleStore } from '@/stores/sales'
import { useUiStore } from '@/stores/ui'
import { todayJakarta, formatDateId } from '@/utils/date'
import { formatNumberId, formatQty, formatRupiah } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const master = useMasterStore()
const sales = useSaleStore()
const ui = useUiStore()
const loading = ref(true)
const loadError = ref('')
const detail = ref<SaleDetail | null>(null)
const actionError = ref('')
const working = ref(false)
const confirmOpen = ref(false)
const confirmMode = ref<'cancel' | 'delete'>('cancel')
const sale = computed(() => detail.value?.sale ?? null)
const items = computed(() => detail.value?.items ?? [])
const paymentLabel = computed(
  () =>
    ({ tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', kredit: 'Kredit' })[
      sale.value?.metode_pembayaran ?? 'tunai'
    ],
)

function customerName(id: string | null): string {
  if (!id) return 'Umum / walk-in'
  return master.customers.find((customer) => customer.id === id)?.nama ?? 'Pelanggan'
}

function productName(id: string): string {
  return master.products.find((product) => product.id === id)?.nama ?? 'Produk'
}

function productCode(id: string): string {
  return master.products.find((product) => product.id === id)?.kode ?? ''
}

function unitSymbol(id: string): string {
  return master.unitSymbol(id)
}

function baseSymbol(productId: string): string {
  const product = master.products.find((row) => row.id === productId)
  return product ? master.unitSymbol(product.base_unit_id) : 'base'
}

function lotFor(lotId: string) {
  return detail.value?.lots.find((lot) => lot.id === lotId)
}

function consumptionsFor(itemId: string) {
  return detail.value?.consumptions.filter((row) => row.sale_item_id === itemId) ?? []
}

function formatHpp(value: number): string {
  return `Rp ${formatNumberId(value, 4)}`
}

const change = computed(() =>
  sale.value?.metode_pembayaran === 'tunai' ? Math.max(0, sale.value.bayar - sale.value.total) : 0,
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const id = typeof route.params.id === 'string' ? route.params.id : ''
    const [nextDetail] = await Promise.all([getSaleDetail(id), master.load()])
    if (!nextDetail) {
      loadError.value = 'Penjualan tidak ditemukan.'
      return
    }
    detail.value = nextDetail
  } catch (caught) {
    loadError.value = caught instanceof Error ? caught.message : 'Detail penjualan gagal dimuat.'
  } finally {
    loading.value = false
  }
}

function openConfirm(mode: 'cancel' | 'delete') {
  confirmMode.value = mode
  actionError.value = ''
  confirmOpen.value = true
}

async function confirmAction() {
  if (!sale.value) return
  actionError.value = ''
  working.value = true
  try {
    if (confirmMode.value === 'cancel') {
      await sales.cancelAction(sale.value.id)
      confirmOpen.value = false
      ui.notify('Penjualan dibatalkan dan stok lot dikembalikan.', 'success', 5000)
      await load()
    } else {
      await sales.deleteDraftAction(sale.value.id)
      ui.notify('Draft penjualan dihapus.', 'success')
      await router.push('/transaksi/penjualan')
    }
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Aksi penjualan gagal dijalankan.'
  } finally {
    working.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Detail penjualan"
      :subtitle="sale?.nomor_nota ?? 'Memuat nota penjualan.'"
      back-to="/transaksi/penjualan"
    />

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
      <div class="h-32 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>
    <AppCard v-else-if="loadError" title="Penjualan tidak dapat dibuka">
      <p class="text-sm leading-6 text-error">{{ loadError }}</p>
    </AppCard>

    <template v-else-if="sale">
      <section class="surface-card p-5" :class="sale.status === 'cancelled' ? 'opacity-80' : ''">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-semibold tracking-[0.16em] text-base-content/65 uppercase">
              {{ formatDateId(sale.tanggal) }}
            </p>
            <h2 class="mt-1 text-lg font-semibold tabular">{{ sale.nomor_nota }}</h2>
            <p class="mt-1 text-sm text-base-content/65">{{ customerName(sale.customer_id) }}</p>
          </div>
          <StatusChip :status="sale.status" size="md" />
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-base-200/70 p-3">
            <p class="text-[10px] tracking-wide text-base-content/65 uppercase">Total</p>
            <p class="mt-1 text-lg font-semibold tabular text-brand-navy">
              {{ formatRupiah(sale.total) }}
            </p>
          </div>
          <div class="rounded-2xl bg-base-200/70 p-3">
            <p class="text-[10px] tracking-wide text-base-content/65 uppercase">Dibayar</p>
            <p class="mt-1 text-lg font-semibold tabular">{{ formatRupiah(sale.bayar) }}</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
          <p class="text-base-content/65">
            Metode <span class="font-semibold text-base-content">{{ paymentLabel }}</span>
          </p>
          <p class="text-right text-base-content/65">{{ items.length }} barang</p>
        </div>
        <p
          v-if="sale.metode_pembayaran === 'tunai'"
          class="mt-2 text-right text-xs text-base-content/65"
        >
          Kembalian <strong class="tabular text-base-content">{{ formatRupiah(change) }}</strong>
        </p>
        <p
          v-if="sale.keterangan"
          class="mt-3 rounded-xl bg-base-200/60 p-3 text-xs leading-5 text-base-content/65"
        >
          {{ sale.keterangan }}
        </p>
        <div
          v-if="sale.status === 'draft'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-draft/20 bg-status-draft/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-draft" aria-hidden="true" />
          Draft belum mengubah stok. Selesaikan penjualan untuk mengalokasikan lot dan menghitung
          HPP.
        </div>
        <div
          v-else-if="sale.status === 'cancelled'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-cancelled/20 bg-status-cancelled/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-cancelled" aria-hidden="true" />
          Penjualan dibatalkan. Stok dikembalikan ke lot asal dan transaksi tidak dihitung sebagai
          COGS.
        </div>
        <div
          v-else
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-completed/20 bg-status-completed/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          Selesai. Lot yang terpakai dan HPP tersimpan untuk transaksi ini.
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="px-1 text-sm font-semibold">Barang & alokasi lot</h2>
        <article v-for="item in items" :key="item.id" class="surface-card p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-semibold tracking-wide text-brand-copper">
                {{ productCode(item.product_id) }}
              </p>
              <h3 class="mt-0.5 text-sm font-semibold">{{ productName(item.product_id) }}</h3>
              <p class="mt-0.5 text-xs text-base-content/65">
                {{ formatQty(item.qty_unit, unitSymbol(item.unit_id)) }}
                = {{ formatQty(item.qty_base, baseSymbol(item.product_id)) }}
              </p>
              <p class="mt-1 text-xs text-base-content/65">
                {{ formatRupiah(item.harga_jual_unit) }} / {{ unitSymbol(item.unit_id) }}
                <template v-if="item.diskon > 0">
                  · diskon {{ formatRupiah(item.diskon) }}</template
                >
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold tabular">{{ formatRupiah(item.subtotal) }}</p>
          </div>
          <div
            v-if="sale.status === 'completed' || sale.status === 'cancelled'"
            class="mt-3 rounded-xl bg-base-200/60 p-3 text-xs"
          >
            <div
              v-for="consumption in consumptionsFor(item.id)"
              :key="consumption.id"
              class="border-b border-brand-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">{{
                  lotFor(consumption.lot_id)?.lot_code ?? 'Lot tidak ditemukan'
                }}</span>
                <span class="font-semibold tabular">{{
                  formatQty(consumption.qty_base, baseSymbol(item.product_id))
                }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2 text-base-content/65">
                <span>
                  Expiry
                  {{
                    lotFor(consumption.lot_id)?.expiry_date
                      ? formatDateId(lotFor(consumption.lot_id)?.expiry_date ?? '')
                      : 'Tanpa expiry'
                  }}
                  <span
                    v-if="
                      lotFor(consumption.lot_id)?.expiry_date &&
                      (lotFor(consumption.lot_id)?.expiry_date ?? '') < todayJakarta()
                    "
                    class="text-status-expired"
                    >· Kedaluwarsa</span
                  >
                </span>
                <span>HPP {{ formatHpp(consumption.unit_cost_base) }} / base</span>
              </div>
              <div class="mt-1 flex justify-between font-semibold">
                <span>COGS lot</span>
                <span class="tabular">{{ formatHpp(consumption.total_cost) }}</span>
              </div>
            </div>
            <p v-if="consumptionsFor(item.id).length === 0" class="text-base-content/65">
              Tidak ada konsumsi lot tercatat.
            </p>
            <div class="mt-2 flex items-center justify-between border-t border-brand-border pt-2">
              <span>HPP item</span><strong class="tabular">{{ formatHpp(item.hpp_total) }}</strong>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span>Laba kotor item</span
              ><strong class="tabular">{{ formatHpp(item.gross_profit) }}</strong>
            </div>
          </div>
        </article>
      </section>

      <AppCard title="Ringkasan penjualan">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Subtotal</dt>
            <dd class="font-semibold tabular">{{ formatRupiah(sale.subtotal) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Diskon</dt>
            <dd class="font-semibold tabular">− {{ formatRupiah(sale.diskon) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-brand-border pt-2">
            <dt class="font-semibold">Total</dt>
            <dd class="font-semibold tabular">{{ formatRupiah(sale.total) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">HPP / COGS</dt>
            <dd class="font-semibold tabular">
              {{ sale.status === 'draft' ? 'Dihitung saat selesai' : formatHpp(sale.hpp_total) }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-brand-border pt-2">
            <dt class="font-semibold">Laba kotor</dt>
            <dd class="text-lg font-semibold tabular text-brand-navy">
              {{ sale.status === 'draft' ? '—' : formatHpp(sale.gross_profit) }}
            </dd>
          </div>
        </dl>
      </AppCard>

      <div v-if="sale.status === 'draft'" class="grid grid-cols-2 gap-3">
        <AppButton variant="danger" @click="openConfirm('delete')">
          <Trash2 class="h-4 w-4" aria-hidden="true" />
          Hapus draft
        </AppButton>
        <RouterLink
          :to="`/transaksi/penjualan/${sale.id}/ubah`"
          class="btn btn-primary min-h-11 rounded-[var(--radius-control)] font-semibold normal-case"
        >
          <Pencil class="h-4 w-4" aria-hidden="true" />
          Ubah draft
        </RouterLink>
      </div>
      <AppButton
        v-else-if="sale.status === 'completed'"
        variant="danger"
        block
        @click="openConfirm('cancel')"
      >
        <PackageCheck class="h-4 w-4" aria-hidden="true" />
        Batalkan penjualan
      </AppButton>
      <div class="flex items-center justify-center gap-2 text-xs text-base-content/65">
        <ReceiptText class="h-3.5 w-3.5" aria-hidden="true" />
        <span>Penjualan disimpan lokal di perangkat ini.</span>
      </div>
    </template>

    <AppBottomSheet
      v-model="confirmOpen"
      :title="confirmMode === 'cancel' ? 'Batalkan penjualan?' : 'Hapus draft?'"
      :description="
        confirmMode === 'cancel'
          ? 'Stok dikembalikan ke lot asal. Lot yang sudah expired tetap tidak bisa dijual.'
          : 'Draft dan barangnya dihapus tanpa mengubah stok.'
      "
    >
      <p v-if="actionError" class="rounded-2xl bg-error/10 p-4 text-sm leading-6 text-error">
        {{ actionError }}
      </p>
      <div class="mt-4 flex gap-3">
        <AppButton variant="ghost" :disabled="working" @click="confirmOpen = false"
          >Kembali</AppButton
        >
        <AppButton variant="danger" class="flex-1" :loading="working" @click="confirmAction">
          {{ confirmMode === 'cancel' ? 'Batalkan penjualan' : 'Hapus draft' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
