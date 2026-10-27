# PRD — StokPlus (PWA)

**Aplikasi stok, penjualan, pembelian, beban, dan laba untuk usaha frozen food — local-first.**

| Item | Nilai |
|---|---|
| Versi dokumen | 2.1 |
| Status | Disetujui — Phase 0 selesai |
| Tanggal | 25 Oktober 2026 |
| Product owner | Pemilik usaha / pengguna StokPlus |
| Target platform | PWA (Android Chrome, iOS Safari) |
| Mode data | Local-first, IndexedDB, tanpa server |
| Target pengguna | Satu HP, satu pengguna lokal |
| Dokumen terkait | `docs/PHASES.md`, `arif-manajemen/docs/01_PRD.md`, `arif-manajemen/docs/04_DATABASE.md`, `arif-manajemen/docs/contoh_UI_mobile/` |

---

## 0. Ringkasan Keputusan

Keputusan yang sudah disepakati dan menjadi dasar PRD ini:

1. Nama produk: **StokPlus**. Tagline: **“Lebih dari sekadar stok.”** Monogram: **`S+`**.
2. Aplikasi digunakan di **satu HP**, satu pengguna utama, dengan **PIN lokal**.
3. Distribusi berupa **PWA**, bukan aplikasi native/APK pada MVP.
4. Data disimpan **lokal di HP** menggunakan **IndexedDB** melalui Dexie.js.
5. Tidak ada server, API, login online, atau sinkronisasi multi-perangkat pada MVP.
6. UI menggunakan **Vue 3 + Vite + Tailwind CSS + DaisyUI**, mobile-first.
7. Data lama dari aplikasi Laravel **dimigrasikan** melalui export JSON.
8. **Backup wajib** dan menjadi bagian inti produk.
9. **Barcode scanner ditunda**; field barcode disiapkan di level satuan produk.
10. Aplikasi bukan ERP dan bukan akuntansi double-entry.
11. Stok memakai **multi-unit**: pembelian bisa per dus/kg, penjualan per pack/gram/pcs.
12. HPP memakai **FEFO** untuk produk ber-expiry dan **FIFO** untuk produk tanpa expiry.
13. **Expiry tracking** diaktifkan per produk.
14. Pembelian hanya boleh dibatalkan jika **semua lot dari pembelian itu masih utuh**.
15. HPP diakui saat **barang terjual** (COGS), bukan total pembelian periode.
16. **Beban operasional dipisahkan** dari HPP; write-off expired/rusak menjadi baris **Kerugian Persediaan**.
17. Migrasi memakai **opening lot saat cutover**; HPP transaksi historis ditandai **estimasi**.
18. Fitur Laravel yang **tidak dibawa**: role admin/owner, master user, login email/password, dan upload logo.
19. Semua transaksi memakai status **draft / completed / cancelled**.
20. Metode pembayaran: **Tunai, Transfer, QRIS**.

### 0.1 Perubahan dari PRD v1.0

| Area | v1.0 | v2.0 |
|---|---|---|
| Brand | SMPP | StokPlus |
| Satuan | Satu satuan per produk | Multi-unit + konversi |
| HPP | Total pembelian periode | COGS per penjualan, FEFO/FIFO |
| Expiry | Tidak ada | Lot, expiry, alert, write-off |
| Laba rugi | HPP periode | HPP aktual + kerugian persediaan + opex |
| Migrasi | Transaksi + stok | Opening lot + estimasi HPP historis |
| Role | Tidak ada | Tidak ada (diperjelas) |
| Logo | Opsional | Dihapus dari MVP |
| Barcode | Field produk | Field per satuan produk |

---

## 1. Product Overview

### 1.1 Nama Produk

**StokPlus**

Monogram: **`S+`**

Tagline: **“Lebih dari sekadar stok.”**

Palet brand:

| Token | Nilai | Penggunaan |
|---|---|---|
| Navy | `#1E2A78` | Warna utama, header, CTA |
| Navy 600 | `#26359A` | Hover/active |
| Copper | `#B86B4B` | Aksen, highlight |
| Off-white | `#F7F5F1` | Background |
| Surface | `#FFFFFF` | Kartu |
| Text | `#181818` | Teks utama |
| Muted | `#6B7280` | Teks sekunder |

Tidak ada file logo pada MVP. Identitas visual memakai monogram `S+` yang dibuat dari teks/ikon, bukan upload gambar.

### 1.2 Deskripsi

StokPlus adalah aplikasi PWA untuk mencatat dan memantau:

- Penjualan
- Pembelian
- Persediaan multi-satuan
- Lot dan tanggal expired
- Stok opname
- Beban operasional
- Laporan penjualan, pembelian, stok, beban, expiry, dan laba/rugi

Aplikasi berjalan sepenuhnya di HP. Setelah dipasang, aplikasi dapat dibuka dan digunakan **tanpa internet**. Data tersimpan di perangkat dan dapat dipindahkan melalui file backup.

StokPlus dirancang untuk usaha **frozen food** yang:

- membeli bahan/produk dalam dus, kg, atau bal,
- menjual dalam pack, gram, atau pcs,
- menghadapi fluktuasi harga beli dari pabrik,
- perlu mengontrol barang mendekati expired,
- ingin memisahkan HPP dari beban operasional seperti listrik freezer, sewa, dan sampah.

### 1.3 Positioning

StokPlus adalah **back-office stok dan penjualan** untuk usaha kecil/menengah, bukan:

- ERP penuh
- Aplikasi akuntansi double-entry
- Aplikasi kasir customer-facing
- Aplikasi multi-cabang/multi-gudang
- Layanan cloud multi-pengguna

### 1.4 Prinsip Produk

1. **Cepat dicatat** — transaksi 1–3 item selesai di bawah 60 detik.
2. **Bisa dipakai offline** — tidak ada ketergantungan jaringan.
3. **Data milik pengguna** — tidak ada upload otomatis ke pihak ketiga.
4. **Aman dari kehilangan data** — backup/restore wajib dan mudah.
5. **Mobile-first** — semua alur dirancang untuk satu tangan dan layar 360–430px.
6. **Sederhana** — hanya fitur yang dibutuhkan operasional harian.
7. **Akurat secara stok** — semua mutasi berasal dari ledger dan lot.
8. **Akurat secara laba** — HPP berasal dari batch yang benar-benar terjual.
9. **Sadar expiry** — stok mendekati expired terlihat dan bisa ditindaklanjuti.

---

## 2. Background & Problem Statement

### 2.1 Background

Versi Laravel saat ini membutuhkan PHP runtime, web server, dan database MySQL. Untuk penggunaan di HP, model tersebut tidak praktis karena:

- Harus ada hosting/server yang aktif.
- Tidak bisa dipakai saat offline.
- Bergantung pada koneksi internet.
- Biaya operasional dan perawatan server terus ada.

Selain itu, kebutuhan usaha frozen food tidak cukup ditangani oleh stok satu satuan dan HPP periode:

- Pembelian sering dalam dus atau kg, sedangkan penjualan dalam pack, gram, atau pcs.
- Harga beli dari pabrik berubah-ubah, sehingga HPP periode bisa menyesatkan.
- Barang memiliki tanggal expired yang harus dipantau.
- Listrik freezer, sewa, dan sampah harus dipisahkan dari HPP agar laba bersih akurat.

### 2.2 Problem Statement

1. Pencatatan penjualan dan pembelian masih membutuhkan perangkat lain/server.
2. Stok tidak selalu tercatat real-time saat transaksi terjadi.
3. Konversi satuan manual rawan salah hitung.
4. HPP periode tidak mencerminkan batch yang terjual.
5. Barang expired tidak terpantau, sehingga menjadi kerugian tak terlihat.
6. Beban operasional tercampur dengan pembelian bahan, sehingga laba bersih tidak akurat.
7. Laporan tidak bisa diakses cepat saat pemilik berada di luar toko.
8. Data berisiko hilang jika perangkat rusak atau storage dibersihkan.

### 2.3 Peluang

PWA local-first menghilangkan kebutuhan server, mempercepat input, dan memberikan kontrol penuh atas data. Dengan lot, expiry, dan COGS, StokPlus tidak hanya mencatat stok, tetapi membantu pemilik frozen food mengetahui:

- stok mana yang harus dijual lebih dulu,
- berapa laba kotor sebenarnya per penjualan,
- berapa nilai stok yang berisiko expired,
- berapa laba bersih setelah beban operasional.

---

## 3. Goals & Non-Goals

### 3.1 Goals

| Goal | Ukuran Keberhasilan |
|---|---|
| Input transaksi cepat | Rata-rata < 60 detik untuk 1–3 item |
| Aplikasi dapat dipakai offline | Semua alur utama berjalan tanpa jaringan setelah instalasi |
| Stok konsisten | Tidak ada selisih stok setelah uji siklus transaksi |
| Konversi satuan akurat | Qty base selalu sama dengan qty transaksi × faktor konversi |
| HPP akurat | COGS per penjualan sama dengan lot yang dikonsumsi |
| Expiry terkontrol | Semua lot expired/hampir expired terlihat dan bisa di-write-off |
| Laba bersih akurat | HPP, kerugian persediaan, dan opex terpisah di laporan |
| Data dapat dipulihkan | Backup/restore berhasil 100% pada UAT |
| Mobile-friendly | Tidak ada horizontal scroll pada alur utama di 360px |
| Instalasi mudah | Berhasil dipasang di Android Chrome dan iOS Safari |
| Migrasi aman | Data Laravel masuk, stok awal rekonsiliasi, tidak ada relasi yatim |

### 3.2 Non-Goals (MVP)

- Multi-user dan role admin/owner di perangkat yang sama.
- Master user, manajemen pengguna, dan audit pelaku.
- Login email/password.
- Upload logo usaha.
- Sinkronisasi antar HP.
- Backup otomatis ke cloud.
- Barcode scanning.
- Cetak struk ke printer thermal.
- Integrasi marketplace, payment gateway, atau akuntansi.
- Pajak, payroll, hutang/piutang.
- Multi-gudang, multi-cabang, multi-currency.
- Aplikasi native APK/IPA.
- Dark mode.
- Notifikasi push.
- Average cost sebagai metode utama.
- Retur pembelian dan pilih lot manual.

### 3.3 Future Scope

| Fitur | Prioritas | Catatan |
|---|---|---|
| Barcode scanner via kamera | Tinggi | Field barcode sudah disiapkan |
| Backup ke Google Drive | Tinggi | Setelah backup file stabil |
| Multi-device sync | Sedang | Butuh backend/konflik resolution |
| Multi-user + role | Sedang | Bertentangan dengan model single-user MVP |
| Cetak struk Bluetooth | Sedang | Thermal printer |
| Retur pembelian | Sedang | Mengembalikan lot ke supplier |
| Pilih lot manual saat jual | Sedang | Untuk kondisi khusus |
| Average cost option | Rendah | Alternatif metode HPP |
| Multi-gudang | Rendah | Butuh transfer stok |
| PWA push notification | Rendah | Untuk expiry alert |
| Capacitor wrapper (APK) | Rendah | Jika PWA kurang |
| Tiered pricing | Rendah | Harga grosir/retail |

---

## 4. Persona & Role

### 4.1 Persona Utama — Pemilik Usaha Frozen Food

- Menggunakan satu HP Android atau iPhone.
- Mengelola penjualan, pembelian, stok, expiry, dan beban sendiri.
- Tidak selalu memiliki koneksi internet stabil.
- Membutuhkan laporan cepat untuk melihat kondisi usaha.
- Tidak ingin mengelola server atau database.
- Membeli dalam dus/kg dan menjual dalam pack/gram/pcs.

### 4.2 Persona Sekunder — Operator Toko

- Menggunakan HP yang sama dengan pemilik.
- Membutuhkan alur input penjualan yang cepat.
- Tidak memerlukan akses ke pengaturan atau backup.
- Tetap memakai PIN yang sama pada MVP.

### 4.3 Model Role

MVP menggunakan **single local operator**. Tidak ada pembedaan hak akses di dalam aplikasi.

| Aspek | MVP |
|---|---|
| Login | PIN 6 digit |
| Jumlah pengguna | 1 |
| Role | Tidak ada |
| Ganti pengguna | Tidak ada |
| Master user | Tidak ada |
| Login email/password | Tidak ada |
| Audit pelaku | Tidak ada (single user) |
| Upload logo | Tidak ada |

Keamanan perangkat mengandalkan PIN aplikasi + kunci layar HP. Role dan multi-user masuk future scope.

---

## 5. Scope

### 5.1 In Scope — MVP

| Area | Fitur |
|---|---|
| Onboarding | Setup usaha, PIN, restore backup |
| Dashboard | KPI, filter periode, grafik 6 bulan, stok alert, expiry alert, aktivitas terbaru |
| Master data | Produk, kategori produk, satuan global, satuan produk/konversi, supplier, customer, kategori beban |
| Multi-unit | Base unit terkecil, konversi, harga beli/jual per satuan, default beli/jual |
| Pembelian | Draft, selesai, batal, lot, expiry, landed cost, HPP per lot, guard pembatalan |
| Penjualan | Draft, selesai, batal, FEFO/FIFO, COGS, laba kotor, validasi stok non-expired |
| Beban | Draft, selesai, batal, kategori operasional |
| Stok | Daftar stok dalam base/display unit, kartu stok per lot, nilai persediaan |
| Expiry | Daftar expired/hampir expired, alert, write-off expired/rusak |
| Stok opname | Sesi opname, input fisik, selisih, alokasi lot, adjustment |
| Laporan | Penjualan, pembelian, stok, beban, expiry, laba/rugi |
| Export | Excel (.xlsx) dan print untuk laporan utama |
| Backup | Backup JSON, restore, pengingat backup |
| Migrasi | Import data Laravel, opening lot, expiry wizard, estimasi HPP historis |
| Pengaturan | Profil usaha, penomoran, PIN, storage, reset, tentang |
| Kamus istilah | Penjelasan istilah operasional seperti lot, base unit, expiry, HPP, FEFO, dan FIFO |
| PWA | Install, offline, update prompt, storage persistence |

### 5.2 Out of Scope — MVP

- Barcode scanner (field data disiapkan)
- Multi-user/role
- Master user
- Login email/password
- Upload logo
- Sinkronisasi multi-HP
- Cloud backup otomatis
- Cetak struk thermal
- Hutang/piutang
- Pajak
- Payroll
- Double-entry accounting
- Marketplace/payment gateway
- POS customer-facing
- Multi-gudang/multi-cabang
- Dark mode
- Push notification
- Aplikasi native
- Average cost sebagai metode utama
- Retur pembelian
- Pilih lot manual
- Transfer stok antar gudang

