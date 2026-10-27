<script setup lang="ts">
import { AlertCircle } from '@lucide/vue'

import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    saving?: boolean
    error?: string
    saveLabel?: string
  }>(),
  {
    description: undefined,
    saving: false,
    error: '',
    saveLabel: 'Simpan',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
}>()
</script>

<template>
  <AppBottomSheet
    :model-value="modelValue"
    :title="title"
    :description="description"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-4" novalidate @submit.prevent="emit('save')">
      <div
        v-if="error"
        class="flex items-start gap-2 rounded-2xl border border-error/20 bg-error/10 p-3"
        role="alert"
      >
        <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
        <p class="text-xs leading-5 text-error">{{ error }}</p>
      </div>

      <slot />

      <div class="flex gap-3 pt-1">
        <AppButton variant="ghost" :disabled="saving" @click="emit('update:modelValue', false)">
          Batal
        </AppButton>
        <AppButton type="submit" class="flex-1" :loading="saving">{{ saveLabel }}</AppButton>
      </div>
    </form>
  </AppBottomSheet>
</template>
