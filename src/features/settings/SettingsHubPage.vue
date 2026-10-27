<script setup lang="ts">
import {
  Building2,
  ChevronRight,
  CircleCheck,
  CloudDownload,
  CloudUpload,
  Database,
  FileUp,
  Hash,
  Info,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import { useBackupStore } from '@/stores/backup'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const session = useSessionStore()
const backup = useBackupStore()
const ui = useUiStore()

const sampleLoading = ref(false)
const resetOpen = ref(false)
const resetConfirm = ref('')
const resetting = ref(false)
const resetBackupReady = ref(false)
const resetBackupName = ref('')
const resetBackupLoading = ref(false)

const menu = [
  {
    to: '/pengaturan/profil',
    title: 'Profil usaha',
    description: 'Nama usaha, pemilik, alamat, dan catatan laporan.',
    icon: Building2,
  },
  {
    to: '/pengaturan/penomoran',
    title: 'Penomoran & default',
    description: 'Prefix transaksi, expiry default, dan tanggal cutover.',
    icon: Hash,
  },
  {
    to: '/pengaturan/keamanan',
    title: 'Keamanan',
    description: 'Ganti PIN dan atur auto-lock 1/5/15 menit.',
    icon: ShieldCheck,
  },
  {
    to: '/pengaturan/backup',
    title: 'Backup & restore',
    description: 'Buat backup JSON, restore data, dan lihat status backup.',
    icon: CloudUpload,
  },
  {
    to: '/pengaturan/migrasi',
    title: 'Migrasi Laravel',
    description: 'Import data historis, atur opening lot, dan rekonsiliasi stok.',
    icon: FileUp,
  },
  {
    to: '/pengaturan/storage',
    title: 'Storage',
    description: 'Lihat pemakaian data dan minta persistent storage.',
    icon: Database,
  },
  {
    to: '/pengaturan/aplikasi',
    title: 'Aplikasi & offline',
    description: 'Pasang PWA, cek pembaruan, dan lihat status offline.',
    icon: Smartphone,
  },
  {
    to: '/pengaturan/tentang',
    title: 'Tentang aplikasi',
    description: 'Versi aplikasi, schema, dan audit log lokal.',
    icon: Info,
  },
]

const canReset = computed(
  () => resetBackupReady.value && resetConfirm.value.trim().toUpperCase() === 'HAPUS',
)

async function seedSample() {
  sampleLoading.value = true

  try {
    await session.seedSampleDataAction()
    ui.notify('Data contoh berhasil ditambahkan.', 'success')
  } catch (caught) {
    ui.notify(
      caught instanceof Error ? caught.message : 'Data contoh gagal ditambahkan.',
      'error',
      5000,
    )
  } finally {
    sampleLoading.value = false
  }
}

function openReset() {
  resetConfirm.value = ''
  resetBackupReady.value = false
  resetBackupName.value = ''
  resetOpen.value = true
}

async function prepareResetBackup() {
  resetBackupLoading.value = true

  try {
    const result = await backup.createBackup({ encrypt: false })
    resetBackupReady.value = true
    resetBackupName.value = result.filename
    ui.notify('Backup pengaman berhasil diunduh. Reset sekarang dapat dilakukan.', 'success', 5000)
  } catch (caught) {
    ui.notify(
      caught instanceof Error ? caught.message : 'Backup pengaman gagal dibuat.',
      'error',
      5000,
    )
  } finally {
    resetBackupLoading.value = false
  }
}

async function resetApplication() {
  if (!canReset.value) {
    return
  }

  resetting.value = true

  try {
    await session.resetApplication()
    resetOpen.value = false
    resetBackupReady.value = false
    resetConfirm.value = ''
    ui.notify('Semua data lokal dihapus. Onboarding dimulai ulang.', 'warning', 5000)
    await router.replace('/')
  } catch (caught) {
    ui.notify(caught instanceof Error ? caught.message : 'Reset gagal.', 'error', 5000)
  } finally {
    resetting.value = false
  }
}

function lockNow() {
  session.lock()
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Pengaturan"
      subtitle="Profil, keamanan, backup, penomoran, dan penyimpanan lokal."
      back-to="/lainnya"
    />

    <AppCard tone="muted" title="Profil usaha">
      <div class="flex items-center gap-3">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-sm font-bold text-white"
          aria-hidden="true"
        >
          {{ (session.profile?.nama_usaha || 'S').slice(0, 1).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">
            {{ session.profile?.nama_usaha || 'Belum ada profil' }}
          </p>
          <p class="mt-0.5 truncate text-xs text-base-content/65">
            {{ session.profile?.nama_pemilik || 'Nama pemilik belum diisi' }}
          </p>
        </div>
        <RouterLink
          to="/pengaturan/profil"
          class="btn btn-ghost btn-sm rounded-full text-xs font-semibold text-brand-copper"
        >
          Edit
        </RouterLink>
      </div>
    </AppCard>

    <div class="space-y-3">
      <RouterLink
        v-for="item in menu"
        :key="item.to"
        :to="item.to"
        class="surface-card flex items-center gap-3 p-4 transition active:scale-[0.995]"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <component :is="item.icon" class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ item.title }}</span>
          <span class="mt-0.5 block text-xs leading-5 text-base-content/65">
            {{ item.description }}
          </span>
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-base-content/35" aria-hidden="true" />
      </RouterLink>
    </div>

    <AppCard title="Data contoh" subtitle="Untuk demo dan evaluasi alur.">
      <div v-if="session.settings.sample_data_seeded" class="flex items-start gap-3">
        <CircleCheck class="mt-0.5 h-5 w-5 shrink-0 text-status-completed" aria-hidden="true" />
        <p class="text-sm leading-6 text-base-content/65">
          Data contoh sudah aktif: unit, kategori, produk, supplier, pelanggan, dan kategori beban.
        </p>
      </div>
      <template v-else>
        <p class="text-sm leading-6 text-base-content/65">
          Tambahkan data master contoh untuk mencoba aplikasi. Hanya bisa dipakai saat tabel master
          masih kosong.
        </p>
        <AppButton
          variant="secondary"
          block
          class="mt-4"
          :loading="sampleLoading"
          @click="seedSample"
        >
          <Sparkles class="h-4 w-4" aria-hidden="true" />
          Isi data contoh
        </AppButton>
      </template>
    </AppCard>

    <AppButton variant="secondary" block @click="lockNow">
      <LockKeyhole class="h-4 w-4" aria-hidden="true" />
      Kunci aplikasi
    </AppButton>

    <AppCard title="Reset data" subtitle="Tindakan permanen.">
      <p class="text-sm leading-6 text-base-content/65">
        Hapus seluruh data lokal dan mulai onboarding dari awal. Backup pengaman wajib dibuat
        terlebih dahulu di dalam konfirmasi reset.
      </p>
      <AppButton variant="danger" block class="mt-4" @click="openReset">
        <Trash2 class="h-4 w-4" aria-hidden="true" />
        Reset aplikasi
      </AppButton>
    </AppCard>

    <AppBottomSheet
      v-model="resetOpen"
      title="Reset seluruh data?"
      description="Semua profil, pengaturan, master data, transaksi, dan audit log akan dihapus."
    >
      <div class="rounded-2xl border border-error/20 bg-error/10 p-4">
        <p class="text-sm font-semibold text-error">Backup wajib sebelum reset</p>
        <p class="mt-1 text-xs leading-5 text-base-content/65">
          Buat backup pengaman sekarang. File JSON akan diunduh dan reset baru aktif setelah backup
          selesai.
        </p>
        <AppButton
          variant="secondary"
          block
          class="mt-3"
          :loading="resetBackupLoading"
          @click="prepareResetBackup"
        >
          <CloudDownload class="h-4 w-4" aria-hidden="true" />
          Buat backup sebelum reset
        </AppButton>
        <div
          v-if="resetBackupReady"
          class="mt-3 flex items-start gap-2 rounded-xl bg-status-completed/10 p-3"
        >
          <CircleCheck class="mt-0.5 h-4 w-4 shrink-0 text-status-completed" aria-hidden="true" />
          <p class="min-w-0 text-xs leading-5 text-base-content/65">
            Backup siap: <span class="font-semibold">{{ resetBackupName }}</span>
          </p>
        </div>
      </div>

      <label for="reset-confirm" class="mt-4 block text-sm font-medium">
        Ketik <strong>HAPUS</strong> untuk konfirmasi
      </label>
      <input
        id="reset-confirm"
        v-model="resetConfirm"
        type="text"
        class="input input-bordered mt-2 min-h-12 w-full rounded-[var(--radius-control)] bg-base-100"
        autocomplete="off"
        placeholder="HAPUS"
      />

      <div class="mt-5 flex gap-3">
        <AppButton variant="ghost" :disabled="resetting" @click="resetOpen = false">
          Batal
        </AppButton>
        <AppButton
          variant="danger"
          class="flex-1"
          :disabled="!canReset"
          :loading="resetting"
          @click="resetApplication"
        >
          Reset permanen
        </AppButton>
      </div>
    </AppBottomSheet>
  </div>
</template>
