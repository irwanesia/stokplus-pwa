<script setup lang="ts">
import { BookOpen, Search } from '@lucide/vue'
import { computed, ref } from 'vue'

import PageHeader from '@/components/navigation/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'

const query = ref('')

interface GlossaryTerm {
  term: string
  short: string
  detail: string
  formula?: string
  example?: string
}

const terms: GlossaryTerm[] = [
  {
    term: 'Lot',
    short: 'Kelompok stok dari satu kali barang masuk atau pembelian.',
    detail:
      'Lot membantu aplikasi membedakan stok yang datang pada waktu berbeda, terutama bila harga beli atau tanggal kedaluwarsanya berbeda.',
  },
  {
    term: 'Lot code',
    short: 'Kode penanda untuk satu lot.',
    detail:
      'Boleh diisi dari kode pada kemasan atau nota pemasok. Jika dikosongkan, aplikasi membuatkan kode otomatis.',
  },
  {
    term: 'Base unit',
    short: 'Satuan paling kecil yang dipakai aplikasi untuk menghitung stok.',
    detail:
      'Contoh: untuk produk yang dibeli per dus tetapi dijual per pcs, pilih pcs sebagai base unit. Untuk produk timbang, gram bisa menjadi base unit.',
  },
  {
    term: 'Konversi satuan',
    short: 'Perbandingan satu satuan dengan base unit.',
    detail:
      'Contoh: 1 dus = 100 pcs. Masukkan angka 100 pada konversi satuan dus jika base unit-nya pcs.',
    formula: 'Qty base = qty satuan × jumlah konversi',
    example: '2 dus × 100 pcs/dus = 200 pcs',
  },
  {
    term: 'Subtotal pembelian',
    short: 'Nilai barang sebelum diskon header dan biaya angkut.',
    detail:
      'Diskon item mengurangi nilai baris pembelian. Pembulatan nilai uang dilakukan ke rupiah penuh.',
    formula: 'Subtotal item = (qty × harga beli per satuan) − diskon item',
    example: '2 dus × Rp 150.000 − Rp 10.000 = Rp 290.000',
  },
  {
    term: 'Total pembelian',
    short: 'Jumlah akhir pembelian setelah diskon header dan biaya angkut.',
    detail: 'Diskon header mengurangi subtotal, sedangkan biaya angkut menambah total pembelian.',
    formula: 'Total pembelian = subtotal − diskon header + biaya angkut',
    example: 'Rp 300.000 − Rp 10.000 + Rp 5.000 = Rp 295.000',
  },
  {
    term: 'Alokasi biaya pembelian',
    short: 'Pembagian diskon header dan biaya angkut ke masing-masing lot.',
    detail:
      'Setiap bagian dibagikan secara proporsional terhadap subtotal item. Nilai alokasi dibulatkan ke rupiah penuh sebelum total biaya lot dihitung.',
    formula:
      'Alokasi diskon = diskon header × (subtotal item ÷ subtotal)\nAlokasi angkut = biaya angkut × (subtotal item ÷ subtotal)\nTotal biaya lot = subtotal item − alokasi diskon + alokasi angkut',
    example:
      'Satu item dengan subtotal Rp 300.000 dari subtotal Rp 300.000 mendapat seluruh alokasi: diskon Rp 10.000 dan angkut Rp 5.000. Total biaya lot = Rp 295.000.',
  },
  {
    term: 'HPP per base unit',
    short: 'Biaya perolehan untuk satu unit stok terkecil dalam satu lot.',
    detail:
      'HPP lot memasukkan harga beli setelah diskon item, alokasi diskon header, dan alokasi biaya angkut. Disimpan dengan presisi maksimal 4 angka desimal.',
    formula: 'HPP per base = total biaya lot ÷ qty base yang diterima',
    example: 'Rp 295.000 ÷ 200 pcs = Rp 1.475 per pcs',
  },
  {
    term: 'Qty',
    short: 'Singkatan dari quantity, artinya jumlah barang.',
    detail: 'Isi jumlah barang sesuai satuan yang sedang dipilih, misalnya 2 dus atau 5 pack.',
  },
  {
    term: 'Expiry',
    short: 'Tanggal kedaluwarsa barang.',
    detail:
      'Isi sesuai tanggal pada kemasan. Aplikasi dapat mengingatkan barang yang mendekati tanggal kedaluwarsa.',
  },
  {
    term: 'HPP',
    short: 'Harga pokok penjualan, yaitu modal barang yang terjual.',
    detail:
      'Di StokPlus, HPP per penjualan dihitung dari biaya lot yang benar-benar dikonsumsi. HPP per base unit pada lot berasal dari harga beli setelah diskon dan alokasi biaya angkut. HPP bukan harga jual ke pelanggan.',
  },
  {
    term: 'COGS',
    short:
      'Singkatan dari Cost of Goods Sold, istilah bahasa Inggris untuk HPP barang yang terjual.',
    detail:
      'COGS adalah total biaya perolehan stok yang dikonsumsi dalam penjualan. StokPlus menghitungnya dari qty yang diambil dari setiap lot dikali HPP per base unit, lalu menyimpannya saat penjualan selesai. COGS sama artinya dengan HPP penjualan.',
    formula: 'COGS item = Σ (qty base dari lot × HPP per base lot)\nCOGS penjualan = Σ COGS item',
    example:
      'Ambil 10 pcs dari lot A (HPP Rp 1.000/pcs) dan 5 pcs dari lot B (HPP Rp 1.200/pcs): COGS = Rp 10.000 + Rp 6.000 = Rp 16.000.',
  },
  {
    term: 'Laba kotor',
    short: 'Penjualan bersih setelah diskon dikurangi HPP atau COGS.',
    detail:
      'Contoh: total penjualan setelah diskon Rp 100.000 dan COGS Rp 65.000 menghasilkan laba kotor Rp 35.000. Laba kotor belum dikurangi beban operasional.',
    formula: 'Laba kotor = total penjualan setelah diskon − COGS',
    example: 'Rp 72.000 − Rp 45.000 = Rp 27.000',
  },
  {
    term: 'Konsumsi lot',
    short: 'Jumlah stok yang diambil dari lot tertentu saat penjualan diselesaikan.',
    detail:
      'Catatan konsumsi menunjukkan lot asal, qty base yang terpakai, dan biayanya. Informasi ini menjadi dasar COGS serta membantu mengembalikan stok ke lot asal jika penjualan dibatalkan.',
  },
  {
    term: 'Stok layak jual',
    short: 'Jumlah stok dari lot aktif yang boleh digunakan untuk penjualan saat ini.',
    detail:
      'Stok layak jual tidak memasukkan lot yang sudah habis, kedaluwarsa, atau dikarantina. Untuk produk dengan tracking expiry, lot tanpa tanggal expiry juga tidak dapat dijual.',
  },
  {
    term: 'Karantina',
    short: 'Status lot yang diblokir agar tidak dipakai atau dijual.',
    detail:
      'Contohnya lot produk yang memakai tracking expiry tetapi tanggal expiry-nya tidak diketahui. Stok karantina tidak dihitung sebagai stok layak jual.',
  },
  {
    term: 'Walk-in',
    short: 'Penjualan kepada pelanggan umum tanpa memilih data pelanggan.',
    detail:
      'Pilih “Umum / walk-in” untuk transaksi langsung yang tidak perlu dikaitkan dengan catatan pelanggan tertentu.',
  },
  {
    term: 'Kembalian',
    short: 'Sisa uang tunai yang dikembalikan setelah pelanggan membayar lebih dari total.',
    detail:
      'Kembalian = jumlah bayar tunai − total penjualan. Pembayaran transfer atau QRIS harus sama dengan total, sehingga tidak menghasilkan kembalian.',
    formula: 'Kembalian tunai = jumlah bayar − total penjualan',
    example: 'Bayar Rp 75.000 − total Rp 72.000 = kembalian Rp 3.000',
  },
  {
    term: 'Diskon item dan diskon header',
    short: 'Potongan harga untuk satu barang atau untuk seluruh transaksi.',
    detail:
      'Diskon item mengurangi subtotal barang tersebut. Diskon header mengurangi subtotal seluruh transaksi. Keduanya mengurangi penjualan bersih, bukan biaya lot atau COGS.',
  },
  {
    term: 'Draft',
    short: 'Transaksi yang disimpan sementara dan belum mengubah stok.',
    detail:
      'Penjualan draft dapat disimpan meski stok layak jual belum cukup. Stok baru dialokasikan dan COGS dihitung saat penjualan diselesaikan.',
  },
  {
    term: 'Subtotal dan total penjualan',
    short: 'Subtotal berasal dari seluruh barang; diskon header mengurangi total transaksi.',
    detail:
      'Diskon item mengurangi baris barang. Diskon header mengurangi subtotal transaksi. Diskon mengurangi pendapatan, bukan HPP lot.',
    formula:
      'Subtotal item = (qty × harga jual per satuan) − diskon item\nTotal penjualan = Σ subtotal item − diskon header',
    example: '3 pack × Rp 24.000 − diskon Rp 0 − diskon header Rp 0 = total Rp 72.000',
  },
  {
    term: 'Perubahan stok',
    short: 'Stok base bertambah saat barang masuk dan berkurang saat terjual.',
    detail:
      'Pembelian menambah stok, penjualan mengurangi stok sesuai qty base. Pembatalan penjualan mengembalikan qty ke lot asal.',
    formula:
      'Setelah barang masuk = stok sebelum + qty base masuk\nSetelah penjualan = stok sebelum − qty base terjual',
    example: 'Stok 200 pcs − penjualan 30 pcs = stok 170 pcs',
  },
  {
    term: 'Nilai persediaan',
    short: 'Perkiraan nilai biaya dari sisa stok di seluruh lot.',
    detail:
      'Hitung setiap lot dari qty yang masih tersisa dikali HPP per base lot, lalu jumlahkan. Lot expired atau karantina tetap merupakan stok fisik sampai dikeluarkan melalui proses yang sesuai.',
    formula: 'Nilai persediaan = Σ (qty tersisa per lot × HPP per base lot)',
    example:
      'Lot A tersisa 10 pcs × Rp 1.000 dan lot B tersisa 5 pcs × Rp 1.200 = nilai persediaan Rp 16.000.',
  },
  {
    term: 'FEFO',
    short: 'Stok dengan expiry paling dekat dipakai atau dijual lebih dulu.',
    detail:
      'Cara ini membantu mengurangi risiko barang kedaluwarsa, terutama untuk frozen food dan makanan.',
  },
  {
    term: 'FIFO',
    short: 'Stok yang masuk lebih dulu dipakai atau dijual lebih dulu.',
    detail: 'Cara ini biasanya dipakai untuk barang yang tidak memiliki tanggal kedaluwarsa.',
  },
  {
    term: 'Stock opname',
    short: 'Menghitung dan mencocokkan stok fisik dengan stok di aplikasi.',
    detail:
      'Finalisasi opname mengurangi lot secara FEFO untuk kekurangan. Kelebihan membuat lot baru dengan HPP rata-rata stok tersisa; lot ber-expiry tanpa tanggal ditempatkan di karantina.',
    formula:
      'Selisih qty = stok fisik − stok sistem\nNilai selisih = Σ(qty kekurangan per lot × HPP lot) − (qty surplus × HPP lot baru)',
    example:
      'Stok sistem 20 pcs, fisik 17 pcs. Jika tiga pcs terambil dari lot ber-HPP Rp 1.500/pcs, selisih −3 pcs dan kerugian opname Rp 4.500.',
  },
  {
    term: 'Write-off',
    short: 'Mengurangi stok yang tidak bisa dijual.',
    detail:
      'Gunakan untuk barang rusak, hilang, atau kedaluwarsa agar stok dan laporan tetap sesuai. Draft belum memengaruhi stok; pembatalan write-off selesai memulihkan qty lot.',
    formula: 'Biaya write-off = Σ (qty write-off per lot × HPP per base lot)',
    example:
      'Write-off 10 pcs dari lot ber-HPP Rp 1.500/pcs menghasilkan kerugian persediaan Rp 15.000.',
  },
  {
    term: 'Kerugian persediaan',
    short: 'Nilai write-off dan kekurangan opname setelah dikurangi surplus opname.',
    detail:
      'Dihitung terpisah dari HPP penjualan dan beban operasional. Hanya write-off serta sesi opname yang selesai dalam periode laporan yang dihitung.',
    formula:
      'Kerugian persediaan = Σ write-off selesai + Σ biaya opname kekurangan − Σ biaya opname surplus',
    example:
      'Write-off Rp 15.000 + kekurangan opname Rp 3.000 − surplus opname Rp 3.000 = kerugian persediaan Rp 15.000.',
  },
  {
    term: 'Supplier',
    short: 'Pihak atau toko tempat usaha membeli barang.',
    detail: 'Contohnya distributor, grosir, atau produsen barang.',
  },
]

