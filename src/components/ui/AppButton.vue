<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    loading: false,
    disabled: false,
    block: false,
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-error',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

function handleClick(event: MouseEvent) {
  if (props.loading || props.disabled) {
    return
  }

  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    class="btn min-h-11 rounded-[var(--radius-control)] font-semibold normal-case"
    :class="[variantClass[variant], sizeClass[size], block && 'btn-block']"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
