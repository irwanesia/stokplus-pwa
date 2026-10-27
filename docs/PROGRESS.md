# PROGRESS — StokPlus PWA

Catatan progres per fase. Dokumen ini melengkapi `docs/PHASES.md`: `PHASES.md` tetap menjadi sumber status gate, sedangkan dokumen ini merangkum hasil implementasi dan file utama agar mudah ditinjau.

| Item | Nilai |
|---|---|
| Versi dokumen | 1.5 |
| Tanggal | 27 Oktober 2026 |
| Status proyek | Phase 12 — Review (menunggu UAT perangkat dan sign-off) |
| PRD acuan | `docs/PRD.md` v2.1 |
| Versi aplikasi | 1.0.0 |
| Dexie schema | v2 |

---

## Phase 3 — Backup & Restore

**Status:** `Done` — sudah direview product owner pada 25 Oktober 2026.

### Yang sudah masuk

- Backup JSON seluruh 22 tabel domain dengan checksum SHA-256.
- Metadata backup lengkap: app, format, schema, versi aplikasi, tanggal export, cutover date, profile, counts, checksum.
- Enkripsi opsional AES-GCM 256-bit + PBKDF2-SHA256 210.000 iterasi.
- Restore dengan validasi app/schema/checksum/kelengkapan PIN & profil.
- Preview jumlah data sebelum restore.
- Safety backup otomatis + unduh sebelum restore.
- Restore atomik dalam satu transaksi Dexie dan rollback jika gagal.
- Setelah restore, aplikasi terkunci dan memakai PIN dari file backup.
- Reminder backup: belum pernah backup, ≥7 hari, atau ≥50 transaksi.
- Reset data sekarang wajib membuat backup pengaman lebih dulu.
- Restore dari onboarding sudah memakai alur nyata, bukan placeholder Phase 2.
- Halaman Backup dan Restore di Pengaturan, link dari More, dan banner di Dashboard.

### File utama

- `src/backup/codec.ts`
- `src/backup/service.ts`
- `src/stores/backup.ts`
- `src/components/backup/RestoreFlow.vue`
- `src/components/backup/BackupReminderBanner.vue`
- `src/features/settings/BackupSettingsPage.vue`
- `src/features/settings/RestoreSettingsPage.vue`

### Bukti gate

- `npm run check` lulus: lint, typecheck, 18 file unit test (49 test), production build.
- `npm run test:e2e` lulus: 9 test Chromium.
- `npm run format:check` lulus.
- PWA preview: service worker aktif, reload offline berhasil, backup produksi valid, tanpa console error.
- Layout Backup/Restore tidak overflow pada 360px dan 390px.

---

## Phase 4 — Master Data, Multi-Unit, Expiry Settings

**Status:** `Done` — disetujui product owner pada 25 Oktober 2026. Tombol tambah produk sudah diseragamkan menjadi satu tombol di toolbar.

**Tujuan:** Menyediakan master data yang mendukung pembelian/penjualan multi-satuan dan expiry.

### Yang sudah masuk