### 5.3 Batasan MVP

- Satu perangkat, satu pengguna.
- Tidak ada API/backend.
- Tidak ada sinkronisasi.
- Tidak ada data sharing antar perangkat selain backup file.
- Tidak ada integrasi pembayaran.
- Tidak ada akuntansi formal.
- Tidak ada jaminan terhadap storage yang dibersihkan OS; backup tetap tanggung jawab pengguna.

---

## 6. Key User Journeys

### 6.1 Pertama Kali Membuka Aplikasi

```text
Buka PWA
  ↓
Pilih: Mulai Baru / Pulihkan Backup
  ↓
Isi profil usaha
  ↓
Buat PIN 6 digit
  ↓
Masuk Dashboard
  ↓
Pengingat: lakukan backup pertama
```

**Edge case:**
- Jika memilih restore, setup dilewati dan data langsung diimpor.
- Jika PIN tidak cocok, tidak bisa lanjut.
- Jika storage tidak tersedia, tampilkan pesan yang jelas.
- Tidak ada upload logo; brand memakai monogram `S+`.

### 6.2 Menyiapkan Produk Multi-Unit

```text
Master → Produk → Tambah
  ↓
Isi kode, nama, kategori
  ↓
Pilih base unit (gram/pcs/ml)
  ↓
Aktifkan track expiry bila perlu
  ↓
Tambah satuan:
  - dus = 100 pcs
  - pack = 10 pcs
  - pcs = 1 pcs
  ↓
Isi harga beli/jual per satuan
  ↓
Simpan
```

**Validasi:**
- Base unit wajib satuan terkecil.
- Faktor konversi bilangan bulat > 0.
- Minimal satu satuan base dengan konversi 1.
- Harga jual/beli ≥ 0.

### 6.3 Mencatat Pembelian dengan Lot dan Expiry

```text
Dashboard → Pembelian
  ↓
Pilih supplier, tanggal, pembayaran
  ↓
Tambah barang
  ↓
Pilih satuan beli (dus/kg)
  ↓
Isi qty, harga per satuan, diskon
  ↓
Isi expiry date dan lot code (opsional)
  ↓
Lihat qty base + HPP per base
  ↓
Simpan Draft / Selesaikan
  ↓
Jika selesai: buat lot → tambah stok → movement
```

**Edge case:**
- Produk `track_expiry` tanpa expiry → tidak bisa diselesaikan.
- Qty transaksi menghasilkan base pecahan → ditolak.
- Pembelian selesai tidak bisa diedit.

### 6.4 Mencatat Penjualan dengan FEFO

```text
Dashboard → Penjualan
  ↓
Pilih customer (opsional)
  ↓
Tambah barang
  ↓
Pilih satuan jual (pack/gram/pcs)
  ↓
Isi qty dan harga
  ↓
Sistem cek stok non-expired
  ↓
Sistem alokasikan lot FEFO/FIFO
  ↓
Lihat HPP dan laba kotor
  ↓
Pilih status: Simpan Draft / Selesaikan
  ↓
Jika selesai: konsumsi lot → kurangi stok → catat COGS
```

**Edge case:**
- Stok non-expired kurang → penyelesaian ditolak, draft masih bisa disimpan.
- Hanya ada lot expired → penjualan ditolak, arahkan ke write-off.
- Bayar kurang dari total → validasi gagal.
- Transaksi selesai tidak bisa diedit; hanya bisa dibatalkan.
- Pembatalan mengembalikan lot dan membalik COGS.

### 6.5 Mencatat Beban Operasional

```text
Dashboard → Beban
  ↓
Pilih kategori (listrik/freezer, sewa, sampah, dll.)
  ↓
Isi nominal dengan keypad
  ↓
Isi keterangan
  ↓
Simpan Draft / Selesaikan
  ↓
Beban selesai masuk laporan laba/rugi sebagai opex
```

**Catatan UI:** form menampilkan bantuan “Pembelian bahan masuk menu Pembelian, bukan Beban.”

### 6.6 Menangani Barang Expired

```text
Dashboard → kartu Expired / Hampir Expired
  ↓
Daftar lot + qty + nilai + tanggal
  ↓
Pilih lot
  ↓
Write-off
  ↓
Isi qty, alasan (expired/rusak/lainnya), catatan
  ↓
Selesaikan
  ↓
Stok berkurang → movement writeoff → Kerugian Persediaan
```

### 6.7 Stok Opname

```text
Stok → Opname → Buat Sesi
  ↓
Pilih tanggal dan catatan
  ↓
Pilih produk (semua / kategori)
  ↓
Input stok fisik dalam base/display unit
  ↓
Lihat selisih + nilai selisih
  ↓
Finalisasi
  ↓
Kekurangan: konsumsi lot FEFO
Kelebihan: buat lot penyesuaian
  ↓
Stok disesuaikan + movement
```

**Edge case:**
- Draft opname tidak mengubah stok.
- Saat finalisasi, stok sistem dibaca ulang.
- Opname selesai tidak bisa diedit.
- Produk `track_expiry` dengan surplus wajib mengisi expiry; jika tidak, lot quarantine.

### 6.8 Melihat Laporan & Export

```text
Laporan → pilih jenis laporan
  ↓
Pilih periode (preset / custom)
  ↓
Lihat ringkasan + detail
  ↓
Export Excel / Print
```

Laporan laba/rugi menampilkan:

```text
Penjualan Bersih
(-) HPP / COGS
= Laba Kotor
(-) Kerugian Persediaan
(-) Beban Operasional
= Laba Bersih
```

### 6.9 Backup & Restore

```text
Pengaturan → Backup
  ↓
Lihat status backup terakhir
  ↓
Backup sekarang → file JSON terunduh
  ↓
Simpan file di penyimpanan/Cloud drive
```

Restore:

```text
Pengaturan → Restore
  ↓
Pilih file backup
  ↓
Validasi versi + checksum
  ↓
Preview jumlah data
  ↓
Konfirmasi replace
  ↓
Backup keamanan otomatis
  ↓
Import → reload aplikasi
```

### 6.10 Kehilangan Data

```text
HP hilang / storage dibersihkan
  ↓
Pasang ulang PWA
  ↓
Pilih Pulihkan Backup
  ↓
Pilih file backup terakhir
  ↓
Data kembali
```

---

## 7. Functional Requirements

### FR-01 — Onboarding & PIN

**Tujuan:** Menyiapkan aplikasi agar siap dipakai dan melindungi data lokal.

**Langkah:**
1. Welcome screen dengan dua pilihan: **Mulai Baru** dan **Pulihkan Backup**.
2. Form profil usaha:
   - Nama usaha (wajib)
   - Nama pemilik (opsional)
   - Alamat (opsional)
   - Telepon (opsional)
   - Catatan footer laporan (opsional)
3. Buat PIN 6 digit + konfirmasi.
4. Opsi **isi data contoh** untuk evaluasi (default mati).
5. Setelah selesai, minta izin **persistent storage** bila didukung.
6. Tampilkan pengingat backup pertama.

**Aturan:**
- PIN disimpan sebagai hash PBKDF2 + salt, bukan teks biasa.
- PIN tidak dapat dipulihkan; jika lupa, satu-satunya jalan adalah reset aplikasi.
- Restore backup melewati setup dan langsung memuat data.
- Tidak ada upload logo.

**Acceptance:**
- Tidak bisa masuk dashboard tanpa nama usaha dan PIN valid.
- Setelah restart, aplikasi meminta PIN.
- Restore berhasil memuat data tanpa setup ulang.

---

### FR-02 — Dashboard

**Tujuan:** Memberikan ringkasan kondisi usaha dalam satu layar.

**Komponen:**
1. **Header**
   - Sapaan sesuai waktu
   - Nama usaha
   - Monogram `S+`
   - Ikon status backup (aman / perlu backup)
2. **Filter periode**
   - Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Custom
   - Default: Bulan Ini
3. **Hero card**
   - Angka besar: **Penjualan Bersih**
   - Sub-angka: **Laba Kotor** dan **Laba Bersih**
   - Label periode
4. **Quick actions**
   - Penjualan
   - Pembelian
   - Beban
5. **KPI grid 2×2**
   - Penjualan
   - HPP/COGS
   - Beban Operasional
   - Laba Bersih
6. **Grafik 6 bulan**
   - Penjualan vs HPP
   - Chart.js, responsif
7. **Ringkasan stok**
   - Jumlah produk menipis
   - Jumlah produk habis
   - Nilai persediaan
   - Jumlah lot expired
   - Jumlah lot hampir expired
   - Tap → daftar terfilter
8. **Aktivitas terbaru**
   - 5 transaksi terakhir (penjualan, pembelian, beban, write-off)
   - Ikon, judul, tanggal, nominal, status
   - Tap → detail
9. **Banner backup**
   - Muncul jika backup terakhir > 7 hari atau > 50 transaksi
   - CTA “Backup sekarang”

**Aturan:**
- Hanya transaksi `completed` yang masuk KPI dan grafik.
- Draft dan cancelled tidak dihitung.
- Grafik 6 bulan selalu menampilkan 6 bulan terakhir, terlepas dari filter periode.
- Laba kotor = penjualan bersih - COGS.
- Laba bersih = laba kotor - kerugian persediaan - beban operasional.
- Jika belum ada data, tampilkan empty state + CTA.

**Acceptance:**
- Nilai dashboard sesuai dengan data transaksi pada periode.
- Mengganti periode mengubah KPI dan daftar aktivitas.
- Kartu expired menampilkan jumlah lot yang benar.
- Banner backup muncul sesuai aturan.

---

### FR-03 — Master Data

**Tujuan:** Mengelola data referensi yang dipakai transaksi.

**Modul:**
1. Produk
2. Kategori produk
3. Satuan global
4. Satuan produk / konversi
5. Supplier
6. Customer
7. Kategori beban

**Pola umum:**
- Halaman hub master data berupa daftar kartu.
- List: search, filter status, jumlah data, FAB tambah.
- Form: tambah/edit dengan validasi inline.
- Detail: informasi + riwayat terkait (opsional).
- Hapus: hanya jika tidak dipakai; jika dipakai, nonaktifkan.
- Data nonaktif tidak muncul di picker transaksi baru, tetapi tetap muncul di histori.

#### FR-03.1 Produk

| Field | Tipe | Aturan |
|---|---|---|
| Kode | text | Unik, auto-generate, dapat diedit |
| Nama | text | Wajib |
| Kategori | select | Wajib |
| Base unit | select | Wajib, satuan terkecil |
| Track expiry | boolean | Default mati; wajib untuk frozen food |
| Expiry alert days | integer | ≥ 0, default 30 |
| Minimum stok | integer | Dalam base unit, ≥ 0 |
| Stok awal | integer | ≥ 0, hanya saat create; membuat opening lot |
| Satuan default beli | select | Dari satuan produk |
| Satuan default jual | select | Dari satuan produk |
| Status | boolean | Aktif/nonaktif |

- Kode auto: `{kode_kategori}-{urut 3 digit}`.
- Stok awal membuat **opening lot**; expiry wajib jika `track_expiry`.
- Perubahan stok hanya melalui transaksi/opname/write-off, bukan edit langsung.
- Base unit dan faktor konversi tidak boleh diubah setelah produk memiliki transaksi/lot.
- Hapus produk hanya jika belum punya transaksi, lot, atau movement.

#### FR-03.2 Kategori Produk

Field: kode (unik), nama, deskripsi, status.

#### FR-03.3 Satuan Global

Field: nama (unik), simbol opsional, status.

Contoh: gram, kg, pcs, pack, dus, ml, liter.

#### FR-03.4 Satuan Produk / Konversi

Setiap produk memiliki satu atau lebih `product_units`.

| Field | Aturan |
|---|---|
| Satuan | Wajib, aktif |
| Konversi ke base | Integer > 0; base = 1 |
| Harga beli default | ≥ 0, per satuan |
| Harga jual | ≥ 0, per satuan |
| Bisa dibeli | boolean |
| Bisa dijual | boolean |
| Default beli | boolean |
| Default jual | boolean |
| Barcode | Opsional, unik jika diisi |
| Status | Aktif/nonaktif |

**Contoh Siomay:**

| Satuan | Konversi | Harga beli | Harga jual | Base |
|---|---:|---:|---:|---|
| pcs | 1 | Rp 1.500 | Rp 2.500 | Ya |
| pack | 10 | — | Rp 20.000 | Tidak |
| dus | 100 | Rp 150.000 | — | Tidak |

**Contoh Ayam Fillet:**

| Satuan | Konversi | Harga beli | Harga jual | Base |
|---|---:|---:|---:|---|
| gram | 1 | Rp 50 | Rp 70 | Ya |
| kg | 1.000 | Rp 50.000 | Rp 70.000 | Tidak |
| pack 500g | 500 | — | Rp 38.000 | Tidak |

**Aturan:**
- Base unit wajib ada dan `is_base = true`, konversi 1.
- `qty_base = qty_unit × conversion_qty`; hasil wajib bilangan bulat.
- Jika hasil pecahan, tolak dan minta satuan yang lebih kecil.
- Satu produk tidak boleh punya dua baris dengan satuan yang sama.
- Barcode unik antar produk; boleh kosong.
- Satuan yang sudah dipakai transaksi tidak bisa dihapus; nonaktifkan.

#### FR-03.5 Supplier

Field: kode (unik), nama, telepon, alamat, catatan, status.

#### FR-03.6 Customer

Field: kode (unik), nama, telepon, alamat, catatan, status.

Customer boleh kosong pada penjualan (walk-in).

#### FR-03.7 Kategori Beban

Field: kode (unik), nama, deskripsi, status.

Semua kategori beban adalah **beban operasional**. Pembelian bahan tidak dicatat di sini.

Contoh kategori:
- Listrik & Freezer
- Sewa Tempat
- Gaji
- Transport Penjualan
- Kebersihan & Sampah
- Packaging Umum
- Maintenance Peralatan
- Marketing
- Lain-lain

**Acceptance:**
- CRUD berjalan untuk semua modul.
- Kode duplikat ditolak.
- Data yang dipakai transaksi tidak bisa dihapus permanen.
- Picker transaksi hanya menampilkan data aktif.
- Produk dengan multi-unit menampilkan konversi dan harga per satuan dengan benar.
- Produk `track_expiry` tidak bisa disimpan tanpa pengaturan expiry yang valid.

---

### FR-04 — Pembelian

**Tujuan:** Mencatat barang masuk, membuat lot, dan menambah stok.

**List:**
- Search nomor nota/supplier
- Filter status: semua, draft, selesai, dibatalkan
- Filter tanggal
- Card list: nomor, tanggal, supplier, total, status
- FAB tambah

