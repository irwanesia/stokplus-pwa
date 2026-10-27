<script setup lang="ts">
import { Boxes, ChartNoAxesColumn, Ellipsis, LayoutDashboard, ReceiptText } from '@lucide/vue'
import type { Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

interface NavItem {
  label: string
  to: string
  icon: Component
  activePrefixes?: string[]
}

const route = useRoute()

const items: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transaksi', to: '/transaksi', icon: ReceiptText },
  { label: 'Stok', to: '/stok', icon: Boxes },
  { label: 'Laporan', to: '/laporan', icon: ChartNoAxesColumn },
  {
    label: 'Lainnya',
    to: '/lainnya',
    icon: Ellipsis,
    activePrefixes: ['/lainnya', '/pengaturan', '/master'],
  },
]

function isItemActive(item: NavItem, isActive: boolean, isExactActive: boolean): boolean {
  if (item.to === '/') {
    return isExactActive
  }

  if (item.activePrefixes?.length) {
    return item.activePrefixes.some(
      (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`),
    )
  }

  return isActive
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-base-100/95 backdrop-blur"
    aria-label="Navigasi utama"
  >
    <div class="mx-auto grid h-[72px] max-w-[720px] grid-cols-5">
      <RouterLink
        v-for="item in items"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :key="item.to"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          class="relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors"
          :class="
            isItemActive(item, isActive, isExactActive) ? 'text-brand-navy' : 'text-base-content/65'
          "
          :aria-current="isItemActive(item, isActive, isExactActive) ? 'page' : undefined"
          @click="navigate"
        >
          <span
            v-if="isItemActive(item, isActive, isExactActive)"
            class="absolute top-0 h-0.5 w-8 rounded-full bg-brand-copper"
            aria-hidden="true"
          />
          <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
          <span class="max-w-full truncate text-[11px] font-medium">{{ item.label }}</span>
        </a>
      </RouterLink>
    </div>
    <div class="h-[env(safe-area-inset-bottom)] bg-base-100" />
  </nav>
</template>
