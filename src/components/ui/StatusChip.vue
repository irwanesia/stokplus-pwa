<script setup lang="ts">
type Status = 'draft' | 'completed' | 'cancelled' | 'expired' | 'warning' | 'quarantine' | 'normal'

withDefaults(
  defineProps<{
    status: Status
    label?: string
    size?: 'sm' | 'md'
  }>(),
  {
    label: undefined,
    size: 'sm',
  },
)

const labels: Record<Status, string> = {
  draft: 'Draft',
  completed: 'Selesai',
  cancelled: 'Batal',
  expired: 'Kedaluwarsa',
  warning: 'Perhatian',
  quarantine: 'Karantina',
  normal: 'Normal',
}

const styles: Record<Status, string> = {
  draft: 'bg-status-draft/10 text-status-draft border-status-draft/20',
  completed: 'bg-status-completed/10 text-status-completed border-status-completed/20',
  cancelled: 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
  expired: 'bg-status-expired/10 text-status-expired border-status-expired/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  quarantine: 'bg-status-quarantine/10 text-status-quarantine border-status-quarantine/20',
  normal: 'bg-status-normal/10 text-status-normal border-status-normal/20',
}
</script>

<template>
  <span
    class="badge gap-1.5 rounded-full border font-medium"
    :class="[styles[status], size === 'md' ? 'badge-md px-3 py-3 text-sm' : 'badge-sm']"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {{ label ?? labels[status] }}
  </span>
</template>