- Hub Master Data dari tab More dengan ringkasan jumlah dan akses ke semua master.
- CRUD kategori produk dengan kode prefix, pencarian, filter status, dan deaktivasi aman.
- CRUD satuan global dengan nama unik, simbol, pencarian, dan filter status.
- CRUD produk dengan kode otomatis `{KODE_KATEGORI}-{URUT_3_DIGIT}`, kategori, base unit, status, minimum stok, dan track expiry.
- Form satuan produk per baris: konversi integer, harga beli/jual per satuan, bisa dibeli/dijual, default beli/jual, barcode, dan status.
- Opening stock saat membuat produk: validasi qty base integer, expiry wajib untuk produk track expiry, opening lot, movement `opening`, dan update `stock_base`.
- Base unit dan konversi terkunci setelah produk memiliki stok, lot, movement, item pembelian/penjualan, opname, atau write-off.
- Konversi dan qty base wajib bilangan bulat; konversi `0`, pecahan, dan qty base pecahan ditolak.
- Barcode opsional dan unik lintas seluruh `product_units`, termasuk satuan nonaktif.
- Harga beli default base unit dipakai sebagai `unit_cost_base` opening lot.
- CRUD supplier dan pelanggan dengan kode otomatis `SUP-xxx`/`CUST-xxx`, kontak, alamat, catatan, dan status.
- CRUD kategori beban dengan kode otomatis `BB-xxx`, deskripsi, dan status.
- Hapus data terpakai akan menonaktifkan, bukan menghapus. Hapus produk tanpa aktivitas menghapus produk + `product_units`.
- Picker form hanya menampilkan kategori dan satuan aktif; data nonaktif tetap dapat ditampilkan saat mengedit record lama.
- Audit log untuk create, update, delete, deactivate, dan opening stock.
- Route master, link dari More, badge Phase 4, dan versi aplikasi `0.4.0`.
- Schema Dexie tetap `v2` karena tabel master sudah tersedia sejak Phase 2.

### Checklist

- [x] Form produk dengan base unit.
- [x] Tabel/card satuan produk.
- [x] Validasi base unit = konversi 1.
- [x] Validasi konversi integer > 0.
- [x] Validasi qty base integer.
- [x] Harga beli/jual per satuan.
- [x] Default beli/jual.
- [x] Barcode unik.
- [x] Track expiry + alert days.
- [x] Opening lot dengan expiry.
- [x] Base unit lock setelah transaksi.
- [x] CRUD supplier/customer/kategori beban.
- [x] Picker hanya data aktif.

### Demo script

1. [x] Produk Siomay base `pcs`, `pack` 10, `dus` 100 — dijalankan lewat E2E UI.
2. [x] Produk Ayam Fillet base `gram`, `kg` 1000, `pack` 500 — dijalankan lewat unit test repository dengan opening lot.
3. [x] Track expiry 30 hari — E2E UI dan unit test.
4. [x] Opening stock + expiry — E2E UI (25 pcs, expiry 2026-12-31) dan unit test beberapa produk.
5. [x] Base unit setelah opening ditolak — E2E UI (select disabled) dan unit test service.
6. [x] Konversi 0 ditolak — E2E UI dan unit test.
7. [x] Konversi pecahan/qty base pecahan ditolak — unit test.
8. [x] Barcode duplikat ditolak — E2E UI dan unit test.
9. [x] Opening lot terbentuk — unit test lot + movement; E2E memverifikasi stok awal di daftar.
10. [x] Produk track expiry tanpa expiry ditolak — unit test service.

### Test gate

- [x] Konversi 1 dus = 100 pcs.
- [x] Konversi 0,5 kg = 500 gram.
- [x] Konversi pecahan base ditolak.
- [x] Barcode duplikat ditolak.
- [x] Base unit lock bekerja.
- [x] Opening lot terbentuk.
- [x] Produk track expiry tanpa expiry ditolak.
- [x] CRUD master stabil.
- [x] Picker kategori/satuan hanya data aktif.
- [x] Deaktivasi data terpakai mempertahankan histori.

### File utama

- `src/master/validation.ts`
- `src/master/repository.ts`
- `src/master/types.ts`
- `src/stores/master.ts`
- `src/components/master/MasterToolbar.vue`
- `src/components/master/MasterFormSheet.vue`
- `src/components/master/ConfirmActionSheet.vue`
- `src/features/master/MasterHubPage.vue`
- `src/features/master/ProductsPage.vue`
- `src/features/master/ProductFormPage.vue`
- `src/features/master/CategoriesPage.vue`
- `src/features/master/UnitsPage.vue`
- `src/features/master/PartnerResourcePage.vue`
- `src/features/master/SuppliersPage.vue`
- `src/features/master/CustomersPage.vue`
- `src/features/master/ExpenseCategoriesPage.vue`
- `src/router/index.ts`
- `src/features/more/MorePage.vue`
- `src/layouts/AppLayout.vue`
- `tests/unit/master-validation.spec.ts`
- `tests/unit/master-service.spec.ts`
- `tests/e2e/phase4.spec.ts`

