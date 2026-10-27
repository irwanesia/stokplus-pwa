<script setup lang="ts">
import {
  ArchiveRestore,
  Boxes,
  ChartNoAxesColumn,
  ClipboardCheck,
  CloudUpload,
  FileUp,
  PackageMinus,
  Printer,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Wallet,
} from '@lucide/vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'

const sections = [
  {
    title: '1. Mulai dan kunci aplikasi',
    icon: ShieldCheck,
    body: [
      'Saat pertama dibuka, isi nama usaha, nama pemilik, lalu buat PIN 6 digit. Tidak ada email atau akun server.',
      'Semua data disimpan di IndexedDB HP ini. Kunci aplikasi dari ikon gembok di kanan atas atau dari menu Lainnya.',
      'PIN tidak dapat dipulihkan tanpa menghapus data. Simpan backup secara rutin.',
    ],
    link: { to: '/pengaturan/keamanan', label: 'Buka Keamanan' },
  },
  {
    title: '2. Siapkan master data',
    icon: Boxes,
    body: [
      'Buat kategori produk, satuan, lalu produk. Tentukan base unit terkecil, misalnya pcs untuk Siomay atau gram untuk Ayam Fillet.',
      'Tambahkan satuan jual/beli dan konversinya, misalnya pack = 10 pcs dan dus = 100 pcs. Base unit harus memiliki konversi 1.',
      'Produk track-expiry wajib memiliki expiry saat stok awal atau pembelian. Base unit terkunci setelah produk dipakai transaksi.',
    ],
    link: { to: '/master', label: 'Buka Master Data' },
  },
  {
    title: '3. Catat pembelian',
    icon: ShoppingCart,
    body: [
      'Buka Transaksi → Pembelian → Tambah. Pilih supplier, tanggal, dan satuan beli.',
      'Isi qty, harga per satuan, diskon, dan expiry untuk produk track-expiry. Diskon header dan biaya angkut dialokasikan proporsional ke HPP lot.',
      'Simpan draft bila belum final. Selesaikan pembelian untuk membuat lot, menambah stok, dan mencatat HPP per base.',
    ],
    link: { to: '/transaksi/pembelian', label: 'Buka Pembelian' },
  },
  {
    title: '4. Catat penjualan',
    icon: ReceiptText,
    body: [
      'Buka Transaksi → Penjualan → Tambah. Pilih produk dan satuan jual; stok tersedia dihitung dalam satuan tersebut.',
      'Sistem memakai FEFO untuk produk expiry (lot terdekat lebih dulu) dan FIFO untuk produk tanpa expiry.',
      'Lot expired atau karantina tidak dapat dijual. Pembatalan penjualan mengembalikan lot dan membalik COGS.',
    ],
    link: { to: '/transaksi/penjualan', label: 'Buka Penjualan' },
  },
  {
    title: '5. Catat beban operasional',
    icon: Wallet,
    body: [
      'Beban adalah biaya operasional seperti listrik, sewa, dan gaji. Beban bukan pembelian barang dagang.',
      'Isi kategori, keterangan, tanggal, nominal, dan metode bayar. Hanya beban selesai yang dihitung di laba/rugi.',
      'HPP tetap berasal dari penjualan; beban tidak mengubah stok atau lot.',
    ],
    link: { to: '/transaksi/beban', label: 'Buka Beban' },
  },
  {
    title: '6. Kontrol stok, expiry, dan opname',
    icon: PackageMinus,
    body: [
      'Halaman Stok menampilkan saldo, nilai persediaan, dan filter stok menipis/habis/expired/karantina.',
      'Gunakan Expiry untuk melihat lot mendekati expiry. Write-off mencatat barang rusak atau expired sebagai kerugian persediaan.',
      'Stok opname membandingkan sistem dan fisik. Kekurangan dialokasikan ke lot terdekat; surplus membuat lot baru.',
    ],
    link: { to: '/stok', label: 'Buka Stok' },
  },
  {
    title: '7. Baca laporan',
    icon: ChartNoAxesColumn,
    body: [
      'Laporan tersedia untuk penjualan, pembelian, stok, beban, expiry, dan laba/rugi. Pilih periode hari ini, minggu ini, bulan ini, tahun ini, atau custom.',
      'Laba kotor = penjualan bersih − HPP. Laba bersih = laba kotor − kerugian persediaan − beban operasional.',
      'Gunakan tombol Excel untuk mengunduh laporan atau Print untuk layout cetak.',
    ],
    link: { to: '/laporan', label: 'Buka Laporan' },
  },
  {
    title: '8. Backup dan restore',
    icon: CloudUpload,
    body: [
      'Buka Pengaturan → Backup & restore. Backup menghasilkan file JSON berisi seluruh tabel domain.',
      'Enkripsi opsional memakai passphrase. Jika passphrase lupa, file tidak dapat dibuka.',
      'Restore memvalidasi app, schema, dan checksum, membuat safety backup, lalu mengganti data secara atomik. Aplikasi terkunci dan memakai PIN dari backup.',
    ],
    link: { to: '/pengaturan/backup', label: 'Buka Backup' },
  },
  {
    title: '9. Migrasi dari Laravel',
    icon: FileUp,
    body: [
      'Ekspor data dari Laravel memakai perintah php artisan stokplus:export-json, lalu import melalui Pengaturan → Migrasi Laravel.',
      'Tentukan cutover date dan expiry opening lot. Produk track-expiry tanpa expiry masuk karantina.',
      'HPP historis memakai weighted average dan diberi label estimasi. Rekonsiliasi stok ditampilkan sebelum data dipakai.',
    ],
    link: { to: '/pengaturan/migrasi', label: 'Buka Migrasi' },
  },
  {
    title: '10. Pasang dan pakai offline',
    icon: Smartphone,
    body: [
      'Di Android/Chrome, buka menu browser lalu pilih Instal aplikasi atau Tambahkan ke layar utama. Di iPhone/iPad, buka Safari → Bagikan → Tambah ke Layar Utama.',
      'Setelah dibuka sekali, app shell tersimpan dan dapat dibuka tanpa internet. Transaksi tetap disimpan lokal.',
      'Saat ada versi baru, muncul prompt Muat ulang. Data lokal tidak hilang karena pembaruan.',
    ],
    link: { to: '/pengaturan/aplikasi', label: 'Buka Aplikasi & Offline' },
  },
]