**Form header:**
| Field | Aturan |
|---|---|
| Nomor nota | Auto, unik, dapat dilihat |
| Tanggal | Default hari ini |
| Supplier | Wajib, aktif |
| Metode pembayaran | Tunai, transfer, QRIS |
| Biaya angkut masuk | Opsional, ≥ 0 |
| Keterangan | Opsional |
| Diskon header | ≥ 0, ≤ subtotal |
| Total | Subtotal - diskon + biaya angkut |
| Bayar | ≥ total |
| Status | Draft / Selesai |

**Form item:**
| Field | Aturan |
|---|---|
| Produk | Wajib, aktif |
| Satuan | Wajib, boleh dibeli |
| Qty | > 0, desimal maks. 3 |
| Konversi | Otomatis dari satuan produk |
| Qty base | Integer, dihitung otomatis |
| Harga beli | ≥ 0, per satuan |
| Diskon item | ≥ 0 |
| Expiry date | Wajib jika produk track expiry |
| Lot code | Opsional, auto jika kosong |
| Subtotal | (qty × harga) - diskon |
| HPP per base | Dihitung saat selesai |

**Aksi:**
- Simpan draft
- Selesaikan
- Batalkan (dengan guard lot)
- Hapus draft
- Lihat detail

**Aturan:**
- Draft tidak mengubah stok.
- Selesai membuat **satu lot per item** + movement `purchase_in`.
- Diskon header dan biaya angkut dialokasikan proporsional ke item berdasarkan subtotal item.
- `unit_cost_base` = (subtotal item - alokasi diskon header + alokasi biaya angkut) / qty base.
- Lot code auto: `LOT-{nomor_nota}-{line}`.
- Batal hanya boleh jika semua lot dari pembelian itu masih utuh (`qty_remaining = qty_received`) dan belum pernah dikonsumsi/di-write-off/di-opname.
- Batal mengembalikan stok + movement `purchase_cancel`.
- Transaksi selesai tidak bisa diedit.
- Transaksi batal tidak bisa diedit/dihapus.
- Detail menampilkan lot, expiry, qty base, dan HPP per base.

**Acceptance:**
- Selesai menambah stok sesuai qty base.
- Lot terbentuk dengan expiry dan HPP yang benar.
- Batal berhasil jika lot utuh.
- Batal gagal jika lot sudah terpakai, dengan pesan jelas.
- Draft tidak mempengaruhi laporan.
- Biaya angkut mengubah HPP lot secara proporsional.

---

### FR-05 — Penjualan

**Tujuan:** Mencatat barang keluar, mengonsumsi lot, dan menghitung COGS.

**List & form:** Struktur sama dengan pembelian, dengan perbedaan:

| Field | Aturan |
|---|---|
| Customer | Opsional (Umum/walk-in) |
| Satuan | Wajib, boleh dijual |
| Harga jual | Default dari satuan produk |
| Metode pembayaran | Tunai, transfer, QRIS |
| Bayar | ≥ total |
| Kembalian | Bayar - total (tunai) |
| Diskon header | ≥ 0, ≤ subtotal |

**Aturan:**
- Draft boleh disimpan meski stok kurang, tetapi tampilkan peringatan.
- Selesaikan ditolak jika stok **non-expired** tidak mencukupi.
- Alokasi lot:
  - `track_expiry = true`: FEFO (expiry terdekat), tie-break `received_at` paling lama.
  - `track_expiry = false`: FIFO (`received_at` paling lama).
  - Lot expired tidak boleh dijual.
  - Lot dengan expiry null pada produk `track_expiry` berstatus quarantine dan tidak boleh dijual.
- Selesai membuat `sale_lot_consumptions`, movement `sale_out` per lot, dan COGS.
- `hpp_total` = Σ konsumsi lot.
- `gross_profit` = subtotal item - hpp_total.
- Batal mengembalikan qty ke lot asal + movement `sale_cancel` + membalik COGS.
- Jika lot asal sudah expired saat restore, stok kembali tetapi tetap tidak bisa dijual sampai di-write-off.
- Pembayaran non-tunai: bayar = total (tidak ada kembalian).
- Total tidak boleh negatif.
- Detail penjualan menampilkan lot yang dikonsumsi, HPP, dan laba kotor.

**Acceptance:**
- Selesai mengurangi stok sesuai qty base.
- Lot yang dikonsumsi adalah lot dengan expiry terdekat (FEFO).
- COGS sama dengan total biaya lot yang dikonsumsi.
- Stok non-expired kurang → transaksi gagal, tidak ada perubahan data.
- Batal mengembalikan lot dan membalik COGS.
- Kembalian dihitung benar.

---

### FR-06 — Beban Operasional

**Tujuan:** Mencatat pengeluaran operasional di luar HPP.

**Field:**
| Field | Aturan |
|---|---|
| Nomor transaksi | Auto, unik |
| Tanggal | Default hari ini |
| Kategori beban | Wajib, aktif |
| Keterangan | Wajib |
| Nominal | > 0, integer |
| Metode pembayaran | Tunai, transfer, QRIS |
| Status | Draft / Selesai |

**Aksi:** Simpan draft, selesaikan, batalkan, hapus draft, lihat detail.

**Aturan:**
- Hanya beban `completed` yang masuk laporan laba/rugi.
- Beban tidak mempengaruhi stok.
- Beban adalah **opex**, bukan HPP.
- Form menampilkan bantuan klasifikasi.
- Beban dengan status cancelled tidak dihitung.

**Acceptance:**
- Beban selesai muncul di laporan beban dan laba/rugi.
- Draft/cancelled tidak dihitung.
- Pembelian bahan tidak bisa dicatat sebagai beban lewat alur normal (edukasi UI).

---

### FR-07 — Stok & Kartu Stok

**Tujuan:** Melihat posisi stok, lot, expiry, dan riwayat perubahannya.

**Daftar stok:**
- Search nama/kode
- Filter: semua, menipis, habis, ada expired, hampir expired
- Filter kategori
- Card: nama, kode, base unit, stok base, display unit, minimum, status, progress bar, jumlah lot, expiry terdekat
- Tap → kartu stok

**Status:**
```text
stock_base = 0                    → Habis
0 < stock_base <= min_stock_base  → Menipis
stock_base > min_stock_base       → Normal
```

**Kartu stok:**
- Header produk + stok saat ini dalam base/display unit
- Filter tanggal
- Ringkasan lot aktif: qty, expiry, nilai
- Ledger: tanggal, referensi, tipe, lot, masuk, keluar, saldo
- Tipe: opening, purchase_in, purchase_cancel, sale_out, sale_cancel, opname_shortage, opname_surplus, writeoff_expired, writeoff_damaged, writeoff_other, writeoff_cancel
- Tap lot → detail lot + konsumsi

**Aturan:**
- Saldo dihitung dari `stock_movements`, bukan hanya field `stock_base`.
- `products.stock_base` adalah cache yang harus selalu sama dengan saldo ledger/lot.
- Tersedia alat “Cek konsistensi stok” di pengaturan.
- Nilai persediaan = Σ(qty_remaining_base × unit_cost_base), dibulatkan saat ditampilkan.

**Acceptance:**
- Ledger menampilkan semua mutasi valid.
- Saldo akhir sama dengan stok produk.
- Filter status menampilkan data yang tepat.
- Lot expired terlihat berbeda dari lot aktif.

---

### FR-08 — Expiry & Write-Off

**Tujuan:** Mengontrol stok expired/rusak dan mencatat kerugiannya.

**Expiry dashboard:**
- Lot expired
- Lot expired hari ini
- Lot ≤ 7 hari
- Lot ≤ 30 hari
- Lot ≤ 90 hari
- Lot dengan expiry tidak diketahui (quarantine)

**Daftar expiry:**
- Filter produk/kategori/status
- Kolom: produk, lot, qty base, display unit, expiry, sisa hari, nilai, status
- Aksi: lihat detail, write-off

**Form write-off:**
| Field | Aturan |
|---|---|
| Nomor | Auto, unik |
| Tanggal | Default hari ini |
| Alasan | Expired / Rusak / Lainnya |
| Keterangan | Opsional |
| Item | Produk + lot + qty |
| Qty | > 0, ≤ qty_remaining lot |
| Status | Draft / Selesai |

**Aksi:** Simpan draft, selesaikan, batalkan, hapus draft, lihat detail.

**Aturan:**
- Draft tidak mengubah stok.
- Selesai mengurangi lot + stok, membuat movement `writeoff_*`.
- Total biaya write-off = Σ(qty × unit_cost_base).
- Write-off `completed` masuk **Kerugian Persediaan** di laba/rugi.
- Batal mengembalikan qty ke lot + movement `writeoff_cancel`, membalik kerugian.
- Write-off expired disarankan otomatis memilih lot expired.
- Lot yang di-write-off tidak boleh dijual.

**Acceptance:**
- Write-off mengurangi stok dan lot.
- Nilai kerugian sesuai HPP lot.
- Laporan laba/rugi menampilkan kerugian persediaan.
- Lot expired tidak bisa dijual.

---

### FR-09 — Stok Opname

**Tujuan:** Mencocokkan stok sistem dengan stok fisik.

**List sesi:**
- Nomor opname, tanggal, jumlah produk, status
- Filter draft/selesai
- FAB buat sesi

**Form sesi:**
- Tanggal
- Catatan
- Pilih produk: semua / per kategori
- Input stok fisik per produk dalam base/display unit
- Menampilkan stok sistem, fisik, selisih, nilai selisih
- Simpan draft / finalisasi

**Aturan:**
- Draft tidak mengubah stok.
- Finalisasi membaca ulang stok/lot terkini.
- Selisih = fisik - sistem (dalam base unit).
- Kekurangan: konsumsi lot FEFO (expired/earliest expiry first), catat movement `opname_shortage`, nilai selisih menjadi kerugian persediaan.
- Kelebihan: buat lot `opname_surplus` dengan HPP rata-rata stok tersisa; jika tidak ada, last purchase cost; expiry wajib jika track_expiry; jika tidak diketahui, quarantine.
- Sesi selesai tidak bisa diedit.
- Sesi draft bisa dihapus.

**Acceptance:**
- Finalisasi mengubah stok sesuai hasil hitung fisik.
- Movement tercatat per lot.
- Selisih dan nilai selisih dihitung benar.
- Lot surplus memiliki expiry yang valid atau quarantine.

---

### FR-10 — Laporan

**Tujuan:** Menyajikan laporan berdasarkan periode.

**Laporan:**
1. Penjualan
2. Pembelian
3. Stok
4. Beban
5. Expiry
6. Laba/Rugi

**Filter:**
- Hari ini, minggu ini, bulan ini, tahun ini, custom
- Default: bulan ini

**Laporan Penjualan:**
- Total penjualan kotor
- Total diskon
- Penjualan bersih
- Total HPP/COGS
- Laba kotor
- Margin kotor
- Jumlah transaksi
- Daftar transaksi
- Ringkasan per customer (opsional)
- Penanda “HPP estimasi” untuk transaksi historis migrasi

**Laporan Pembelian:**
- Total pembelian kotor
- Total diskon
- Total biaya angkut
- Pembelian bersih
- Jumlah transaksi
- Daftar transaksi
- Ringkasan per supplier (opsional)

**Laporan Stok:**
- Total produk
- Total qty base
- Nilai persediaan
- Produk menipis/habis
- Mutasi periode
- Rincian lot + expiry
- Ringkasan expired/hampir expired

**Laporan Beban:**
- Total beban
- Rincian per kategori
- Daftar transaksi

**Laporan Expiry:**
- Lot expired
- Lot hampir expired
- Nilai stok berisiko
- Lot quarantine
- Riwayat write-off

**Laporan Laba/Rugi:**
```text
Penjualan Kotor
(-) Diskon Penjualan
= Penjualan Bersih

(-) HPP / COGS
= Laba Kotor

(-) Kerugian Persediaan (write-off + opname shortage - opname surplus)
(-) Beban Operasional
= Laba Bersih
```

**Aturan:**
- Hanya transaksi `completed` yang dihitung.
- Draft/cancelled tidak dihitung.
- HPP diakui pada tanggal penjualan, bukan tanggal pembelian.
- Tanggal mengikuti zona waktu Asia/Jakarta.
- Laporan periode sebelum cutover migrasi menampilkan label “HPP estimasi”.

**Acceptance:**
- Total laporan sama dengan data transaksi.
- Filter periode mengubah hasil.
- HPP laporan = Σ `sale_items.hpp_total`.
- Laba bersih = laba kotor - kerugian persediaan - opex.
- Laporan kosong menampilkan empty state.

---

### FR-11 — Export & Print

**Tujuan:** Membawa laporan keluar dari aplikasi.

**Export Excel:**
- Format `.xlsx` menggunakan SheetJS.
- Tersedia untuk laporan penjualan, pembelian, stok, beban, expiry, laba/rugi.
- Nama file: `laporan-{jenis}-{from}-{to}.xlsx`.
- Isi: header usaha, periode, tabel data, total.
- Mengikuti filter yang sedang aktif.
- Laporan penjualan menyertakan kolom HPP dan laba kotor.

**Print:**
- Menggunakan `window.print()` dengan CSS print.
- Sembunyikan navigasi dan tombol.
- Tampilkan header usaha + periode.

**Aturan:**
- Export berjalan offline.
- Di iOS, jika Web Share API mendukung file, tampilkan share sheet; jika tidak, unduh file.
- Tidak ada upload ke server.

**Acceptance:**
- File terunduh dan dapat dibuka di Excel.
- Data sesuai filter.
- Print menghasilkan layout yang rapi.

---

### FR-12 — Backup & Restore

**Tujuan:** Mencegah kehilangan data dan memungkinkan pemulihan.

**Backup:**
- Format JSON.
- Nama file: `stokplus-backup-YYYYMMDD-HHmm.json`.
- Isi:
  - `app`: `StokPlus`
  - `schemaVersion`
  - `appVersion`
  - `exportedAt`
  - `cutoverDate`
  - `businessProfile`
  - `tables`: seluruh tabel, termasuk lot dan konsumsi
  - `counts`: jumlah baris per tabel
  - `checksum`: SHA-256
- Ditampilkan: backup terakhir, jumlah transaksi, ukuran file.
- Pengingat: > 7 hari atau > 50 transaksi sejak backup terakhir.
- Enkripsi opsional dengan passphrase (AES-GCM + PBKDF2).

