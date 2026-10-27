<script setup lang="ts">
import { CircleCheck, CircleX, Info, TriangleAlert, X } from '@lucide/vue'
import type { Component } from 'vue'

import { useUiStore, type ToastTone } from '@/stores/ui'

const ui = useUiStore()

const icons: Record<ToastTone, Component> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
}

const toneStyles: Record<ToastTone, string> = {
  info: 'bg-info text-info-content',
  success: 'bg-success text-success-content',
  warning: 'bg-warning text-warning-content',
  error: 'bg-error text-error-content',
}
</script>

<template>
  <Transition name="toast">
    <div
      v-if="ui.toast"
      class="fixed inset-x-4 top-4 z-[60] mx-auto max-w-[420px]"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg"
        :class="toneStyles[ui.toast.tone]"
      >
        <component :is="icons[ui.toast.tone]" class="h-5 w-5 shrink-0" aria-hidden="true" />
        <p class="min-w-0 flex-1">{{ ui.toast.message }}</p>
        <button
          type="button"
          class="flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-80 transition hover:opacity-100"
          aria-label="Tutup notifikasi"
          @click="ui.dismiss()"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Transition>
</template>