const troubleshooting = [
  {
    question: 'Data tidak muncul setelah ganti HP',
    answer:
      'Data tidak disinkronkan. Backup dari HP lama, lalu restore file tersebut di HP baru melalui onboarding atau Pengaturan → Restore.',
  },
  {
    question: 'PIN lupa',
    answer:
      'PIN tidak dapat dipulihkan. Hapus data situs dari pengaturan browser lalu onboarding ulang. Jika punya backup, restore dan gunakan PIN yang tersimpan di file backup.',
  },
  {
    question: 'Pembelian tidak bisa dibatalkan',
    answer:
      'Pembatalan hanya berlaku jika semua lot masih utuh dan belum dikonsumsi penjualan, write-off, atau opname. Periksa detail lot.',
  },
  {
    question: 'Produk tidak muncul di form penjualan',
    answer:
      'Pastikan produk aktif, memiliki satuan jual, dan memiliki stok non-expired. Lot expired atau karantina tidak dapat dijual.',
  },
  {
    question: 'Aplikasi tidak mau install',
    answer:
      'Install PWA memerlukan HTTPS atau localhost. Di iOS gunakan Safari; di Android gunakan Chrome. Cek juga apakah aplikasi sudah terpasang.',
  },
]

function printGuide() {
  window.print()
}
</script>

<template>
  <div class="page-stack print-report">
    <PageHeader
      title="Panduan pengguna"
      subtitle="Alur singkat StokPlus untuk operasional harian toko frozen food."
      back-to="/lainnya"
    />

    <AppCard tone="muted">
      <div class="flex items-start gap-3">
        <span class="monogram" aria-hidden="true">S+</span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">Alur harian singkat</p>
          <p class="mt-1 text-xs leading-5 text-base-content/65">
            Buka aplikasi → cek dashboard dan expiry → catat penjualan/pembelian/beban → cek stok →
            backup berkala. Semua transaksi berjalan lokal tanpa internet.
          </p>
        </div>
      </div>
      <div class="no-print mt-4 flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="printGuide">
          <Printer class="h-4 w-4" aria-hidden="true" />
          Cetak panduan
        </AppButton>
        <RouterLink
          to="/lainnya/uat"
          class="btn btn-ghost min-h-11 rounded-[var(--radius-control)]"
        >
          <ClipboardCheck class="h-4 w-4" aria-hidden="true" />
          Jalankan UAT
        </RouterLink>
      </div>
    </AppCard>

    <AppCard v-for="section in sections" :key="section.title" :title="section.title">
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-copper/10 text-brand-copper"
          aria-hidden="true"
        >
          <component :is="section.icon" class="h-5 w-5" />
        </span>
        <ul class="min-w-0 flex-1 space-y-2 text-sm leading-6 text-base-content/75">
          <li v-for="line in section.body" :key="line" class="flex gap-2">
            <span
              class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-copper"
              aria-hidden="true"
            />
            <span>{{ line }}</span>
          </li>
        </ul>
      </div>
      <RouterLink
        :to="section.link.to"
        class="no-print mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-copper"
      >
        {{ section.link.label }} →
      </RouterLink>
    </AppCard>

    <AppCard title="Backup dan pemulihan" subtitle="Rutinitas wajib untuk data lokal.">
      <div class="flex items-start gap-3">
        <ArchiveRestore class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
        <div class="text-sm leading-6 text-base-content/75">
          <p>
            Lakukan backup minimal seminggu sekali dan sebelum reset, migrasi, atau mengganti HP.
            Simpan file di penyimpanan cloud atau komputer, bukan hanya di folder Download HP.
          </p>
          <p class="mt-2">
            Uji restore secara berkala pada data contoh untuk memastikan file backup benar-benar
            dapat dipakai.
          </p>
        </div>
      </div>
    </AppCard>

    <AppCard title="Pemecahan masalah" subtitle="Gejala umum dan langkah cepat.">
      <div class="space-y-2">
        <details
          v-for="item in troubleshooting"
          :key="item.question"
          class="rounded-xl border border-brand-border bg-base-200/50 p-3"
        >
          <summary class="cursor-pointer text-sm font-semibold">{{ item.question }}</summary>
          <p class="mt-2 text-sm leading-6 text-base-content/75">{{ item.answer }}</p>
        </details>
      </div>
    </AppCard>

    <AppCard title="Butuh bantuan?" subtitle="Kontak dan dokumen rilis.">
      <p class="text-sm leading-6 text-base-content/75">
        Hubungi pengelola usaha atau developer yang memasang aplikasi. Sertakan versi aplikasi dari
        halaman Tentang, langkah yang dilakukan, dan screenshot bila memungkinkan.
      </p>
      <RouterLink
        to="/pengaturan/tentang"
        class="no-print mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-copper"
      >
        Buka Tentang aplikasi →
      </RouterLink>
    </AppCard>
  </div>
</template>
