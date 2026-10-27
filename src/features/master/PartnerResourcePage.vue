<script setup lang="ts">
import { MapPin, Pencil, Phone, Trash2, Truck, Users } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'

import ConfirmActionSheet from '@/components/master/ConfirmActionSheet.vue'
import MasterFormSheet from '@/components/master/MasterFormSheet.vue'
import MasterToolbar from '@/components/master/MasterToolbar.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Customer, Supplier } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useUiStore } from '@/stores/ui'

type Partner = Supplier | Customer
type StatusFilter = 'all' | 'active' | 'inactive'

const props = defineProps<{
  kind: 'supplier' | 'customer'
}>()

const master = useMasterStore()
const ui = useUiStore()

const search = ref('')
const status = ref<StatusFilter>('all')
const sheetOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const editing = ref<Partner | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<Partner | null>(null)
const deleting = ref(false)

const form = reactive({
  kode: '',
  nama: '',
  telepon: '',
  alamat: '',
  catatan: '',
  status: 'active' as 'active' | 'inactive',
})

const isSupplier = computed(() => props.kind === 'supplier')
const title = computed(() => (isSupplier.value ? 'Supplier' : 'Pelanggan'))
const description = computed(() =>
  isSupplier.value
    ? 'Pemasok barang untuk transaksi pembelian.'
    : 'Pelanggan penjualan. Penjualan walk-in boleh tanpa pelanggan.',
)
const rows = computed(() => (isSupplier.value ? master.suppliers : master.customers))
const icon = computed(() => (isSupplier.value ? Truck : Users))
const codePlaceholder = computed(() => (isSupplier.value ? 'SUP-001' : 'CUST-001'))
const resourceLabel = computed(() => (isSupplier.value ? 'supplier' : 'pelanggan'))

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')

  return rows.value.filter((row) => {
    if (status.value !== 'all' && row.status !== status.value) return false
    if (!term) return true
    return [row.kode, row.nama, row.telepon, row.alamat].some((value) =>
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

function openCreate() {
  editing.value = null
  form.kode = ''
  form.nama = ''
  form.telepon = ''
  form.alamat = ''
  form.catatan = ''
  form.status = 'active'
  formError.value = ''
  sheetOpen.value = true
}

function openEdit(partner: Partner) {
  editing.value = partner
  form.kode = partner.kode
  form.nama = partner.nama
  form.telepon = partner.telepon
  form.alamat = partner.alamat
  form.catatan = partner.catatan
  form.status = partner.status
  formError.value = ''
  sheetOpen.value = true
}

async function save() {
  saving.value = true
  formError.value = ''

  try {
    if (isSupplier.value) {
      await master.saveSupplierAction({ ...form }, editing.value?.id)
    } else {
      await master.saveCustomerAction({ ...form }, editing.value?.id)
    }

    sheetOpen.value = false
    ui.notify(`${title.value} ${editing.value ? 'diperbarui' : 'ditambahkan'}.`, 'success')
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : `${title.value} gagal disimpan.`
  } finally {
    saving.value = false
  }
}

function askDelete(partner: Partner) {
  deleteTarget.value = partner
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  deleting.value = true

  try {
    const mode = isSupplier.value
      ? await master.removeSupplierAction(target.id)
      : await master.removeCustomerAction(target.id)

    deleteOpen.value = false
    ui.notify(
      mode === 'deleted'
        ? `${title.value} dihapus.`
        : `${title.value} masih dipakai transaksi dan sudah dinonaktifkan.`,
      mode === 'deleted' ? 'success' : 'warning',
      4500,
    )
  } catch (caught) {
    ui.notify(
      caught instanceof Error ? caught.message : `${title.value} gagal dihapus.`,
      'error',
      5000,
    )
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader :title="title" :subtitle="description" back-to="/master" />

    <MasterToolbar
      v-model="search"
      v-model:status="status"
      :total="rows.length"
      :filtered="filtered.length"
      add-label="Tambah"
      :placeholder="`Cari ${resourceLabel}, kode, atau telepon`"
      @add="openCreate"
    />

    <div v-if="master.loading && !master.loaded" class="space-y-3" aria-busy="true">
      <div
        v-for="index in 3"
        :key="index"
        class="h-20 animate-pulse rounded-[var(--radius-card)] bg-base-300/60"
      />
    </div>

    <p v-else-if="master.error" class="rounded-2xl bg-error/10 p-4 text-sm text-error">
      {{ master.error }}
    </p>

    <EmptyState
      v-else-if="filtered.length === 0"
      :title="`Belum ada ${resourceLabel}`"
      :description="
        isSupplier
          ? 'Tambahkan pemasok agar dapat dipilih saat pembelian.'
          : 'Tambahkan pelanggan langganan. Pelanggan walk-in tidak wajib diisi.'
      "
    >
      <template #icon>
        <component :is="icon" class="h-8 w-8" aria-hidden="true" />
      </template>
    </EmptyState>

    <div v-else class="space-y-3">
      <article v-for="partner in filtered" :key="partner.id" class="surface-card p-4">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="badge badge-sm rounded-full border-brand-navy/15 bg-brand-navy/10 font-semibold text-brand-navy"
              >
                {{ partner.kode }}
              </span>
              <span
                class="badge badge-sm rounded-full border"
                :class="
                  partner.status === 'active'
                    ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
                    : 'border-brand-border bg-base-200 text-base-content/65'
                "
              >
                {{ partner.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
            <h2 class="mt-1.5 text-sm font-semibold">{{ partner.nama }}</h2>
            <p
              v-if="partner.telepon"
              class="mt-1 flex items-center gap-1.5 text-xs text-base-content/65"
            >
              <Phone class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {{ partner.telepon }}
            </p>
            <p
              v-if="partner.alamat"
              class="mt-1 flex items-start gap-1.5 text-xs leading-5 text-base-content/65"
            >
              <MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span class="line-clamp-2">{{ partner.alamat }}</span>
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0"
              :aria-label="`Edit ${resourceLabel} ${partner.nama}`"
              @click="openEdit(partner)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
              :aria-label="`Hapus ${resourceLabel} ${partner.nama}`"
              @click="askDelete(partner)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <MasterFormSheet
      v-model="sheetOpen"
      :title="editing ? `Edit ${resourceLabel}` : `Tambah ${resourceLabel}`"
      :description="
        isSupplier
          ? 'Supplier aktif akan muncul di picker pembelian.'
          : 'Pelanggan aktif akan muncul di picker penjualan.'
      "
      :saving="saving"
      :error="formError"
      @save="save"
    >
      <FormField
        label="Kode"
        for-id="partner-code"
        :hint="`Opsional. Kosongkan untuk kode otomatis, misalnya ${codePlaceholder}.`"
      >
        <input
          id="partner-code"
          v-model="form.kode"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 uppercase"
          maxlength="20"
          autocomplete="off"
          :placeholder="codePlaceholder"
        />
      </FormField>

      <FormField label="Nama" for-id="partner-name" required>
        <input
          id="partner-name"
          v-model="form.nama"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="80"
          autocomplete="off"
          :placeholder="isSupplier ? 'CV Frozen Nusantara' : 'Warung Bu Sari'"
        />
      </FormField>

      <FormField label="Telepon" for-id="partner-phone" hint="Opsional.">
        <input
          id="partner-phone"
          v-model="form.telepon"
          type="tel"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="30"
          autocomplete="off"
          placeholder="0812-0000-0000"
        />
      </FormField>

      <FormField label="Alamat" for-id="partner-address" hint="Opsional.">
        <textarea
          id="partner-address"
          v-model="form.alamat"
          class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="200"
          placeholder="Jl. Distribusi No. 1"
        />
      </FormField>

      <FormField label="Catatan" for-id="partner-note" hint="Opsional.">
        <textarea
          id="partner-note"
          v-model="form.catatan"
          class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="200"
          placeholder="Informasi tambahan."
        />
      </FormField>

      <FormField label="Status" for-id="partner-status">
        <select
          id="partner-status"
          v-model="form.status"
          class="select select-bordered min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </FormField>
    </MasterFormSheet>

    <ConfirmActionSheet
      v-model="deleteOpen"
      :title="`Hapus ${resourceLabel} ${deleteTarget?.nama ?? ''}?`"
      description="Jika sudah dipakai transaksi, data tidak dihapus tetapi dinonaktifkan agar histori tetap utuh."
      confirm-label="Hapus / nonaktifkan"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
