<script setup lang="ts">
import {
  Boxes,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  Info,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Smartphone,
} from '@lucide/vue'
import { RouterLink } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const links = [
  {
    to: '/lainnya/panduan',
    title: 'Panduan pengguna',
    description: 'Alur onboarding, transaksi, stok, laporan, backup, dan penggunaan offline.',
    icon: BookOpen,
  },
  {
    to: '/lainnya/kamus-istilah',
    title: 'Kamus istilah',
    description: 'Arti istilah transaksi dan rumus qty, HPP/COGS, stok, serta laba.',
    icon: BookOpen,
  },
  {
    to: '/lainnya/uat',
    title: 'UAT & sign-off',
    description: 'Jalankan skenario UAT rilis, catat hasil, dan simpan sign-off.',
    icon: ClipboardCheck,
  },
  {
    to: '/master',
    title: 'Master data',
    description: 'Produk multi-satuan, kategori, satuan, supplier, pelanggan, dan beban.',
    icon: Boxes,
  },
  {
    to: '/pengaturan',
    title: 'Pengaturan',
    description: 'Profil, keamanan, backup, migrasi, penyimpanan, dan reset.',
    icon: Settings2,
  },
  {
    to: '/pengaturan/aplikasi',
    title: 'Aplikasi & offline',
    description: 'Pasang PWA, cek pembaruan, dan lihat status offline.',
    icon: Smartphone,
  },
  {
    to: '/pengaturan/keamanan',
    title: 'Keamanan',
    description: 'Ganti PIN dan atur auto-lock.',
    icon: ShieldCheck,
  },
  {
    to: '/pengaturan/backup',
    title: 'Backup & restore',
    description: 'Simpan atau pulihkan seluruh data lokal.',
    icon: CloudUpload,
  },
  {
    to: '/pengaturan/tentang',
    title: 'Tentang',
    description: 'Versi aplikasi, schema, dan audit log.',
    icon: Info,
  },
]
</script>

<template>
  <div class="page-stack">
    <PageHeader title="Lainnya" subtitle="Akun lokal, pengaturan aplikasi, dan informasi." />

    <AppCard tone="muted">
      <div class="flex items-center gap-3">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-base font-bold text-white ring-1 ring-brand-copper/40"
          aria-hidden="true"
        >
          {{ (session.profile?.nama_usaha || 'S').slice(0, 1).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-semibold">
            {{ session.profile?.nama_usaha || 'StokPlus' }}
          </p>
          <p class="mt-0.5 truncate text-xs text-base-content/65">
            {{ session.profile?.nama_pemilik || 'Satu HP, satu pengguna' }}
          </p>
        </div>
        <RouterLink
          to="/pengaturan/profil"
          class="btn btn-ghost btn-sm rounded-full text-xs font-semibold text-brand-copper"
        >
          Profil
        </RouterLink>
      </div>
    </AppCard>

    <div class="space-y-3">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <component :is="link.icon" class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ link.title }}</span>
          <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
            {{ link.description }}
          </span>
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
      </RouterLink>
    </div>

    <AppButton variant="secondary" block @click="session.lock()">
      <LockKeyhole class="h-4 w-4" aria-hidden="true" />
      Kunci aplikasi
    </AppButton>

    <p class="px-1 text-xs leading-5 text-base-content/65">
      Import dari Laravel tersedia melalui menu Pengaturan → Migrasi Laravel.
    </p>
  </div>
</template>
