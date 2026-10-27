<script setup lang="ts">
import RestoreFlow from '@/components/backup/RestoreFlow.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Restore"
      subtitle="Pulihkan seluruh data dari file backup StokPlus."
      back-to="/pengaturan/backup"
    />

    <RestoreFlow />
  </div>
</template>
