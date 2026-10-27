# Panduan Pengguna — StokPlus PWA

**StokPlus — Lebih dari sekadar stok.**

Panduan singkat untuk operasional harian usaha frozen food: stok, pembelian, penjualan, beban, expiry, laporan, backup, dan penggunaan offline.

| Item | Nilai |
|---|---|
| Versi aplikasi | 1.0.0 |
| Platform | PWA (Android, iPhone/iPad, desktop) |
| Data | Lokal di perangkat (IndexedDB) |
| Akun | Satu HP, satu pengguna, PIN 6 digit |

> Panduan ini juga tersedia di dalam aplikasi: **Lainnya → Panduan pengguna**.

---

## 1. Pertama kali memakai

1. Buka StokPlus di browser.
2. Pilih **Mulai Baru**.
3. Isi nama usaha dan nama pemilik.
4. Buat PIN 6 digit dan ulangi.
5. Opsional: aktifkan **Isi data contoh** untuk mencoba alur.
6. Selesai. Dashboard akan terbuka.

**Penting:**

- PIN disimpan sebagai hash lokal dan **tidak dapat dipulihkan**.
- Jika PIN lupa, data harus dihapus dari pengaturan browser. Gunakan backup untuk memulihkan data, tetapi PIN tetap mengikuti PIN pada file backup.
- Semua data tersimpan di HP ini. Tidak ada sinkronisasi otomatis antarperangkat.

---

## 2. Alur harian singkat

```text
Buka aplikasi
  → cek dashboard dan expiry
  → catat penjualan / pembelian / beban
  → cek stok dan lot
  → backup berkala
```

Gunakan bottom navigation:

| Tab | Fungsi |
|---|---|
| Dashboard | Ringkasan penjualan, laba, stok, expiry, dan aktivitas. |
| Transaksi | Pembelian, penjualan, dan beban operasional. |
| Stok | Saldo, kartu stok, expiry, write-off, dan opname. |
| Laporan | Enam laporan dan export Excel/print. |
| Lainnya | Master data, panduan, UAT, pengaturan, backup, migrasi. |

---

## 3. Master data dan multi-satuan

1. Buka **Lainnya → Master data**.
2. Buat **Kategori produk** (misalnya Frozen Food, Bumbu).
3. Buat **Satuan** (pcs, pack, dus, gram, kg).
4. Buat **Produk**:
   - Pilih base unit terkecil, misalnya `pcs` untuk Siomay atau `gram` untuk Ayam Fillet.
   - Tambahkan satuan lain dan konversi: `pack = 10 pcs`, `dus = 100 pcs`.
   - Base unit harus memiliki konversi `1`.
   - Isi harga beli/jual per satuan dan default beli/jual.
   - Aktifkan **Track expiry** bila produk memiliki tanggal kedaluwarsa.
5. Opsional: isi **Opening stock** dan expiry saat membuat produk.

**Aturan penting:**

- Konversi dan qty base harus bilangan bulat.
- Barcode harus unik.
- Base unit dan konversi terkunci setelah produk memiliki stok, lot, atau transaksi.
- Data yang sudah dipakai tidak dihapus, tetapi dinonaktifkan.

---

## 4. Pembelian

1. Buka **Transaksi → Pembelian → Tambah**.
2. Pilih supplier dan tanggal.
3. Tambahkan item:
   - Pilih satuan beli (misalnya dus).
   - Isi qty dan harga per satuan.
   - Isi expiry untuk produk track-expiry.
   - Lot code otomatis dapat diganti manual.
4. Isi diskon item/header dan biaya angkut bila ada.
5. **Simpan draft** bila belum final, atau **Selesaikan** untuk:
   - Membuat lot dan expiry.
   - Menambah stok base.
   - Menghitung HPP per base.
   - Mencatat movement `purchase_in`.

Pembatalan pembelian hanya bisa dilakukan jika semua lot masih utuh dan belum dikonsumsi. Lot yang dibatalkan ditandai `depleted` agar histori tetap dapat diaudit.

---

## 5. Penjualan dan FEFO