**Restore:**
1. Pilih file.
2. Validasi `app`, `schemaVersion`, `checksum`.
3. Tampilkan preview jumlah data.
4. Konfirmasi replace all.
5. Buat backup keamanan otomatis.
6. Import dalam transaksi.
7. Reload aplikasi.

**Aturan:**
- Restore mengganti seluruh data, bukan merge.
- Jika validasi gagal, tidak ada data yang diubah.
- Jika import gagal, backup keamanan dipulihkan.
- Passphrase enkripsi tidak dapat dipulihkan jika lupa.
- Backup wajib mencakup `product_units`, `stock_lots`, `sale_lot_consumptions`, `stock_writeoffs`, dan `stock_writeoff_items`.

**Acceptance:**
- Backup menghasilkan file valid.
- Restore mengembalikan data identik, termasuk lot dan expiry.
- File rusak/versi tidak cocok ditolak dengan pesan jelas.
- Backup keamanan dibuat sebelum restore.

---

### FR-13 — Import dari Laravel

**Tujuan:** Memindahkan data lama tanpa input ulang.

**Sumber:** File JSON hasil perintah Laravel `php artisan stokplus:export-json`.

**Prasyarat:**
- Backup database Laravel.
- Patch PHP source ke versi aman (minimal 8.3.36) sebelum export.
- Pastikan tidak ada transaksi berjalan saat export.

**Wizard:**
1. Pilih file.
2. Validasi struktur dan versi.
3. Tentukan **cutover date**.
4. Preview jumlah data + total nilai.
5. Konfirmasi replace.
6. Import master + transaksi historis.
7. Wizard opening lot + expiry.
8. Rekonsiliasi.
9. Tampilkan laporan hasil.

**Mapping:**
- ID integer lama → UUID v5 deterministik.
- `legacy_id` disimpan untuk referensi.
- Relasi dipertahankan.
- `users` tidak diimpor (single user).
- `created_by` diabaikan.
- `products.satuan_id` → `base_unit_id`.
- Setiap produk lama membuat satu `product_units` base dengan konversi 1 dan harga dari produk lama.
- `purchase_details` → `purchase_items` dengan `qty_base = qty` (1:1).
- `sale_details` → `sale_items` dengan `qty_base = qty` (1:1).
- `stock_opname_details` → `stock_opname_items`.

**Strategi stok & HPP historis:**
- Stok saat cutover menjadi **opening lot** per produk.
- HPP opening lot = rata-rata tertimbang pembelian historis (setelah diskon), atau harga beli terakhir, atau `products.harga_beli`.
- Transaksi historis tetap diimpor untuk laporan.
- Transaksi historis **tidak** membuat lot aktif.
- HPP penjualan historis dihitung estimasi dari HPP opening lot dan ditandai `hpp_is_estimated = true`.
- Riwayat mutasi lama tidak dijadikan ledger aktif; ledger aktif dimulai dari opening lot.
- Laporan sebelum cutover menampilkan label “Estimasi”.

**Rekonsiliasi:**
- Jumlah baris per tabel.
- Total penjualan, pembelian, beban.
- Stok akhir per produk = qty opening lot.
- Tidak ada relasi yatim.
- Jika selisih, import dibatalkan dan backup dipulihkan.

**Acceptance:**
- Data master dan transaksi masuk lengkap.
- Total laporan historis sesuai dengan data sumber (dengan label estimasi HPP).
- Stok awal sesuai stok Laravel saat cutover.
- Relasi tidak putus.
- Import gagal tidak merusak data lama.

---

### FR-14 — Pengaturan

**Menu:**
1. Profil usaha
2. Penomoran transaksi
3. Keamanan (PIN, auto-lock)
4. Backup
5. Restore
6. Import data
7. Storage & persistent storage
8. Cek konsistensi stok
9. Default expiry alert
10. Reset data
11. Tentang aplikasi

**Profil usaha:**
- Nama, alamat, telepon, catatan footer laporan.
- Tidak ada logo upload.

**Penomoran:**
- Prefix penjualan, pembelian, beban, opname, write-off.
- Preview format.
- Counter berjalan otomatis; tidak ada reset manual pada MVP.

**Keamanan:**
- Ganti PIN.
- Auto-lock: 1 menit, 5 menit, 15 menit, tidak pernah.

**Storage:**
- Estimasi penggunaan.
- Kuota (jika tersedia).
- Tombol minta persistent storage.
- Peringatan jika penggunaan > 80% kuota.

**Cek konsistensi stok:**
- Hitung ulang saldo dari ledger.
- Bandingkan dengan `products.stock_base`.
- Bandingkan `products.stock_base` dengan Σ `stock_lots.qty_remaining_base`.
- Tampilkan selisih.
- Opsi perbaiki (dengan konfirmasi + audit log).

**Default expiry alert:**
- Default 30 hari.
- Bisa dioverride per produk.

**Reset data:**
- Butuh backup terlebih dahulu.
- Konfirmasi ganda.
- Menghapus seluruh data dan kembali ke onboarding.

**Acceptance:**
- Semua pengaturan tersimpan lokal.
- PIN baru berlaku setelah disimpan.
- Reset tidak bisa dilakukan tanpa konfirmasi.
- Cek konsistensi mendeteksi selisih lot vs cache.

---

### FR-15 — Pencarian, Filter, dan Pagination

- Search per list dengan debounce 200ms.
- Filter status dan tanggal.
- Tombol “Hapus filter”.
- List panjang menggunakan “Muat lebih banyak” (20 item per batch) atau virtual scroll.
- Empty state berbeda untuk “belum ada data” dan “tidak ada hasil filter”.

**Acceptance:**
- Search menemukan data berdasarkan nama/kode/nomor/lot.
- Filter dapat dikombinasikan.
- Hasil kosong menampilkan pesan yang sesuai.

---

### FR-16 — PWA, Offline, Install, Update

**Manifest:**
- Nama: `StokPlus`
- Nama pendek: `StokPlus`
- `display: standalone`
- `orientation: portrait`
- `theme_color`: `#1E2A78`
- `background_color`: `#F7F5F1`
- Ikon 192, 512, maskable, apple-touch-icon 180
- Monogram `S+`

**Service worker:**
- Precache app shell.
- `navigateFallback: index.html`.
- Aset lokal (font, ikon, JS, CSS) di-cache.
- Tidak ada runtime API.
- Update prompt: “Versi baru tersedia — muat ulang”.

**Instalasi:**
- Android: tombol install memakai `beforeinstallprompt`.
- iOS: panduan “Share → Add to Home Screen”.

**Storage:**
- Minta `navigator.storage.persist()` saat onboarding.
- Tampilkan status persistent.
- Peringatan jika storage tidak persisten.

**Update:**
- Cek update saat aplikasi dibuka/resume.
- Sebelum migrasi schema, minta backup.
- Tampilkan versi aplikasi dan schema di Pengaturan.

**Acceptance:**
- Aplikasi dapat dibuka offline setelah instalasi.
- Update prompt muncul saat versi baru tersedia.
- Data tidak hilang setelah update.
- Manifest dan ikon memakai brand StokPlus.

---

### FR-17 — Audit & Diagnostik Lokal

- `audit_logs` menyimpan aksi penting: complete, cancel, write-off, restore, import, reset, perbaikan stok, perubahan expiry.
- Maksimal 1.000 entri terakhir.
- Dapat dilihat di Pengaturan → Tentang → Log (read-only).
- Log tidak dikirim ke mana pun.

**Acceptance:**
- Aksi penting tercatat.
- Log lama otomatis terhapus saat melewati batas.

---

### FR-18 — Barcode (Future-Ready)

- Barcode disimpan di `product_units.barcode`, opsional dan unik.
- Satu produk bisa punya barcode berbeda per satuan jual.
- MVP: pencarian manual berdasarkan barcode.
- Future: scan kamera menggunakan BarcodeDetector API atau Capacitor plugin.
- Tidak ada perubahan schema besar saat fitur scanner ditambahkan.

**Acceptance:**
- Barcode dapat dicari di picker produk.
- Barcode duplikat ditolak.
- Produk tanpa barcode tetap bisa dipakai.

---

### FR-19 — Multi-Unit & Konversi

- Setiap produk wajib punya base unit.
- Base unit adalah satuan terkecil: gram, pcs, ml.
- Semua stok, lot, movement, dan COGS memakai base unit.
- Transaksi memakai satuan beli/jual yang dikonversi ke base.
- Qty base wajib integer.
- Qty transaksi boleh desimal maksimal 3 angka.
- Harga beli/jual disimpan per satuan transaksi.
- Harga per base dihitung otomatis untuk HPP.
- UI menampilkan stok dalam base unit dan display unit.

**Acceptance:**
- 1 dus = 100 pcs menghasilkan qty base 100.
- 0,5 kg = 500 gram diterima.
- 0,333 pcs ditolak karena base pecahan.
- Stok tampil dalam base dan satuan ramah.

---

### FR-20 — Lot, Expiry, dan FEFO/FIFO

- Pembelian selesai membuat lot.
- Lot menyimpan qty received, qty remaining, unit cost, expiry, dan source.
- Penjualan mengonsumsi lot otomatis.
- Produk `track_expiry` memakai FEFO.
- Produk tanpa expiry memakai FIFO.
- Lot expired tidak boleh dijual.
- Lot expiry null pada produk `track_expiry` berstatus quarantine.
- Expiry alert per produk, default 30 hari.
- Lot dapat dilihat di kartu stok dan laporan expiry.

**Acceptance:**
- Penjualan memilih lot expiry terdekat.
- Lot expired dilewati.
- Jika stok non-expired kurang, transaksi ditolak.
- Lot quarantine tidak bisa dijual sampai expiry diisi.

---

### FR-21 — COGS & HPP per Penjualan

- Setiap penjualan menyimpan `hpp_total` dan `gross_profit`.
- COGS = Σ(qty konsumsi × unit cost lot).
- HPP diakui pada tanggal penjualan.
- Diskon penjualan mengurangi revenue, bukan COGS.
- Diskon pembelian dan biaya angkut mempengaruhi unit cost lot.
- Laporan laba/rugi memakai COGS, bukan pembelian periode.

**Acceptance:**
- Penjualan 3 pack dari lot berbeda menghasilkan COGS sesuai lot.
- Harga beli naik tidak mengubah COGS lot lama.
- Laporan laba/rugi memakai COGS penjualan.

---

### FR-22 — Pemisahan HPP & Beban Operasional

- HPP berasal dari pembelian yang terjual (COGS).
- Beban operasional berasal dari modul Beban.
- Write-off expired/rusak menjadi Kerugian Persediaan.
- Biaya angkut masuk masuk HPP lot.
- Transport penjualan masuk beban operasional.
- Laporan laba/rugi menampilkan baris terpisah.

**Acceptance:**
- Pembelian bahan tidak muncul sebagai beban operasional.
- Listrik freezer muncul sebagai beban operasional.
- Write-off muncul sebagai kerugian persediaan.
- Laba bersih = laba kotor - kerugian persediaan - opex.

---

## 8. Business Rules

### BR-01 — Stok adalah Ledger Base Unit

Setiap perubahan stok **wajib** menghasilkan record di `stock_movements`.

```text
stock_after_base = stock_before_base + qty_base
```

`qty_base` positif untuk masuk, negatif untuk keluar.

`products.stock_base` adalah cache. Nilai yang benar:

```text
stock_base = Σ stock_lots.qty_remaining_base
```

### BR-02 — Status Transaksi

| Status | Stok | Laporan | Dapat diedit |
|---|---|---|---|
| draft | Tidak berubah | Tidak dihitung | Ya |
| completed | Berubah | Dihitung | Tidak |
| cancelled | Dikembalikan | Tidak dihitung | Tidak |

Berlaku untuk pembelian, penjualan, beban, dan write-off. Opname memakai draft/completed.

### BR-03 — Konversi Satuan

```text
qty_base = qty_unit × conversion_qty
```

- `conversion_qty` integer > 0.
- `qty_base` wajib integer.
- Base unit selalu `conversion_qty = 1`.
- Satuan transaksi harus milik produk.
- Jika hasil bukan integer, transaksi ditolak.

Contoh:

```text
2 dus × 100 = 200 pcs
0,5 kg × 1.000 = 500 gram
3 pack × 10 = 30 pcs
```

### BR-04 — Presisi Qty

- `qty_base`: integer.
- `qty_unit`: desimal maksimal 3 angka.
- `conversion_qty`: integer.
- Tidak ada stok pecahan dalam base unit.
- Untuk produk yang dijual per gram, base unit gram.

### BR-05 — Penyelesaian Pembelian

```text
Untuk setiap item:
  qty_base = qty_unit × conversion_qty
  subtotal_item = (qty_unit × harga_beli_unit) - diskon_item
  alokasi_diskon_header = diskon_header × (subtotal_item / total_subtotal)
  alokasi_angkut = biaya_angkut × (subtotal_item / total_subtotal)
  total_lot = subtotal_item - alokasi_diskon_header + alokasi_angkut
  unit_cost_base = total_lot / qty_base

  buat lot
  stock_base += qty_base
  catat movement purchase_in
```

- Expiry wajib jika `track_expiry`.
- Lot code auto jika kosong.
- Jika total_subtotal = 0, diskon header dan biaya angkut harus 0.

### BR-06 — Penyelesaian Penjualan

```text
Untuk setiap item:
  qty_base = qty_unit × conversion_qty
  cek lot tersedia (non-expired)
  jika kurang: tolak seluruh transaksi
  konsumsi lot FEFO/FIFO
  hpp_total = Σ(qty_konsumsi × unit_cost_base)
  gross_profit = subtotal_item - hpp_total
  stock_base -= qty_base
  catat movement sale_out per lot
```

- Lot expired tidak boleh dipakai.
- Lot quarantine tidak boleh dipakai.
- Tidak boleh stok negatif.
- COGS disimpan agar laporan stabil.

### BR-07 — Aturan Expiry

- `track_expiry = true`:
  - Purchase item wajib expiry.
  - Penjualan memakai FEFO.
  - Lot expired tidak dijual.
  - Lot expiry null = quarantine.
  - Alert default 30 hari, bisa dioverride per produk.
- `track_expiry = false`:
  - Expiry null.
  - Penjualan memakai FIFO.
- Lot dianggap expired jika `today > expiry_date`.
- Pada tanggal expiry, lot masih bisa dijual tetapi diberi label “expires today”.
- Write-off disarankan untuk lot expired.

### BR-08 — Pembatalan Pembelian

```text
Jika semua lot dari pembelian masih utuh:
  hapus/nonaktifkan lot
  stock_base -= qty_base
  catat movement purchase_cancel
  status = cancelled

Jika ada lot yang sudah dikonsumsi/di-write-off/di-opname:
  tolak pembatalan
```

