<script setup lang="ts">
import { AlertTriangle, Check, Pencil, Plus, ReceiptText, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import type { PaymentMethod, ProductUnit } from '@/db/schema'
import { toBaseQuantity } from '@/master/validation'
import {
  getSaleDetail,
  getDraftStockWarnings,
  getAvailableSaleStock,
  nextSaleNumber,
} from '@/sales/repository'
import type { SaleDraft, SaleItemDraft } from '@/sales/types'
import {
  computeSaleTotals,
  SALE_PAYMENT_METHODS,
  saleLineSubtotal,
  validateSaleItem,
} from '@/sales/validation'
import { useMasterStore } from '@/stores/master'
import { useSaleStore } from '@/stores/sales'
import { useUiStore } from '@/stores/ui'
import { todayJakarta } from '@/utils/date'
import { formatQty, formatRupiah, toNumber } from '@/utils/format'
import { selectOnFocus } from '@/utils/input'

interface FormItem {
  product_id: string
  unit_id: string
  qty_unit: string
  harga_jual_unit: string
  diskon: string
}

const master = useMasterStore()
const sales = useSaleStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const editingId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id !== 'baru' ? id : ''
})

const initializing = ref(true)
const saving = ref(false)
const formError = ref('')
const nomorNota = ref('')
const tanggal = ref(todayJakarta())
const customerId = ref('')
const metodePembayaran = ref<PaymentMethod>('tunai')
const diskon = ref('0')
const bayar = ref('0')
const keterangan = ref('')
const items = ref<FormItem[]>([])
const stockWarnings = ref<string[]>([])
const stockLoading = ref(false)

const sheetOpen = ref(false)
const editingIndex = ref(-1)
const itemError = ref('')
const selectedStock = ref(0)
const itemForm = reactive<FormItem>({
  product_id: '',
  unit_id: '',
  qty_unit: '1',
  harga_jual_unit: '0',
  diskon: '0',
})

const activeCustomers = computed(() =>
  master.customers.filter((customer) => customer.status === 'active'),
)
const activeProducts = computed(() =>
  master.products.filter((product) => product.status === 'active'),
)
const sellableProducts = computed(() =>
  activeProducts.value.filter((product) => hasSaleUnit(product.id)),
)
const selectedProduct = computed(() =>
  master.products.find((product) => product.id === itemForm.product_id),
)
const selectedUnit = computed(() =>
  master.productUnits.find(
    (row) => row.product_id === itemForm.product_id && row.unit_id === itemForm.unit_id,
  ),
)
const availableUnits = computed<Array<ProductUnit & { __symbol: string }>>(() =>
  master.productUnits
    .filter(
      (row) =>
        row.product_id === itemForm.product_id &&
        (row.status === 'active' || row.unit_id === itemForm.unit_id) &&
        row.can_sell,
    )
    .sort((a, b) => {
      if (a.is_default_sale !== b.is_default_sale) return a.is_default_sale ? -1 : 1
      if (a.is_base !== b.is_base) return a.is_base ? -1 : 1
      return b.conversion_qty - a.conversion_qty
    })
    .map((row) => ({ ...row, __symbol: master.unitSymbol(row.unit_id) })),
)
const selectedItemBaseQty = computed(() =>
  selectedUnit.value
    ? toBaseQuantity(toNumber(itemForm.qty_unit), selectedUnit.value.conversion_qty)
    : null,
)
const unitStock = computed(() =>
  selectedUnit.value ? selectedStock.value / selectedUnit.value.conversion_qty : 0,
)
const subtotal = computed(() => items.value.reduce((sum, item) => sum + itemSubtotal(item), 0))
const totals = computed(() =>
  computeSaleTotals(
    items.value.map((item) => ({ subtotal: itemSubtotal(item) })),
    diskon.value,
  ),
)
const change = computed(() =>
  metodePembayaran.value === 'tunai' ? Math.max(0, toNumber(bayar.value) - totals.value.total) : 0,
)

function itemSubtotal(item: FormItem): number {
  return saleLineSubtotal(item.qty_unit, item.harga_jual_unit, item.diskon)
}

function hasSaleUnit(productId: string): boolean {
  return master.productUnits.some(
    (row) => row.product_id === productId && row.status === 'active' && row.can_sell,
  )
}

function productName(id: string): string {
  return master.products.find((product) => product.id === id)?.nama ?? 'Produk'
}

