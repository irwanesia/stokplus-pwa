<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    backTo?: string
    backLabel?: string
  }>(),
  {
    subtitle: '',
    backTo: undefined,
    backLabel: 'Kembali',
  },
)
</script>

<template>
  <header class="space-y-3">
    <RouterLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-medium text-base-content/65 transition hover:text-brand-navy"
    >
      <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      {{ backLabel }}
    </RouterLink>

    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight text-brand-navy">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm leading-6 text-base-content/65">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>
