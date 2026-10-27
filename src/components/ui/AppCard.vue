<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padded?: boolean
    tone?: 'default' | 'muted'
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    padded: true,
    tone: 'default',
  },
)
</script>

<template>
  <section
    class="surface-card"
    :class="[padded ? 'p-5' : '', tone === 'muted' ? 'bg-base-200/60' : 'bg-base-100']"
  >
    <header
      v-if="title || subtitle || $slots.header"
      class="flex items-start justify-between gap-3"
      :class="padded ? '' : 'px-5 pt-5'"
    >
      <div>
        <h2 v-if="title" class="text-base font-semibold tracking-tight">{{ title }}</h2>
        <p v-if="subtitle" class="mt-1 text-sm leading-5 text-base-content/65">{{ subtitle }}</p>
      </div>
      <slot name="header" />
    </header>

    <div :class="padded ? (title || subtitle || $slots.header ? 'mt-4' : '') : 'p-5'">
      <slot />
    </div>

    <footer v-if="$slots.footer" :class="padded ? 'mt-4' : 'px-5 pb-5'">
      <slot name="footer" />
    </footer>
  </section>
</template>
