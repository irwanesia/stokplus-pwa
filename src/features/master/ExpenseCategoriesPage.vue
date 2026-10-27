<script setup lang="ts">
import { Pencil, Trash2, WalletCards } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'

import ConfirmActionSheet from '@/components/master/ConfirmActionSheet.vue'
import MasterFormSheet from '@/components/master/MasterFormSheet.vue'
import MasterToolbar from '@/components/master/MasterToolbar.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { ExpenseCategory } from '@/db/schema'
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
const editing = ref<ExpenseCategory | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ExpenseCategory | null>(null)
const deleting = ref(false)

const form = reactive({
  kode: '',
  nama: '',
  deskripsi: '',
  status: 'active' as 'active' | 'inactive',
})

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')

  return master.expenseCategories.filter((category) => {
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

function openEdit(category: ExpenseCategory) {
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
    await master.saveExpenseCategoryAction({ ...form }, editing.value?.id)
    sheetOpen.value = false
    ui.notify(
      editing.value ? 'Kategori beban diperbarui.' : 'Kategori beban ditambahkan.',
      'success',
    )
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Kategori beban gagal disimpan.'
  } finally {
    saving.value = false
  }
}

function askDelete(category: ExpenseCategory) {
  deleteTarget.value = category
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  deleting.value = true

  try {
    const mode = await master.removeExpenseCategoryAction(target.id)
    deleteOpen.value = false
    ui.notify(
      mode === 'deleted'
        ? 'Kategori beban dihapus.'
        : 'Kategori beban masih dipakai dan sudah dinonaktifkan.',
      mode === 'deleted' ? 'success' : 'warning',
      4500,
    )
  } catch (caught) {
    ui.notify(
      caught instanceof Error ? caught.message : 'Kategori beban gagal dihapus.',
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
    <PageHeader
      title="Kategori beban"
      subtitle="Beban operasional seperti listrik, sewa, freezer, dan gaji."
      back-to="/master"
    />

    <div class="rounded-2xl border border-brand-copper/20 bg-brand-copper/10 p-4">
      <p class="text-sm leading-6 text-base-content/70">
        Beban operasional dicatat terpisah dari HPP. Laba bersih = laba kotor − kerugian persediaan
        − beban operasional.
      </p>
    </div>

    <MasterToolbar
      v-model="search"
      v-model:status="status"
      :total="master.expenseCategories.length"
      :filtered="filtered.length"
      add-label="Tambah"
      placeholder="Cari kode atau nama kategori beban"
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
      title="Belum ada kategori beban"
      description="Tambahkan Listrik & Air, Sewa Tempat, Operasional, atau Gaji."
    >
      <template #icon>
        <WalletCards class="h-8 w-8" aria-hidden="true" />
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
              :aria-label="`Edit kategori beban ${category.nama}`"
              @click="openEdit(category)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
              :aria-label="`Hapus kategori beban ${category.nama}`"
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
      :title="editing ? 'Edit kategori beban' : 'Tambah kategori beban'"
      description="Kategori beban dipakai transaksi beban operasional dan laporan laba bersih."
      :saving="saving"
      :error="formError"
      @save="save"
    >
      <FormField
        label="Kode"
        for-id="expense-category-code"
        hint="Opsional. Kosongkan untuk kode otomatis, misalnya BB-001."
      >
        <input
          id="expense-category-code"
          v-model="form.kode"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100 uppercase"
          maxlength="20"
          autocomplete="off"
          placeholder="BB-001"
        />
      </FormField>

      <FormField label="Nama kategori" for-id="expense-category-name" required>
        <input
          id="expense-category-name"
          v-model="form.nama"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="80"
          autocomplete="off"
          placeholder="Listrik & Air"
        />
      </FormField>

      <FormField label="Deskripsi" for-id="expense-category-description" hint="Opsional.">
        <textarea
          id="expense-category-description"
          v-model="form.deskripsi"
          class="textarea textarea-bordered min-h-20 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="200"
          placeholder="Listrik, air, dan freezer."
        />
      </FormField>

      <FormField label="Status" for-id="expense-category-status">
        <select
          id="expense-category-status"
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
      :title="`Hapus kategori beban ${deleteTarget?.nama ?? ''}?`"
      description="Jika sudah dipakai transaksi beban, data tidak dihapus tetapi dinonaktifkan."
      confirm-label="Hapus / nonaktifkan"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