const filteredTerms = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase('id')
  if (!keyword) return terms

  return terms.filter((item) =>
    [item.term, item.short, item.detail, item.formula ?? '', item.example ?? ''].some((value) =>
      value.toLocaleLowerCase('id').includes(keyword),
    ),
  )
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="Kamus istilah"
      subtitle="Arti istilah dan rumus perhitungan yang dipakai di StokPlus."
      back-to="/lainnya"
    />

    <label
      class="input input-bordered flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] bg-base-100"
    >
      <Search class="h-5 w-5 shrink-0 text-base-content/65" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        class="min-w-0 grow bg-transparent text-sm outline-none"
        placeholder="Cari istilah, misalnya lot, HPP, atau COGS"
        aria-label="Cari istilah"
      />
    </label>

    <div class="space-y-3">
      <AppCard v-for="item in filteredTerms" :key="item.term" :title="item.term">
        <p class="text-sm font-medium leading-6 text-base-content">{{ item.short }}</p>
        <p class="mt-2 text-sm leading-6 text-base-content/65">{{ item.detail }}</p>
        <div
          v-if="item.formula"
          class="mt-3 rounded-xl border border-brand-border bg-base-200/70 p-3"
        >
          <p class="text-[10px] font-semibold tracking-wide text-base-content/65 uppercase">
            Rumus
          </p>
          <p class="mt-1 whitespace-pre-line font-mono text-xs leading-5 text-base-content">
            {{ item.formula }}
          </p>
          <p v-if="item.example" class="mt-2 text-xs leading-5 text-base-content/65">
            <span class="font-semibold">Contoh:</span> {{ item.example }}
          </p>
        </div>
      </AppCard>

      <AppCard v-if="filteredTerms.length === 0" tone="muted" title="Istilah tidak ditemukan">
        <p class="text-sm leading-6 text-base-content/65">
          Coba gunakan kata lain, misalnya “stok”, “tanggal”, “COGS”, atau “modal”.
        </p>
      </AppCard>
    </div>

    <div class="flex items-start gap-3 rounded-2xl bg-brand-navy p-4 text-white">
      <BookOpen class="mt-0.5 h-5 w-5 shrink-0 text-brand-copper" aria-hidden="true" />
      <p class="text-sm leading-6 text-white/80">
        Rumus dan contoh ini adalah panduan hitung. Data transaksi dan cara kerja aplikasi tidak
        berubah.
      </p>
    </div>
  </div>
</template>