- Pesan: “Pembelian tidak dapat dibatalkan karena sebagian lot sudah terpakai.”
- Retur pembelian masuk future scope.

### BR-09 — Pembatalan Penjualan

```text
Untuk setiap konsumsi lot:
  qty_remaining_base += qty_base
  catat movement sale_cancel
  balik hpp_total
status = cancelled
```

- Jika lot sudah expired, stok kembali tetapi tetap tidak bisa dijual.
- Jika lot sudah di-write-off, restore tetap ke lot asal; lot menjadi aktif kembali.
- Pembatalan penjualan tidak boleh membuat qty_remaining > qty_received.

### BR-10 — Draft Tidak Mengubah Stok

Draft boleh disimpan meski stok kurang, tetapi penyelesaian divalidasi ulang.

### BR-11 — Status Stok

```text
stock_base = 0                    → Habis
0 < stock_base <= min_stock_base  → Menipis
stock_base > min_stock_base       → Normal
```

Status expired dihitung dari lot, bukan dari total stok.

### BR-12 — Kode Unik

- Kode produk, kategori, supplier, customer, kategori beban wajib unik.
- Nama satuan global wajib unik.
- Kombinasi produk + satuan wajib unik.
- Barcode unik jika diisi.
- Nomor nota/transaksi wajib unik.
- Lot code unik per produk.

### BR-13 — Penomoran

```text
PJ-YYYYMMDD-0001   → Penjualan
PB-YYYYMMDD-0001   → Pembelian
BB-YYYYMMDD-0001   → Beban
OP-YYYYMMDD-0001   → Opname
WO-YYYYMMDD-0001   → Write-off
```

Counter disimpan di `settings` dan diambil dalam transaksi Dexie untuk menghindari duplikasi.

### BR-14 — Perhitungan Total

```text
Subtotal item = (qty_unit × harga_unit) - diskon item
Subtotal      = Σ subtotal item

Pembelian:
Total = Subtotal - diskon header + biaya angkut

Penjualan:
Total = Subtotal - diskon header

Kembalian = bayar - total (tunai)
```

Total tidak boleh negatif.

### BR-15 — Diskon

- Diskon item dan diskon header tidak boleh negatif.
- Diskon header ≤ subtotal.
- Diskon header tidak boleh membuat total < 0.
- Diskon pembelian dialokasikan ke HPP lot.
- Diskon penjualan mengurangi revenue, bukan COGS.

### BR-16 — Pembayaran

- Tunai: bayar ≥ total; kembalian dihitung.
- Transfer/QRIS: bayar = total; tidak ada kembalian.
- Tidak ada hutang/piutang pada MVP.

### BR-17 — Laba/Rugi

```text
Penjualan Bersih = Σ completed sales.total

HPP/COGS = Σ completed sale_items.hpp_total

Laba Kotor = Penjualan Bersih - HPP/COGS

Kerugian Persediaan =
  Σ completed writeoff total_cost
  + Σ completed opname shortage cost
  - Σ completed opname surplus cost

Beban Operasional = Σ completed expenses.nominal

Laba Bersih = Laba Kotor - Kerugian Persediaan - Beban Operasional
```

- Hanya transaksi `completed`.
- HPP diakui pada tanggal penjualan.
- Write-off dan opname diakui pada tanggal transaksi masing-masing.
- Transaksi historis migrasi dengan HPP estimasi diberi label.

### BR-18 — Klasifikasi HPP vs Beban

| Masuk HPP | Masuk Beban Operasional |
|---|---|
| Pembelian bahan/produk dagang | Listrik, freezer, kulkas |
| Diskon pembelian | Sewa tempat |
| Biaya angkut masuk | Gaji karyawan |
| — | Kebersihan, sampah |
| — | Packaging umum |
| — | Maintenance peralatan |
| — | Marketing |
| — | Transport penjualan |

- Pembelian bahan tidak boleh dicatat sebagai beban operasional.
- Listrik freezer tidak boleh dicatat sebagai HPP.
- Write-off expired/rusak masuk Kerugian Persediaan, bukan opex.

### BR-19 — Hapus Master

- Jika data dipakai transaksi: nonaktifkan, jangan hapus.
- Jika belum dipakai: boleh hapus dengan konfirmasi.
- Produk dengan lot/movement tidak boleh dihapus.
- Satuan yang dipakai `product_units` tidak boleh dihapus.
- Base unit dan konversi tidak boleh diubah setelah ada transaksi/lot.

### BR-20 — Tanggal & Zona Waktu

- Tanggal transaksi: `YYYY-MM-DD` lokal Asia/Jakarta.
- Timestamp: ISO 8601 dengan offset.
- Filter periode inklusif dari awal sampai akhir hari.

### BR-21 — Uang & Presisi Biaya

- Uang transaksi disimpan sebagai integer rupiah.
- `unit_cost_base` disimpan desimal 4 angka.
- Qty base integer.
- Qty unit desimal maksimal 3 angka.
- Pembulatan half-up pada total baris.
- Nilai persediaan = pembulatan dari Σ(qty × unit_cost).
- COGS item = Σ total_cost konsumsi yang sudah dibulatkan per konsumsi.

### BR-22 — Backup

- Backup adalah tanggung jawab pengguna, difasilitasi aplikasi.
- Aplikasi wajib mengingatkan, tetapi tidak dapat menjamin file backup disimpan.
- Restore selalu membuat backup keamanan terlebih dahulu.
- Backup harus mencakup lot dan konsumsi.

### BR-23 — Opname & Alokasi Lot

- Draft tidak mengubah stok.
- Finalisasi membaca ulang stok/lot.
- Kekurangan:
  - konsumsi lot dengan expiry paling awal/expired terlebih dahulu,
  - catat movement per lot,
  - nilai selisih menjadi kerugian persediaan.
- Kelebihan:
  - buat lot `opname_surplus`,
  - HPP = rata-rata tertimbang lot tersisa,
  - jika tidak ada lot, last purchase cost,
  - expiry wajib jika track_expiry; jika tidak diketahui, quarantine.
- Sesi selesai immutable.

### BR-24 — Write-Off

- Draft tidak mengubah stok.
- Selesai mengurangi lot + stok.
- Total biaya = Σ(qty × unit_cost_base).
- Masuk Kerugian Persediaan.
- Batal mengembalikan lot + stok dan membalik kerugian.
- Write-off tidak boleh melebihi qty_remaining lot.

### BR-25 — Migrasi & Cutover

- Cutover date disimpan di settings.
- Stok saat cutover menjadi opening lot.
- Transaksi historis tidak membuat lot aktif.
- HPP historis = estimasi.
- Ledger aktif dimulai dari opening lot.
- Laporan sebelum cutover diberi label “Estimasi”.
- Rekonsiliasi wajib sebelum import dianggap selesai.

---

## 9. Data Model

### 9.1 Konvensi

| Aspek | Keputusan |
|---|---|
| Primary key | UUID v7 (string) |
| Legacy ID | `legacy_id` untuk data hasil migrasi |
| Timestamps | `created_at`, `updated_at` (ISO) |
| Soft delete | `deleted_at` pada master & transaksi |
| Uang | integer rupiah |
| Unit cost | desimal 4 angka |
| Qty base | integer |
| Qty unit | desimal 3 angka |
| Tanggal | `YYYY-MM-DD` |
| Zona waktu | Asia/Jakarta |
| Status | `draft`, `completed`, `cancelled` |
| Stok | cache + ledger + lot |
| HPP | COGS per penjualan |

### 9.2 Entities

#### `business_profile`

| Field | Tipe | Catatan |
|---|---|---|
| id | string | `main` |
| nama_usaha | string | Wajib |
| nama_pemilik | string | Opsional |
| alamat | string | Opsional |
| telepon | string | Opsional |
| catatan_laporan | string | Footer laporan |
| created_at | string | |
| updated_at | string | |

Tidak ada field logo.

#### `settings`

| Field | Tipe | Catatan |
|---|---|---|
| key | string | PK |
| value | json | Nilai |
| updated_at | string | |

Contoh key: `pin_hash`, `pin_salt`, `auto_lock`, `prefix_sale`, `counter_PJ_20261024`, `last_backup_at`, `schema_version`, `cutover_date`, `expiry_alert_default_days`, `backup_encryption_default`, `historical_cogs_method`, `hpp_policy`.

#### `product_categories`

`id`, `kode` (unique), `nama`, `deskripsi`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `units`

`id`, `nama` (unique), `simbol` (nullable), `status`, `created_at`, `updated_at`, `deleted_at`

#### `products`

`id`, `kode` (unique), `nama`, `kategori_id`, `base_unit_id`, `track_expiry`, `expiry_alert_days`, `min_stock_base`, `stock_base`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `product_units`

`id`, `product_id`, `unit_id`, `conversion_qty`, `is_base`, `can_purchase`, `can_sell`, `is_default_purchase`, `is_default_sale`, `harga_beli_default`, `harga_jual`, `barcode` (nullable), `status`, `created_at`, `updated_at`

Unique: `(product_id, unit_id)`. Barcode unik jika diisi.

#### `suppliers`

`id`, `kode` (unique), `nama`, `telepon`, `alamat`, `catatan`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `customers`

`id`, `kode` (unique), `nama`, `telepon`, `alamat`, `catatan`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `expense_categories`

`id`, `kode` (unique), `nama`, `deskripsi`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `purchases`

`id`, `nomor_nota` (unique), `tanggal`, `supplier_id`, `metode_pembayaran`, `subtotal`, `diskon`, `biaya_angkut`, `total`, `bayar`, `status`, `keterangan`, `created_at`, `updated_at`, `deleted_at`

#### `purchase_items`

`id`, `purchase_id`, `product_id`, `unit_id`, `qty_unit`, `conversion_qty`, `qty_base`, `harga_beli_unit`, `diskon`, `subtotal`, `expiry_date`, `lot_code`, `unit_cost_base`, `lot_id`, `created_at`

#### `sales`

`id`, `nomor_nota` (unique), `tanggal`, `customer_id` (nullable), `metode_pembayaran`, `subtotal`, `diskon`, `total`, `bayar`, `hpp_total`, `gross_profit`, `status`, `keterangan`, `created_at`, `updated_at`, `deleted_at`

#### `sale_items`

`id`, `sale_id`, `product_id`, `unit_id`, `qty_unit`, `conversion_qty`, `qty_base`, `harga_jual_unit`, `diskon`, `subtotal`, `hpp_total`, `gross_profit`, `created_at`

`gross_profit` item dihitung sebelum diskon header. Laba kotor header = `sales.total - sales.hpp_total`.

#### `sale_lot_consumptions`

`id`, `sale_id`, `sale_item_id`, `lot_id`, `qty_base`, `unit_cost_base`, `total_cost`, `created_at`

Immutable.

#### `stock_lots`

`id`, `product_id`, `purchase_id` (nullable), `purchase_item_id` (nullable), `lot_code`, `received_at`, `expiry_date` (nullable), `qty_received_base`, `qty_remaining_base`, `unit_cost_base`, `source`, `status`, `created_at`, `updated_at`

Source: `purchase`, `opening`, `opname_surplus`, `import`.

Status lifecycle: `active`, `depleted`, `quarantined`. Status `expired` boleh dihitung saat query dari `expiry_date`; jika disimpan, harus disegarkan saat read.

Unique: `(product_id, lot_code)`.

#### `stock_movements`

`id`, `product_id`, `lot_id` (nullable), `tanggal`, `tipe`, `qty_unit`, `conversion_qty`, `qty_base`, `unit_cost_base`, `stock_before_base`, `stock_after_base`, `ref_type`, `ref_id`, `keterangan`, `created_at`

Tipe: `opening`, `purchase_in`, `purchase_cancel`, `sale_out`, `sale_cancel`, `opname_shortage`, `opname_surplus`, `writeoff_expired`, `writeoff_damaged`, `writeoff_other`, `writeoff_cancel`, `import_opening`.

Immutable.

#### `stock_opnames`

`id`, `nomor` (unique), `tanggal`, `status`, `keterangan`, `created_at`, `updated_at`, `deleted_at`

#### `stock_opname_items`

`id`, `opname_id`, `product_id`, `unit_id`, `qty_unit`, `conversion_qty`, `system_qty_base`, `physical_qty_base`, `diff_base`, `diff_cost`, `created_at`

#### `stock_writeoffs`

`id`, `nomor` (unique), `tanggal`, `alasan`, `keterangan`, `total_cost`, `status`, `created_at`, `updated_at`, `deleted_at`

Alasan: `expired`, `damaged`, `other`.

#### `stock_writeoff_items`

`id`, `writeoff_id`, `product_id`, `lot_id`, `qty_base`, `unit_cost_base`, `total_cost`, `expiry_date`, `keterangan`, `created_at`

#### `expenses`

`id`, `nomor_transaksi` (unique), `tanggal`, `expense_category_id`, `keterangan`, `nominal`, `metode_pembayaran`, `status`, `created_at`, `updated_at`, `deleted_at`

#### `audit_logs`

`id`, `timestamp`, `action`, `entity`, `entity_id`, `payload`, `note`

Maksimal 1.000 entri; dipangkas otomatis.

### 9.3 Dexie Schema (rancangan)

```js
db.version(1).stores({
  business_profile: 'id',
  settings: 'key',
  product_categories: 'id, &kode, nama, status, deleted_at',
  units: 'id, &nama, status, deleted_at',
  products: 'id, &kode, kategori_id, base_unit_id, track_expiry, status, deleted_at',
  product_units: 'id, product_id, unit_id, &[product_id+unit_id], barcode, status',
  suppliers: 'id, &kode, nama, status, deleted_at',
  customers: 'id, &kode, nama, status, deleted_at',
  expense_categories: 'id, &kode, nama, status, deleted_at',
  purchases: 'id, &nomor_nota, tanggal, supplier_id, status, [tanggal+status], deleted_at',
  purchase_items: 'id, purchase_id, product_id, lot_id',
  sales: 'id, &nomor_nota, tanggal, customer_id, status, [tanggal+status], deleted_at',
  sale_items: 'id, sale_id, product_id',
  sale_lot_consumptions: 'id, sale_id, sale_item_id, lot_id, [lot_id+created_at]',
  stock_lots: 'id, product_id, purchase_id, expiry_date, status, [product_id+expiry_date], [product_id+status], lot_code',
  stock_movements: 'id, product_id, lot_id, tanggal, tipe, [product_id+tanggal], [ref_type+ref_id]',
  stock_opnames: 'id, &nomor, tanggal, status, deleted_at',
  stock_opname_items: 'id, opname_id, product_id',
  stock_writeoffs: 'id, &nomor, tanggal, status, deleted_at',
  stock_writeoff_items: 'id, writeoff_id, product_id, lot_id',
  expenses: 'id, &nomor_transaksi, tanggal, expense_category_id, status, [tanggal+status], deleted_at',
  audit_logs: 'id, timestamp, action, entity'
});
```

