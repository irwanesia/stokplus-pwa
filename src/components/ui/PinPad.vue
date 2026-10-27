<script setup lang="ts">
import { computed, watch } from 'vue'

import NumericKeypad from './NumericKeypad.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    length?: number
    label?: string
    error?: string
    disabled?: boolean
  }>(),
  {
    length: 6,
    label: 'PIN',
    error: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const positions = computed(() => Array.from({ length: props.length }, (_, index) => index))

watch(
  () => props.modelValue,
  (value) => {
    if (value.length === props.length) {
      emit('complete', value)
    }
  },
)

function update(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div>
    <p v-if="label" class="text-center text-sm font-medium text-base-content/65">{{ label }}</p>

    <div
      class="mt-4 flex justify-center gap-2"
      role="group"
      :aria-label="`${label} ${length} digit`"
    >
      <span
        v-for="position in positions"
        :key="position"
        class="flex h-12 w-10 items-center justify-center rounded-xl border text-lg"
        :class="
          modelValue.length > position
            ? 'border-brand-navy/30 bg-brand-navy/5 text-brand-navy'
            : 'border-brand-border bg-base-200/60'
        "
        aria-hidden="true"
      >
        <span
          v-if="modelValue.length > position"
          class="h-2.5 w-2.5 rounded-full bg-brand-copper"
        />
      </span>
    </div>

    <p class="sr-only" aria-live="polite">{{ modelValue.length }} dari {{ length }} digit</p>
    <p v-if="error" class="mt-2 text-center text-sm font-medium text-error" role="alert">
      {{ error }}
    </p>

    <NumericKeypad
      class="mt-5"
      :model-value="modelValue"
      :max-length="length"
      :show-triple-zero="false"
      :disabled="disabled"
      @update:model-value="update"
    />
  </div>
</template>
