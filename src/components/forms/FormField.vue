<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    forId?: string
    hint?: string
    error?: string
    required?: boolean
  }>(),
  {
    forId: undefined,
    hint: '',
    error: '',
    required: false,
  },
)
</script>

<template>
  <div class="space-y-1.5">
    <label :for="forId" class="block text-sm font-medium text-base-content/80">
      {{ label }}
      <span v-if="required" class="text-brand-copper" aria-hidden="true">*</span>
    </label>
    <slot />
    <p v-if="error" class="text-xs font-medium text-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="text-xs leading-5 text-base-content/65">{{ hint }}</p>
  </div>
</template>