Catatan:
- Barcode unik ditegakkan di service karena IndexedDB tidak ideal untuk unique nullable.
- Index `[product_id+expiry_date]` dipakai FEFO.
- Index `[product_id+status]` dipakai daftar lot aktif.
- Phase 1 memakai `version(1)` hanya untuk tabel `app_meta` (skeleton). Phase 2 menaikkan ke `version(2)` untuk schema domain lengkap di atas.
- Schema version dinaikkan setiap ada perubahan struktur.

### 9.4 Relasi

```text
product_categories 1 ── N products
units              1 ── N product_units
products           1 ── N product_units
products           1 ── N stock_lots

suppliers          1 ── N purchases
purchases          1 ── N purchase_items
products           1 ── N purchase_items
purchase_items     1 ── 1 stock_lots

customers          1 ── N sales
sales              1 ── N sale_items
products           1 ── N sale_items
sale_items         1 ── N sale_lot_consumptions
stock_lots         1 ── N sale_lot_consumptions

expense_categories 1 ── N expenses

products           1 ── N stock_movements
stock_lots         1 ── N stock_movements

stock_opnames      1 ── N stock_opname_items
products           1 ── N stock_opname_items

stock_writeoffs    1 ── N stock_writeoff_items
stock_lots         1 ── N stock_writeoff_items
```

### 9.5 Aturan Integritas

- Semua penulisan transaksi memakai `db.transaction('rw', ...)`.
- Stok, lot, movement, dan konsumsi ditulis dalam transaksi yang sama.
- Nomor nota diambil dari counter dalam transaksi yang sama.
- `qty_remaining_base` tidak boleh negatif.
- `qty_remaining_base` tidak boleh melebihi `qty_received_base`.
- `sale_items.hpp_total` harus sama dengan Σ `sale_lot_consumptions.total_cost`.
- `sales.hpp_total` harus sama dengan Σ `sale_items.hpp_total`.
- `sales.gross_profit` = `sales.total` - `sales.hpp_total`.
- Hapus master yang direferensikan ditolak.
- `stock_movements` dan `sale_lot_consumptions` bersifat immutable.
- Lot expired/quarantine tidak boleh dipakai penjualan.
- Cek konsistensi stok tersedia di pengaturan.
- Perubahan base unit/konversi setelah ada transaksi ditolak.
- Perubahan expiry lot setelah lot dikonsumsi ditolak; sebelum dikonsumsi boleh dengan audit.

---

## 10. Information Architecture & Navigation

### 10.1 Bottom Navigation

| Tab | Route | Isi |
|---|---|---|
| Dashboard | `/` | Ringkasan |
| Transaksi | `/transaksi` | Penjualan, pembelian, beban |
| Stok | `/stok` | Daftar stok, expiry, opname, write-off |
| Laporan | `/laporan` | 6 laporan |
| Lainnya | `/lainnya` | Master, pengaturan, backup, kamus istilah |

### 10.2 Route Map

```text
/                               Dashboard
/transaksi                      Transaksi hub
/transaksi/penjualan            Daftar penjualan
/transaksi/penjualan/baru       Buat penjualan
/transaksi/penjualan/:id        Detail penjualan
/transaksi/pembelian            Daftar pembelian
/transaksi/pembelian/baru       Buat pembelian
/transaksi/pembelian/:id        Detail pembelian
/transaksi/beban                Daftar beban
/transaksi/beban/baru           Buat beban
/transaksi/beban/:id            Detail beban

/stok                           Daftar stok
/stok/:id                       Kartu stok
/stok/expiry                    Daftar expiry
/stok/writeoff                  Daftar write-off
/stok/writeoff/baru             Buat write-off
/stok/writeoff/:id              Detail write-off
/stok/opname                    Daftar opname
/stok/opname/baru               Buat opname
/stok/opname/:id                Detail opname

/laporan                        Hub laporan
/laporan/penjualan              Laporan penjualan
/laporan/pembelian              Laporan pembelian
/laporan/stok                   Laporan stok
/laporan/beban                  Laporan beban
/laporan/expiry                 Laporan expiry
/laporan/laba-rugi              Laporan laba/rugi

/lainnya                        Menu lainnya
/lainnya/kamus-istilah          Kamus istilah operasional
/master                         Hub master data
/master/produk                  Produk
/master/kategori                Kategori produk
/master/satuan                  Satuan global
/master/supplier                Supplier
/master/customer                Customer
/master/kategori-beban          Kategori beban

/pengaturan                     Pengaturan
/pengaturan/profil              Profil usaha
/pengaturan/penomoran           Penomoran
/pengaturan/keamanan            PIN & auto-lock
/pengaturan/backup              Backup
/pengaturan/restore             Restore
/pengaturan/import              Import data Laravel
/pengaturan/storage             Storage
/pengaturan/tentang             Tentang
```

### 10.3 Prinsip Navigasi

- Maksimal 2 level dari bottom nav ke tugas utama.
- Aksi utama selalu di thumb zone (bawah).
- Bottom sheet untuk picker/filter, bukan halaman baru.
- Tombol back konsisten di kiri atas.
- State filter disimpan saat kembali ke list (dalam sesi).
- Expiry dan write-off dapat diakses dari Dashboard dan Stok.

---

## 11. UI/UX Specification

### 11.1 Referensi Visual

Contoh UI berada di `arif-manajemen/docs/contoh_UI_mobile/`. Yang diadopsi:

| Referensi | Yang diambil | Penerapan di StokPlus |
|---|---|---|
| Dashboard | Angka besar, quick actions, recent activity, bottom nav | Dashboard KPI + expiry cards |
| Savings | Kartu ringkasan dengan progress | Ringkasan stok / nilai persediaan |
| Send money | Input nominal besar + keypad numerik | Pembayaran penjualan, nominal beban |
| Recipient picker | Bottom sheet dengan pencarian & check | Picker produk/customer/supplier/lot |
| Cards | Kartu detail dengan aksi & toggle | Detail pengaturan/produk |
| Detail sheet | Bottom sheet detail transaksi | Quick detail transaksi |

Yang **tidak** diadopsi:
- Tema perbankan/kartu kredit.
- Fitur transfer uang.
- Warna dan brand asli.
- Layout yang terlalu bergantung pada grafik dekoratif.

### 11.2 Design Tokens

```css
--color-bg: #F7F5F1;
--color-surface: #FFFFFF;
--color-surface-muted: #F1EEE8;
--color-primary: #1E2A78;
--color-primary-600: #26359A;
--color-accent: #B86B4B;
--color-text: #181818;
--color-muted: #6B7280;
--color-border: #E8E3DC;
--color-success: #2F7D4A;
--color-warning: #B7791F;
--color-danger: #C0392B;
--color-expiry: #B7791F;
--color-expired: #C0392B;
--color-quarantine: #6B7280;

--radius-card: 24px;
--radius-control: 14px;
--radius-pill: 999px;
--shadow-card: 0 8px 24px rgba(24, 24, 24, 0.06);

--space-page: 20px;
--space-section: 24px;
--bottom-nav-height: 72px;
```

**Tipografi:** Plus Jakarta Sans (self-hosted), fallback `system-ui`.
**Angka uang:** tabular numerals agar rapi.
**Ikon:** Lucide, stroke 1.75–2px.
**Monogram:** `S+` dalam lingkaran navy/copper.

### 11.3 Layout Patterns

- **App bar:** tinggi 56px, back/title/action, safe area.
- **Page padding:** 20px kiri-kanan.
- **Card:** radius 24px, padding 20px, border tipis + shadow halus.
- **List row:** ikon 40px, teks 2 baris, nominal di kanan, divider tipis.
- **Bottom nav:** 5 item, ikon 24px, label 11px, indikator aktif berupa dot.
- **Bottom sheet:** radius atas 28px, drag handle, judul, close, safe area bawah.
- **Sticky CTA:** pill button full width, di atas bottom nav/safe area.
- **Numeric keypad:** 3×4, tombol besar, backspace, dipakai untuk nominal/bayar.
- **Status chip:** draft (amber), selesai (green), batal (red), expired (red), hampir expired (amber), quarantine (gray).
- **Empty state:** ikon, judul, deskripsi, CTA.
- **Toast:** atas/bawah, auto-dismiss 3 detik.

### 11.4 Wireframe Dashboard

```text
┌──────────────────────────────┐
│ S+  Selamat pagi, Arif  [🔔] │
│    Toko Berkah               │
│    [Bulan Ini ▾]             │
│                              │
│      ╭────────────────╮      │
│      │ Penjualan      │      │
│      │ Rp 12.480.000  │      │
│      │ Laba Kotor     │      │
│      │ Rp 3.200.000   │      │
│      │ Laba Bersih    │      │
│      │ Rp 2.450.000   │      │
│      ╰────────────────╯      │
│                              │
│   (↑)        (↓)       (＋)  │
│ Penjualan  Pembelian   Beban │
│                              │
│ Ringkasan                    │
│ ┌──────────┐ ┌──────────┐   │
│ │HPP/COGS  │ │Beban     │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐   │
│ │Stok Nilai│ │Laba      │   │
│ └──────────┘ └──────────┘   │
│                              │
│ Expired & Hampir Expired     │
│ ┌──────────────────────────┐ │
│ │ 3 lot expired  >         │ │
│ │ 5 lot ≤ 30 hari >        │ │
│ └──────────────────────────┘ │
│                              │
│ Grafik 6 bulan               │
│ ▁▂▃▅▆▇                       │
│                              │
│ Stok menipis     5 produk >  │
│                              │
│ Aktivitas terbaru    Lihat   │
│ 🧾 PJ-20261024-0001          │
│    Hari ini · Rp 250.000     │
│ 🛒 PB-20261024-0001          │
│    Kemarin · Rp 1.200.000    │
│                              │
├──────────────────────────────┤
│ 🏠      🧾      📦      📊     ⋯ │
│Dashboard Transaksi Stok Laporan Lainnya│
└──────────────────────────────┘
```

### 11.5 Wireframe Form Produk Multi-Unit

```text
┌──────────────────────────────┐
│ <   Produk Baru              │
│                              │
│ Kode        P001             │
│ Nama        Siomay Frozen    │
│ Kategori    Frozen Food      │
│ Base Unit   [pcs ▾]          │
│ [x] Track expiry             │
│ Alert       30 hari          │
│ Min stock   20 pcs           │
│                              │
│ Satuan & Konversi            │
│ ┌──────────────────────────┐ │
│ │ pcs   base   1           │ │
│ │       jual Rp 2.500      │ │
│ ├──────────────────────────┤ │
│ │ pack  10 pcs  Rp 20.000  │ │
│ ├──────────────────────────┤ │
│ │ dus   100 pcs Rp 150.000 │ │
│ └──────────────────────────┘ │
│ + Tambah satuan              │
│                              │
│ [ Simpan ]                   │
└──────────────────────────────┘
```

### 11.6 Wireframe Item Pembelian

```text
┌──────────────────────────────┐
│ Tambah barang            [×] │
│ Siomay Frozen                │
│                              │
│ Satuan       [dus ▾]         │
│ Qty          2               │
│ = 200 pcs                    │
│ Harga/dus    Rp 150.000      │
│ Diskon       Rp 0            │
│ Expiry       12/12/2026      │
│ Lot code     LOT-PB-001-1    │
│                              │
│ HPP/pcs      Rp 1.500        │
│ Subtotal     Rp 300.000      │
│                              │
│ [        Tambah            ] │
└──────────────────────────────┘
```

### 11.7 Wireframe Penjualan FEFO

```text
┌──────────────────────────────┐
│ <   Penjualan          Draft │
│                              │
│ Customer    [Umum ▾]         │
│ Tanggal     24/10/2026       │
│ Pembayaran  [Tunai ▾]        │
│                              │
│ Barang                       │
│ ┌──────────────────────────┐ │
│ │ Siomay Frozen       [×]  │ │
│ │ Satuan [pack ▾]          │ │
│ │ Rp 20.000 / pack         │ │
│ │ Stok tersedia 12 pack    │ │
│ │ [-]   3   [+]            │ │
│ │ HPP Rp 15.000            │ │
│ │ Laba Rp 45.000           │ │
│ │ Subtotal Rp 60.000       │ │
│ └──────────────────────────┘ │
│ + Tambah barang              │
│                              │
│ Ringkasan                    │
│ Subtotal         Rp 60.000   │
│ Diskon           Rp 0        │
│ Total            Rp 60.000   │
│                              │
│ [ Simpan Draft ] [ Selesaikan ]│
└──────────────────────────────┘
```

### 11.8 Wireframe Laporan Laba/Rugi

```text
┌──────────────────────────────┐
│ <   Laba/Rugi                │
│ [Bulan Ini ▾]                │
│                              │
│ Penjualan Bersih Rp 12.480.000│
│ HPP/COGS        Rp  8.200.000│
│ ─────────────────────────────│
│ Laba Kotor      Rp  4.280.000│
│                              │
│ Kerugian Persediaan Rp 150.000│
│ Beban Operasional   Rp 1.680.000│
│ ─────────────────────────────│
│ Laba Bersih     Rp  2.450.000│
│                              │
│ Rincian beban                │
│ Listrik & Freezer Rp 800.000 │
│ Sewa              Rp 500.000 │
│ Sampah            Rp 80.000  │
│ ...                          │
└──────────────────────────────┘
```

### 11.9 Interaction Rules

- Semua aksi destruktif memakai konfirmasi.
- Form mencegah kehilangan input saat validasi gagal.
- Tombol submit menampilkan loading dan disabled saat proses.
- Error validasi tampil dekat field.
- Sukses menampilkan toast + navigasi yang jelas.
- Angka uang memakai keyboard numerik.
- Swipe-to-delete tidak dipakai (rawan salah).
- Pull-to-refresh tidak diperlukan karena data lokal.
- Bottom sheet dapat ditutup dengan swipe/back/klik overlay.
- Semua target sentuh minimal 44×44px.
- Pilihan satuan menampilkan konversi dan stok tersedia dalam satuan tersebut.
- Pilihan lot hanya muncul di detail/audit, bukan input penjualan (FEFO otomatis).

### 11.10 Aksesibilitas

