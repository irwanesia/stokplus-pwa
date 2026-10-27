<script setup lang="ts">
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import type { PaymentMethod, ProductUnit } from '@/db/schema'
import { toBaseQuantity } from '@/master/validation'
import { getPurchaseDetail, nextPurchaseNumber, suggestLotCode } from '@/purchases/repository'
import type { PurchaseDraft } from '@/purchases/types'
import {
  PAYMENT_METHODS,
  computePurchaseTotals,
  roundUnitCost,
  validatePurchaseItem,
} from '@/purchases/validation'
import { useMasterStore } from '@/stores/master'
import { usePurchaseStore } from '@/stores/purchases'
import { useUiStore } from '@/stores/ui'
import { todayJakarta } from '@/utils/date'
import { formatQty, formatRupiah, toNumber } from '@/utils/format'
import { selectOnFocus } from '@/utils/input'

interface FormItem {
  product_id: string
  unit_id: string
  qty_unit: string
  harga_beli_unit: string
  diskon: string
  expiry_date: string
  lot_code: string
}

const master = useMasterStore()
const purchases = usePurchaseStore()
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
const supplierId = ref('')
const metodePembayaran = ref<PaymentMethod>('tunai')
const diskon = ref('0')
const biayaAngkut = ref('0')
const bayar = ref('0')
const keterangan = ref('')
const items = ref<FormItem[]>([])

const sheetOpen = ref(false)
const editingIndex = ref(-1)
const itemError = ref('')
const itemForm = reactive<FormItem>({
  product_id: '',
  unit_id: '',
  qty_unit: '1',
  harga_beli_unit: '0',
  diskon: '0',
  expiry_date: '',
  lot_code: '',
})

const activeSuppliers = computed(() =>
  master.suppliers.filter((supplier) => supplier.status === 'active'),
)
const supplierOptions = computed(() => {
  const options = [...activeSuppliers.value]
  const current = master.suppliers.find((supplier) => supplier.id === supplierId.value)
  if (current && current.status !== 'active') options.push(current)
  return options
})
const activeProducts = computed(() =>
  master.products.filter((product) => product.status === 'active'),
)
const purchasableProducts = computed(() =>
  activeProducts.value.filter((product) => productHasPurchaseUnit(product.id)),
)
const productsWithoutPurchaseUnit = computed(() =>
  activeProducts.value.filter((product) => !productHasPurchaseUnit(product.id)),
)
const missingPurchaseNames = computed(() =>
  productsWithoutPurchaseUnit.value.map((product) => product.nama).join(', '),
)
const canCreatePurchase = computed(
  () => activeSuppliers.value.length > 0 && purchasableProducts.value.length > 0,
)

const selectedProduct = computed(() =>
  master.products.find((product) => product.id === itemForm.product_id),
)
const selectedUnit = computed(() =>
  master.productUnits.find(
    (row) => row.product_id === itemForm.product_id && row.unit_id === itemForm.unit_id,
  ),
)
const availableUnits = computed<Array<ProductUnit & { __symbol: string }>>(() => {
  const rows = master.productUnits
    .filter(
      (row) =>
        row.product_id === itemForm.product_id &&
        (row.status === 'active' || row.unit_id === itemForm.unit_id) &&
        row.can_purchase,
    )
    .sort((a, b) => {
      if (a.is_default_purchase !== b.is_default_purchase) {
        return a.is_default_purchase ? -1 : 1
      }
      if (a.is_base !== b.is_base) return a.is_base ? -1 : 1
      return b.conversion_qty - a.conversion_qty
    })

  return rows.map((row) => ({
    ...row,
    __symbol: master.unitSymbol(row.unit_id),
  }))
})
const itemQtyBase = computed(() => {
  if (!selectedUnit.value) return null
  return toBaseQuantity(toNumber(itemForm.qty_unit), selectedUnit.value.conversion_qty)
})
const itemGross = computed(() => toNumber(itemForm.qty_unit) * toNumber(itemForm.harga_beli_unit))
const itemSubtotal = computed(() => Math.round(itemGross.value - toNumber(itemForm.diskon)))
const itemUnitCostEstimate = computed(() => {
  if (!itemQtyBase.value) return 0
  return roundUnitCost(Math.max(0, itemSubtotal.value) / itemQtyBase.value)
})
const lotPlaceholder = computed(() => {
  const line = editingIndex.value >= 0 ? editingIndex.value + 1 : items.value.length + 1
  return nomorNota.value ? suggestLotCode(nomorNota.value, line) : `LOT-PB-...-${line}`
})
const expiryRequired = computed(() => Boolean(selectedProduct.value?.track_expiry))