1. Buka **Transaksi → Penjualan → Tambah**.
2. Pilih produk dan satuan jual.
3. Isi qty; aplikasi menampilkan stok tersedia dalam satuan tersebut.
4. Pilih metode bayar: Tunai, Transfer, atau QRIS.
5. Untuk tunai, isi jumlah bayar; kembalian dihitung otomatis.
6. **Selesaikan** penjualan.

**Cara lot dipilih:**

- Produk track-expiry: **FEFO** — lot dengan expiry terdekat dipakai lebih dulu.
- Produk tanpa expiry: **FIFO** — lot dengan penerimaan paling lama dipakai lebih dulu.
- Lot expired atau karantina tidak dapat dijual. Lot dengan expiry hari ini masih dapat dijual.
- Jika stok tidak cukup, transaksi ditolak tanpa perubahan parsial.

Pembatalan penjualan mengembalikan qty ke lot asal, mencatat movement `sale_cancel`, dan membalik COGS/laba kotor.

---

## 6. Beban operasional

Beban adalah biaya di luar pembelian barang dagang, misalnya listrik, sewa, gaji, dan kebersihan.

1. Buka **Transaksi → Beban**.
2. Tambah beban: kategori, keterangan, tanggal, nominal, dan metode bayar.
3. Simpan draft atau selesaikan.

Hanya beban **selesai** yang dihitung di laba/rugi. Beban tidak mengubah stok, lot, atau movement.

---

## 7. Stok, expiry, write-off, dan opname

### Stok

- Menampilkan saldo base/display, nilai persediaan, dan ringkasan lot.
- Filter: menipis, habis, expired, karantina.
- Kartu stok menampilkan ledger movement per lot.

### Expiry

- Menampilkan lot expired, mendekati expiry, dan karantina/expiry tidak diketahui.
- Gunakan **Write-off** untuk barang expired atau rusak.
- Write-off selesai mengurangi stok, mencatat movement, dan masuk sebagai kerugian persediaan.

### Stok opname

1. Buat sesi opname dan isi qty fisik.
2. Finalisasi.
3. Kekurangan dialokasikan ke lot dengan expiry paling awal/expired lebih dulu.
4. Surplus membuat lot baru dengan HPP rata-rata tersisa atau biaya beli terakhir.
5. Finalisasi diblokir bila stok produk tidak konsisten dengan jumlah lot.

---

## 8. Laporan dan export

Buka **Laporan**. Pilih periode:

- Hari ini
- Minggu ini
- Bulan ini
- Tahun ini
- Custom

Laporan yang tersedia:

1. Penjualan (kotor, diskon, bersih, COGS, laba kotor).
2. Pembelian (kotor, diskon, angkut, bersih).
3. Stok (qty, nilai, expiry).
4. Beban per kategori.
5. Expiry (termasuk write-off dalam periode).
6. Laba/rugi.

Rumus:

```text
Laba kotor = penjualan bersih − HPP
Laba bersih = laba kotor − kerugian persediaan − beban operasional
```

Gunakan **Excel** untuk mengunduh file `.xlsx` atau **Print** untuk layout cetak. HPP historis dari migrasi diberi label estimasi berdasarkan cutover date.

---

## 9. Backup dan restore

### Backup

1. Buka **Pengaturan → Backup & restore**.
2. Pilih enkripsi (opsional) dan passphrase.
3. Unduh file `stokplus-backup-YYYYMMDD-HHmm.json`.

File backup memuat seluruh tabel domain, termasuk lot, konsumsi lot, write-off, dan opname. `app_meta` tidak ikut karena metadata teknis internal.

### Restore

1. Buka **Pengaturan → Restore** atau pilih restore saat onboarding.
2. Pilih file backup.
3. Periksa preview jumlah data.
4. Konfirmasi.

Restore:

- Memvalidasi app, schema, dan checksum.
- Membuat safety backup sebelum mengganti data.
- Berjalan dalam satu transaksi Dexie; jika gagal, data lama tetap utuh.
- Mengunci aplikasi dan memakai PIN dari file backup.

**Rutinitas:** backup minimal seminggu sekali, sebelum reset, sebelum migrasi, dan sebelum mengganti HP. Simpan file di cloud/komputer, bukan hanya folder Download HP.

