# StokPlus PWA

**StokPlus — Lebih dari sekadar stok.**

PWA local-first untuk usaha frozen food: stok, penjualan, pembelian, beban operasional, expiry, dan laporan. Satu HP, satu pengguna, tanpa server dan tanpa sinkronisasi multi-device pada MVP.

> **Status:** Phase 12 — PWA polish, UAT, dan release. Versi aplikasi **1.0.0**.
>
> Phase 0–11 sudah `Done`. Phase 12 sudah diimplementasikan dan otomasi lulus; UAT perangkat, deploy produksi, dan sign-off product owner masih menunggu.

---

## Scope Saat Ini

Sudah ada:

- Vue 3 + Vite + TypeScript.
- Tailwind CSS 4 + DaisyUI 5 dengan tema StokPlus.
- Vue Router + Pinia dengan 5 tab bottom nav.
- Layout mobile 360–430 px dengan app bar dan bottom nav.
- UI primitives: Button, Card, BottomSheet, NumericKeypad, PinPad, StatusChip, EmptyState, Toast.
- Dexie schema domain **v2** lengkap dan migrasi dari skeleton v1.
- Onboarding 3 langkah: mulai baru, profil usaha, PIN.
- Restore backup dari onboarding dan halaman Pengaturan.
- PIN 6 digit dengan PBKDF2-SHA256 + salt, disimpan lokal.
- Lock screen, auto-lock 1/5/15 menit, dan kunci manual.
- Profil usaha tanpa field logo.
- Settings: prefix transaksi, preview counter, default expiry, cutover date, keamanan, storage, tentang.
- Persistent storage request dan informasi pemakaian storage.
- Sample data opsional untuk demo.
- Audit log dasar (maksimal 1.000 entri) untuk setup, perubahan profil/pengaturan, PIN, sample data, reset, backup, dan restore.
- Backup JSON seluruh tabel domain dengan checksum SHA-256.
- Enkripsi backup opsional AES-GCM + PBKDF2 dengan passphrase.
- Restore tervalidasi, preview jumlah data, safety backup otomatis, transaksi atomik, dan rollback.
- Pengingat backup setelah 7 hari atau 50 transaksi.
- Reset data wajib membuat backup pengaman terlebih dahulu.
- Master data: kategori produk, satuan global, produk, supplier, pelanggan, dan kategori beban.
- Produk multi-unit: base unit, konversi integer, harga beli/jual per satuan, default beli/jual, dan barcode unik.
- Opening stock + opening lot + expiry saat membuat produk.
- Base unit dan konversi terkunci setelah produk memiliki stok, lot, atau transaksi.
- Data master yang sudah dipakai transaksi dinonaktifkan, bukan dihapus.
- Pembelian draft/selesai/batal dengan nomor nota otomatis.
- Item pembelian multi-satuan, diskon item, expiry, dan lot code auto/manual.
- Diskon header dan biaya angkut dialokasikan proporsional ke HPP lot.
- Lot + expiry + `unit_cost_base` 4 desimal dibuat saat pembelian selesai.
- Mutasi `purchase_in`/`purchase_cancel` dan update stok atomik.
- Detail pembelian dengan lot, expiry, HPP, dan sisa lot.
- Pembatalan pembelian hanya jika semua lot masih utuh dan belum dikonsumsi.
- Vitest + Vue Test Utils + `fake-indexeddb`.
- Playwright E2E, termasuk regresi fase 1–12.
- ESLint + Prettier.
- PWA manifest, ikon `192/512/maskable/apple-touch`, service worker, dan update prompt.
- Halaman **Aplikasi & offline** untuk install Android/iOS/desktop, status service worker, dan cek pembaruan.
- Banner mode offline dan notifikasi siap offline.
- Panduan pengguna di dalam aplikasi dan `docs/USER-GUIDE.md`.
- UAT runner 15 skenario + sign-off di `/lainnya/uat` dan `docs/UAT.md`.
- Deploy statis Cloudflare Pages/Netlify dengan `_redirects` dan `_headers`.
- Dokumentasi rilis dan rollback.
- Dokumentasi developer.

Belum ada dan memang ditunda:

- Barcode scanner, cloud backup, multi-user, dan sinkronisasi.
- Retur pembelian, pilih lot manual, average cost, tiered pricing.
- Cetak struk Bluetooth, multi-gudang, dark mode, push notification expiry.
- Transfer stok dan rekonstruksi lot historis.

---

## Requirements

- Node.js `>=22.12.0` (disarankan Node 24, lihat `.nvmrc`).
- npm.
- Browser Chromium untuk E2E Playwright.