### Bukti gate

- `npm run check` lulus: lint, typecheck, **20 file unit test / 64 test**, production build.
- `npm run test:e2e` lulus: **12 test Chromium** (3 test baru Phase 4).
- `npm run format:check` lulus.
- PWA preview produksi `0.4.0`: service worker mengontrol halaman, offline reload berhasil setelah unlock, tanpa console error.
- Layout master hub, daftar produk, form produk, dan satuan tidak overflow pada 360px dan 390px.
- Backup produksi berisi master data: `products: 3`, `units: 4`, `product_units: 7`, schema `2`, appVersion `0.4.0`, checksum 64 karakter. Sample data Phase 5 menambah satuan `Dus` dan satu konversi Siomay, sehingga data contoh terbaru berisi `units: 5` dan `product_units: 8`.
- Chromium: form produk multi-unit, konversi `0`, barcode duplikat, base lock, picker aktif, dan CRUD master lulus.

**Catatan:** Demo Ayam Fillet dijalankan lewat repository test (bukan klik UI) karena aturan konversi dan opening lot sudah tercakup oleh test; alur UI multi-unit diverifikasi dengan Siomay. Demo UI Ayam Fillet terpisah dapat ditambahkan bila diminta.

---

## Phase 5 — Pembelian, Lot, Expiry, HPP, Kamus Istilah

**Status:** `Done` — disetujui product owner pada 25 Oktober 2026.

**Tujuan:** Mencatat pembelian yang menghasilkan lot dengan expiry dan HPP per base unit.

### Yang sudah masuk

- Hub Transaksi dengan pintasan Pembelian dan status Phase 6/7.
- Daftar pembelian dengan pencarian nomor/supplier, filter status, dan satu tombol tambah di toolbar.
- Form pembelian: supplier aktif, tanggal, metode bayar, keterangan, multi-item, dan nomor nota otomatis `PB-YYYYMMDD-0001`.
- Item pembelian: seluruh produk aktif tampil di picker; satuan beli mengikuti `can_purchase`, qty unit → qty base integer, harga per satuan, diskon item, expiry wajib untuk `track_expiry`, dan lot code otomatis/manual. Produk tanpa satuan beli tetap tampil dengan label dan peringatan.
- Satuan base produk baru otomatis `can_purchase`; produk lama tanpa satuan beli diarahkan ke Master Produk.
- Input angka memilih seluruh nilai saat fokus agar angka `0` langsung terganti.
- Ringkasan: subtotal, diskon header, biaya angkut, total, jumlah bayar, dan tombol “Sesuai total”.
- Simpan draft tanpa membuat lot/movement dan tanpa mengubah stok.
- Selesaikan pembelian: buat satu lot per item, simpan `unit_cost_base` 4 desimal, movement `purchase_in`, update `products.stock_base` dalam satu transaksi Dexie.
- Alokasi diskon header dan biaya angkut proporsional terhadap subtotal item.
- Detail pembelian: status, supplier, total, item, lot, expiry, HPP per base, sisa lot, dan qty terpakai.
- Edit/hapus draft; pembelian selesai tidak bisa diedit.
- Pembatalan pembelian selesai: guard lot utuh dan belum dikonsumsi; movement `purchase_cancel`; lot menjadi `depleted`; stok dikembalikan.
- Audit untuk create/update/complete/cancel/delete pembelian.
- Sample data ditambah satuan `Dus` dan Siomay `dus = 100 pcs` untuk demo.
- Kamus Istilah di menu Lainnya dengan pencarian untuk lot, base unit, expiry, HPP, FEFO, FIFO, dan istilah operasional terkait.