const subtotal = computed(() => items.value.reduce((sum, item) => sum + formItemSubtotal(item), 0))
const headerDiscount = computed(() => toNumber(diskon.value))
const freight = computed(() => toNumber(biayaAngkut.value))
const totals = computed(() =>
  computePurchaseTotals(
    items.value.map((item) => ({ subtotal: formItemSubtotal(item) })),
    headerDiscount.value,
    freight.value,
  ),
)

function formItemSubtotal(item: FormItem): number {
  return Math.round(
    toNumber(item.qty_unit) * toNumber(item.harga_beli_unit) - toNumber(item.diskon),
  )
}

function unitLabel(row: ProductUnit & { __symbol?: string }): string {
  const symbol = row.__symbol ?? master.unitSymbol(row.unit_id)
  const baseSymbol = master.unitSymbol(selectedProduct.value?.base_unit_id ?? '')
  return `${symbol} · ${formatQty(row.conversion_qty, baseSymbol)}`
}

function selectedBaseUnit(productId: string): string {
  return master.products.find((product) => product.id === productId)?.base_unit_id ?? ''
}

function productName(id: string): string {
  return master.products.find((product) => product.id === id)?.nama ?? 'Produk'
}

function productHasPurchaseUnit(productId: string): boolean {
  return master.productUnits.some(
    (row) => row.product_id === productId && row.status === 'active' && row.can_purchase,
  )
}

function productOptionLabel(product: { id: string; nama: string; kode: string }): string {
  const suffix = productHasPurchaseUnit(product.id) ? '' : ' (belum ada satuan beli)'
  return `${product.nama} · ${product.kode}${suffix}`
}

function productCode(id: string): string {
  return master.products.find((product) => product.id === id)?.kode ?? ''
}

function itemUnitSymbol(item: FormItem): string {
  return master.unitSymbol(item.unit_id)
}

function itemBaseQty(item: FormItem): number | null {
  const row = master.productUnits.find(
    (unitRow) => unitRow.product_id === item.product_id && unitRow.unit_id === item.unit_id,
  )
  return row ? toBaseQuantity(toNumber(item.qty_unit), row.conversion_qty) : null
}

function underlyingProductTrackExpiry(id: string): boolean {
  return Boolean(master.products.find((product) => product.id === id)?.track_expiry)
}

function resetItemForm() {
  itemForm.product_id = ''
  itemForm.unit_id = ''
  itemForm.qty_unit = '1'
  itemForm.harga_beli_unit = '0'
  itemForm.diskon = '0'
  itemForm.expiry_date = ''
  itemForm.lot_code = ''
  itemError.value = ''
}

function openAddItem() {
  resetItemForm()
  editingIndex.value = -1
  const firstProduct = purchasableProducts.value[0]
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
  itemForm.harga_beli_unit = item.harga_beli_unit
  itemForm.diskon = item.diskon
  itemForm.expiry_date = item.expiry_date
  itemForm.lot_code = item.lot_code
  editingIndex.value = index
  itemError.value = ''
  sheetOpen.value = true
}

function onProductChange() {
  const units = availableUnits.value
  const next = units[0]
  itemForm.unit_id = next?.unit_id ?? ''
  itemForm.harga_beli_unit = next ? String(next.harga_beli_default) : '0'
  if (!selectedProduct.value?.track_expiry) {
    itemForm.expiry_date = ''
  }
}

function onUnitChange() {
  const row = selectedUnit.value
  if (row) {
    itemForm.harga_beli_unit = String(row.harga_beli_default)
  }
}