---

## 10. Migrasi dari Laravel

1. Di Laravel, jalankan:

   ```bash
   php artisan stokplus:export-json
   ```

   Perintah meminta konfirmasi backup database dan memastikan tidak ada transaksi draft. PHP minimal 8.3.36.

2. Di StokPlus, buka **Pengaturan → Migrasi Laravel**.
3. Pilih file export.
4. Validasi dan periksa preview (jumlah data, relasi, rekonsiliasi).
5. Tentukan cutover date.
6. Lengkapi expiry opening lot. Produk track-expiry tanpa expiry masuk karantina.
7. Ketik `MIGRASI` dan import.

Import berjalan atomik. HPP historis memakai weighted average pembelian setelah diskon, fallback pembelian terakhir/harga beli produk, dan ditandai estimasi.

---

## 11. Pasang dan pakai offline

### Android / Chrome

1. Buka StokPlus di Chrome.
2. Ketuk menu tiga titik.
3. Pilih **Instal aplikasi** atau **Tambahkan ke layar utama**.
4. Konfirmasi.

### iPhone / iPad

1. Buka StokPlus di **Safari**, bukan browser lain.
2. Ketuk tombol **Bagikan**.
3. Pilih **Tambah ke Layar Utama**.
4. Ketuk **Tambah**.

### Offline

- Setelah dibuka sekali, app shell tersimpan oleh service worker.
- Mode pesawat: aplikasi tetap terbuka dan transaksi baru disimpan di IndexedDB.
- Banner **Mode offline** muncul saat tidak ada internet.
- Saat ada versi baru, muncul prompt **Muat ulang**. Data lokal tidak hilang.

Cek status di **Pengaturan → Aplikasi & offline**.

---

## 12. Keamanan dan PIN

- PIN 6 digit, hash PBKDF2-SHA256 + salt.
- Auto-lock 1/5/15 menit; dapat diubah di **Pengaturan → Keamanan**.
- Kunci manual dari ikon gembok atau menu Lainnya.
- Tidak ada email, akun server, atau pemulihan PIN.
- Backup berisi PIN hash saat backup dibuat.

---

## 13. Pemecahan masalah

| Masalah | Solusi |
|---|---|
| Data tidak muncul setelah ganti HP | Backup dari HP lama, restore di HP baru. Data tidak disinkronkan otomatis. |
| PIN lupa | PIN tidak dapat dipulihkan. Hapus data situs, onboarding ulang, lalu restore backup dengan PIN dari file tersebut. |
| Pembelian tidak bisa dibatalkan | Lot sudah dikonsumsi atau tidak utuh. Periksa detail lot. |
| Produk tidak muncul di penjualan | Pastikan produk aktif, punya satuan jual, dan stok non-expired. |
| Aplikasi tidak mau install | PWA memerlukan HTTPS/localhost. iOS memakai Safari; Android memakai Chrome. |
| Prompt update tidak muncul | Buka **Pengaturan → Aplikasi & offline → Periksa pembaruan**, lalu muat ulang. |
| Aplikasi lambat | Tutup tab lain, pastikan storage cukup, dan backup data lama. |

---

## 14. Batasan MVP

Belum tersedia dan masuk backlog:

- Barcode scanner.
- Cloud backup dan multi-device sync.
- Multi-user dan role.
- Retur pembelian.
- Pilih lot manual.
- Average cost.
- Tiered pricing.
- Cetak struk Bluetooth.
- Multi-gudang.
- Dark mode.
- Push notification expiry.
- Transfer stok.

---

## 15. Bantuan

Sertakan informasi berikut saat melapor:

- Versi aplikasi (Pengaturan → Tentang).
- Perangkat dan browser.
- Langkah yang dilakukan.
- Screenshot/video bila memungkinkan.
- Apakah masalah terjadi online atau offline.

Dokumen terkait:

- `docs/UAT.md` — skenario dan sign-off.
- `docs/RELEASE.md` — checklist rilis dan rollback.
- `docs/DEPLOY.md` — cara deploy statis.
- `docs/PHASES.md` — status fase dan gate.