### Checklist

- [x] Form header + item.
- [x] Satuan beli per item.
- [x] Qty unit → qty base.
- [x] Expiry wajib jika track.
- [x] Lot code auto/manual.
- [x] Diskon item/header.
- [x] Biaya angkut.
- [x] Alokasi diskon/angkut.
- [x] `unit_cost_base` 4 desimal.
- [x] Buat lot saat complete.
- [x] Movement + stock update atomik.
- [x] Cancel guard lot utuh.
- [x] Detail menampilkan lot/expiry/HPP.
- [x] Draft tidak mengubah stok.
- [x] Kamus Istilah dapat dibuka dari menu Lainnya dan dicari.

### File utama

- `src/purchases/types.ts`
- `src/purchases/validation.ts`
- `src/purchases/repository.ts`
- `src/stores/purchases.ts`
- `src/features/purchases/PurchasesPage.vue`
- `src/features/purchases/PurchaseFormPage.vue`
- `src/features/purchases/PurchaseDetailPage.vue`
- `src/features/transactions/TransactionsPage.vue`
- `src/features/dashboard/DashboardPage.vue`
- `src/features/more/MorePage.vue`
- `src/features/more/GlossaryPage.vue`
- `src/db/sampleData.ts`
- `src/router/index.ts`
- `tests/unit/purchase-validation.spec.ts`
- `tests/unit/purchase-service.spec.ts`
- `tests/e2e/phase5.spec.ts`

### Demo script

1. [x] Buat pembelian Siomay 2 dus, expiry 12/12/2026 — E2E UI.
2. [x] Isi diskon header `10.000` + biaya angkut `5.000` — E2E UI.
3. [x] Selesaikan → lot 200 pcs, HPP `Rp 1.475` per pcs — E2E UI + unit test.
4. [x] Buka detail → lot, expiry, HPP, sisa lot — E2E UI.
5. [x] Coba batalkan setelah lot dikonsumsi (fixture/test) → ditolak — E2E + unit test.
6. [x] Batalkan pembelian yang lot-nya utuh → berhasil — E2E UI + unit test.
7. [x] Buka Lainnya → Kamus Istilah, lalu cari “lot” atau “HPP”.

### Test gate

- [x] Qty base benar.
- [x] Lot terbentuk.
- [x] Expiry tersimpan.
- [x] HPP per base benar.
- [x] Diskon/angkut teralokasi.
- [x] Cancel guard bekerja.
- [x] Movement benar.
- [x] Draft tidak mengubah stok.
- [x] Transaksi atomik.
- [x] Lot code duplikat per produk ditolak.
- [x] Qty base pecahan ditolak.
- [x] Kamus istilah dapat dibuka dan hasilnya dapat dicari.

### Bukti gate

- `npm run check` lulus: lint, typecheck, **22 file unit test / 76 test**, production build `0.5.0`.
- `npm run test:e2e` lulus: **16 test Chromium** (4 test baru Phase 5).
- `npm run format:check` lulus.
- E2E memverifikasi total `Rp 295.000`, HPP `Rp 1.475`, lot `LOT-PB-...-1`, expiry, sisa lot `200 pcs`, pembatalan lot utuh, draft tanpa stok, picker produk lengkap, input angka, dan penolakan batal setelah lot dikonsumsi.
- Unit test memverifikasi alokasi dua item, HPP 4 desimal, guard konsumsi lot, movement `purchase_in`/`purchase_cancel`, expiry wajib, qty base pecahan, lot code duplikat, dan penolakan batch tanpa penulisan parsial.
- Layout form pembelian dan detail tidak overflow pada 360px dan 390px.
- Kamus Istilah tersedia di `/lainnya/kamus-istilah` dan menjelaskan istilah operasional yang muncul di aplikasi.
- Schema tetap **v2**; versi aplikasi naik ke **0.5.0**.

---

## Phase 6 — Penjualan, FEFO, COGS

