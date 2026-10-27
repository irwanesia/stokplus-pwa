<script setup lang="ts">
import PwaUpdatePrompt from '@/components/pwa/PwaUpdatePrompt.vue'
import SessionGate from '@/components/session/SessionGate.vue'
</script>

<template>
  <SessionGate />
  <PwaUpdatePrompt />
</template>
