<script setup lang="ts">
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  PackageCheck,
  Pencil,
  ShoppingCart,
  Trash2,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import type { StockLot } from '@/db/schema'
import { getPurchaseDetail } from '@/purchases/repository'
import type { PurchaseDetail } from '@/purchases/types'
import { useMasterStore } from '@/stores/master'
import { usePurchaseStore } from '@/stores/purchases'
import { useUiStore } from '@/stores/ui'
import { formatDateId } from '@/utils/date'
import { formatNumberId, formatQty, formatRupiah } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const master = useMasterStore()
const purchases = usePurchaseStore()
const ui = useUiStore()

const loading = ref(true)
const loadError = ref('')
const detail = ref<PurchaseDetail | null>(null)
const actionError = ref('')
const working = ref(false)
const confirmOpen = ref(false)
const confirmMode = ref<'cancel' | 'delete'>('cancel')

const purchase = computed(() => detail.value?.purchase ?? null)
const items = computed(() => detail.value?.items ?? [])

function supplierName(id: string | null): string {
  if (!id) return 'Tanpa supplier'
  return master.suppliers.find((supplier) => supplier.id === id)?.nama ?? 'Supplier'
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

function lotFor(itemId: string): StockLot | undefined {
  return detail.value?.lots.find((lot) => lot.purchase_item_id === itemId)
}

function lotUsed(itemId: string): number {
  const lot = lotFor(itemId)
  if (!lot) return 0
  return Math.max(0, lot.qty_received_base - lot.qty_remaining_base)
}

const hasConsumedLots = computed(
  () =>
    purchase.value?.status === 'completed' &&
    items.value.some((item) => {
      const lot = lotFor(item.id)
      return Boolean(lot && (lot.status === 'depleted' || lotUsed(item.id) > 0))
    }),
)

function formatHpp(value: number): string {
  return `Rp ${formatNumberId(value, 4)}`
}

function openConfirm(mode: 'cancel' | 'delete') {
  confirmMode.value = mode
  actionError.value = ''
  confirmOpen.value = true
}

async function load() {
  loading.value = true
  loadError.value = ''

  try {
    const id = typeof route.params.id === 'string' ? route.params.id : ''
    const [nextDetail] = await Promise.all([getPurchaseDetail(id), master.load()])

    if (!nextDetail) {
      loadError.value = 'Pembelian tidak ditemukan.'
      return
    }

    detail.value = nextDetail
  } catch (caught) {
    loadError.value = caught instanceof Error ? caught.message : 'Detail pembelian gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function confirmAction() {
  if (!purchase.value) return

  actionError.value = ''
  working.value = true

  try {
    if (confirmMode.value === 'cancel') {
      await purchases.cancelAction(purchase.value.id)
      confirmOpen.value = false
      ui.notify('Pembelian dibatalkan dan stok dikembalikan.', 'success', 5000)
      await load()
    } else {
      const id = purchase.value.id
      await purchases.deleteDraftAction(id)
      ui.notify('Draft pembelian dihapus.', 'success')
      await router.push('/transaksi/pembelian')
    }
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Aksi pembelian gagal dijalankan.'
  } finally {
    working.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Detail pembelian"
      :subtitle="purchase?.nomor_nota ?? 'Memuat nota pembelian.'"
      back-to="/transaksi/pembelian"
    />

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="h-48 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
      <div class="h-32 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>

    <AppCard v-else-if="loadError" title="Pembelian tidak dapat dibuka">
      <p class="text-sm leading-6 text-error">{{ loadError }}</p>
    </AppCard>

    <template v-else-if="purchase">
      <section
        class="surface-card p-5"
        :class="purchase.status === 'cancelled' ? 'opacity-80' : ''"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-semibold tracking-[0.16em] text-base-content/65 uppercase">
              {{ formatDateId(purchase.tanggal) }}
            </p>
            <h2 class="mt-1 text-lg font-semibold tabular">{{ purchase.nomor_nota }}</h2>
            <p class="mt-1 text-sm text-base-content/65">
              {{ supplierName(purchase.supplier_id) }}
            </p>
          </div>
          <StatusChip :status="purchase.status" size="md" />
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-base-200/70 p-3">
            <p class="text-[10px] tracking-wide text-base-content/65 uppercase">Total</p>
            <p class="mt-1 text-lg font-semibold tabular text-brand-navy">
              {{ formatRupiah(purchase.total) }}
            </p>
          </div>
          <div class="rounded-2xl bg-base-200/70 p-3">
            <p class="text-[10px] tracking-wide text-base-content/65 uppercase">Dibayar</p>
            <p class="mt-1 text-lg font-semibold tabular">{{ formatRupiah(purchase.bayar) }}</p>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
          <p class="text-base-content/65">
            Metode
            <span class="font-semibold capitalize text-base-content">{{
              purchase.metode_pembayaran
            }}</span>
          </p>
          <p class="text-right text-base-content/65">{{ items.length }} barang</p>
        </div>

        <p
          v-if="purchase.keterangan"
          class="mt-3 rounded-xl bg-base-200/60 p-3 text-xs leading-5 text-base-content/65"
        >
          {{ purchase.keterangan }}
        </p>

        <div
          v-if="purchase.status === 'draft'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-draft/20 bg-status-draft/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-draft" aria-hidden="true" />
          Draft belum mengubah stok. Selesaikan pembelian untuk membuat lot dan mutasi stok.
        </div>

        <div
          v-else-if="purchase.status === 'cancelled'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-cancelled/20 bg-status-cancelled/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-cancelled" aria-hidden="true" />
          Pembelian dibatalkan. Stok sudah dikembalikan dan lot dari pembelian ini tidak aktif.
        </div>

        <div
          v-else-if="hasConsumedLots"
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-warning/20 bg-status-warning/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
          Sebagian lot sudah terpakai. Pembatalan pembelian tidak tersedia karena stok sudah
          bergerak.
        </div>

        <div
          v-else
          class="mt-4 flex items-start gap-2 rounded-xl border border-status-completed/20 bg-status-completed/10 p-3 text-xs leading-5 text-base-content/65"
        >
          <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          Selesai. Lot sudah dibuat dan HPP per base tersimpan.
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="px-1 text-sm font-semibold">Barang</h2>

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
                {{ formatRupiah(item.harga_beli_unit) }} /
                {{ unitSymbol(item.unit_id) }}
                <template v-if="item.diskon > 0">
                  · diskon {{ formatRupiah(item.diskon) }}
                </template>
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold tabular">{{ formatRupiah(item.subtotal) }}</p>
          </div>

          <div class="mt-3 rounded-xl bg-base-200/60 p-3 text-xs">
            <div class="flex items-center justify-between gap-3">
              <span class="text-base-content/65">Lot</span>
              <span class="font-semibold">{{ item.lot_code }}</span>
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-3">
              <span class="flex items-center gap-1 text-base-content/65">
                <CalendarClock class="h-3.5 w-3.5" aria-hidden="true" />
                Expiry
              </span>
              <span class="font-semibold">
                {{ item.expiry_date ? formatDateId(item.expiry_date) : 'Tanpa expiry' }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-3">
              <span class="text-base-content/65">HPP / base</span>
              <span class="font-semibold tabular">
                {{
                  purchase.status === 'completed'
                    ? formatHpp(item.unit_cost_base)
                    : 'Dibuat saat selesai'
                }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-3">
              <span class="text-base-content/65">Sisa lot</span>
              <span class="font-semibold tabular">
                <template v-if="lotFor(item.id)">
                  {{ formatQty(lotFor(item.id)?.qty_remaining_base, baseSymbol(item.product_id)) }}
                </template>
                <template v-else>Belum ada lot</template>
              </span>
            </div>
            <div
              v-if="purchase.status === 'completed' && lotFor(item.id)"
              class="mt-1.5 flex items-center justify-between gap-3"
            >
              <span class="text-base-content/65">Terpakai</span>
              <span class="font-semibold tabular">
                {{ formatQty(lotUsed(item.id), baseSymbol(item.product_id)) }}
              </span>
            </div>
          </div>
        </article>
      </section>

      <AppCard title="Ringkasan biaya">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Subtotal</dt>
            <dd class="font-semibold tabular">{{ formatRupiah(purchase.subtotal) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Diskon header</dt>
            <dd class="font-semibold tabular">− {{ formatRupiah(purchase.diskon) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Biaya angkut</dt>
            <dd class="font-semibold tabular">+ {{ formatRupiah(purchase.biaya_angkut) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-brand-border pt-2">
            <dt class="font-semibold">Total</dt>
            <dd class="text-lg font-semibold tabular text-brand-navy">
              {{ formatRupiah(purchase.total) }}
            </dd>
          </div>
        </dl>
      </AppCard>

      <div v-if="purchase.status === 'draft'" class="grid grid-cols-2 gap-3">
        <AppButton variant="danger" @click="openConfirm('delete')">
          <Trash2 class="h-4 w-4" aria-hidden="true" />
          Hapus draft
        </AppButton>
        <RouterLink
          :to="`/transaksi/pembelian/${purchase.id}/ubah`"
          class="btn btn-primary min-h-11 rounded-[var(--radius-control)] font-semibold normal-case"
        >
          <Pencil class="h-4 w-4" aria-hidden="true" />
          Ubah draft
        </RouterLink>
      </div>

      <AppButton
        v-else-if="purchase.status === 'completed'"
        variant="danger"
        block
        @click="openConfirm('cancel')"
      >
        <PackageCheck class="h-4 w-4" aria-hidden="true" />
        Batalkan pembelian
      </AppButton>

      <div class="flex items-center justify-center gap-2 text-xs text-base-content/65">
        <ShoppingCart class="h-3.5 w-3.5" aria-hidden="true" />
        <span>Pembelian disimpan lokal di perangkat ini.</span>
      </div>
    </template>

    <AppBottomSheet
      v-model="confirmOpen"
      :title="confirmMode === 'cancel' ? 'Batalkan pembelian?' : 'Hapus draft?'"
      :description="
        confirmMode === 'cancel'
          ? 'Pembatalan hanya berhasil jika semua lot dari pembelian ini masih utuh.'
          : 'Draft dan barangnya akan dihapus. Stok tidak berubah karena draft belum membuat lot.'
      "
    >
      <p v-if="actionError" class="rounded-2xl bg-error/10 p-4 text-sm leading-6 text-error">
        {{ actionError }}
      </p>

      <div class="mt-4 flex gap-3">
        <AppButton variant="ghost" :disabled="working" @click="confirmOpen = false">
          Kembali
        </AppButton>
        <AppButton variant="danger" class="flex-1" :loading="working" @click="confirmAction">
          {{ confirmMode === 'cancel' ? 'Batalkan pembelian' : 'Hapus draft' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