**Status:** `Done` — disetujui product owner 26 Oktober 2026.

### Yang sudah masuk

- Penjualan draft/selesai/batal dengan nomor nota otomatis dan pembayaran tunai/kredit.
- Item multi-satuan dengan konversi ke qty base dan validasi stok non-expired.
- Alokasi lot FEFO (expiry terdekat) dengan fallback FIFO untuk produk tanpa expiry.
- `sale_lot_consumptions`, COGS per item, HPP total, laba kotor, dan restore lot saat pembatalan.
- Peringatan stok kurang pada draft dan penolakan penyelesaian jika stok tidak cukup.
- Kamus istilah dapat dicari dan menjelaskan FEFO, COGS, HPP, laba kotor, dan lot.
- Schema tetap v2; versi aplikasi `0.6.0`.

### File utama

- `src/sales/validation.ts`
- `src/sales/repository.ts`
- `src/stores/sales.ts`
- `src/features/sales/SalesPage.vue`
- `src/features/sales/SaleFormPage.vue`
- `src/features/sales/SaleDetailPage.vue`
- `src/features/more/GlossaryPage.vue`
- `tests/unit/sale-validation.spec.ts`
- `tests/unit/sale-service.spec.ts`
- `tests/e2e/phase6.spec.ts`

### Bukti gate

- Unit test memverifikasi FEFO, COGS, pembayaran, stok kurang, dan restore stok/lot saat cancel.
- E2E memverifikasi konsumsi lot expiry terdekat, laba kotor, penolakan over-stock, dan kamus istilah.
- Gate disetujui; Phase 7 dimulai.

---

## Phase 7 — Beban & Pemisahan P&L

**Status:** `Done` — disetujui product owner 26 Oktober 2026.

### Yang sudah masuk

- Beban operasional draft/completed/cancelled dengan kategori beban, nominal, tanggal, dan catatan.
- Hanya beban completed yang masuk laporan; draft dan cancelled dikecualikan.
- Pemisahan HPP (COGS) dari beban operasional pada laporan laba/rugi.
- Laporan beban per kategori dan rekonsiliasi laba bersih.
- Integrasi kerugian persediaan dari write-off/opname pada P&L.
- Audit log dan versi aplikasi `0.7.0`.

### File utama

- `src/expenses/`
- `src/stores/expenses.ts`
- `src/features/expenses/`
- `src/reports/`
- `tests/unit/expense-service.spec.ts`
- `tests/e2e/phase7.spec.ts`

### Bukti gate

- E2E memverifikasi pemisahan beban dari COGS, pengecualian draft/cancelled, dan laba bersih.
- Unit test memverifikasi lifecycle beban, kategori, dan formula P&L.
- Gate disetujui; Phase 8 dimulai.

---

## Phase 8 — Stok, Expiry, Write-Off, Opname

**Status:** `Done` — disetujui product owner 26 Oktober 2026.

### Yang sudah masuk

- Halaman stok dengan qty, nilai persediaan, dan status expiry.
- Kartu stok/mutasi per produk.
- Write-off lot expired dengan kerugian persediaan dan movement.
- Opname surplus/shortage; shortage mengonsumsi lot FEFO.
- Pemeriksaan konsistensi stok sistem vs total lot.
- Integrasi kerugian persediaan ke laporan P&L.
- Alert expiry dan filter stok menipis/expired.
- Versi aplikasi `0.8.0`.

### File utama

- `src/stock/`
- `src/stores/stock.ts`
- `src/features/stock/`
- `src/features/stock/StocktakePage.vue`
- `tests/unit/stock-service.spec.ts`
- `tests/e2e/phase8.spec.ts`

### Bukti gate

- E2E memverifikasi write-off, opname shortage/surplus, biaya lot, dan dampak P&L.
- Unit test memverifikasi ledger, konsistensi stok, dan alokasi FEFO.
- Gate disetujui; Phase 9 dimulai.

