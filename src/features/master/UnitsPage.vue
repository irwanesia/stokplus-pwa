<script setup lang="ts">
import { Pencil, Ruler, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'

import ConfirmActionSheet from '@/components/master/ConfirmActionSheet.vue'
import MasterFormSheet from '@/components/master/MasterFormSheet.vue'
import MasterToolbar from '@/components/master/MasterToolbar.vue'
import FormField from '@/components/forms/FormField.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Unit } from '@/db/schema'
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
const editing = ref<Unit | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<Unit | null>(null)
const deleting = ref(false)

const form = reactive({
  nama: '',
  simbol: '',
  status: 'active' as 'active' | 'inactive',
})

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id')

  return master.units.filter((unit) => {
    if (status.value !== 'all' && unit.status !== status.value) return false
    if (!term) return true
    return [unit.nama, unit.simbol ?? ''].some((value) =>
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
  form.nama = ''
  form.simbol = ''
  form.status = 'active'
  formError.value = ''
  sheetOpen.value = true
}

function openEdit(unit: Unit) {
  editing.value = unit
  form.nama = unit.nama
  form.simbol = unit.simbol ?? ''
  form.status = unit.status
  formError.value = ''
  sheetOpen.value = true
}

async function save() {
  saving.value = true
  formError.value = ''

  try {
    await master.saveUnitAction({ ...form }, editing.value?.id)
    sheetOpen.value = false
    ui.notify(editing.value ? 'Satuan diperbarui.' : 'Satuan ditambahkan.', 'success')
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : 'Satuan gagal disimpan.'
  } finally {
    saving.value = false
  }
}

function askDelete(unit: Unit) {
  deleteTarget.value = unit
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  deleting.value = true

  try {
    const mode = await master.removeUnitAction(target.id)
    deleteOpen.value = false
    ui.notify(
      mode === 'deleted'
        ? 'Satuan dihapus.'
        : 'Satuan masih dipakai produk dan sudah dinonaktifkan.',
      mode === 'deleted' ? 'success' : 'warning',
      4500,
    )
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Satuan gagal dihapus.', 'error', 5000)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Satuan global"
      subtitle="Satuan dasar dan satuan turunan yang dapat dipakai produk."
      back-to="/master"
    />

    <MasterToolbar
      v-model="search"
      v-model:status="status"
      :total="master.units.length"
      :filtered="filtered.length"
      add-label="Tambah"
      placeholder="Cari nama atau simbol satuan"
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
      title="Belum ada satuan"
      description="Tambahkan gram, pcs, pack, dus, kg, atau satuan lain yang dipakai usaha."
    >
      <template #icon>
        <Ruler class="h-8 w-8" aria-hidden="true" />
      </template>
    </EmptyState>

    <div v-else class="space-y-3">
      <article v-for="unit in filtered" :key="unit.id" class="surface-card p-4">
        <div class="flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold">{{ unit.nama }}</h2>
              <span
                v-if="unit.simbol"
                class="badge badge-sm rounded-full border-brand-navy/15 bg-brand-navy/10 font-semibold text-brand-navy"
              >
                {{ unit.simbol }}
              </span>
              <span
                class="badge badge-sm rounded-full border"
                :class="
                  unit.status === 'active'
                    ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
                    : 'border-brand-border bg-base-200 text-base-content/65'
                "
              >
                {{ unit.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
            <p class="mt-1 text-[11px] text-base-content/65">
              Dipakai sebagai base unit atau satuan turunan produk.
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0"
              :aria-label="`Edit satuan ${unit.nama}`"
              @click="openEdit(unit)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm h-9 w-9 rounded-full p-0 text-error"
              :aria-label="`Hapus satuan ${unit.nama}`"
              @click="askDelete(unit)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <MasterFormSheet
      v-model="sheetOpen"
      :title="editing ? 'Edit satuan' : 'Tambah satuan'"
      description="Satuan global dipakai ulang oleh banyak produk. Base unit produk wajib satuan terkecil."
      :saving="saving"
      :error="formError"
      @save="save"
    >
      <FormField
        label="Nama satuan"
        for-id="unit-name"
        required
        hint="Contoh: Gram, Kilogram, Pcs, Pack, Dus."
      >
        <input
          id="unit-name"
          v-model="form.nama"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="40"
          autocomplete="off"
          placeholder="Kilogram"
        />
      </FormField>

      <FormField label="Simbol" for-id="unit-symbol" hint="Opsional, contoh g, kg, pcs.">
        <input
          id="unit-symbol"
          v-model="form.simbol"
          type="text"
          class="input input-bordered min-h-12 w-full rounded-[var(--radius-control)] border-brand-border bg-base-100"
          maxlength="12"
          autocomplete="off"
          placeholder="kg"
        />
      </FormField>

      <FormField label="Status" for-id="unit-status">
        <select
          id="unit-status"
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
      :title="`Hapus satuan ${deleteTarget?.nama ?? ''}?`"
      description="Jika satuan sudah dipakai produk, data tidak dihapus tetapi dinonaktifkan."
      confirm-label="Hapus / nonaktifkan"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
