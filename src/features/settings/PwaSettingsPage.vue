<script setup lang="ts">
import {
  CircleCheck,
  CloudUpload,
  Download,
  Info,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { APP_VERSION } from '@/config'
import { SCHEMA_VERSION } from '@/db/dexie'
import { usePwaStore } from '@/stores/pwa'
import { useUiStore } from '@/stores/ui'
import { formatDateTimeId } from '@/utils/date'

const pwa = usePwaStore()
const ui = useUiStore()
const installing = ref(false)
const checking = ref(false)
const persisted = ref<boolean | null>(null)

const isProduction = import.meta.env.PROD

const swStatus = computed(() => {
  if (!pwa.swSupported) {
    return 'Browser tidak mendukung service worker'
  }

  if (pwa.swRegistered) {
    return 'Terdaftar dan siap menerima pembaruan'
  }

  return isProduction ? 'Belum terdaftar' : 'Nonaktif di mode pengembangan'
})

onMounted(async () => {
  pwa.initialize()

  if (navigator.storage?.persisted) {
    persisted.value = await navigator.storage.persisted()
  }
})

async function installApp() {
  installing.value = true

  try {
    const result = await pwa.promptInstall()

    if (result === 'accepted') {
      ui.notify('Permintaan pemasangan diterima. Ikuti petunjuk browser.', 'success', 5000)
    } else if (result === 'dismissed') {
      ui.notify('Pemasangan dibatalkan. Kamu bisa mencoba lagi nanti.', 'info', 4000)
    } else {
      ui.notify(
        'Prompt instal belum tersedia. Gunakan menu browser atau petunjuk manual di bawah.',
        'info',
        5000,
      )
    }
  } finally {
    installing.value = false
  }
}

async function checkUpdate() {
  checking.value = true

  try {
    const checked = await pwa.checkForUpdate()

    if (checked) {
      ui.notify(
        pwa.needRefresh
          ? 'Versi baru tersedia. Muat ulang untuk memakainya.'
          : 'Aplikasi sudah memakai versi terbaru.',
        'success',
        4000,
      )
    } else {
      ui.notify(
        isProduction
          ? 'Service worker belum siap. Muat ulang halaman lalu coba lagi.'
          : 'Pemeriksaan pembaruan hanya aktif pada build produksi.',
        'info',
        5000,
      )
    }
  } finally {
    checking.value = false
  }
}

async function applyUpdate() {
  await pwa.applyUpdate()
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Aplikasi & offline"
      subtitle="Pasang StokPlus, cek pembaruan, dan pastikan aplikasi siap dipakai tanpa internet."
      back-to="/pengaturan"
    />

    <AppCard tone="muted">
      <div class="flex items-start gap-3">
        <span class="monogram" aria-hidden="true">S+</span>
        <div class="min-w-0 flex-1">
          <p class="text-base font-semibold">StokPlus v{{ APP_VERSION }}</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Local-first · schema Dexie v{{ SCHEMA_VERSION }} · data tidak dikirim ke server.
          </p>
        </div>
        <span
          class="badge shrink-0 rounded-full px-3 py-3 text-[11px] font-semibold"
          :class="
            pwa.isOnline
              ? 'border-status-completed/20 bg-status-completed/10 text-status-completed'
              : 'border-warning/20 bg-warning/10 text-warning'
          "
        >
          {{ pwa.isOnline ? 'Online' : 'Offline' }}
        </span>
      </div>
    </AppCard>

    <AppCard title="Status koneksi" subtitle="Transaksi tetap berjalan tanpa internet.">
      <div class="flex items-start gap-3">
        <Wifi
          v-if="pwa.isOnline"
          class="mt-0.5 h-5 w-5 shrink-0 text-status-completed"
          aria-hidden="true"
        />
        <WifiOff v-else class="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div class="text-sm leading-6 text-base-content/75">
          <p class="font-semibold">
            {{ pwa.isOnline ? 'Terhubung ke internet' : 'Mode offline aktif' }}
          </p>
          <p class="mt-1">
            {{
              pwa.isOnline
                ? 'Aplikasi tetap memakai data lokal. Internet hanya dibutuhkan saat pertama membuka atau memasang aplikasi.'
                : 'App shell tetap dapat dibuka dan transaksi baru disimpan di IndexedDB perangkat ini.'
            }}
          </p>
          <p class="mt-2 text-xs text-base-content/65">
            App shell tersimpan: {{ pwa.swControlled || pwa.offlineReady ? 'ya' : 'belum' }} ·
            Persistent storage:
            {{ persisted === null ? 'memeriksa…' : persisted ? 'aktif' : 'belum aktif' }}
          </p>
        </div>
      </div>
    </AppCard>

    <AppCard title="Pasang aplikasi" subtitle="Jalankan StokPlus seperti aplikasi biasa.">
      <div v-if="pwa.isStandalone" class="flex items-start gap-3">
        <CircleCheck class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
        <p class="text-sm leading-6 text-base-content/75">
          StokPlus sudah berjalan dalam mode standalone. Aplikasi dapat dibuka dari layar utama
          tanpa address bar.
        </p>
      </div>

      <template v-else>
        <p class="text-sm leading-6 text-base-content/75">{{ pwa.installHint }}</p>
        <AppButton
          v-if="pwa.installAvailable"
          class="mt-4"
          block
          :loading="installing"
          @click="installApp"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          Pasang StokPlus
        </AppButton>

        <div class="mt-4 space-y-2">
          <details class="rounded-xl border border-brand-border bg-base-200/50 p-3">
            <summary class="cursor-pointer text-sm font-semibold">Android / Chrome</summary>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-base-content/75">
              <li>Buka StokPlus di Chrome.</li>
              <li>Ketuk menu tiga titik di kanan atas.</li>
              <li>
                Pilih <strong>Instal aplikasi</strong> atau
                <strong>Tambahkan ke layar utama</strong>.
              </li>
              <li>Konfirmasi pemasangan.</li>
            </ol>
          </details>

          <details class="rounded-xl border border-brand-border bg-base-200/50 p-3">
            <summary class="cursor-pointer text-sm font-semibold">iPhone / iPad (Safari)</summary>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-base-content/75">
              <li>Buka StokPlus di Safari, bukan browser lain.</li>
              <li>Ketuk tombol <strong>Bagikan</strong>.</li>
              <li>Pilih <strong>Tambah ke Layar Utama</strong>.</li>
              <li>Ketuk <strong>Tambah</strong>.</li>
            </ol>
          </details>

          <details class="rounded-xl border border-brand-border bg-base-200/50 p-3">
            <summary class="cursor-pointer text-sm font-semibold">Desktop / laptop</summary>
            <p class="mt-2 text-sm leading-6 text-base-content/75">
              Klik ikon instal di address bar atau menu browser, lalu pilih
              <strong>Instal StokPlus</strong>.
            </p>
          </details>
        </div>
      </template>
    </AppCard>

    <AppCard
      title="Pembaruan aplikasi"
      subtitle="Data lokal tidak hilang saat versi baru dipasang."
    >
      <dl class="space-y-2 text-sm">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-base-content/65">Service worker</dt>
          <dd class="text-right font-medium">{{ swStatus }}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-base-content/65">Mengontrol halaman</dt>
          <dd class="font-medium">{{ pwa.swControlled ? 'Ya' : 'Belum' }}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-base-content/65">Pemeriksaan terakhir</dt>
          <dd class="text-right font-medium">
            {{ pwa.lastUpdateCheck ? formatDateTimeId(pwa.lastUpdateCheck) : 'Belum pernah' }}
          </dd>
        </div>
      </dl>

      <p
        v-if="pwa.offlineReady"
        class="mt-3 flex items-center gap-2 text-xs font-medium text-status-completed"
      >
        <CircleCheck class="h-4 w-4" aria-hidden="true" />
        App shell siap dipakai offline.
      </p>

      <p
        v-if="pwa.needRefresh"
        class="mt-3 rounded-xl bg-brand-copper/10 p-3 text-xs leading-5 text-base-content/75"
        role="status"
      >
        Versi baru tersedia. Muat ulang untuk memakai versi terbaru. Data lokal tetap tersimpan.
      </p>

      <p
        v-if="pwa.registrationError"
        class="mt-3 rounded-xl bg-error/10 p-3 text-xs text-error"
        role="alert"
      >
        {{ pwa.registrationError }}
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton
          variant="secondary"
          :loading="checking"
          :disabled="!pwa.swRegistered"
          @click="checkUpdate"
        >
          <RefreshCw class="h-4 w-4" aria-hidden="true" />
          Periksa pembaruan
        </AppButton>
        <AppButton v-if="pwa.needRefresh" @click="applyUpdate">Muat ulang sekarang</AppButton>
      </div>

      <p v-if="!isProduction" class="mt-3 text-xs leading-5 text-base-content/65">
        Mode pengembangan: service worker dimatikan. Uji pembaruan dan offline memakai
        <code class="font-semibold">npm run build</code> lalu
        <code class="font-semibold">npm run preview</code>.
      </p>
    </AppCard>

    <AppCard title="Rilis dan verifikasi" subtitle="Bukti sebelum MVP dipakai.">
      <div class="space-y-2 text-sm">
        <RouterLink
          to="/lainnya/uat"
          class="flex min-h-11 items-center gap-2 font-semibold text-brand-copper"
        >
          <ShieldCheck class="h-4 w-4" aria-hidden="true" />
          Jalankan UAT dan sign-off
        </RouterLink>
        <RouterLink
          to="/pengaturan/backup"
          class="flex min-h-11 items-center gap-2 font-semibold text-brand-copper"
        >
          <CloudUpload class="h-4 w-4" aria-hidden="true" />
          Buat backup final
        </RouterLink>
        <RouterLink
          to="/lainnya/panduan"
          class="flex min-h-11 items-center gap-2 font-semibold text-brand-copper"
        >
          <Info class="h-4 w-4" aria-hidden="true" />
          Buka panduan pengguna
        </RouterLink>
        <RouterLink
          to="/pengaturan/tentang"
          class="flex min-h-11 items-center gap-2 font-semibold text-brand-copper"
        >
          <Smartphone class="h-4 w-4" aria-hidden="true" />
          Lihat versi dan audit log
        </RouterLink>
      </div>
    </AppCard>
  </div>
</template>