---

## Phase 9 — Dashboard & Expiry Alert

**Status:** `Done` — disetujui product owner 26 Oktober 2026.

### Yang sudah masuk

- KPI dashboard: penjualan, laba kotor/bersih, beban, nilai stok, dan transaksi.
- Filter periode satu baris yang dapat digeser horizontal.
- Grafik tren penjualan/laba dan ringkasan aktivitas.
- Alert expiry dan stok menipis dengan tautan ke daftar terfilter.
- Status backup, pengingat backup, dan empty state.
- Layout mobile 360–430 px tanpa overflow.
- Versi aplikasi `0.9.0`.

### File utama

- `src/features/dashboard/DashboardPage.vue`
- `src/components/dashboard/`
- `src/stores/dashboard.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/e2e/phase9.spec.ts`

### Bukti gate

- E2E memverifikasi KPI, filter periode, tautan stok/aktivitas, dan viewport mobile.
- Unit test memverifikasi agregasi KPI dan filter tanggal.
- Gate disetujui; Phase 10 dimulai.

---

## Phase 10 — Laporan & Export

**Status:** `Done` — disetujui product owner 27 Oktober 2026.

### Yang sudah masuk

- Enam laporan: penjualan (+HPP/laba kotor), pembelian (+angkut), stok (+lot/expiry/nilai), beban, expiry (+write-off), dan laba/rugi.
- Filter hari ini, minggu ini, bulan ini, tahun ini, dan rentang kustom.
- Export Excel (`.xlsx`) untuk keenam laporan dan layout print.
- Empty state, validasi rentang tanggal, dan rekonsiliasi total.
- Label HPP estimasi historis berdasarkan cutover date.
- Exporter dimuat sebagai dynamic chunk.
- Versi aplikasi `0.10.0`.

### File utama

- `src/reports/`
- `src/features/reports/`
- `src/stores/reports.ts`
- `tests/unit/report-*.spec.ts`
- `tests/e2e/phase10.spec.ts`

### Bukti gate

- `npm run check` lulus: 29 file / 106 unit test dan production build.
- `npm run test:e2e -- --workers=1` lulus: 25 test Chromium.
- E2E memverifikasi enam laporan, export, print, empty state, dan periode invalid.
- Gate disetujui; Phase 11 dimulai.

---

## Phase 11 — Migrasi Laravel & Opening Lot

**Status:** `Done` — gate aplikasi lulus 27 Oktober 2026; migrasi database Laravel aktual dikecualikan atas keputusan product owner.

### Yang sudah masuk

- Perintah Laravel `php artisan stokplus:export-json` dengan guard PHP 8.3.36+, konfirmasi backup, dan penolakan transaksi draft.
- Import wizard StokPlus: validasi metadata/tabel/relasi/status/pembayaran/tanggal, preview, cutover date, dan rollback atomik.
- Mapping UUID v5 deterministik + `legacy_id` untuk master dan transaksi.
- Opening lot dari stok sumber, expiry wizard, dan quarantine produk track-expiry tanpa expiry.
- HPP historis weighted average dengan fallback dan label estimasi.
- Rekonsiliasi stok per produk, laporan hasil migrasi, audit log, dan safety backup sebelum import.
- Sample fixture sesuai format export Laravel.
- Versi aplikasi `0.11.0`.

### File utama

- `app/Console/Commands/ExportStokPlusJson.php`
- `src/migration/`
- `src/features/migration/`
- `src/stores/migration.ts`
- `tests/fixtures/laravel-export.json`
- `tests/unit/migration-*.spec.ts`
- `tests/e2e/phase11.spec.ts`

### Bukti gate

