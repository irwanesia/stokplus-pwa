<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description: string
    confirmLabel?: string
    loading?: boolean
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Hapus',
    loading: false,
    danger: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <AppBottomSheet
    :model-value="modelValue"
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      class="flex items-start gap-3 rounded-2xl border p-4"
      :class="danger ? 'border-error/20 bg-error/10' : 'border-brand-copper/20 bg-brand-copper/10'"
    >
      <AlertTriangle
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="danger ? 'text-error' : 'text-brand-copper'"
        aria-hidden="true"
      />
      <p class="text-sm leading-6 text-base-content/70">{{ description }}</p>
    </div>

    <p class="mt-4 text-xs leading-5 text-base-content/65">
      Data yang sudah dipakai transaksi tidak dihapus permanen, tetapi dinonaktifkan agar histori
      tetap utuh.
    </p>

    <div class="mt-5 flex gap-3">
      <AppButton variant="ghost" :disabled="loading" @click="emit('update:modelValue', false)">
        Batal
      </AppButton>
      <AppButton
        :variant="danger ? 'danger' : 'primary'"
        class="flex-1"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </div>
  </AppBottomSheet>
</template>