function productCode(id: string): string {
  return master.products.find((product) => product.id === id)?.kode ?? ''
}

function itemUnitSymbol(item: FormItem): string {
  return master.unitSymbol(item.unit_id)
}

function itemBaseQty(item: FormItem): number | null {
  const row = master.productUnits.find(
    (productUnit) =>
      productUnit.product_id === item.product_id && productUnit.unit_id === item.unit_id,
  )
  return row ? toBaseQuantity(toNumber(item.qty_unit), row.conversion_qty) : null
}

function selectedBaseUnit(productId: string): string {
  return master.products.find((product) => product.id === productId)?.base_unit_id ?? ''
}

function unitLabel(row: ProductUnit & { __symbol?: string }): string {
  const symbol = row.__symbol ?? master.unitSymbol(row.unit_id)
  const base = master.unitSymbol(selectedProduct.value?.base_unit_id ?? '')
  return `${symbol} · ${formatQty(row.conversion_qty, base)}`
}

function resetItemForm() {
  itemForm.product_id = ''
  itemForm.unit_id = ''
  itemForm.qty_unit = '1'
  itemForm.harga_jual_unit = '0'
  itemForm.diskon = '0'
  itemError.value = ''
  selectedStock.value = 0
}

function onProductChange() {
  const row = availableUnits.value[0]
  if (!row) {
    itemForm.unit_id = ''
    return
  }
  itemForm.unit_id = row.unit_id
  itemForm.harga_jual_unit = String(row.harga_jual)
  void loadSelectedStock()
}

function onUnitChange() {
  if (selectedUnit.value) itemForm.harga_jual_unit = String(selectedUnit.value.harga_jual)
}

async function loadSelectedStock() {
  if (!itemForm.product_id) return
  stockLoading.value = true
  try {
    const available = await getAvailableSaleStock(itemForm.product_id)
    selectedStock.value = available.qty_base
  } catch (caught) {
    itemError.value = caught instanceof Error ? caught.message : 'Stok produk gagal dimuat.'
  } finally {
    stockLoading.value = false
  }
}

function openAddItem() {
  resetItemForm()
  editingIndex.value = -1
  const firstProduct = sellableProducts.value[0]
  if (firstProduct) {
    itemForm.product_id = firstProduct.id
    onProductChange()
  }
  sheetOpen.value = true
}

function openEditItem(index: number) {
  const item = items.value[index]
  if (!item) return
  itemForm.product_id = item.product_id
  itemForm.unit_id = item.unit_id
  itemForm.qty_unit = item.qty_unit
  itemForm.harga_jual_unit = item.harga_jual_unit
  itemForm.diskon = item.diskon
  editingIndex.value = index
  itemError.value = ''
  sheetOpen.value = true
  void loadSelectedStock()
}

