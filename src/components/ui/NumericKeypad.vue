<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    maxLength?: number
    allowDecimal?: boolean
    showTripleZero?: boolean
    showConfirm?: boolean
    confirmLabel?: string
    disabled?: boolean
  }>(),
  {
    maxLength: 12,
    allowDecimal: false,
    showTripleZero: true,
    showConfirm: false,
    confirmLabel: 'Lanjut',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  confirm: [value: string]
}>()

const keys = computed(() => [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  props.allowDecimal ? '.' : props.showTripleZero ? '000' : 'blank',
  '0',
  'backspace',
])

function press(key: string) {
  if (props.disabled || key === 'blank') {
    return
  }

  if (key === 'backspace') {
    emit('update:modelValue', props.modelValue.slice(0, -1))
    return
  }

  if (key === '.' && (props.allowDecimal === false || props.modelValue.includes('.'))) {
    return
  }

  let next = props.modelValue

  if (key === '.') {
    next = next === '' ? '0.' : `${next}.`
  } else if (next === '0') {
    next = key === '000' ? '0' : key
  } else if (next === '' && key === '000') {
    return
  } else {
    next = `${next}${key}`
  }

  if (next.length > props.maxLength) {
    return
  }

  emit('update:modelValue', next)
}

function confirm() {
  emit('confirm', props.modelValue)
}
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-2" role="group" aria-label="Keypad angka">
      <template v-for="key in keys" :key="key">
        <span v-if="key === 'blank'" class="invisible min-h-14" aria-hidden="true" />
        <button
          v-else
          type="button"
          class="keypad-key"
          :disabled="disabled"
          :aria-label="key === 'backspace' ? 'Hapus angka' : key === '000' ? 'Tiga nol' : key"
          @click="press(key)"
        >
          <Delete v-if="key === 'backspace'" class="h-5 w-5" aria-hidden="true" />
          <span v-else :class="key === '000' ? 'text-base' : ''">{{ key }}</span>
        </button>
      </template>
    </div>

    <button
      v-if="showConfirm"
      type="button"
      class="btn btn-primary mt-3 min-h-12 w-full rounded-[var(--radius-control)] font-semibold normal-case"
      :disabled="disabled"
      @click="confirm"
    >
      {{ confirmLabel }}
    </button>
  </div>
</template>
