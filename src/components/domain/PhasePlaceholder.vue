<script setup lang="ts">
import { CircleCheck, PackageOpen } from '@lucide/vue'

import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusChip from '@/components/ui/StatusChip.vue'

withDefaults(
  defineProps<{
    phase: string
    title: string
    description: string
    items: string[]
    note?: string
  }>(),
  {
    note: undefined,
  },
)
</script>

<template>
  <div class="page-stack">
    <header class="space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <StatusChip status="draft" :label="`Phase ${phase}`" />
        <span class="text-xs font-medium text-base-content/65">Belum aktif</span>
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
      <p class="text-sm leading-6 text-base-content/65">{{ description }}</p>
    </header>

    <AppCard title="Rencana fitur" subtitle="Akan dibangun pada phase berikutnya.">
      <ul class="space-y-3">
        <li v-for="item in items" :key="item" class="flex gap-3 text-sm leading-6">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-copper/10 text-brand-copper"
          >
            <CircleCheck class="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>{{ item }}</span>
        </li>
      </ul>
    </AppCard>

    <AppCard tone="muted">
      <EmptyState
        title="Belum ada data"
        :description="
          note ??
          'Fitur pada halaman ini belum diimplementasikan, sehingga belum ada data untuk ditampilkan.'
        "
        compact
      >
        <template #icon>
          <PackageOpen class="h-8 w-8" aria-hidden="true" />
        </template>
      </EmptyState>
    </AppCard>
  </div>
</template>