```bash
nvm use
npm install
npx playwright install chromium
```

---

## Commands

| Command                   | Fungsi                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`             | Jalankan dev server Vite.                                              |
| `npm run build`           | Typecheck lalu build produksi + service worker.                        |
| `npm run preview`         | Preview build produksi di port 4173.                                   |
| `npm run lint`            | ESLint.                                                                |
| `npm run lint:fix`        | ESLint dengan auto-fix.                                                |
| `npm run format`          | Prettier.                                                              |
| `npm run format:check`    | Cek format tanpa menulis.                                              |
| `npm run typecheck`       | `vue-tsc` untuk app dan config.                                        |
| `npm run test:unit`       | Unit test Vitest.                                                      |
| `npm run test:unit:watch` | Unit test mode watch.                                                  |
| `npm run test:e2e`        | Playwright E2E (menjalankan dev server otomatis).                      |
| `npm run test:e2e:pwa`    | E2E produksi: manifest, service worker, offline, transaksi offline.    |
| `npm run test:e2e:all`    | Semua E2E dev + produksi PWA.                                          |
| `npm run check:pwa`       | Validasi manifest, ikon, `_redirects`, `_headers`, dan service worker. |
| `npm run release:check`   | `check` + seluruh E2E.                                                 |
| `npm run check`           | Lint + typecheck + unit test + build + PWA check.                      |

---

## Struktur

```text
src/
├── assets/main.css              # Tailwind, DaisyUI theme, design tokens
├── backup/
│   ├── codec.ts                 # Checksum, validasi, enkripsi, format file
│   ├── service.ts               # Export, restore, safety backup, reminder
│   └── types.ts                 # Tipe metadata dan hasil backup
├── components/
│   ├── backup/                  # Reminder banner + alur restore
│   ├── domain/                  # Template halaman placeholder
│   ├── forms/                   # Form field
│   ├── master/                  # Toolbar, form sheet, konfirmasi hapus
│   ├── navigation/              # Bottom nav + page header
│   ├── session/                 # Session gate (loading/onboarding/lock/app)
│   └── ui/                      # UI primitives
├── composables/useAutoLock.ts   # Timer auto-lock berbasis aktivitas
├── db/
│   ├── dexie.ts                 # Dexie instance + version(1)/version(2)
│   ├── schema.ts                # Tipe domain + index Dexie
│   ├── migrations.ts            # Upgrade v1 → v2
│   ├── settings.ts              # Default dan repository settings
│   ├── audit.ts                 # Audit log + pruning
│   └── sampleData.ts            # Sample data master
├── features/
│   ├── dashboard/               # Status + pengingat backup
│   ├── lock/                    # Lock screen
│   ├── master/                  # Produk, kategori, satuan, supplier, pelanggan, beban
│   ├── onboarding/              # Onboarding 3 langkah + restore
│   ├── purchases/               # Daftar, form, dan detail pembelian
│   ├── settings/                # Profil, keamanan, backup, restore, storage, tentang
│   └── ...                      # Placeholder tab lain
├── layouts/AppLayout.vue        # App bar, main, bottom nav
├── master/
│   ├── repository.ts            # CRUD, validasi relasi, opening lot, audit
│   ├── types.ts                 # Draft form dan hasil aktivitas produk
│   └── validation.ts            # Konversi, kode, barcode, expiry, baris satuan
├── purchases/
│   ├── repository.ts            # Draft, complete, cancel, lot, movement, HPP
│   ├── types.ts                 # Draft/form dan detail pembelian
│   └── validation.ts            # Totals, alokasi biaya, validasi item/header
├── router/index.ts              # 5 tab + master data + pembelian + pengaturan
├── stores/
│   ├── backup.ts                # Orkestrasi backup, restore, reminder
│   ├── master.ts                # State master, picker aktif, mutasi
│   ├── purchases.ts             # State daftar dan aksi pembelian
│   ├── session.ts               # Onboarding, PIN, settings, reset
│   └── ui.ts                    # Toast state
├── utils/                       # PIN, ID, tanggal, penomoran, format, storage, base64, download
├── config.ts                    # Versi aplikasi
├── App.vue
└── main.ts
tests/
├── unit/                        # Vitest
├── e2e/                         # Playwright
└── setup.ts                     # fake-indexeddb
```

---

## Data Layer

Database: `stokplus` (IndexedDB via Dexie).

- `version(1)` — skeleton Phase 1: `app_meta`.
- `version(2)` — schema domain lengkap sesuai PRD 9.3.
- `app_meta` dipertahankan sebagai tabel internal metadata teknis.
- Setiap perubahan schema wajib menambah versi baru dan migration, bukan mengubah versi lama.
- `schema_version` juga disimpan di tabel `settings` dan ditampilkan di Tentang.

Tabel domain v2:

| Kelompok  | Tabel                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Identitas | `business_profile`, `settings`                                                                             |
| Master    | `product_categories`, `units`, `products`, `product_units`, `suppliers`, `customers`, `expense_categories` |
| Pembelian | `purchases`, `purchase_items`                                                                              |
| Penjualan | `sales`, `sale_items`, `sale_lot_consumptions`                                                             |
| Stok      | `stock_lots`, `stock_movements`                                                                            |
| Opname    | `stock_opnames`, `stock_opname_items`                                                                      |
| Write-off | `stock_writeoffs`, `stock_writeoff_items`                                                                  |
| Beban     | `expenses`                                                                                                 |
| Audit     | `audit_logs`                                                                                               |

Index penting:

- FEFO: `stock_lots` → `[product_id+expiry_date]`.
- Lot status: `stock_lots` → `[product_id+status]`.
- Konsumsi lot: `sale_lot_consumptions` → `[lot_id+created_at]`.
- Movement: `stock_movements` → `[product_id+tanggal]`, `[ref_type+ref_id]`.

Primary key memakai UUID v7. Uang disimpan sebagai integer rupiah; unit cost desimal 4 angka; qty base integer; qty unit desimal 3 angka.

---

## Master Data & Multi-Unit

- Base unit adalah satuan terkecil dan wajib memiliki konversi `1`.
- Konversi satuan lain wajib bilangan bulat `> 0`; qty base dari hasil konversi juga wajib bilangan bulat.
- Setiap produk menyimpan `product_units` untuk harga beli/jual per satuan, default beli/jual, status aktif, dan barcode.
- Barcode opsional, tetapi jika diisi harus unik di seluruh produk (termasuk satuan nonaktif).
- Kode produk otomatis memakai format `{KODE_KATEGORI}-{URUT_3_DIGIT}`, misalnya `FRZ-001`, dan tetap dapat diedit selama unik.
- Produk `track_expiry` memakai alert default dari Settings (30 hari) dan dapat dioverride per produk.
- Saat produk dibuat dengan stok awal, sistem membuat satu `opening` lot dan movement `opening`. Expiry wajib jika produk track expiry dan stok awal `> 0`.
- Base unit dan faktor konversi terkunci setelah produk memiliki lot, movement, item pembelian/penjualan, opname, atau write-off.
- Satuan produk yang sudah dipakai transaksi tidak dapat dihapus; nonaktifkan satuannya.
- Kategori, satuan, supplier, pelanggan, dan kategori beban yang sudah dipakai akan dinonaktifkan, bukan dihapus.
- Picker untuk data baru hanya menampilkan master berstatus aktif. Data nonaktif tetap ditampilkan saat mengedit record lama agar histori tidak rusak.
- Harga beli default base unit dipakai sebagai `unit_cost_base` opening lot. HPP historis tetap ditandai estimasi pada migrasi.
- Stok tidak diubah dari form edit produk; perubahan stok melalui opening stock atau pembelian selesai.
- Schema tetap **v2** karena seluruh tabel master sudah ada sejak Phase 2. Versi aplikasi naik ke **0.5.0**.

---

## Pembelian, Lot, Expiry, HPP

- Nomor pembelian otomatis: `{prefix_purchase}-YYYYMMDD-0001`, dapat diubah di Settings.
- Supplier dan produk baru wajib aktif; picker transaksi hanya menampilkan data aktif.
- Picker pembelian menampilkan seluruh produk aktif. Produk tanpa satuan `can_purchase` diberi label dan peringatan; satuan base produk baru otomatis bisa dibeli.
- Satuan beli mengikuti `product_units.can_purchase`; qty unit boleh 3 desimal, tetapi qty base hasil konversi wajib bilangan bulat.
- Expiry wajib jika produk `track_expiry`; lot code opsional dan otomatis memakai `LOT-{nomor_nota}-{baris}`.
- Diskon item mengurangi subtotal item. Diskon header dan biaya angkut dialokasikan proporsional terhadap subtotal item.
- `unit_cost_base` = nilai lot setelah diskon header + biaya angkut, dibagi qty base, disimpan 4 desimal.
- Draft hanya menyimpan header/item; belum ada lot, movement, atau perubahan stok.
- Selesaikan pembelian membuat satu lot per item, movement `purchase_in`, dan menambah `products.stock_base` dalam satu transaksi Dexie.
- Pembelian selesai tidak bisa diedit. Draft masih bisa diedit atau dihapus.
- Pembatalan hanya berhasil jika semua lot masih utuh, belum dikonsumsi penjualan/write-off, dan stok cukup. Lot ditandai `depleted`, movement `purchase_cancel` dicatat, dan status pembelian menjadi `cancelled`.
- Detail menampilkan lot, expiry, HPP per base, sisa lot, dan qty terpakai.
- Input angka memilih seluruh nilai saat fokus agar angka `0` langsung terganti saat mengetik.
- Uang disimpan integer rupiah; HPP per base disimpan hingga 4 desimal.

---

## Backup & Restore

- File: `stokplus-backup-YYYYMMDD-HHmm.json` (zona Asia/Jakarta).
- Metadata: `app`, `format`, `formatVersion`, `schemaVersion`, `appVersion`, `exportedAt`, `cutoverDate`, `businessProfile`, `tables`, `counts`, `checksum`.
- `tables` memuat seluruh 22 tabel domain, termasuk `product_units`, `stock_lots`, `sale_lot_consumptions`, `stock_writeoffs`, dan `stock_writeoff_items`.
- `app_meta` adalah metadata teknis internal dan tidak ikut backup/restore.
- Checksum SHA-256 dihitung dari canonical JSON tanpa field `checksum`.
- Enkripsi opsional: envelope JSON dengan ciphertext AES-GCM 256-bit; kunci dari PBKDF2-SHA256 210.000 iterasi, salt 16 byte, IV 12 byte. Passphrase tidak disimpan.
- File backup berisi data usaha dan PIN hash, bukan PIN asli. Simpan file di tempat aman.
- Restore memvalidasi app, schema, struktur tabel, jumlah baris, kelengkapan profil/PIN, dan checksum sebelum menampilkan preview.
- Restore mengganti seluruh data dalam satu transaksi Dexie. Jika gagal, data lama dipulihkan dari safety backup.
- Safety backup dibuat dan diunduh otomatis sebelum restore bila sudah ada profil. File safety memakai prefix `stokplus-safety-backup-`.
- Setelah restore, aplikasi dikunci dan PIN mengikuti file backup.
- Reset data wajib membuat backup pengaman di dialog reset sebelum tombol reset aktif.
- Pengingat muncul jika belum pernah backup, backup terakhir ≥ 7 hari, atau ≥ 50 transaksi selesai sejak backup terakhir.

---

## Keamanan Lokal

- PIN 6 digit di-hash dengan **PBKDF2-SHA256**, salt acak 16 byte, 210.000 iterasi.
- `pin_hash`, `pin_salt`, dan `pin_iterations` disimpan di tabel `settings`.
- PIN tidak dapat dipulihkan. Jika lupa, satu-satunya jalan adalah menghapus data situs/reset aplikasi.
- Aplikasi selalu meminta PIN setelah restart.
- Auto-lock default 5 menit; opsi 1/5/15 menit atau tidak pernah.
- Reset data memakai konfirmasi ketik `HAPUS` dan wajib membuat backup pengaman terlebih dahulu.

---

## Design System

Tema berada di `src/assets/main.css` (Tailwind 4 CSS-first, tanpa `tailwind.config.ts`).

| Token          | Nilai             |
| -------------- | ----------------- |
| Navy           | `#1E2A78`         |
| Copper         | `#B86B4B`         |
| Off-white      | `#F7F5F1`         |
| Font           | Plus Jakarta Sans |
| Card radius    | `1.5rem`          |
| Control radius | `0.875rem`        |