- Kontras teks minimal WCAG AA.
- Label form eksplisit; placeholder bukan pengganti label.
- Fokus terlihat.
- Dukungan screen reader untuk tombol ikon (`aria-label`).
- Tidak mengandalkan warna saja untuk status (ada teks).
- Ukuran font minimum 14px untuk body, 12px hanya caption.
- Status expired/quarantine punya teks, bukan hanya warna.

### 11.11 Responsif

- Fokus utama: 360×800, 390×844, 430×932.
- Di layar ≥ 768px (tablet), konten maksimal 720px di tengah.
- Tidak ada horizontal scroll pada alur utama.
- Tabel laporan di layar kecil berubah menjadi card list.
- Safe area iOS diperhitungkan untuk bottom nav dan CTA.

---

## 12. Technical Architecture

### 12.1 Diagram

```text
┌──────────────────────────────────────────┐
│                PWA                       │
│                                          │
│  Vue 3 + Vue Router + Pinia              │
│  ├─ Features (dashboard, transaksi, ...) │
│  ├─ Domain services:                     │
│  │   units, lots, fefo, cogs, reports    │
│  ├─ Dexie.js ── IndexedDB                │
│  └─ Service Worker (Workbox)             │
│                                          │
│  Chart.js   SheetJS   Zod   date-fns     │
└──────────────────────────────────────────┘
                 │
                 ▼
        Static hosting (HTTPS)
        Hanya untuk memuat app shell
```

Tidak ada backend, API, database server, atau autentikasi online.

### 12.2 Stack

| Komponen | Pilihan |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite + TypeScript |
| UI | Tailwind CSS + DaisyUI |
| Router | Vue Router (hash history untuk hosting statis) |
| State | Pinia |
| Database | Dexie.js + IndexedDB |
| PWA | `vite-plugin-pwa` (Workbox) |
| Chart | Chart.js + `vue-chartjs` |
| Excel | SheetJS (`xlsx`) |
| Validasi | Zod |
| Tanggal | date-fns |
| Ikon | Lucide Vue |
| Font | `@fontsource/plus-jakarta-sans` |
| Testing | Vitest, Vue Test Utils, Playwright, `fake-indexeddb` |
| Lint/format | ESLint + Prettier |

### 12.3 Struktur Folder

```text
stokplus-pwa/
├── docs/
│   ├── PRD.md
│   └── PHASES.md
├── public/
│   ├── icons/
│   └── robots.txt
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/          # Button, Card, BottomSheet, Keypad, dll.
│   │   └── domain/      # TransactionCard, StockCard, LotBadge, dll.
│   ├── composables/
│   ├── db/
│   │   ├── dexie.ts
│   │   ├── schema.ts
│   │   └── migrations.ts
│   ├── domain/
│   │   ├── units.ts     # konversi & validasi
│   │   ├── lots.ts      # lot, expiry, FEFO/FIFO
│   │   ├── cogs.ts      # HPP/COGS
│   │   ├── stock.ts     # ledger & konsistensi
│   │   └── reports.ts   # laporan & laba/rugi
│   ├── features/
│   │   ├── dashboard/
│   │   ├── master/
│   │   ├── purchases/
│   │   ├── sales/
│   │   ├── expenses/
│   │   ├── stock/
│   │   ├── expiry/
│   │   ├── reports/
│   │   ├── backup/
│   │   ├── import/
│   │   └── settings/
│   ├── layouts/
│   ├── router/
│   ├── stores/
│   ├── utils/
│   ├── App.vue
│   └── main.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 12.4 Alur Data

```text
User action
  ↓
Komponen Vue
  ↓
Composable / domain service
  ↓
Validasi Zod
  ↓
Dexie transaction
  ↓
IndexedDB
  ↓
Live query / refresh state
  ↓
UI diperbarui
```

- Dexie adalah **source of truth**.
- Pinia menyimpan state UI (filter, sesi, preferensi), bukan duplikasi data transaksi.
- Domain service berisi fungsi murni untuk konversi, FEFO, COGS, stok, dan laporan; mudah di-unit-test.
- Tidak ada layer HTTP.

### 12.5 PWA

- `registerType: 'prompt'`.
- Precache: HTML, JS, CSS, font, ikon.
- `navigateFallback: 'index.html'`.
- Tidak ada runtime caching eksternal.
- Cek update saat app start/resume.
- Tampilkan prompt update.
- Sebelum migrasi schema, tampilkan peringatan backup.

### 12.6 Deploy

- Build menghasilkan `dist/`.
- Hosting statis: Cloudflare Pages / Netlify / GitHub Pages.
- HTTPS wajib.
- Tidak ada environment variable rahasia.
- Untuk GitHub Pages, gunakan hash router atau konfigurasi `404.html`.
- Rilis diberi versi (`1.0.0`) dan ditampilkan di Pengaturan.

---

## 13. Migration Plan

### 13.1 Export dari Laravel

Tambahkan perintah Artisan di proyek Laravel:

```bash
php artisan stokplus:export-json
```

Output: `storage/app/stokplus-export-YYYYMMDD-HHmm.json`

Struktur:

```json
{
  "meta": {
    "app": "SMPP Laravel",
    "version": "1.0",
    "exported_at": "2026-10-24T12:00:00+07:00",
    "schema": "mysql-2026-10",
    "source_php": "8.3.33"
  },
  "tables": {
    "product_categories": [],
    "units": [],
    "products": [],
    "suppliers": [],
    "customers": [],
    "expense_categories": [],
    "purchases": [],
    "purchase_details": [],
    "sales": [],
    "sale_details": [],
    "expenses": [],
    "stock_movements": [],
    "stock_opnames": [],
    "stock_opname_details": []
  }
}
```

**Prasyarat keamanan:** patch PHP Laravel ke **8.3.36+** sebelum export. Versi 8.3.33 rentan terhadap PHP2Shell (`CVE-2026-109618`, `CVE-2026-109619`). Jangan menjalankan export di server yang terekspos tanpa patch.

### 13.2 Mapping

| Laravel | StokPlus |
|---|---|
| `id` integer | UUID v5 dari `{table}:{id}` + `legacy_id` |
| `created_by` | Diabaikan |
| `users` | Tidak diimpor |
| `purchase_details` | `purchase_items` |
| `sale_details` | `sale_items` |
| `stock_opname_details` | `stock_opname_items` |
| `products.satuan_id` | `products.base_unit_id` + `product_units` base |
| `products.harga_beli` | harga beli default base |
| `products.harga_jual` | harga jual base |
| `products.stock` | opening lot qty |
| `stock_movements` | Tidak diimpor ke ledger aktif; riwayat lama hanya tersedia lewat transaksi historis |

### 13.3 Strategi Opening Lot

Untuk setiap produk saat cutover:

```text
qty_opening = products.stock
unit_cost_opening = weighted average purchase price
                    atau last purchase price
                    atau products.harga_beli
