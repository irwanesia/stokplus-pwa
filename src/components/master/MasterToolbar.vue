<script setup lang="ts">
import { Plus, Search } from '@lucide/vue'
import { useId } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'

type StatusFilter = 'all' | 'active' | 'inactive'

withDefaults(
  defineProps<{
    modelValue: string
    status: StatusFilter
    total: number
    filtered: number
    placeholder?: string
    addLabel?: string
  }>(),
  {
    placeholder: 'Cari nama atau kode',
    addLabel: 'Tambah',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:status': [value: StatusFilter]
  add: []
}>()

const searchId = useId()
const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <label :for="searchId" class="sr-only">Cari data</label>
      <div class="relative min-w-0 flex-1">
        <Search
          class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-base-content/35"
          aria-hidden="true"
        />
        <input
          :id="searchId"
          :value="modelValue"
          type="search"
          class="input input-bordered min-h-11 w-full rounded-[var(--radius-control)] bg-base-100 pl-9"
          :placeholder="placeholder"
          autocomplete="off"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <AppButton size="sm" class="shrink-0" :aria-label="addLabel" @click="emit('add')">
        <Plus class="h-4 w-4" aria-hidden="true" />
        <span class="hidden min-[380px]:inline">{{ addLabel }}</span>
      </AppButton>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="btn btn-xs min-h-8 rounded-full border px-3 font-medium normal-case"
          :class="
            status === filter.value
              ? 'border-brand-navy bg-brand-navy text-white'
              : 'border-brand-border bg-base-100 text-base-content/65'
          "
          :aria-pressed="status === filter.value"
          @click="emit('update:status', filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>
      <p class="shrink-0 text-[11px] tabular text-base-content/65">
        {{ filtered }}/{{ total }} data
      </p>
    </div>
  </div>
</template>