Prinsip UI:

- Angka besar dan mudah dibaca.
- Kartu sebagai unit informasi utama.
- Bottom sheet untuk form/filter/konfirmasi.
- Numeric keypad untuk input uang, qty, dan PIN.
- Bottom nav 5 tab, target sentuh minimal 44 px.
- Tidak ada horizontal scroll pada 360 px.

---

## PWA

- Manifest: `StokPlus`, `standalone`, portrait, tema navy.
- Ikon 192, 512, maskable 512, dan apple-touch 180.
- Service worker dibuat saat `npm run build`.
- Mode update: `prompt` (UI update prompt masuk Phase 12).
- Service worker dimatikan di dev; gunakan `npm run preview` untuk menguji PWA/offline.

Uji cepat setelah build:

```bash
npm run build
npm run preview
```

Buka `http://127.0.0.1:4173`, pastikan service worker aktif, lalu coba reload dengan mode offline.

---

## Testing

Unit test mencakup:

- Schema v2, index FEFO/lot, dan migrasi v1 → v2.
- PIN hash/salt, validasi 6 digit, dan verifikasi.
- Session store: onboarding, restart → lock, PIN benar/salah, ganti PIN.
- Auto-lock dan reset timer.
- Settings repository, sample data, audit log, numbering, storage.
- Backup codec: canonical checksum, wrong schema/app, corrupt checksum, encryption roundtrip, wrong passphrase.
- Backup service: seluruh tabel domain, lot/expiry/konsumsi/write-off, safety backup, rollback, metadata backup terakhir.
- Reminder: belum pernah backup, backup baru, 7 hari, dan 50 transaksi.
- UI: Button, NumericKeypad, PinPad, BottomSheet, toast.
- Master validation: konversi integer/base, kode otomatis, default beli/jual, base row, dan barcode.
- Master repository: produk multi-unit, opening lot + movement, code sequence, expiry wajib, barcode unik, base/conversion lock, dan deaktivasi data terpakai.
- Purchase validation: totals, alokasi diskon/angkut proporsional, HPP 4 desimal, qty/expiry/diskon.
- Purchase repository: draft tanpa stok, lot + expiry + HPP, movement `purchase_in`, cancel utuh, guard lot terpakai, lot code duplikat, dan qty base pecahan.