function applyItem() {
  itemError.value = ''
  if (!itemForm.product_id) {
    itemError.value = 'Produk wajib dipilih.'
    return
  }
  if (!itemForm.unit_id) {
    itemError.value = 'Satuan jual wajib dipilih.'
    return
  }
  const error = validateSaleItem({
    qty_unit: toNumber(itemForm.qty_unit),
    harga_jual_unit: toNumber(itemForm.harga_jual_unit),
    diskon: toNumber(itemForm.diskon),
  })
  if (error) {
    itemError.value = error
    return
  }
  if (!Number.isInteger(toNumber(itemForm.diskon))) {
    itemError.value = 'Diskon item harus bilangan bulat rupiah.'
    return
  }
  if (!selectedItemBaseQty.value || selectedItemBaseQty.value <= 0) {
    itemError.value = 'Qty base harus bilangan bulat lebih dari 0.'
    return
  }

  const item = { ...itemForm }
  if (editingIndex.value >= 0) items.value.splice(editingIndex.value, 1, item)
  else items.value.push(item)
  sheetOpen.value = false
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function fillPaidTotal() {
  bayar.value = String(totals.value.total)
}

function toDraft(): SaleDraft {
  return {
    nomor_nota: nomorNota.value,
    tanggal: tanggal.value,
    customer_id: customerId.value,
    metode_pembayaran: metodePembayaran.value,
    diskon: toNumber(diskon.value),
    bayar: toNumber(bayar.value),
    keterangan: keterangan.value,
    items: items.value.map((item): SaleItemDraft => ({
      product_id: item.product_id,
      unit_id: item.unit_id,
      qty_unit: toNumber(item.qty_unit),
      harga_jual_unit: toNumber(item.harga_jual_unit),
      diskon: toNumber(item.diskon),
    })),
  }
}

async function save(complete: boolean) {
  formError.value = ''
  if (!items.value.length) {
    formError.value = 'Minimal satu barang wajib ditambahkan.'
    return
  }
  if (complete && toNumber(bayar.value) < totals.value.total) {
    formError.value = 'Jumlah bayar kurang dari total penjualan.'
    return
  }
  saving.value = true
  try {
    const result = await sales.saveAction(toDraft(), {
      id: editingId.value || undefined,
      complete,
    })
    ui.notify(
      result.status === 'completed'
        ? 'Penjualan selesai, lot dikonsumsi dan HPP dicatat.'
        : 'Draft penjualan disimpan.',
      'success',
      4500,
    )
    await router.push(`/transaksi/penjualan/${result.id}`)
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Penjualan gagal disimpan.'
  } finally {
    saving.value = false
  }
}

watch(
  items,
  async (current) => {
    stockLoading.value = true
    try {
      stockWarnings.value = await getDraftStockWarnings(
        current.map((item) => ({
          product_id: item.product_id,
          unit_id: item.unit_id,
          qty_unit: toNumber(item.qty_unit),
          harga_jual_unit: toNumber(item.harga_jual_unit),
          diskon: toNumber(item.diskon),
        })),
      )
    } catch (caught) {
      formError.value = caught instanceof Error ? caught.message : 'Peringatan stok gagal dimuat.'
    } finally {
      stockLoading.value = false
    }
  },
  { deep: true },
)

onMounted(async () => {
  try {
    await master.load()
    if (editingId.value) {
      const detail = await getSaleDetail(editingId.value)
      if (!detail) {
        ui.notify('Penjualan tidak ditemukan.', 'error')
        await router.replace('/transaksi/penjualan')
        return
      }
      if (detail.sale.status !== 'draft') {
        await router.replace(`/transaksi/penjualan/${detail.sale.id}`)
        return
      }
      nomorNota.value = detail.sale.nomor_nota
      tanggal.value = detail.sale.tanggal
      customerId.value = detail.sale.customer_id ?? ''
      metodePembayaran.value = detail.sale.metode_pembayaran
      diskon.value = String(detail.sale.diskon)
      bayar.value = String(detail.sale.bayar)
      keterangan.value = detail.sale.keterangan
      items.value = detail.items.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id,
        qty_unit: String(item.qty_unit),
        harga_jual_unit: String(item.harga_jual_unit),
        diskon: String(item.diskon),
      }))
    } else {
      nomorNota.value = await nextSaleNumber(tanggal.value)
      customerId.value = activeCustomers.value[0]?.id ?? ''
    }
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Data penjualan gagal dimuat.'
  } finally {
    initializing.value = false
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :title="editingId ? 'Ubah draft penjualan' : 'Tambah penjualan'"
      subtitle="Stok dikurangi dan lot dialokasikan saat transaksi diselesaikan."
      back-to="/transaksi/penjualan"
    />

    <div v-if="initializing" class="space-y-3" aria-busy="true">
      <div class="h-40 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
      <div class="h-40 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>

    <template v-else>
      <AppCard title="Informasi penjualan">
        <div class="grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Nomor nota">
              <input
                :value="nomorNota"
                type="text"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-200"
                readonly
              />
            </FormField>
            <FormField label="Tanggal" for-id="sale-date" required>
              <input
                id="sale-date"
                v-model="tanggal"
                type="date"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
              />
            </FormField>
          </div>
          <FormField label="Pelanggan" for-id="sale-customer">
            <select
              id="sale-customer"
              v-model="customerId"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option value="">Umum / walk-in</option>
              <option v-for="customer in activeCustomers" :key="customer.id" :value="customer.id">
                {{ customer.nama }}
              </option>
            </select>
          </FormField>
          <FormField label="Metode pembayaran" for-id="sale-payment-method" required>
            <select
              id="sale-payment-method"
              v-model="metodePembayaran"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option
                v-for="method in SALE_PAYMENT_METHODS"
                :key="method.value"
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
          </FormField>
        </div>
      </AppCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 class="text-sm font-semibold">Barang</h2>
            <p class="mt-0.5 text-xs text-base-content/65">
              {{ items.length }} barang · {{ formatRupiah(subtotal) }}
            </p>
          </div>
          <AppButton size="sm" variant="secondary" @click="openAddItem">
            <Plus class="h-4 w-4" aria-hidden="true" />
            Tambah barang
          </AppButton>
        </div>

        <div
          v-if="items.length === 0"
          class="rounded-[var(--radius-card)] border border-dashed border-brand-border bg-base-100 p-5 text-center"
        >
          <ReceiptText class="mx-auto h-8 w-8 text-base-content/25" aria-hidden="true" />
          <p class="mt-2 text-sm font-semibold">Belum ada barang</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Tambahkan minimal satu barang sebelum menyimpan penjualan.
          </p>
        </div>

        <article
          v-for="(item, index) in items"
          :key="`${item.product_id}-${item.unit_id}-${index}`"
          class="surface-card p-4"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <span class="text-[10px] font-semibold tracking-wide text-brand-copper">
                {{ productCode(item.product_id) }}
              </span>
              <h3 class="mt-0.5 text-sm font-semibold">{{ productName(item.product_id) }}</h3>
              <p class="mt-0.5 text-xs text-base-content/65">
                {{ formatQty(toNumber(item.qty_unit), itemUnitSymbol(item)) }}
                <template v-if="itemBaseQty(item) !== null">
                  =
                  {{
                    formatQty(
                      itemBaseQty(item),
                      master.unitSymbol(selectedBaseUnit(item.product_id)),
                    )
                  }}
                </template>
              </p>
              <p class="mt-1 text-xs text-base-content/65">
                {{ formatRupiah(toNumber(item.harga_jual_unit)) }} / {{ itemUnitSymbol(item) }}
                <template v-if="toNumber(item.diskon) > 0">
                  · diskon {{ formatRupiah(toNumber(item.diskon)) }}
                </template>
              </p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <p class="text-sm font-semibold tabular">{{ formatRupiah(itemSubtotal(item)) }}</p>
              <div class="flex gap-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0"
                  :aria-label="`Edit barang ${productName(item.product_id)}`"
                  @click="openEditItem(index)"
                >
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
                  :aria-label="`Hapus barang ${productName(item.product_id)}`"
                  @click="removeItem(index)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <div
        v-if="stockWarnings.length"
        class="space-y-1 rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-base-content/70"
        role="status"
      >
        <p class="flex items-center gap-2 font-semibold text-status-warning">
          <AlertTriangle class="h-4 w-4" aria-hidden="true" />
          Stok layak jual kurang
        </p>
        <p v-for="warning in stockWarnings" :key="warning" class="text-xs leading-5">
          {{ warning }}
        </p>
        <p class="text-xs">
          Draft tetap dapat disimpan, tetapi penjualan tidak dapat diselesaikan.
        </p>
      </div>

      <AppCard title="Ringkasan">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Subtotal</dt>
            <dd class="font-semibold tabular">{{ formatRupiah(totals.subtotal) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Diskon header</dt>
            <dd class="font-semibold tabular">− {{ formatRupiah(totals.diskon) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-brand-border pt-2">
            <dt class="font-semibold">Total</dt>
            <dd class="text-lg font-semibold tabular text-brand-navy">
              {{ formatRupiah(totals.total) }}
            </dd>
          </div>
        </dl>
        <div class="mt-4 grid gap-3">
          <FormField label="Diskon header" for-id="sale-discount" hint="Rupiah.">
            <input
              id="sale-discount"
              v-model="diskon"
              type="number"
              min="0"
              inputmode="numeric"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
              @focus="selectOnFocus"
            />
          </FormField>
          <FormField label="Jumlah bayar" for-id="sale-paid" required>
            <div class="flex gap-2">
              <input
                id="sale-paid"
                v-model="bayar"
                type="number"
                min="0"
                inputmode="numeric"
                class="input input-bordered min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] bg-base-100 text-right tabular"
                @focus="selectOnFocus"
              />
              <button type="button" class="btn btn-ghost btn-sm shrink-0" @click="fillPaidTotal">
                Sesuai total
              </button>
            </div>
          </FormField>
          <div class="flex items-center justify-between text-sm">
            <span class="text-base-content/65">
              {{ metodePembayaran === 'tunai' ? 'Kembalian' : 'Kembalian non-tunai' }}
            </span>
            <strong class="tabular">{{ formatRupiah(change) }}</strong>
          </div>
          <FormField label="Keterangan" for-id="sale-note">
            <textarea
              id="sale-note"
              v-model="keterangan"
              rows="2"
              class="textarea textarea-bordered w-full rounded-[var(--radius-control)] bg-base-100"
              placeholder="Catatan penjualan (opsional)."
            />
          </FormField>
        </div>
      </AppCard>

      <p v-if="formError" class="rounded-2xl bg-error/10 p-4 text-sm text-error">{{ formError }}</p>
      <div class="grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :loading="saving" @click="save(false)"
          >Simpan draft</AppButton
        >
        <AppButton :loading="saving" @click="save(true)">
          <Check class="h-4 w-4" aria-hidden="true" />
          Selesaikan
        </AppButton>
      </div>
      <p class="px-1 text-xs leading-5 text-base-content/65">
        Saat selesai, stok non-expired dikurangi berdasarkan FEFO atau FIFO dan COGS disimpan.
      </p>
    </template>

    <AppBottomSheet
      v-model="sheetOpen"
      :title="editingIndex >= 0 ? 'Edit barang' : 'Tambah barang'"
      description="Pilih satuan jual; jumlah base harus bilangan bulat."
    >
      <div class="grid gap-3">
        <FormField label="Produk" for-id="sale-item-product" required>
          <select
            id="sale-item-product"
            v-model="itemForm.product_id"
            class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            @change="onProductChange"
          >
            <option value="" disabled>Pilih produk</option>
            <option
              v-for="product in activeProducts"
              :key="product.id"
              :value="product.id"
              :disabled="!hasSaleUnit(product.id)"
            >
              {{ product.nama }} · {{ product.kode
              }}{{ hasSaleUnit(product.id) ? '' : ' (belum ada satuan jual)' }}
            </option>
          </select>
        </FormField>

        <p v-if="itemForm.product_id && availableUnits.length === 0" class="text-xs text-error">
          Produk ini belum punya satuan yang bisa dijual. Atur di master produk.
        </p>
        <template v-else-if="selectedProduct && availableUnits.length">
          <FormField label="Satuan jual" for-id="sale-item-unit" required>
            <select
              id="sale-item-unit"
              v-model="itemForm.unit_id"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
              @change="onUnitChange"
            >
              <option v-for="row in availableUnits" :key="row.id" :value="row.unit_id">
                {{ unitLabel(row) }}
              </option>
            </select>
          </FormField>
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Qty" for-id="sale-item-qty" required>
              <input
                id="sale-item-qty"
                v-model="itemForm.qty_unit"
                type="number"
                min="0.001"
                step="0.001"
                inputmode="decimal"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
                @focus="selectOnFocus"
              />
            </FormField>
            <FormField label="Harga / satuan" for-id="sale-item-price" required>
              <input
                id="sale-item-price"
                v-model="itemForm.harga_jual_unit"
                type="number"
                min="0"
                inputmode="numeric"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
                @focus="selectOnFocus"
              />
            </FormField>
          </div>
          <FormField label="Diskon item" for-id="sale-item-discount" hint="Rupiah.">
            <input
              id="sale-item-discount"
              v-model="itemForm.diskon"
              type="number"
              min="0"
              inputmode="numeric"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
              @focus="selectOnFocus"
            />
          </FormField>
          <div class="rounded-xl bg-base-200/70 p-3 text-xs">
            <p>
              Stok layak jual:
              <strong>{{
                stockLoading ? 'Memuat…' : formatQty(unitStock, master.unitSymbol(itemForm.unit_id))
              }}</strong>
            </p>
            <p v-if="selectedItemBaseQty !== null" class="mt-1">
              Qty base:
              <strong>{{
                formatQty(selectedItemBaseQty, master.unitSymbol(selectedProduct.base_unit_id))
              }}</strong>
            </p>
          </div>
        </template>
      </div>
      <p v-if="itemError" class="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">
        {{ itemError }}
      </p>
      <div class="mt-4 flex gap-3">
        <AppButton variant="ghost" @click="sheetOpen = false">Kembali</AppButton>
        <AppButton class="flex-1" @click="applyItem">
          <Plus class="h-4 w-4" aria-hidden="true" />
          {{ editingIndex >= 0 ? 'Simpan perubahan' : 'Tambah ke penjualan' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