expiry_opening = input wizard
```

- Jika `track_expiry` dan expiry tidak diisi: lot `quarantined`.
- Lot `quarantined` tidak bisa dijual sampai expiry diisi.
- Opening lot source = `opening` atau `import`.
- Ledger aktif dimulai dari opening lot.
- Transaksi historis tidak membuat lot aktif.

### 13.4 Estimasi HPP Historis

- HPP historis = `qty_base × unit_cost_opening`.
- Tandai `hpp_is_estimated = true` pada sale item/historical report.
- Laporan sebelum cutover menampilkan label “HPP estimasi”.
- Setelah cutover, HPP memakai lot aktual.

### 13.5 Langkah Import

1. Backup data PWA yang ada.
2. Pilih file export.
3. Validasi `meta.app`, `meta.schema`, relasi.
4. Tentukan cutover date.
5. Preview jumlah baris + total nilai.
6. Konfirmasi replace.
7. Import master + transaksi historis per batch.
8. Wizard opening lot + expiry.
9. Rekonsiliasi:
   - jumlah baris,
   - total penjualan/pembelian/beban,
   - stok akhir per produk,
   - relasi yatim,
   - lot quarantine.
10. Jika gagal: restore backup keamanan.
11. Tampilkan laporan hasil.

### 13.6 Uji Migrasi

- Bandingkan total laporan Laravel vs StokPlus.
- Bandingkan stok 10 produk sampel.
- Pastikan nomor nota tidak berubah.
- Pastikan tanggal tidak bergeser.
- Pastikan tidak ada relasi yatim.
- Pastikan semua produk `track_expiry` punya expiry atau quarantine.
- Pastikan HPP historis berlabel estimasi.

---

## 14. Non-Functional Requirements

### NFR-01 — Performance

| Metrik | Target |
|---|---|
| Cold start offline | < 3 detik di Android mid-range |
| Warm start | < 1 detik |
| Navigasi antar halaman | < 100ms |
| Simpan transaksi | < 300ms |
| Alokasi FEFO 1.000 lot | < 100ms |
| Laporan 12 bulan / 10.000 transaksi | < 1 detik |
| Bundle awal | < 500KB gzip; Chart.js/SheetJS lazy-load |

### NFR-02 — Offline

- Semua fitur utama berjalan tanpa jaringan.
- Tidak ada request ke API.
- App shell tersedia offline setelah instalasi.
- Update aplikasi hanya butuh jaringan saat tersedia.

### NFR-03 — Data Integrity

- Transaksi multi-tabel atomik.
- Stok, lot, movement, dan konsumsi selalu konsisten.
- Nomor nota unik.
- Restore/import tidak boleh meninggalkan data setengah jadi.
- `qty_remaining` tidak negatif.
- COGS konsisten dengan konsumsi lot.

### NFR-04 — Security

- PIN di-hash PBKDF2 + salt.
- Auto-lock.
- Tidak ada secret di frontend.
- Backup terenkripsi opsional.
- Data tidak dikirim ke pihak ketiga.
- Gunakan CSP header dari hosting.
- Hindari `v-html` untuk input pengguna.
- Source Laravel harus dipatch sebelum export.

### NFR-05 — Reliability

- Tidak ada data loss saat aplikasi ditutup di tengah transaksi.
- Dexie transaction rollback.
- Backup sebelum operasi berisiko (restore/import/reset).
- Cek konsistensi stok tersedia.

### NFR-06 — Storage

- Pantau penggunaan dan kuota.
- Minta persistent storage.
- Peringatan pada 80% kuota.
- Target penggunaan normal < 50MB.
- Lot dan konsumsi historis dapat dipangkas? Tidak pada MVP; arsip tetap.

### NFR-07 — Compatibility

- Chrome Android 120+
- Safari iOS 16.4+
- Edge Chromium terbaru
- Tidak mendukung IE/legacy browser
- Orientasi portrait; tablet tetap didukung

### NFR-08 — Accessibility

- WCAG 2.1 AA untuk kontras dan navigasi keyboard.
- Target sentuh 44px.
- Label dan `aria-label`.
- Status tidak hanya dibedakan warna.

### NFR-09 — Maintainability

- TypeScript.
- Modul per fitur.
- Domain logic terpisah dari UI.
- Unit test untuk rumus dan aturan bisnis.
- Lint/format otomatis.
- Domain units/lots/cogs/reports terisolasi.

### NFR-10 — Observability

- Log lokal untuk error dan aksi penting.
- Tidak ada telemetry eksternal.
- Layar “Tentang” menampilkan versi app, schema, dan storage.

---

## 15. Success Metrics

Karena tidak ada telemetry, metrik diukur saat UAT dan pilot:

| Metrik | Target |
|---|---|
| Waktu input penjualan 1–3 item | < 60 detik |
| Waktu buka aplikasi offline | < 3 detik |
| Akurasi stok setelah 20 transaksi uji | 100% |
| Akurasi konversi satuan | 100% |
| Akurasi COGS setelah 20 penjualan uji | 100% |
| Keberhasilan backup/restore | 100% |
| Keberhasilan import data Laravel | 100% |
| Crash/data loss saat UAT | 0 |
| Tugas UAT selesai tanpa bantuan | ≥ 90% |
| Lighthouse PWA | Installable, performance ≥ 85 |

---

## 16. Testing & QA

### 16.1 Unit Test

- Perhitungan subtotal, diskon, total, kembalian.
- Konversi satuan dan validasi qty base integer.
- Harga per base.
- Alokasi diskon header dan biaya angkut ke lot.
- FEFO: expiry terdekat, tie-break, expired skip.
- FIFO untuk produk tanpa expiry.
- Quarantine lot expiry null.
- COGS per sale item.
- Gross profit.
- Guard pembatalan pembelian (lot utuh vs terpakai).
- Pembatalan penjualan dan restore lot.
- Write-off cost dan P&L.
- Opname shortage/surplus dan alokasi lot.
- Rumus laba/rugi baru.
- Status stok.
- Penomoran unik.
- Mapping import + estimasi HPP.
- Validasi backup.

### 16.2 Integration Test

- Dexie CRUD.
- Transaksi atomik lot + movement + konsumsi.
- Restore/import.
- Migrasi schema.
- Audit log.
- Cek konsistensi stok.
- Backup dengan tabel baru.

### 16.3 E2E Test

- Onboarding + PIN.
- Master produk multi-unit.
- Siklus pembelian → lot + expiry → stok naik.
- Siklus penjualan → FEFO → stok turun → COGS.
- Pembatalan pembelian + guard lot.
- Pembatalan penjualan + restore lot.
- Expiry alert → write-off.
- Opname.
- Laporan + filter.
- Export.
- Backup → reset → restore.
- Offline reload.
- Install prompt.
- Import Laravel + opening lot.

### 16.4 Device Matrix

| Perangkat | Browser |
|---|---|
| Android mid-range 360×800 | Chrome |
| Android 390×844 | Chrome |
| iPhone 390×844 | Safari |
| iPhone 430×932 | Safari |
| Tablet 768×1024 | Chrome |

### 16.5 UAT Checklist

- Pengguna dapat menyelesaikan siklus harian tanpa pendampingan.
- Pesan error dapat dipahami.
- Backup mudah ditemukan.
- Laporan sesuai ekspektasi.
- Tidak ada horizontal scroll pada alur utama.
- Pengguna memahami perbedaan HPP dan beban operasional.
- Pengguna memahami arti expired/quarantine.
- Pengguna dapat melakukan write-off.
- Pengguna dapat membaca laporan laba bersih.

---

## 17. Release Plan

| Fase | Deliverable | Estimasi |
|---|---|---|
| 0 | PRD v2, PHASES, brand token, schema review | 1–2 hari |
| 1 | Scaffold, design system, Dexie schema, test harness | 4–5 hari |
| 2 | Onboarding/PIN, settings, full schema | 4–6 hari |
| 3 | Backup/restore | 3–4 hari |
| 4 | Master data + multi-unit + expiry settings | 6–8 hari |
| 5 | Pembelian + lot + expiry + HPP + kamus istilah | 6–8 hari |
| 6 | Penjualan + FEFO + COGS | 7–9 hari |
| 7 | Beban + pemisahan P&L | 3–4 hari |
| 8 | Stok + expiry + write-off + opname | 7–9 hari |
| 9 | Dashboard + expiry alert | 3–4 hari |
| 10 | Laporan + export/print | 5–6 hari |
| 11 | Migrasi Laravel + opening lot | 6–8 hari |
| 12 | PWA polish, UAT, deploy, dokumentasi | 4–6 hari |

Total: **10–13 minggu** untuk MVP, tergantung kecepatan dan kualitas data migrasi.

### Definition of Done

- Semua FR MVP berfungsi.
- Unit/integration/E2E test lulus.
- UAT disetujui.
- PWA installable dan offline.
- Backup/restore terbukti, termasuk lot.
- Import data lama terbukti dengan opening lot.
- Dokumentasi pengguna singkat tersedia.
- Tidak ada bug kritis/blocker.
- Phase tracking diperbarui.

---

## 18. Risks & Mitigations

| Risiko | Dampak | Mitigasi |
|---|---|---|
| IndexedDB terhapus (clear data/uninstall) | Kehilangan seluruh data | Backup wajib, pengingat, persistent storage, edukasi |
| iOS evict storage | Data hilang | Instal ke home screen, backup rutin, peringatan |
| Pengguna lupa backup | Data tidak bisa dipulihkan | Banner berkala, checklist onboarding, reminder 7 hari/50 transaksi |
| PWA menyajikan versi lama | Bug/schema tidak sinkron | Update prompt, versioning, cek saat resume |
| Storage penuh | Transaksi gagal | Pantau kuota, peringatan 80%, bersihkan audit log |
| Kesalahan input | Laporan salah | Draft, konfirmasi, validasi, koreksi via cancel |
| Migrasi tidak cocok | Data rusak | Dry run, rekonsiliasi, backup sebelum import, rollback |
| Expiry tidak diisi | FEFO salah | Wajib untuk track_expiry, quarantine, wizard migrasi |
| Disiplin lot rendah | Stok/expiry tidak akurat | UI sederhana, auto lot code, audit, UAT |
| HPP historis estimasi | Laba historis tidak presisi | Label estimasi, cutover date, rekonstruksi future |
| Konversi satuan salah | Stok/COGS salah | Base unit terkecil, validasi integer, test |
| Performa FEFO pada lot banyak | Transaksi lambat | Index produk+expiry, query terbatas, arsip |
| PHP source rentan | Eksploitasi saat export | Patch ke 8.3.36+, backup, akses terbatas |
| Perbedaan browser | Layout/behavior berbeda | Device matrix, Playwright, uji nyata |
| HP hilang | Data dibaca orang lain | PIN, kunci HP, enkripsi backup opsional |
| Tidak ada sync | Data hanya di satu HP | Dokumentasikan; future sync |
| Jam perangkat berubah | Tanggal transaksi kacau | Gunakan tanggal lokal; validasi tanggal wajar |
| Barcode ditunda | Input lebih lambat | Search cepat; field barcode disiapkan |

---

## 19. Open Questions

| # | Pertanyaan | Status |
|---|---|---|
| 1 | Backup hanya file, atau perlu Google Drive di MVP? | Default: file dulu; Drive future |
| 2 | Apakah perlu logo usaha di MVP? | **Tidak**; monogram `S+` |
| 3 | Metode pembayaran final? | Tunai, transfer, QRIS |
| 4 | Apakah beban perlu status draft? | Ya, konsisten |
| 5 | Cetak struk? | Future |
| 6 | Barcode kapan? | Setelah MVP stabil |
| 7 | Multi-user kapan? | Future, setelah sync |
| 8 | Target volume data? | Asumsi: < 10.000 transaksi/tahun |
| 9 | Apakah perlu dark mode? | Future |
| 10 | Hosting PWA? | Cloudflare Pages/Netlify |
| 11 | Biaya angkut masuk default? | Opsional, masuk HPP lot; isi 0 jika tidak ada |
| 12 | Write-off P&L? | Baris terpisah Kerugian Persediaan |
| 13 | Expiry alert default? | 30 hari, override per produk |
| 14 | Opening lot expiry tidak diketahui? | Quarantine sampai diisi |
| 15 | Cutover date migrasi? | Ditentukan saat Phase 11 |
| 16 | Average cost? | Future, bukan MVP |

---

## 20. Acceptance Criteria (MVP)

### AC-01 — Onboarding

**Given** aplikasi baru dibuka
**When** pengguna mengisi nama usaha dan PIN valid
**Then** dashboard tampil dan PIN diminta saat aplikasi dibuka ulang.

### AC-02 — Master Produk Multi-Unit

**Given** pengguna berada di master produk
**When** pengguna menyimpan produk dengan base unit pcs dan satuan dus = 100 pcs
**Then** produk muncul, konversi tersimpan, dan dapat dipilih pada transaksi.

### AC-03 — Pembelian Lot & Expiry

**Given** produk track expiry dengan stok 10 pcs
**When** pembelian 2 dus (200 pcs) diselesaikan dengan expiry 12/12/2026
**Then** stok menjadi 210 pcs, lot 200 pcs terbentuk, dan movement `purchase_in` tercatat.

### AC-04 — Pembatalan Pembelian

**Given** pembelian 5 unit sudah selesai dan 1 unit sudah terjual
**When** pengguna membatalkan pembelian
**Then** pembatalan ditolak, stok tetap, status tetap completed.

### AC-05 — Penjualan FEFO

**Given** stok terdiri dari lot A expiry 1/11/2026 dan lot B expiry 1/12/2026
**When** penjualan 3 pack diselesaikan
**Then** lot A dikonsumsi lebih dulu dan COGS memakai HPP lot A.

### AC-06 — Stok Non-Expired Kurang

**Given** stok non-expired 2 pack dan ada lot expired 10 pack
**When** pengguna mencoba menyelesaikan penjualan 5 pack
**Then** transaksi ditolak dan stok tetap 2 pack.

### AC-07 — COGS & Laba Kotor

**Given** penjualan 3 pack dengan harga Rp 20.000/pack dan HPP lot Rp 15.000/pack
**When** transaksi diselesaikan
**Then** HPP = Rp 45.000 dan laba kotor = Rp 15.000.

### AC-08 — Draft

**Given** pengguna menyimpan penjualan sebagai draft
**When** pengguna membuka daftar stok
**Then** stok belum berubah.

### AC-09 — Beban & Pemisahan HPP

**Given** pengguna menyelesaikan beban listrik Rp 100.000
**When** membuka laporan laba/rugi periode tersebut
**Then** beban mengurangi laba bersih dan tidak mengubah HPP/COGS.

### AC-10 — Expiry Write-Off

**Given** lot expired 10 pcs dengan HPP Rp 1.500/pcs
**When** write-off diselesaikan
**Then** stok berkurang 10 pcs dan Kerugian Persediaan bertambah Rp 15.000.

### AC-11 — Opname

**Given** stok sistem 10 dan fisik 8
**When** opname difinalisasi
**Then** stok menjadi 8, lot dikurangi FEFO, dan movement `opname_shortage` tercatat.

### AC-12 — Laporan Laba/Rugi

**Given** terdapat penjualan, write-off, dan beban completed
**When** pengguna membuka laporan laba/rugi
**Then** laba bersih = laba kotor - kerugian persediaan - beban operasional.

### AC-13 — Export

**Given** pengguna membuka laporan penjualan
**When** menekan Export Excel
**Then** file `.xlsx` terunduh sesuai filter dan menyertakan HPP.

### AC-14 — Backup/Restore

**Given** pengguna membuat backup
**When** data direset lalu restore file tersebut
**Then** seluruh data kembali, termasuk lot, expiry, dan total laporan sama.

### AC-15 — Offline

**Given** aplikasi sudah terpasang
**When** HP dalam mode pesawat
**Then** aplikasi terbuka dan transaksi tetap dapat disimpan.

### AC-16 — PWA Install

**Given** pengguna membuka aplikasi di Chrome Android
**When** memilih Install
**Then** aplikasi muncul di home screen dengan brand StokPlus dan berjalan standalone.

### AC-17 — Import Laravel

**Given** file export Laravel valid
**When** pengguna menjalankan import dengan cutover date
**Then** data master/transaksi masuk, opening lot terbentuk, dan total laporan historis sesuai dengan label estimasi.

### AC-18 — PIN Lock

**Given** aplikasi sedang terbuka
**When** melewati batas auto-lock
**Then** aplikasi meminta PIN sebelum melanjutkan.

### AC-19 — Tidak Ada Role/Admin/Email Login

**Given** aplikasi StokPlus dibuka
**When** pengguna mencari menu admin, owner, master user, atau login email
**Then** menu tersebut tidak tersedia; akses hanya melalui PIN lokal.

### AC-20 — Expiry Quarantine

**Given** produk track expiry dan opening lot tanpa expiry
**When** pengguna mencoba menjual produk tersebut
**Then** penjualan ditolak sampai expiry diisi.

---

## 21. Appendix

### 21.1 Parity Matrix — Laravel vs StokPlus

| Fitur | Laravel | StokPlus MVP | Catatan |
|---|---|---|---|
| Dashboard | Ya | Ya | Mobile + expiry cards |
| Master produk/kategori/satuan | Ya | Ya | Multi-unit |
| Supplier/customer/kategori beban | Ya | Ya | |
| Pembelian | Ya | Ya | Lot + expiry + landed cost |
| Penjualan | Ya | Ya | FEFO + COGS |
| Beban | Ya | Ya | Opex terpisah |
| Stok & kartu stok | Ya | Ya | Per lot + expiry |
| Opname | Ya | Ya | Alokasi lot |
| Laporan 5 jenis | Ya | Ya | + expiry |
| Export Excel | Ya | Ya | Client-side |
| Backup | Database | JSON file | Wajib, termasuk lot |
| Role admin/owner | Ya | Tidak | Single user |
| Master user | Ya | Tidak | Dihapus |
| Login email/password | Ya | Tidak | Diganti PIN |
| Upload logo | Ya | Tidak | Monogram S+ |
| Multi-user | Ya | Tidak | Future |
| Multi-unit | Tidak | Ya | Base unit + konversi |
| Lot/batch | Tidak | Ya | Per pembelian |
| Expiry tracking | Tidak | Ya | FEFO + alert |
| Expiry write-off | Tidak | Ya | Kerugian persediaan |
| COGS per penjualan | Tidak | Ya | HPP aktual |
| HPP vs opex | Tidak | Ya | Laporan terpisah |
| Barcode | Tidak | Tidak | Field disiapkan |
| Hosting | Server | Statis | Tanpa backend |
| Database | MySQL | IndexedDB | Local-first |

### 21.2 Formula Reference

```text
Konversi:
qty_base = qty_unit × conversion_qty

Pembelian:
subtotal_item = (qty_unit × harga_beli_unit) - diskon_item
subtotal = Σ subtotal_item
alokasi_diskon = diskon_header × (subtotal_item / subtotal)
alokasi_angkut = biaya_angkut × (subtotal_item / subtotal)
total_lot = subtotal_item - alokasi_diskon + alokasi_angkut
unit_cost_base = total_lot / qty_base
total_pembelian = subtotal - diskon_header + biaya_angkut

Penjualan:
subtotal_item = (qty_unit × harga_jual_unit) - diskon_item
subtotal = Σ subtotal_item
total_penjualan = subtotal - diskon_header
hpp_total_item = Σ(qty_konsumsi × unit_cost_base)
hpp_total_sale = Σ hpp_total_item
gross_profit_item = subtotal_item - hpp_total_item
gross_profit_sale = total_penjualan - hpp_total_sale
kembalian = bayar - total

Laba/rugi:
penjualan_bersih = Σ completed sales.total
hpp = Σ completed sale_items.hpp_total
laba_kotor = penjualan_bersih - hpp
kerugian_persediaan = writeoff + opname_shortage - opname_surplus
laba_bersih = laba_kotor - kerugian_persediaan - beban_operasional

Stok:
stock_base = Σ stock_lots.qty_remaining_base
stock_after_base = stock_before_base + qty_base
nilai_persediaan = Σ(qty_remaining_base × unit_cost_base)
```

### 21.3 Glossary

| Istilah | Arti |
|---|---|
| StokPlus | Nama produk |
| PWA | Progressive Web App |
| IndexedDB | Database browser untuk data lokal |
| Dexie | Library query IndexedDB |
| Service worker | Cache/app shell offline |
| Base unit | Satuan terkecil untuk stok |
| Product unit | Satuan beli/jual produk + konversi |
| Lot/batch | Kelompok stok dari satu pembelian |
| Expiry | Tanggal kedaluwarsa lot |
| FEFO | First Expired First Out |
| FIFO | First In First Out |
| COGS | Cost of Goods Sold; HPP barang terjual |
| HPP | Harga Pokok Penjualan |
| Opex | Beban operasional |
| Kerugian persediaan | Nilai stok expired/rusak/selisih opname |
| Quarantine | Lot dengan expiry tidak diketahui, tidak bisa dijual |
| Ledger | Catatan mutasi stok |
| Opname | Penghitungan stok fisik |
| Draft | Transaksi belum berpengaruh |
| Completed | Transaksi selesai dan berpengaruh |
| Cancelled | Transaksi dibatalkan dan efeknya dikembalikan |
| Cutover | Titik peralihan data Laravel ke StokPlus |
| Opening lot | Lot awal dari stok saat cutover |
| UUID | Identifier unik |
| Local-first | Data utama berada di perangkat |
| RPO | Batas kehilangan data yang dapat diterima |
| RTO | Target waktu pemulihan |

### 21.4 Referensi UI

- `arif-manajemen/docs/contoh_UI_mobile/Screenshot from 2026-10-24 11-31-44.png`
- `...11-32-13.png`
- `...11-32-20.png`
- `...11-32-30.png`
- `...11-32-49.png`
- `...11-33-00.png`

### 21.5 Brand Assets

| Aset | Nilai |
|---|---|
| Nama | StokPlus |
| Tagline | Lebih dari sekadar stok. |
| Monogram | `S+` |
| Warna utama | `#1E2A78` |
| Warna aksen | `#B86B4B` |
| Background | `#F7F5F1` |
| Font | Plus Jakarta Sans |

### 21.6 Persetujuan

| Peran | Nama | Tanggal | Status |
|---|---|---|---|
| Product Owner | | | Menunggu |
| Developer | | | Menunggu |
| QA/UAT | | | Menunggu |

---

**Akhir dokumen.**