E2E mencakup:

- Onboarding validasi nama dan PIN.
- PIN mismatch, lock setelah reload, PIN salah/benar.
- Settings auto-lock, profil tanpa logo, storage, schema v2 di Tentang.
- Sample data dan audit log.
- Auto-lock dengan timer dipercepat.
- Navigasi 5 tab, bottom sheet, toast.
- Tidak ada horizontal overflow di 360 px.
- Tidak ada console error / page error.
- Backup/restore dengan safety backup.
- File rusak dan schema salah ditolak tanpa mengubah data.
- Reset wajib backup lalu restore dari onboarding.
- Enkripsi backup dan passphrase salah ditolak.
- Halaman Backup/Restore tidak overflow di 360/390 px.
- Produk Siomay multi-unit (`pcs`/`pack`/`dus`) + opening stock + expiry + base lock.
- Konversi `0` dan barcode duplikat ditolak.
- CRUD supplier, pelanggan, dan kategori beban dengan kode otomatis.
- Picker produk hanya menampilkan kategori/satuan aktif.
- Form produk dan daftar master tidak overflow di 360/390 px.
- Pembelian Siomay 2 dus, expiry, diskon header, biaya angkut, total, lot 200 pcs, HPP per pcs, dan detail lot.
- Draft pembelian tidak mengubah stok dan belum membuat lot.
- Pembatalan pembelian lot utuh berhasil; guard lot terpakai diuji lewat E2E dan unit test.
- Form pembelian dan detail tidak overflow di 360/390 px.