- `npm run check` lulus: 30 file / 111 unit test dan production build.
- `npm run test:e2e -- --workers=1` lulus: 27 test Chromium.
- `php -l` perintah export lulus; runtime lokal PHP 8.3.6 sengaja ditolak karena mensyaratkan 8.3.36+.
- Unit test memverifikasi UUID deterministik, rekonsiliasi, weighted-average HPP, kredit historis, expiry/quarantine, audit, dan rollback atomik.
- Migrasi database Laravel aktual dikecualikan; alur import diuji dengan fixture.

---

## Phase 12 — PWA Polish, UAT, Release

**Status:** `Review` — implementasi, otomasi, dan Lighthouse selesai; UAT perangkat, deploy, dan sign-off menunggu.

### Yang sudah masuk

- Manifest StokPlus `standalone`, ikon 192/512/maskable/apple-touch, shortcut Penjualan/Pembelian.
- Service worker Workbox dengan precache app shell, cleanup cache lama, dan update prompt.
- Registrasi service worker manual via `virtual:pwa-register`; prompt update dan banner offline.
- Banner mode offline, notifikasi siap offline, dan halaman **Aplikasi & offline**.
- Panduan pengguna di `/lainnya/panduan` dan `docs/USER-GUIDE.md`.
- UAT runner 15 skenario + skor + sign-off di `/lainnya/uat`, tersimpan di `localStorage`.
- Route lazy-load kecuali Dashboard; chunk utama turun ke ±140 kB.
- Accessibility: kontras teks, target sentuh, focus trap bottom sheet, skip link, safe area, reduced motion.
- `public/_redirects` dan `public/_headers` untuk Cloudflare Pages/Netlify.
- `scripts/check-pwa.mjs` memvalidasi manifest, ikon, service worker, dan artefak deploy.
- E2E produksi khusus PWA: manifest, ikon, service worker, reload offline, dan transaksi offline.
- Dokumentasi `docs/UAT.md`, `docs/USER-GUIDE.md`, `docs/DEPLOY.md`, dan `docs/RELEASE.md`.
- Versi aplikasi `1.0.0`; schema Dexie tetap v2.

### File utama

- `src/stores/pwa.ts`
- `src/components/pwa/PwaUpdatePrompt.vue`
- `src/features/settings/PwaSettingsPage.vue`
- `src/features/release/UatPage.vue`
- `src/features/release/UserGuidePage.vue`
- `src/features/release/uat.ts`
- `src/main.ts`
- `vite.config.ts`
- `scripts/check-pwa.mjs`
- `tests/unit/pwa-store.spec.ts`
- `tests/unit/uat.spec.ts`
- `tests/e2e/phase12.spec.ts`
- `tests/e2e-pwa/phase12.spec.ts`
- `playwright.pwa.config.ts`
- `public/_redirects`
- `public/_headers`
- `docs/RELEASE.md`

### Bukti otomasi

- `npm run check` lulus: 32 file / 121 unit test, production build, dan PWA check.
- `npm run test:e2e -- --workers=1` lulus: 30 test Chromium.
- `npm run test:e2e:pwa` lulus: manifest, ikon, service worker aktif, reload offline, dan transaksi offline.
- `npm run format:check` lulus.
- `npm run build` menghasilkan chunk utama 140,25 kB (gzip 42,88 kB).
- Lighthouse 13.5.0 mobile: Performance **96**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 2,1 s, LCP 2,3 s, TBT 20 ms, CLS 0.
- Audit pertama menemukan `aria-label` tanpa role pada progres onboarding dan loading form produk; keduanya diperbaiki dengan `role="group"`, lalu Accessibility naik dari 95 ke 100.
- UAT perangkat, install Android/iOS, matriks perangkat, deploy produksi, dan sign-off masih menunggu.

### Masih menunggu

- Install Android Chrome dan iPhone Safari.
- UAT 15 skenario di perangkat nyata dan sign-off.
- Matriks perangkat dan screenshot.
- Lighthouse performance ≥ 85.
- Update prompt dengan dua deployment nyata.
- Deploy ke domain HTTPS.
- Backup/restore final dan migrasi dry run final (bila data Laravel tersedia).