function applyItem() {
  itemError.value = ''

  if (!itemForm.product_id) {
    itemError.value = 'Produk wajib dipilih.'
    return
  }

  if (!itemForm.unit_id) {
    itemError.value = 'Satuan beli wajib dipilih.'
    return
  }

  const itemValidation = validatePurchaseItem({
    qty_unit: toNumber(itemForm.qty_unit),
    harga_beli_unit: toNumber(itemForm.harga_beli_unit),
    diskon: toNumber(itemForm.diskon),
  })
  if (itemValidation) {
    itemError.value = itemValidation
    return
  }

  if (!Number.isInteger(toNumber(itemForm.harga_beli_unit))) {
    itemError.value = 'Harga beli harus bilangan bulat rupiah.'
    return
  }

  if (!Number.isInteger(toNumber(itemForm.diskon))) {
    itemError.value = 'Diskon item harus bilangan bulat rupiah.'
    return
  }

  if (!itemQtyBase.value || itemQtyBase.value <= 0) {
    itemError.value = 'Qty base harus bilangan bulat lebih dari 0.'
    return
  }

  if (itemGross.value < 0 || toNumber(itemForm.diskon) > itemGross.value) {
    itemError.value = 'Diskon item tidak boleh melebihi qty × harga.'
    return
  }

  if (expiryRequired.value && !itemForm.expiry_date) {
    itemError.value = 'Expiry wajib diisi untuk produk ini.'
    return
  }

  const lotCode = itemForm.lot_code.trim().toUpperCase()
  const duplicateLot = items.value.some(
    (item, index) =>
      index !== editingIndex.value &&
      item.product_id === itemForm.product_id &&
      item.lot_code.trim().toUpperCase() === lotCode &&
      lotCode !== '',
  )
  if (duplicateLot) {
    itemError.value = 'Lot code sudah dipakai pada produk yang sama di pembelian ini.'
    return
  }

  const next: FormItem = {
    product_id: itemForm.product_id,
    unit_id: itemForm.unit_id,
    qty_unit: itemForm.qty_unit,
    harga_beli_unit: itemForm.harga_beli_unit,
    diskon: itemForm.diskon,
    expiry_date: expiryRequired.value ? itemForm.expiry_date : '',
    lot_code: lotCode,
  }

  if (editingIndex.value >= 0) {
    items.value.splice(editingIndex.value, 1, next)
  } else {
    items.value.push(next)
  }

  sheetOpen.value = false
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function fillPaidTotal() {
  bayar.value = String(totals.value.total)
}

function toDraft(): PurchaseDraft {
  return {
    nomor_nota: nomorNota.value,
    tanggal: tanggal.value,
    supplier_id: supplierId.value,
    metode_pembayaran: metodePembayaran.value,
    diskon: toNumber(diskon.value),
    biaya_angkut: toNumber(biayaAngkut.value),
    bayar: toNumber(bayar.value),
    keterangan: keterangan.value,
    items: items.value.map((item) => ({
      product_id: item.product_id,
      unit_id: item.unit_id,
      qty_unit: toNumber(item.qty_unit),
      harga_beli_unit: toNumber(item.harga_beli_unit),
      diskon: toNumber(item.diskon),
      expiry_date: item.expiry_date,
      lot_code: item.lot_code,
    })),
  }
}

async function save(complete: boolean) {
  formError.value = ''

  if (!supplierId.value) {
    formError.value = 'Supplier wajib dipilih.'
    return
  }

  if (!items.value.length) {
    formError.value = 'Minimal satu barang wajib ditambahkan.'
    return
  }

  if (complete && toNumber(bayar.value) < totals.value.total) {
    formError.value = 'Jumlah bayar kurang dari total pembelian.'
    return
  }

  saving.value = true

  try {
    const result = await purchases.saveAction(toDraft(), {
      id: editingId.value || undefined,
      complete,
    })

    ui.notify(
      result.status === 'completed'
        ? 'Pembelian selesai dan lot dibuat.'
        : 'Draft pembelian disimpan.',
      'success',
      4500,
    )
    await router.push(`/transaksi/pembelian/${result.id}`)
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Pembelian gagal disimpan.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await master.load()

    if (editingId.value) {
      const detail = await getPurchaseDetail(editingId.value)
      if (!detail) {
        ui.notify('Pembelian tidak ditemukan.', 'error')
        await router.replace('/transaksi/pembelian')
        return
      }

      if (detail.purchase.status !== 'draft') {
        await router.replace(`/transaksi/pembelian/${detail.purchase.id}`)
        return
      }

      nomorNota.value = detail.purchase.nomor_nota
      tanggal.value = detail.purchase.tanggal
      supplierId.value = detail.purchase.supplier_id ?? ''
      metodePembayaran.value = detail.purchase.metode_pembayaran
      diskon.value = String(detail.purchase.diskon)
      biayaAngkut.value = String(detail.purchase.biaya_angkut)
      bayar.value = String(detail.purchase.bayar)
      keterangan.value = detail.purchase.keterangan
      items.value = detail.items.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id,
        qty_unit: String(item.qty_unit),
        harga_beli_unit: String(item.harga_beli_unit),
        diskon: String(item.diskon),
        expiry_date: item.expiry_date ?? '',
        lot_code: item.lot_code,
      }))
    } else {
      nomorNota.value = await nextPurchaseNumber(tanggal.value)
      supplierId.value = activeSuppliers.value[0]?.id ?? ''
    }
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Data pembelian gagal dimuat.'
  } finally {
    initializing.value = false
  }
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :title="editingId ? 'Ubah draft pembelian' : 'Tambah pembelian'"
      subtitle="Draft tidak mengubah stok. Lot dibuat saat pembelian diselesaikan."
      back-to="/transaksi/pembelian"
    />

    <div v-if="initializing" class="space-y-3" aria-busy="true">
      <div class="h-40 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
      <div class="h-40 animate-pulse rounded-[var(--radius-card)] bg-base-300/60" />
    </div>

    <template v-else>
      <div
        v-if="!canCreatePurchase"
        class="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
        <div class="min-w-0 text-sm leading-6 text-base-content/70">
          <p class="font-semibold text-base-content">Master belum siap</p>
          <p class="mt-1">
            Butuh minimal satu supplier aktif dan produk dengan satuan yang bisa dibeli. Lengkapi di
            <RouterLink
              to="/master/supplier"
              class="font-semibold text-brand-copper underline underline-offset-2"
            >
              Supplier
            </RouterLink>
            dan
            <RouterLink
              to="/master/produk"
              class="font-semibold text-brand-copper underline underline-offset-2"
            >
              Produk </RouterLink
            >.
          </p>
        </div>
      </div>

      <div
        v-if="productsWithoutPurchaseUnit.length > 0"
        class="flex items-start gap-3 rounded-2xl border border-brand-copper/20 bg-brand-copper/10 p-4"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
        <div class="min-w-0 text-sm leading-6 text-base-content/70">
          <p class="font-semibold text-base-content">
            {{ productsWithoutPurchaseUnit.length }} produk aktif belum punya satuan beli
          </p>
          <p class="mt-1">
            {{ missingPurchaseNames }}. Centang <strong>Bisa dibeli</strong> pada minimal satu
            satuan agar produk bisa dipilih saat pembelian.
            <RouterLink
              to="/master/produk"
              class="font-semibold text-brand-copper underline underline-offset-2"
            >
              Atur produk
            </RouterLink>
          </p>
        </div>
      </div>

      <AppCard title="Informasi pembelian">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-semibold tracking-[0.16em] text-base-content/65 uppercase">
              Nomor nota
            </p>
            <p class="mt-1 text-sm font-semibold tabular">{{ nomorNota || 'Otomatis' }}</p>
          </div>
          <StatusChip status="draft" />
        </div>

        <div class="mt-4 grid gap-4">
          <FormField label="Supplier" for-id="purchase-supplier" required>
            <select
              id="purchase-supplier"
              v-model="supplierId"
              class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option value="">Pilih supplier</option>
              <option v-for="supplier in supplierOptions" :key="supplier.id" :value="supplier.id">
                {{ supplier.nama }}{{ supplier.status === 'inactive' ? ' (nonaktif)' : '' }}
              </option>
            </select>
          </FormField>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Tanggal" for-id="purchase-date" required>
              <input
                id="purchase-date"
                v-model="tanggal"
                type="date"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
              />
            </FormField>

            <FormField label="Pembayaran" for-id="purchase-payment" required>
              <select
                id="purchase-payment"
                v-model="metodePembayaran"
                class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
              >
                <option v-for="method in PAYMENT_METHODS" :key="method.value" :value="method.value">
                  {{ method.label }}
                </option>
              </select>
            </FormField>
          </div>

          <FormField label="Keterangan" for-id="purchase-note" hint="Opsional.">
            <textarea
              id="purchase-note"
              v-model="keterangan"
              rows="2"
              class="textarea textarea-bordered w-full rounded-[var(--radius-control)] bg-base-100"
              placeholder="Misalnya: pembelian mingguan dari distributor."
            />
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
          <ShoppingCart class="mx-auto h-8 w-8 text-base-content/25" aria-hidden="true" />
          <p class="mt-2 text-sm font-semibold">Belum ada barang</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Tambahkan minimal satu barang sebelum menyimpan atau menyelesaikan pembelian.
          </p>
        </div>

        <article
          v-for="(item, index) in items"
          :key="`${item.product_id}-${item.unit_id}-${index}`"
          class="surface-card p-4"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[10px] font-semibold tracking-wide text-brand-copper">
                  {{ productCode(item.product_id) }}
                </span>
                <span
                  v-if="underlyingProductTrackExpiry(item.product_id)"
                  class="badge badge-sm gap-1 rounded-full border-brand-copper/20 bg-brand-copper/10 text-brand-copper"
                >
                  <CalendarClock class="h-3 w-3" aria-hidden="true" />
                  Expiry
                </span>
              </div>
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
                {{ formatRupiah(toNumber(item.harga_beli_unit)) }} /
                {{ itemUnitSymbol(item) }}
                <template v-if="toNumber(item.diskon) > 0">
                  · diskon {{ formatRupiah(toNumber(item.diskon)) }}
                </template>
              </p>
              <p v-if="item.expiry_date" class="mt-1 text-xs text-base-content/65">
                Expiry {{ item.expiry_date }} · {{ item.lot_code }}
              </p>
              <p v-else-if="item.lot_code" class="mt-1 text-xs text-base-content/65">
                Lot {{ item.lot_code }}
              </p>
            </div>

            <div class="flex shrink-0 flex-col items-end gap-1">
              <p class="text-sm font-semibold tabular">
                {{ formatRupiah(formItemSubtotal(item)) }}
              </p>
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

      <AppCard title="Ringkasan">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Subtotal</dt>
            <dd class="font-semibold tabular">{{ formatRupiah(subtotal) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Diskon header</dt>
            <dd class="font-semibold tabular">− {{ formatRupiah(headerDiscount) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-base-content/65">Biaya angkut</dt>
            <dd class="font-semibold tabular">+ {{ formatRupiah(freight) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-brand-border pt-2">
            <dt class="font-semibold">Total</dt>
            <dd class="text-lg font-semibold tabular text-brand-navy">
              {{ formatRupiah(totals.total) }}
            </dd>
          </div>
        </dl>

        <div class="mt-4 grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Diskon header" for-id="purchase-discount" hint="Rupiah.">
              <input
                id="purchase-discount"
                v-model="diskon"
                type="number"
                min="0"
                inputmode="numeric"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
                @focus="selectOnFocus"
              />
            </FormField>
            <FormField label="Biaya angkut" for-id="purchase-freight" hint="Rupiah.">
              <input
                id="purchase-freight"
                v-model="biayaAngkut"
                type="number"
                min="0"
                inputmode="numeric"
                class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
                @focus="selectOnFocus"
              />
            </FormField>
          </div>

          <FormField label="Jumlah bayar" for-id="purchase-paid" required>
            <div class="flex gap-2">
              <input
                id="purchase-paid"
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
        </div>
      </AppCard>

      <p v-if="formError" class="rounded-2xl bg-error/10 p-4 text-sm text-error">
        {{ formError }}
      </p>

      <div class="grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :loading="saving" @click="save(false)">
          Simpan draft
        </AppButton>
        <AppButton :loading="saving" @click="save(true)">
          <Check class="h-4 w-4" aria-hidden="true" />
          Selesaikan
        </AppButton>
      </div>

      <p class="px-1 text-xs leading-5 text-base-content/65">
        Pembelian selesai tidak dapat diedit. Pembatalan hanya bisa dilakukan selama semua lot dari
        pembelian ini masih utuh.
      </p>
    </template>

    <AppBottomSheet
      v-model="sheetOpen"
      :title="editingIndex >= 0 ? 'Edit barang' : 'Tambah barang'"
      description="Qty base dihitung otomatis dari konversi satuan."
    >
      <div class="space-y-4">
        <FormField label="Produk" for-id="purchase-product" required>
          <select
            id="purchase-product"
            v-model="itemForm.product_id"
            class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            @change="onProductChange"
          >
            <option value="">Pilih produk</option>
            <option v-for="product in activeProducts" :key="product.id" :value="product.id">
              {{ productOptionLabel(product) }}
            </option>
          </select>
        </FormField>

        <FormField label="Satuan beli" for-id="purchase-unit" required>
          <select
            id="purchase-unit"
            v-model="itemForm.unit_id"
            class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
            :disabled="!itemForm.product_id"
            @change="onUnitChange"
          >
            <option value="">Pilih satuan</option>
            <option v-for="unit in availableUnits" :key="unit.unit_id" :value="unit.unit_id">
              {{ unitLabel(unit) }}
            </option>
          </select>
        </FormField>

        <div
          v-if="itemForm.product_id && availableUnits.length === 0"
          class="rounded-2xl border border-status-warning/20 bg-status-warning/10 p-3 text-xs leading-5 text-base-content/65"
        >
          Produk ini belum punya satuan yang bisa dibeli. Tutup form ini, lalu buka
          <strong>Master → Produk</strong>, edit produk, dan centang <strong>Bisa dibeli</strong>
          pada minimal satu satuan.
        </div>

        <div class="grid grid-cols-2 gap-3">
          <FormField label="Qty" for-id="purchase-qty" required>
            <input
              id="purchase-qty"
              v-model="itemForm.qty_unit"
              type="number"
              min="0"
              step="0.001"
              inputmode="decimal"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
              @focus="selectOnFocus"
            />
          </FormField>

          <FormField label="Harga / satuan" for-id="purchase-price" required>
            <input
              id="purchase-price"
              v-model="itemForm.harga_beli_unit"
              type="number"
              min="0"
              inputmode="numeric"
              class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
              @focus="selectOnFocus"
            />
          </FormField>
        </div>

        <div class="rounded-2xl bg-base-200/70 p-3 text-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="text-base-content/65">Qty base</span>
            <span class="font-semibold tabular">
              <template v-if="itemQtyBase !== null">
                {{ formatQty(itemQtyBase, master.unitSymbol(selectedProduct?.base_unit_id ?? '')) }}
              </template>
              <template v-else>Belum bulat</template>
            </span>
          </div>
          <div class="mt-1.5 flex items-center justify-between gap-3">
            <span class="text-base-content/65">HPP estimasi / base</span>
            <span class="font-semibold tabular">{{ formatRupiah(itemUnitCostEstimate) }}</span>
          </div>
        </div>

        <FormField
          label="Diskon item"
          for-id="purchase-item-discount"
          hint="Rupiah, dipotong dari qty × harga."
        >
          <input
            id="purchase-item-discount"
            v-model="itemForm.diskon"
            type="number"
            min="0"
            inputmode="numeric"
            class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-right tabular"
            @focus="selectOnFocus"
          />
        </FormField>

        <FormField
          v-if="expiryRequired"
          label="Expiry"
          for-id="purchase-expiry"
          hint="Tanggal expired batch ini."
          required
        >
          <input
            id="purchase-expiry"
            v-model="itemForm.expiry_date"
            type="date"
            class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100"
          />
        </FormField>

        <FormField
          label="Lot code"
          for-id="purchase-lot-code"
          :hint="`Opsional. Kosongkan untuk otomatis: ${lotPlaceholder}`"
        >
          <input
            id="purchase-lot-code"
            v-model="itemForm.lot_code"
            type="text"
            class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 uppercase"
            :placeholder="lotPlaceholder"
            autocomplete="off"
          />
        </FormField>

        <p v-if="itemError" class="rounded-xl bg-error/10 p-3 text-sm text-error">
          {{ itemError }}
        </p>

        <AppButton
          block
          :disabled="!itemForm.product_id || !itemForm.unit_id || availableUnits.length === 0"
          @click="applyItem"
        >
          <Check class="h-4 w-4" aria-hidden="true" />
          {{ editingIndex >= 0 ? 'Simpan perubahan' : 'Tambah ke pembelian' }}
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