Gate Phase 5:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run format:check
```

Hasil terakhir: **32 file / 121 unit test lulus**, **30 E2E dev + 1 E2E produksi PWA lulus**, build `1.0.0` lulus, format lulus, manifest/service worker/offline terverifikasi, chunk utama 140,25 kB, dan Lighthouse mobile **Performance 96 / Accessibility 100 / Best Practices 100 / SEO 100**.

---

## Dokumentasi

- [`docs/PRD.md`](docs/PRD.md) — requirement StokPlus v2.0.
- [`docs/PHASES.md`](docs/PHASES.md) — phase tracking, gate, demo, test plan.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — ringkasan implementasi per fase.
- [`docs/UAT.md`](docs/UAT.md) — skrip dan sign-off UAT.
- [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) — panduan pengguna.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — deploy Cloudflare Pages/Netlify dan rollback.
- [`docs/RELEASE.md`](docs/RELEASE.md) — checklist rilis, Lighthouse, matriks perangkat, dan keputusan rilis.
- [`src/domain/README.md`](src/domain/README.md) — rencana aturan bisnis murni.

---

## Next Step

Phase 12 berstatus `Review`. Langkah berikutnya memerlukan manusia/perangkat nyata:

1. Jalankan UAT 15 skenario di Android dan iOS (`docs/UAT.md`).
2. Catat device matrix, screenshot install, dan offline.
3. Verifikasi Lighthouse dan install/offline pada domain produksi setelah deploy.
4. Isi sign-off product owner, developer, dan QA/UAT.
5. Deploy ke HTTPS dan uji update prompt dengan deployment kedua.

Jangan tandai Phase 12 `Done` sebelum langkah di atas selesai.
