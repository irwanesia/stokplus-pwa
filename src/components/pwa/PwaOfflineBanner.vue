<script setup lang="ts">
import { WifiOff } from '@lucide/vue'

import { usePwaStore } from '@/stores/pwa'

const pwa = usePwaStore()
</script>

<template>
  <div
    v-if="!pwa.isOnline"
    class="no-print border-b border-warning/30 bg-warning/10 px-5 py-2 text-center text-xs font-medium text-warning"
    role="status"
    aria-live="polite"
  >
    <span class="inline-flex items-center gap-1.5">
      <WifiOff class="h-3.5 w-3.5" aria-hidden="true" />
      Mode offline — data tetap tersimpan di perangkat ini.
    </span>
  </div>
</template>
