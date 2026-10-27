<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    compact?: boolean
  }>(),
  {
    description: undefined,
    compact: false,
  },
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-brand-border bg-base-200/40 px-6 text-center"
    :class="compact ? 'py-8' : 'py-12'"
  >
    <div v-if="$slots.icon" class="mb-3 text-brand-copper">
      <slot name="icon" />
    </div>
    <h3 class="text-base font-semibold">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm leading-6 text-base-content/65">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
