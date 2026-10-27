<script setup lang="ts">
import { AlertTriangle, ArrowLeft, Boxes, LockKeyhole, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import type { ProductUnit } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'
import type { ProductActivity, ProductDraft, ProductUnitDraft } from '@/master/types'
import {
  toBaseQuantity,
  unitRowError,
  validateInteger,
  validateProductUnits,
} from '@/master/validation'
import { formatQty, toNumber } from '@/utils/format'
import { selectOnFocus } from '@/utils/input'

const master = useMasterStore()
const session = useSessionStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const productId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const isEdit = computed(() => Boolean(productId.value && productId.value !== 'baru'))

const initializing = ref(true)
const notFound = ref(false)
const saving = ref(false)
const activity = ref<ProductActivity | null>(null)
const unitRows = ref<ProductUnitDraft[]>([])
const rowErrors = ref<Record<number, string>>({})
const formError = ref('')
const suggestedCode = ref('')
const errors = reactive<Record<string, string>>({})

const form = reactive({
  kode: '',
  nama: '',
  kategori_id: '',
  base_unit_id: '',
  track_expiry: false,
  expiry_alert_days: 30,
  min_stock_base: 0,
  status: 'active' as 'active' | 'inactive',
  opening_stock_base: 0,
  opening_expiry_date: '',
  opening_lot_code: '',
})

const locked = computed(() => Boolean(activity.value?.hasActivity))
const categoryOptions = computed(() => {
  const options = [...master.activeCategories]
  const current = master.categories.find((category) => category.id === form.kategori_id)
  if (current && current.status !== 'active') options.push(current)
  return options
})
const baseUnitOptions = computed(() => {
  const options = [...master.activeUnits]
  const current = master.units.find((unit) => unit.id === form.base_unit_id)
  if (current && current.status !== 'active') options.push(current)
  return options
})
const canCreate = computed(
  () => master.activeCategories.length > 0 && master.activeUnits.length > 0,
)
const baseSymbol = computed(() => master.unitSymbol(form.base_unit_id))
const openingStockNumber = computed(() => toNumber(form.opening_stock_base))
const showOpeningExpiry = computed(
  () => !isEdit.value && form.track_expiry && openingStockNumber.value > 0,
)

function makeRow(unitId: string): ProductUnitDraft {
  const isBase = unitId === form.base_unit_id
  return {
    unit_id: unitId,
    conversion_qty: isBase ? 1 : 1,
    is_base: isBase,
    can_purchase: isBase,
    can_sell: isBase,
    is_default_purchase: isBase,
    is_default_sale: isBase,
    harga_beli_default: 0,
    harga_jual: 0,
    barcode: '',
    status: 'active',
  }
}

function rowFromStored(row: ProductUnit): ProductUnitDraft {
  return {
    id: row.id,
    unit_id: row.unit_id,
    conversion_qty: row.conversion_qty,
    is_base: row.is_base,
    can_purchase: row.can_purchase,
    can_sell: row.can_sell,
    is_default_purchase: row.is_default_purchase,
    is_default_sale: row.is_default_sale,
    harga_beli_default: row.harga_beli_default,
    harga_jual: row.harga_jual,
    barcode: row.barcode ?? '',
    status: row.status,
  }
}

function availableUnitsFor(row: ProductUnitDraft) {
  const used = new Set(unitRows.value.filter((item) => item !== row).map((item) => item.unit_id))
  return master.units.filter(
    (unit) => (unit.status === 'active' || unit.id === row.unit_id) && !used.has(unit.id),
  )
}

function updateSuggestedCode() {
  if (!form.kategori_id || isEdit.value) {
    suggestedCode.value = ''
    return
  }

  void master
    .nextProductCode(form.kategori_id)
    .then((code) => {
      suggestedCode.value = code
    })
    .catch(() => {
      suggestedCode.value = ''
    })
}

function onCategoryChange() {
  updateSuggestedCode()
}

function onBaseUnitChange() {
  if (!form.base_unit_id) return

  let baseRow = unitRows.value.find((row) => row.unit_id === form.base_unit_id)
  if (!baseRow) {
    baseRow = makeRow(form.base_unit_id)
    unitRows.value.push(baseRow)
  }

  for (const row of unitRows.value) {
    row.is_base = row.unit_id === form.base_unit_id
    if (row.is_base) {
      row.conversion_qty = 1
      row.status = 'active'
    }
  }
}

function onUnitChange(row: ProductUnitDraft) {
  row.is_base = row.unit_id === form.base_unit_id
}

function addUnit() {
  const used = new Set(unitRows.value.map((row) => row.unit_id))
  const next = master.activeUnits.find((unit) => !used.has(unit.id))

  if (!next) {
    ui.notify('Semua satuan aktif sudah dipakai produk ini.', 'warning')
    return
  }

  const row = makeRow(next.id)
  row.can_sell = false
  row.is_default_sale = false
  unitRows.value.push(row)
}

function removeUnit(index: number) {
  const row = unitRows.value[index]
  if (!row) return

  if (row.unit_id === form.base_unit_id || row.is_base) {
    ui.notify('Base unit tidak dapat dihapus.', 'warning')
    return
  }

  if (locked.value && row.id) {
    ui.notify(
      'Satuan yang sudah tersimpan tidak dapat dihapus setelah produk memiliki transaksi atau lot. Nonaktifkan saja.',
      'warning',
      5000,
    )
    return
  }

  unitRows.value.splice(index, 1)
}

function setDefault(row: ProductUnitDraft, kind: 'purchase' | 'sale', checked: boolean) {
  if (kind === 'purchase') {
    if (checked) {
      row.can_purchase = true
      for (const item of unitRows.value) item.is_default_purchase = false
      row.is_default_purchase = true
    } else {
      row.is_default_purchase = false
    }
    return
  }

  if (checked) {
    row.can_sell = true
    for (const item of unitRows.value) item.is_default_sale = false
    row.is_default_sale = true
  } else {
    row.is_default_sale = false
  }
}

function onCanPurchaseChange(row: ProductUnitDraft) {
  if (!row.can_purchase) row.is_default_purchase = false
}

function onCanSellChange(row: ProductUnitDraft) {
  if (!row.can_sell) row.is_default_sale = false
}

function clearErrors() {
  for (const key of Object.keys(errors)) {
    delete errors[key]
  }
  rowErrors.value = {}
  formError.value = ''
}

function validateForm(): boolean {
  clearErrors()
  let valid = true

  if (!form.nama.trim()) {
    errors.nama = 'Nama produk wajib diisi.'
    valid = false
  }

  if (!form.kategori_id) {
    errors.kategori_id = 'Kategori produk wajib dipilih.'
    valid = false
  }

  if (!form.base_unit_id) {
    errors.base_unit_id = 'Base unit wajib dipilih.'
    valid = false
  }

  const minStockError = validateInteger(form.min_stock_base, 'Minimum stok', { min: 0 })
  if (minStockError) {
    errors.min_stock_base = minStockError
    valid = false
  }

  if (!isEdit.value) {
    const openingError = validateInteger(form.opening_stock_base, 'Stok awal', { min: 0 })
    if (openingError) {
      errors.opening_stock_base = openingError
      valid = false
    }
  }

  if (form.track_expiry) {
    const alertError = validateInteger(form.expiry_alert_days, 'Peringatan expiry', {
      min: 0,
      max: 3650,
    })
    if (alertError) {
      errors.expiry_alert_days = alertError
      valid = false
    }

    if (showOpeningExpiry.value && !form.opening_expiry_date) {
      errors.opening_expiry_date =
        'Expiry wajib diisi untuk produk ber-expiry yang memiliki stok awal.'
      valid = false
    }
  }

  if (unitRows.value.length === 0) {
    errors.units = 'Minimal satu satuan produk wajib diisi.'
    valid = false
  }

  const normalizedRows = unitRows.value.map((row) => ({
    ...row,
    is_base: row.unit_id === form.base_unit_id,
    conversion_qty: toNumber(row.conversion_qty),
    harga_beli_default: toNumber(row.harga_beli_default),
    harga_jual: toNumber(row.harga_jual),
    barcode: row.barcode.trim(),
  }))

  const seen = new Set<string>()
  normalizedRows.forEach((row, index) => {
    if (row.unit_id && seen.has(row.unit_id)) {
      rowErrors.value[index] = 'Satuan yang sama tidak boleh dipilih dua kali.'
      valid = false
      return
    }

    seen.add(row.unit_id)
    const rowError = unitRowError(row, form.base_unit_id)
    if (rowError) {
      rowErrors.value[index] = rowError
      valid = false
    }
  })

  const purchaseCandidates = normalizedRows.filter((row) => row.can_purchase)
  if (
    purchaseCandidates.length > 0 &&
    purchaseCandidates.every((row) => !row.is_default_purchase)
  ) {
    purchaseCandidates[0]!.is_default_purchase = true
  }

  const saleCandidates = normalizedRows.filter((row) => row.can_sell)
  if (saleCandidates.length > 0 && saleCandidates.every((row) => !row.is_default_sale)) {
    saleCandidates[0]!.is_default_sale = true
  }

  const unitError = validateProductUnits(normalizedRows, form.base_unit_id)
  if (unitError) {
    errors.units = unitError
    valid = false
  }

  if (!valid) {
    formError.value = 'Periksa kembali data yang ditandai.'
  }

  return valid
}

function buildDraft(): ProductDraft {
  return {
    kode: form.kode.trim(),
    nama: form.nama.trim(),
    kategori_id: form.kategori_id,
    base_unit_id: form.base_unit_id,
    track_expiry: form.track_expiry,
    expiry_alert_days: form.track_expiry ? toNumber(form.expiry_alert_days, 30) : null,
    min_stock_base: toNumber(form.min_stock_base),
    status: form.status,
    units: unitRows.value.map((row) => ({
      ...row,
      is_base: row.unit_id === form.base_unit_id,
      conversion_qty: toNumber(row.conversion_qty),
      harga_beli_default: toNumber(row.harga_beli_default),
      harga_jual: toNumber(row.harga_jual),
      barcode: row.barcode.trim(),
    })),
    opening_stock_base: isEdit.value ? 0 : toNumber(form.opening_stock_base),
    opening_expiry_date: form.track_expiry ? form.opening_expiry_date : '',
    opening_lot_code: form.opening_lot_code.trim(),
  }
}

async function save() {
  if (!validateForm()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  saving.value = true
  formError.value = ''

  try {
    const result = await master.saveProductAction(
      buildDraft(),
      isEdit.value ? productId.value : undefined,
    )
    ui.notify(
      result.mode === 'created'
        ? 'Produk dibuat. Stok awal dan lot tersimpan.'
        : 'Produk diperbarui.',
      'success',
    )
    await router.push('/master/produk')
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Produk gagal disimpan.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    saving.value = false
  }
}

async function initialize() {
  initializing.value = true
  notFound.value = false
  formError.value = ''

  try {
    await master.load()

    if (isEdit.value) {
      const current = master.products.find((row) => row.id === productId.value)
      if (!current) {
        notFound.value = true
        return
      }

      activity.value = await master.productActivity(current.id)
      form.kode = current.kode
      form.nama = current.nama
      form.kategori_id = current.kategori_id
      form.base_unit_id = current.base_unit_id
      form.track_expiry = current.track_expiry
      form.expiry_alert_days = current.expiry_alert_days ?? 30
      form.min_stock_base = current.min_stock_base
      form.status = current.status
      form.opening_stock_base = 0
      form.opening_expiry_date = ''
      form.opening_lot_code = ''
      unitRows.value = master.unitsForProduct(current.id).map(rowFromStored)
      return
    }

    const firstCategory = master.activeCategories[0]
    form.kategori_id = firstCategory?.id ?? ''
    form.base_unit_id = ''
    form.expiry_alert_days = Number(session.settings.expiry_alert_default_days) || 30
    unitRows.value = []
    updateSuggestedCode()
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Data produk gagal dimuat.'
  } finally {
    initializing.value = false
  }
}

onMounted(initialize)
</script>

<template>
  <div class="page-stack">
    <PageHeader
      :title="isEdit ? 'Edit produk' : 'Tambah produk'"
      subtitle="Base unit adalah satuan terkecil. Satuan lain memakai konversi bilangan bulat."
      back-to="/master/produk"
    >
      <template #actions>
        <span
          v-if="locked"
          class="badge gap-1 rounded-full border-brand-copper/20 bg-brand-copper/10 px-3 py-3 text-[11px] font-semibold text-brand-copper"
        >
          <LockKeyhole class="h-3.5 w-3.5" aria-hidden="true" />
          Terkunci
        </span>
      </template>
    </PageHeader>

    <div
      v-if="initializing"
      class="space-y-3"
      role="group"
      aria-busy="true"
      aria-label="Memuat form produk"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-28 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>

    <AppCard v-else-if="notFound" title="Produk tidak ditemukan">
      <p class="text-sm leading-6 text-base-content/65">
        Produk mungkin sudah dihapus. Kembali ke daftar produk.
      </p>
      <RouterLink to="/master/produk" class="btn btn-primary mt-4 rounded-[var(--radius-control)]">
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        Kembali
      </RouterLink>
    </AppCard>

    <template v-else>
      <div
        v-if="formError"
        class="flex items-start gap-3 rounded-2xl border border-error/20 bg-error/10 p-4"
        role="alert"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
        <p class="text-sm leading-6 text-error">{{ formError }}</p>
      </div>

      <div
        v-if="!isEdit && !canCreate"
        class="rounded-2xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm leading-6 text-base-content/70"
      >
        <p class="font-semibold text-base-content">Kategori dan satuan belum lengkap.</p>
        <p class="mt-1">
          Buat minimal satu kategori produk dan satu satuan aktif sebelum menyimpan produk.
        </p>
      </div>

      <div
        v-if="locked"
        class="flex items-start gap-3 rounded-2xl border border-brand-copper/20 bg-brand-copper/10 p-4"
      >
        <LockKeyhole class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
        <div class="min-w-0 text-sm leading-6 text-base-content/70">
          <p class="font-semibold text-base-content">Base unit dan konversi terkunci</p>
          <p class="mt-1">
            Produk sudah memiliki stok, lot, atau transaksi. Base unit dan faktor konversi tidak
            dapat diubah. Harga, status, barcode, dan satuan baru masih dapat diperbarui.
          </p>
        </div>
      </div>

      <AppCard title="Identitas produk">
        <div class="space-y-4">
          <FormField
            label="Kode produk"
            for-id="product-code"
            :hint="
              isEdit
                ? 'Kode tetap dapat diedit selama unik.'
                : suggestedCode
                  ? `Kosongkan untuk otomatis memakai ${suggestedCode}.`
                  : 'Kosongkan untuk otomatis dari kode kategori.'
            "
          >
            <input
              id="product-code"
              v-model="form.kode"
              type="text"
              class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 uppercase"
              maxlength="20"
              autocomplete="off"
              :placeholder="suggestedCode || 'Otomatis'"
            />
          </FormField>

          <FormField label="Nama produk" for-id="product-name" required :error="errors.nama">
            <input
              id="product-name"
              v-model="form.nama"
              type="text"
              class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
              maxlength="100"
              autocomplete="off"
              placeholder="Siomay Ayam"
            />
          </FormField>

          <FormField
            label="Kategori"
            for-id="product-category"
            required
            :error="errors.kategori_id"
          >
            <select
              id="product-category"
              v-model="form.kategori_id"
              class="select select-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
              @change="onCategoryChange"
            >
              <option value="" disabled>Pilih kategori</option>
              <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
                {{ category.nama }}{{ category.status === 'inactive' ? ' (nonaktif)' : '' }}
              </option>
            </select>
          </FormField>

          <FormField
            label="Base unit"
            for-id="product-base-unit"
            required
            :error="errors.base_unit_id"
            :hint="
              locked
                ? 'Terkunci karena produk sudah memiliki stok, lot, atau transaksi.'
                : 'Pilih satuan terkecil, misalnya pcs atau gram.'
            "
          >
            <select
              id="product-base-unit"
              v-model="form.base_unit_id"
              class="select select-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
              :disabled="locked"
              @change="onBaseUnitChange"
            >
              <option value="" disabled>Pilih base unit</option>
              <option v-for="unit in baseUnitOptions" :key="unit.id" :value="unit.id">
                {{ unit.nama }}{{ unit.simbol ? ` (${unit.simbol})` : ''
                }}{{ unit.status === 'inactive' ? ' (nonaktif)' : '' }}
              </option>
            </select>
          </FormField>

          <FormField label="Status" for-id="product-status">
            <select
              id="product-status"
              v-model="form.status"
              class="select select-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </FormField>
        </div>
      </AppCard>

      <AppCard
        title="Stok & expiry"
        subtitle="Stok berubah hanya melalui transaksi, opname, atau write-off."
      >
        <div class="space-y-4">
          <FormField
            label="Minimum stok"
            for-id="product-min-stock"
            :error="errors.min_stock_base"
            :hint="`Dalam base unit (${baseSymbol}).`"
          >
            <div class="join w-full">
              <input
                id="product-min-stock"
                v-model.number="form.min_stock_base"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                class="input join-item min-h-12 w-full rounded-l-[var(--radius-control)] border-brand-border bg-base-100 tabular"
                @focus="selectOnFocus"
              />
              <span
                class="join-item flex min-h-12 items-center border border-brand-border bg-base-200 px-3 text-sm font-medium text-base-content/65"
              >
                {{ baseSymbol }}
              </span>
            </div>
          </FormField>

          <div
            class="flex items-center justify-between gap-4 rounded-2xl border border-brand-border bg-base-200/50 p-4"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium">Track expiry</p>
              <p class="mt-0.5 text-xs leading-5 text-base-content/65">
                Wajib untuk frozen food. Lot tanpa expiry akan dikarantina pada fase stok.
              </p>
            </div>
            <input
              id="product-track-expiry"
              v-model="form.track_expiry"
              type="checkbox"
              class="toggle toggle-primary shrink-0"
              aria-label="Aktifkan track expiry"
            />
          </div>

          <FormField
            v-if="form.track_expiry"
            label="Peringatan expiry (hari)"
            for-id="product-expiry-alert"
            :error="errors.expiry_alert_days"
            hint="Default 30 hari. Bisa diubah per produk."
          >
            <input
              id="product-expiry-alert"
              v-model.number="form.expiry_alert_days"
              type="number"
              min="0"
              max="3650"
              step="1"
              inputmode="numeric"
              class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 tabular"
              @focus="selectOnFocus"
            />
          </FormField>

          <template v-if="!isEdit">
            <div class="border-t border-brand-border pt-4">
              <div class="flex items-center gap-2">
                <Boxes class="h-4 w-4 text-brand-copper" aria-hidden="true" />
                <h3 class="text-sm font-semibold">Stok awal</h3>
              </div>
              <p class="mt-1 text-xs leading-5 text-base-content/65">
                Stok awal membuat satu opening lot. Setelah tersimpan, base unit dan konversi
                terkunci.
              </p>

              <div class="mt-3 space-y-4">
                <FormField
                  label="Qty stok awal"
                  for-id="product-opening-stock"
                  :error="errors.opening_stock_base"
                  :hint="`Dalam base unit (${baseSymbol}).`"
                >
                  <div class="join w-full">
                    <input
                      id="product-opening-stock"
                      v-model.number="form.opening_stock_base"
                      type="number"
                      min="0"
                      step="1"
                      inputmode="numeric"
                      class="input join-item min-h-12 w-full rounded-l-[var(--radius-control)] border-brand-border bg-base-100 tabular"
                      @focus="selectOnFocus"
                    />
                    <span
                      class="join-item flex min-h-12 items-center border border-brand-border bg-base-200 px-3 text-sm font-medium text-base-content/65"
                    >
                      {{ baseSymbol }}
                    </span>
                  </div>
                </FormField>

                <FormField
                  v-if="showOpeningExpiry"
                  label="Expiry stok awal"
                  for-id="product-opening-expiry"
                  required
                  :error="errors.opening_expiry_date"
                  hint="Wajib untuk produk track expiry."
                >
                  <input
                    id="product-opening-expiry"
                    v-model="form.opening_expiry_date"
                    type="date"
                    class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
                  />
                </FormField>

                <FormField
                  v-if="openingStockNumber > 0"
                  label="Kode lot awal"
                  for-id="product-opening-lot"
                  hint="Opsional. Kosongkan untuk kode otomatis OPEN-{kode}-{tanggal}."
                >
                  <input
                    id="product-opening-lot"
                    v-model="form.opening_lot_code"
                    type="text"
                    class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 uppercase"
                    maxlength="40"
                    autocomplete="off"
                    placeholder="OPEN-SIO-20261025"
                  />
                </FormField>
              </div>
            </div>
          </template>
        </div>
      </AppCard>

      <AppCard
        title="Satuan & harga"
        subtitle="Satu base unit wajib ada. Centang Bisa dibeli minimal satu satuan agar produk muncul di Pembelian."
      >
        <div class="space-y-3">
          <div
            v-if="errors.units"
            class="rounded-xl border border-error/20 bg-error/10 p-3 text-xs leading-5 text-error"
            role="alert"
          >
            {{ errors.units }}
          </div>

          <article
            v-for="(row, index) in unitRows"
            :key="row.id ?? `${row.unit_id}-${index}`"
            class="rounded-2xl border border-brand-border bg-base-200/35 p-3"
          >
            <div class="flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <label :for="`unit-select-${index}`" class="sr-only">Satuan</label>
                <select
                  :id="`unit-select-${index}`"
                  v-model="row.unit_id"
                  class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-sm"
                  :disabled="row.is_base || row.unit_id === form.base_unit_id"
                  @change="onUnitChange(row)"
                >
                  <option v-for="unit in availableUnitsFor(row)" :key="unit.id" :value="unit.id">
                    {{ unit.nama }}{{ unit.simbol ? ` (${unit.simbol})` : '' }}
                  </option>
                </select>
              </div>
              <span
                v-if="row.is_base"
                class="badge shrink-0 rounded-full border-brand-navy/15 bg-brand-navy/10 text-xs font-semibold text-brand-navy"
              >
                Base
              </span>
              <button
                v-else
                type="button"
                class="btn btn-ghost btn-sm h-9 w-9 shrink-0 rounded-full p-0 text-error"
                :aria-label="`Hapus satuan ${master.unitName(row.unit_id)}`"
                @click="removeUnit(index)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p class="mt-2 text-[11px] text-base-content/65">
              1 {{ master.unitSymbol(row.unit_id) }} =
              {{ formatQty(toBaseQuantity(1, row.conversion_qty) ?? row.conversion_qty) }}
              {{ baseSymbol }}
            </p>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <FormField
                label="Konversi ke base"
                :for-id="`unit-conversion-${index}`"
                :error="rowErrors[index]"
              >
                <input
                  :id="`unit-conversion-${index}`"
                  v-model.number="row.conversion_qty"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 tabular"
                  :disabled="row.is_base || (locked && Boolean(row.id))"
                  @focus="selectOnFocus"
                />
              </FormField>

              <FormField label="Status" :for-id="`unit-status-${index}`">
                <select
                  :id="`unit-status-${index}`"
                  v-model="row.status"
                  class="select select-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 text-sm"
                  :disabled="row.is_base"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </FormField>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2">
              <FormField label="Harga beli default" :for-id="`unit-purchase-price-${index}`">
                <input
                  :id="`unit-purchase-price-${index}`"
                  v-model.number="row.harga_beli_default"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 tabular"
                  placeholder="0"
                  @focus="selectOnFocus"
                />
              </FormField>

              <FormField label="Harga jual" :for-id="`unit-sale-price-${index}`">
                <input
                  :id="`unit-sale-price-${index}`"
                  v-model.number="row.harga_jual"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 tabular"
                  placeholder="0"
                  @focus="selectOnFocus"
                />
              </FormField>
            </div>

            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <label class="label cursor-pointer justify-start gap-2 p-0">
                <input
                  v-model="row.can_purchase"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  @change="onCanPurchaseChange(row)"
                />
                <span class="label-text text-xs text-base-content/70">Bisa dibeli</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2 p-0">
                <input
                  v-model="row.can_sell"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  @change="onCanSellChange(row)"
                />
                <span class="label-text text-xs text-base-content/70">Bisa dijual</span>
              </label>
              <label v-if="row.can_purchase" class="label cursor-pointer justify-start gap-2 p-0">
                <input
                  :checked="row.is_default_purchase"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  @change="setDefault(row, 'purchase', ($event.target as HTMLInputElement).checked)"
                />
                <span class="label-text text-xs font-medium text-brand-copper">Default beli</span>
              </label>
              <label v-if="row.can_sell" class="label cursor-pointer justify-start gap-2 p-0">
                <input
                  :checked="row.is_default_sale"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  @change="setDefault(row, 'sale', ($event.target as HTMLInputElement).checked)"
                />
                <span class="label-text text-xs font-medium text-brand-copper">Default jual</span>
              </label>
            </div>

            <FormField
              label="Barcode"
              :for-id="`unit-barcode-${index}`"
              hint="Opsional, unik jika diisi."
            >
              <input
                :id="`unit-barcode-${index}`"
                v-model="row.barcode"
                type="text"
                class="input input-bordered mt-0 min-h-11 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 font-mono text-sm"
                maxlength="64"
                autocomplete="off"
                placeholder="8991234567890"
              />
            </FormField>
          </article>

          <AppButton variant="secondary" block @click="addUnit">
            <Plus class="h-4 w-4" aria-hidden="true" />
            Tambah satuan
          </AppButton>
        </div>
      </AppCard>

      <div class="flex gap-3">
        <RouterLink
          to="/master/produk"
          class="btn btn-ghost min-h-11 flex-1 rounded-[var(--radius-control)] font-semibold"
        >
          Batal
        </RouterLink>
        <AppButton
          class="flex-[2]"
          :loading="saving"
          :disabled="!isEdit && !canCreate"
          @click="save"
        >
          {{ isEdit ? 'Simpan perubahan' : 'Simpan produk' }}
        </AppButton>
      </div>
    </template>
  </div>
</template>
