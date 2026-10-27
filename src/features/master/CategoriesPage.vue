<script setup lang="ts">
import { Pencil, Tags, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'

import ConfirmActionSheet from '@/components/master/ConfirmActionSheet.vue'
import MasterFormSheet from '@/components/master/MasterFormSheet.vue'
import MasterToolbar from '@/components/master/MasterToolbar.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { ProductCategory } from '@/db/schema'
import { useMasterStore } from '@/stores/master'
import { useUiStore } from '@/stores/ui'

type StatusFilter = 'all' | 'active' | 'inactive'

const master = useMasterStore()
const ui = useUiStore()

const search = ref('')
const status = ref<StatusFilter>('all')
const sheetOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const editing = ref<ProductCategory | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ProductCategory | null>(null)
const deleting = ref(false)

const form = reactive({
  kode: '',
  nama: '',
  deskripsi: '',
  status: 'active' as 'active' | 'inactive',
})

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')

  return master.categories.filter((category) => {
    if (status.value !== 'all' && category.status !== status.value) return false
    if (!term) return true
    return [category.kode, category.nama, category.deskripsi].some((value) =>
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
  form.deskripsi = ''
  form.status = 'active'
  formError.value = ''
  sheetOpen.value = true
}

function openEdit(category: ProductCategory) {
  editing.value = category
  form.kode = category.kode
  form.nama = category.nama
  form.deskripsi = category.deskripsi
  form.status = category.status
  formError.value = ''
  sheetOpen.value = true
}

async function save() {
  saving.value = true
  formError.value = ''

  try {
    await master.saveCategoryAction({ ...form }, editing.value?.id)
    sheetOpen.value = false
    ui.notify(editing.value ? 'Kategori diperbarui.' : 'Kategori ditambahkan.', 'success')
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Kategori gagal disimpan.'
  } finally {
    saving.value = false
  }
}

function askDelete(category: ProductCategory) {
  deleteTarget.value = category
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  deleting.value = true

  try {
    const mode = await master.removeCategoryAction(target.id)
    deleteOpen.value = false
    ui.notify(
      mode === 'deleted'
        ? 'Kategori dihapus.'
        : 'Kategori masih dipakai produk dan sudah dinonaktifkan.',
      mode === 'deleted' ? 'success' : 'warning',
      4500,
    )
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Kategori gagal dihapus.', 'error', 5000)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Kategori produk"
      subtitle="Kode kategori menjadi prefix kode produk otomatis."
      back-to="/master"
    />

    <MasterToolbar
      v-model="search"
      v-model:status="status"
      :total="master.categories.length"
      :filtered="filtered.length"
      add-label="Tambah"
      placeholder="Cari kode atau nama kategori"
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
      title="Belum ada kategori"
      description="Tambahkan kategori seperti Frozen Food atau Bahan Pendamping."
    >
      <template #icon>
        <Tags class="h-8 w-8" aria-hidden="true" />
      </template>
    </EmptyState>

    <div v-else class="space-y-3">
      <article v-for="category in filtered" :key="category.id" class="surface-card p-4">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="badge badge-sm rounded-full border-brand-navy/15 bg-brand-navy/10 font-semibold text-brand-navy"
              >
                {{ category.kode }}
              </span>
              <span
                class="badge badge-sm rounded-full border"
                :class="
                  category.status === 'active'
                    ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
                    : 'border-brand-border bg-base-200 text-base-content/65'
                "
              >
                {{ category.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
            <h2 class="mt-1.5 text-sm font-semibold">{{ category.nama }}</h2>
            <p v-if="category.deskripsi" class="mt-1 text-xs leading-5 text-base-content/65">
              {{ category.deskripsi }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0"
              :aria-label="`Edit kategori ${category.nama}`"
              @click="openEdit(category)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
              :aria-label="`Hapus kategori ${category.nama}`"
              @click="askDelete(category)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <MasterFormSheet
      v-model="sheetOpen"
      :title="editing ? 'Edit kategori' : 'Tambah kategori'"
      description="Kategori dipakai untuk mengelompokkan produk dan membuat kode produk otomatis."
      :saving="saving"
      :error="formError"
      @save="save"
    >
      <FormField
        label="Kode"
        for-id="category-code"
        required
        hint="2–20 karakter, otomatis menjadi huruf besar."
      >
        <input
          id="category-code"
          v-model="form.kode"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 uppercase"
          maxlength="20"
          autocomplete="off"
          placeholder="FRZ"
        />
      </FormField>

      <FormField label="Nama kategori" for-id="category-name" required>
        <input
          id="category-name"
          v-model="form.nama"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="80"
          autocomplete="off"
          placeholder="Frozen Food"
        />
      </FormField>

      <FormField label="Deskripsi" for-id="category-description" hint="Opsional.">
        <textarea
          id="category-description"
          v-model="form.deskripsi"
          class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="200"
          placeholder="Produk beku siap jual."
        />
      </FormField>

      <FormField label="Status" for-id="category-status">
        <select
          id="category-status"
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
      :title="`Hapus kategori ${deleteTarget?.nama ?? ''}?`"
      description="Jika kategori sudah dipakai produk, data tidak dihapus tetapi dinonaktifkan."
      confirm-label="Hapus / nonaktifkan"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
