# PHASES — StokPlus PWA

**Phase tracking, gate, demo, dan test plan untuk implementasi StokPlus.**

| Item | Nilai |
|---|---|
| Versi dokumen | 2.1 |
| Status | Phase 12 — Review (menunggu UAT perangkat dan sign-off) |
| Tanggal | 27 Oktober 2026 |
| PRD acuan | `docs/PRD.md` v2.1 |
| Model eksekusi | Satu fase pada satu waktu; fase berikutnya hanya setelah gate lulus |
| Target | PWA local-first, satu HP, satu pengguna, frozen food |

---

## 1. Aturan Eksekusi

1. **Satu fase pada satu waktu.** Jangan mulai fase berikutnya sebelum gate fase aktif lulus.
2. **Gate harus objektif.** Gate terdiri dari deliverable, demo, dan test yang bisa dibuktikan.
3. **Dokumen dulu.** Perubahan scope/aturan harus masuk PRD atau decision log sebelum kode.
4. **Tidak ada skip gate.** Jika ada bug blocker, fase tetap di status `In progress` atau `Blocked`.
5. **Update dokumen ini.** Setiap selesai fase, ubah status board, checklist, dan change log.
6. **Demo script wajib dijalankan.** Demo bukan sekadar “sudah bisa”; harus mengikuti skenario.
7. **Test regresi wajib.** Fase baru tidak boleh merusak test fase sebelumnya.
8. **Backup sebelum migrasi schema.** Setiap perubahan Dexie schema harus punya jalur migrasi.
9. **Satu sumber kebenaran.** PRD untuk requirement; PHASES untuk urutan dan status.
10. **Tidak ada data produksi di environment demo.** Gunakan sample data atau salinan anonim.

### 1.1 Status Legend

| Status | Arti |
|---|---|
| `Not started` | Belum dikerjakan |
| `In progress` | Sedang dikerjakan |
| `Review` | Deliverable selesai, menunggu review/gate |
| `Blocked` | Menunggu keputusan/akses/perbaikan |
| `Done` | Gate lulus dan disetujui |

### 1.2 Gate Definition

Sebuah fase dinyatakan `Done` jika:

- Semua deliverable ada.
- Demo script berhasil.
- Test gate lulus.
- Tidak ada bug kritis/blocker.
- Dokumen status diperbarui.
- Product owner menyetujui hasil fase.

---

## 2. Status Board

| Fase | Nama | Status | Gate | Estimasi |
|---|---|---|---|---|
| 0 | Finalisasi PRD, brand, dan phase plan | **Done** | Dokumen disetujui | 1–2 hari |
| 1 | Foundation, scaffold, design system | **Done** | Build + lint + test + shell | 4–5 hari |
| 2 | Local data, onboarding, PIN, settings | **Done** | Schema + PIN + lock | 4–6 hari |
| 3 | Backup & restore | **Done** | Backup/restore cycle | 3–4 hari |
| 4 | Master data, multi-unit, expiry settings | **Done** | Conversion + product units | Selesai |
| 5 | Pembelian, lot, expiry, HPP, kamus istilah | **Done** | Lot + HPP + cancel guard + kamus istilah | Gate lulus |
| 6 | Penjualan, FEFO, COGS | **Done** | FEFO + COGS + restore | Gate lulus |
| 7 | Beban & pemisahan P&L | **Done** | Expense + P&L separation | Gate lulus |
| 8 | Stok, expiry, write-off, opname | **Done** | Ledger + expiry + opname | Disetujui |
| 9 | Dashboard & expiry alert | **Done** | KPI + alert + empty state | Disetujui |
| 10 | Laporan & export | **Done** | 6 laporan + export | Disetujui |
| 11 | Migrasi Laravel & opening lot | **Done** | Import fixture + rekonsiliasi; migrasi DB aktual dikecualikan | Gate aplikasi lulus |
| 12 | PWA polish, UAT, release | `Review` | Otomasi + PWA lulus; UAT perangkat dan sign-off menunggu | Menunggu validasi manusia |

**Total estimasi:** 10–13 minggu.

---

## 3. Dependency & Milestones

```text
Phase 0
  ↓
Phase 1 — Foundation
  ↓
Phase 2 — Local data + onboarding/PIN
  ↓
Phase 3 — Backup/restore
  ↓
Phase 4 — Master data + multi-unit
  ↓
Phase 5 — Purchases + lots + expiry
  ↓
Phase 6 — Sales + FEFO + COGS
  ↓
Phase 7 — Expenses + P&L
  ↓
Phase 8 — Stock + expiry + write-off + opname
  ↓
Phase 9 — Dashboard + alerts
  ↓
Phase 10 — Reports + export
  ↓
Phase 11 — Migration + opening lot
  ↓
Phase 12 — PWA polish + UAT + release
```

### 3.1 Milestones

| Milestone | Fase | Bukti |
|---|---|---|
| M1 — Fondasi lokal | 1–3 | App shell, schema, PIN, backup/restore |
| M2 — Master & pembelian | 4–5 | Produk multi-unit, lot, expiry, HPP |
| M3 — Penjualan & laba | 6–7 | FEFO, COGS, beban, laba kotor/bersih |
| M4 — Kontrol stok | 8–9 | Kartu stok, expiry, write-off, opname, dashboard |
| M5 — Laporan | 10 | 6 laporan + export |
| M6 — Migrasi & rilis | 11–12 | Data Laravel masuk, UAT, PWA live |

---

## 4. Phase Details

---

## Phase 0 — Finalisasi PRD, Brand, dan Phase Plan

**Status:** `Done`

**Tujuan:** Mengunci requirement, brand, keputusan bisnis, dan urutan fase sebelum menulis kode.

**Deliverable:**
- `docs/PRD.md` v2.0 — StokPlus, multi-unit, FEFO/FIFO, expiry, write-off, P&L, migrasi.
- `docs/PHASES.md` v1.0 — dokumen ini.
- Decision log (bagian 9).
- Parity matrix Laravel vs StokPlus.
- Acceptance criteria MVP.
- Struktur folder target `stokplus-pwa`.
- Backup PRD v1.0 di luar repo (`/tmp`) untuk referensi.

**Checklist:**
- [x] Brand StokPlus, tagline, monogram `S+`, palet navy/copper/off-white.
- [x] Hapus admin/owner, master user, email/password login, upload logo.
- [x] Tambah multi-unit & konversi satuan.
- [x] Tambah lot/batch, expiry, FEFO/FIFO.
- [x] Tambah COGS per penjualan.
- [x] Tambah expiry alert & write-off.
- [x] Pisahkan HPP vs beban operasional.
- [x] Tambah laporan expiry dan kerugian persediaan.
- [x] Tambah strategi migrasi opening lot + HPP estimasi.
- [x] Update data model & Dexie schema.
- [x] Update acceptance criteria.
- [x] Buat phase tracking & gate.
- [x] Review dan persetujuan product owner.
- [x] Rename folder `smpp-pwa` → `stokplus-pwa`.

**Demo script:**
1. Buka PRD bagian 0 dan tunjukkan 20 keputusan.
2. Tunjukkan scope MVP dan daftar yang dihapus.
3. Tunjukkan contoh multi-unit Siomay dan Ayam Fillet.
4. Tunjukkan alur FEFO + expiry + write-off.
5. Tunjukkan struktur laba/rugi baru.
6. Tunjukkan strategi migrasi opening lot.
7. Tunjukkan status board dan gate fase 1–12.
8. Konfirmasi tidak ada kontradiksi antara PRD dan PHASES.

**Test gate:**
- [x] Tidak ada istilah “HPP periode” sebagai metode utama.
- [x] Tidak ada requirement admin/owner/master user/email login/logo.
- [x] Semua requirement multi-unit punya aturan qty base.
- [x] Semua requirement expiry punya aturan FEFO/quarantine.
- [x] Semua requirement pembelian punya aturan lot + cancel guard.
- [x] Semua requirement penjualan punya aturan COGS + restore.
- [x] Semua requirement laporan punya formula laba bersih.
- [x] Semua fase punya deliverable, demo, dan gate.
- [x] Product owner menyetujui.

**Exit criteria:**
- PRD v2.0 disetujui.
- PHASES v1.0 disetujui.
- Folder target disepakati.
- Fase 1 boleh dimulai.

---

## Phase 1 — Foundation, Scaffold, Design System

**Status:** `Done`

**Tujuan:** Menyiapkan fondasi aplikasi yang bisa dibuild, dites, dan dipakai untuk semua fitur.

**Deliverable:**
- Vite + Vue 3 + TypeScript.
- Tailwind CSS + DaisyUI.
- Vue Router + Pinia.
- Dexie skeleton.
- Vitest + Vue Test Utils + Playwright + `fake-indexeddb`.
- ESLint + Prettier.
- PWA skeleton (`vite-plugin-pwa`).
- Design tokens StokPlus.
- Layout dasar: app bar, page, card, bottom nav.
- UI primitives: Button, Card, BottomSheet, Keypad, StatusChip, EmptyState, Toast.
- Struktur folder `src/domain`, `src/features`, `src/db`.
- README developer.

**Checklist:**
- [x] Scaffold Vite + Vue 3 + TypeScript.
- [x] Tailwind + DaisyUI theme StokPlus.
- [x] Router dengan 5 tab bottom nav.
- [x] Layout mobile 360–430px.
- [x] UI primitives dasar.
- [x] Dexie instance + schema versi 1 (skeleton).
- [x] Test harness unit + e2e.
- [x] Lint/format scripts.
- [x] PWA manifest + ikon placeholder `S+`.
- [x] CI lokal scripts: lint, typecheck, test, build.
- [x] Dokumentasi cara menjalankan.

**Demo script:**
1. `npm run dev` → app shell tampil.
2. Navigasi 5 tab.
3. Tampilkan design tokens dan komponen dasar.
4. Tampilkan PWA manifest.
5. Jalankan `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

**Test gate:**
- [x] Lint tanpa error.
- [x] Typecheck tanpa error.
- [x] Unit test contoh lulus.
- [x] Build produksi lulus.
- [x] Tidak ada horizontal scroll di 360px.
- [x] Bottom nav dapat digunakan dengan keyboard/screen reader dasar.
- [x] Service worker tidak error di console.

**Bukti gate Phase 1 (2026-10-24):**
- `npm run lint` — lulus tanpa error/warning.
- `npm run typecheck` — lulus.
- `npm run test:unit` — 5 file, 10 test lulus.
- `npm run test:e2e` — 2 test lulus di Chromium.
- `npm run build` — lulus; menghasilkan `dist/sw.js` dan `dist/manifest.webmanifest`.
- PWA preview — service worker `activated`, manifest valid, reload offline di `/` dan `/transaksi` berhasil, tanpa console error.

**Exit criteria:**
- App shell stabil.
- Test harness siap.
- Design system dasar siap.
- Fase 2 boleh dimulai.

---

## Phase 2 — Local Data, Onboarding, PIN, Settings

**Status:** `Done`

**Tujuan:** Menyiapkan database lokal lengkap, onboarding, PIN, dan pengaturan dasar.

**Deliverable:**
- Dexie schema domain lengkap (v2; v1 adalah skeleton Phase 1): produk, `product_units`, lot, konsumsi, write-off, opname, movement.
- Onboarding: mulai baru / pilihan restore (import aktual diimplementasikan pada Phase 3).
- Profil usaha tanpa logo.
- PIN 6 digit + hash PBKDF2 + salt.
- Auto-lock.
- Settings: prefix, counter, expiry default, cutover date, storage.
- Sample data opsional.
- Schema migration harness.
- Audit log dasar.

**Checklist:**
- [x] Schema Dexie lengkap sesuai PRD 9.3.
- [x] Index FEFO `[product_id+expiry_date]`.
- [x] Index lot `[product_id+status]`.
- [x] Onboarding 3 langkah.
- [x] PIN hash + salt.
- [x] Lock screen.
- [x] Auto-lock 1/5/15 menit.
- [x] Profil usaha.
- [x] Prefix & counter.
- [x] Persistent storage request.
- [x] Sample data untuk demo.
- [x] Schema version + migration test.
- [x] Audit log untuk setup/reset.

**Demo script:**
1. Fresh install → onboarding.
2. Isi profil, buat PIN.
3. Restart → PIN lock.
4. Buka settings → ganti auto-lock.
5. Aktifkan sample data.
6. Tunjukkan schema version di Tentang.

**Test gate:**
- [x] PIN benar membuka aplikasi.
- [x] PIN salah ditolak.
- [x] Auto-lock bekerja.
- [x] Schema create/upgrade berhasil.
- [x] Semua tabel baru ada.
- [x] Sample data tidak merusak data kosong.
- [x] Onboarding tidak bisa selesai tanpa nama usaha/PIN.
- [x] Profil tidak memiliki field logo.

**Bukti gate Phase 2 (2026-10-25):**
- `npm run lint` — lulus tanpa error/warning.
- `npm run typecheck` — lulus.
- `npm run test:unit` — 15 file, 38 test lulus.
- `npm run test:e2e` — 5 test lulus di Chromium (2 regresi Phase 1 + 3 Phase 2).
- `npm run build` — lulus; PWA service worker dan manifest tergenerate.
- `npm run format:check` — lulus.
- PWA preview — service worker mengontrol halaman; reload offline di `/` dan `/transaksi` berhasil, tanpa console error.
- Manual — onboarding 3 langkah, PIN benar/salah, lock setelah restart, auto-lock 1 menit, sample data, schema v2 di Tentang, audit log setup/reset.
- Layout — tidak ada horizontal overflow pada 360px dan 390px; tidak ada console error.

**Catatan Phase 2:**
- Pilihan restore di onboarding sudah menjadi entry point; import backup aktual diimplementasikan pada Phase 3.
- Reset data memakai konfirmasi ketik `HAPUS`; prerequisite “backup dulu” diaktifkan pada Phase 3.

**Exit criteria:**
- Database lokal siap.
- Onboarding/PIN stabil.
- Settings dasar siap.
- Fase 3 boleh dimulai.

---

## Phase 3 — Backup & Restore

**Status:** `Done` — disetujui product owner 25 Oktober 2026.

**Tujuan:** Menjamin data bisa dibackup dan dipulihkan, termasuk lot dan expiry.

**Deliverable:**
- Backup JSON `stokplus-backup-YYYYMMDD-HHmm.json`.
- Metadata `app`, `schemaVersion`, `appVersion`, `exportedAt`, `cutoverDate`.
- Checksum SHA-256.
- Enkripsi opsional AES-GCM + PBKDF2.
- Restore dengan validasi.
- Backup keamanan otomatis sebelum restore.
- Pengingat backup 7 hari/50 transaksi.
- UI backup/restore.

**Checklist:**
- [x] Export seluruh tabel.
- [x] Hitung checksum.
- [x] Validasi app/schema/checksum.
- [x] Preview jumlah data.
- [x] Safety backup sebelum restore.
- [x] Restore atomik.
- [x] Rollback jika gagal.
- [x] Enkripsi opsional.
- [x] Banner reminder.
- [x] Backup mencakup `stock_lots`, `sale_lot_consumptions`, `stock_writeoffs`.
- [x] Test file rusak/versi salah.

**Demo script:**
1. Isi data contoh dari onboarding.
2. Backup → file JSON terunduh dan status backup terakhir diperbarui.
3. Buka restore → preview jumlah data tampil.
4. Reset data → wajib membuat backup pengaman lebih dulu.
5. Restore dari onboarding → profil, PIN, dan data contoh kembali.
6. Coba file rusak → ditolak tanpa mengubah data.
7. Coba versi schema salah → ditolak.
8. Lot, expiry, konsumsi, dan write-off diverifikasi roundtrip di unit test karena UI transaksi belum tersedia.

**Test gate:**
- [x] Backup/restore identik.
- [x] Checksum valid.
- [x] File rusak ditolak tanpa mengubah data.
- [x] Safety backup dibuat.
- [x] Restore gagal → data lama utuh.
- [x] Lot, expiry, dan konsumsi kembali.
- [x] Backup reminder muncul.

**Bukti gate Phase 3 (2026-10-25):**
- `npm run lint` — lulus tanpa error/warning.
- `npm run typecheck` — lulus.
- `npm run test:unit` — 18 file, 49 test lulus.
- `npm run test:e2e` — 9 test lulus di Chromium (2 regresi Phase 1 + 3 Phase 2 + 4 Phase 3).
- `npm run build` — lulus; PWA service worker dan manifest tergenerate.
- `npm run format:check` — lulus.
- PWA preview — service worker mengontrol halaman; reload offline berhasil; backup produksi terunduh dengan nama `stokplus-backup-20261025-1238.json`, checksum 64 hex, dan 47 baris data contoh.
- Layout — halaman Backup dan Restore tidak overflow pada 360px dan 390px.
- E2E Phase 3 — backup/restore dengan safety backup, file rusak + schema salah ditolak, reset wajib backup lalu restore dari onboarding, dan enkripsi + passphrase salah ditolak.
- Unit Phase 3 — checksum, encryption roundtrip, wrong passphrase, backup seluruh tabel domain, lot/expiry/konsumsi/write-off, safety backup, rollback, dan reminder 7 hari/50 transaksi.

**Catatan Phase 3:**
- Backup memuat 22 tabel domain; `app_meta` dikecualikan karena metadata teknis internal dan tidak ikut direstore.
- Checksum dihitung dari canonical JSON tanpa field `checksum`, sehingga urutan key JSON tidak memengaruhi validasi.
- Enkripsi memakai AES-GCM 256-bit, PBKDF2-SHA256 210.000 iterasi, salt 16 byte, IV 12 byte. Passphrase tidak disimpan.
- Safety backup dibuat sebelum restore jika sudah ada profil, diunduh otomatis, dan tetap disimpan di memori untuk rollback. File safety tidak dienkripsi agar bisa dipakai darurat.
- Restore berjalan dalam satu transaksi Dexie; jika gagal, transaksi dibatalkan dan safety backup dipulihkan. Setelah restore, aplikasi dikunci dan memakai PIN dari backup.
- Restore juga memperbarui metadata backup terakhir ke `exportedAt` file yang dipulihkan.
- Reset data sekarang mewajibkan backup pengaman yang dibuat di dalam dialog reset. Backup tersebut diunduh sebelum reset diaktifkan.
- Banner pengingat muncul jika belum pernah backup, backup terakhir ≥ 7 hari, atau ≥ 50 transaksi selesai sejak backup terakhir.
- Tidak ada perubahan schema Dexie; versi aplikasi menjadi `0.3.0`, schema tetap v2.

**Exit criteria:**
- Backup/restore aman.
- Data lot terlindungi.
- Fase 4 boleh dimulai setelah review Phase 3 disetujui.

---

## Phase 4 — Master Data, Multi-Unit, Expiry Settings

**Status:** `Done` — disetujui product owner pada 25 Oktober 2026.

**Tujuan:** Menyediakan master data yang mendukung pembelian/penjualan multi-satuan dan expiry.

**Deliverable:**
- CRUD kategori produk.
- CRUD satuan global.
- CRUD produk + base unit.
- CRUD `product_units` (konversi, harga, default, barcode).
- Pengaturan `track_expiry` + alert days.
- CRUD supplier.
- CRUD customer.
- CRUD kategori beban.
- Opening stock + opening lot + expiry.
- Validasi konversi & base unit lock.

**Checklist:**
- [x] Form produk dengan base unit.
- [x] Card satuan produk.
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

**Demo script:**
1. Buat produk Siomay base pcs, pack 10, dus 100. — **lulus E2E UI**
2. Buat produk Ayam Fillet base gram, kg 1000, pack 500. — **lulus repository test**
3. Aktifkan track expiry 30 hari. — **lulus E2E + unit test**
4. Isi opening stock + expiry. — **lulus E2E + unit test**
5. Coba ubah base unit setelah opening → ditolak. — **lulus E2E + unit test**
6. Coba konversi 0 → ditolak. — **lulus E2E + unit test**
7. Coba qty base pecahan dan barcode duplikat → ditolak. — **lulus unit test + E2E**
8. Buat produk track expiry dengan opening stock tanpa expiry → ditolak. — **lulus unit test**

**Test gate:**
- [x] Konversi 1 dus = 100 pcs.
- [x] Konversi 0,5 kg = 500 gram.
- [x] Konversi pecahan base ditolak.
- [x] Barcode duplikat ditolak.
- [x] Base unit lock bekerja.
- [x] Opening lot terbentuk.
- [x] Produk track expiry tanpa expiry ditolak.
- [x] CRUD master stabil.
- [x] Picker hanya kategori/satuan aktif.
- [x] Data terpakai dinonaktifkan, bukan dihapus.

**Bukti gate Phase 4:**
- `npm run check` — lint, typecheck, **20 file unit test / 64 test**, production build lulus.
- `npm run test:e2e` — **12 test Chromium lulus**, termasuk 3 test Phase 4.
- `npm run format:check` — lulus.
- PWA preview `0.4.0` — service worker mengontrol halaman; offline reload setelah unlock berhasil; tanpa console error.
- Layout master hub, produk, form produk, dan satuan — tidak ada horizontal overflow pada 360px dan 390px.
- Backup produksi — schema `2`, appVersion `0.4.0`, master data ikut, checksum 64 karakter.
- Unit test tambahan — Ayam Fillet gram/kg/pack, opening stock 1500 g, expiry, dan penolakan qty base pecahan.
- Test file — `tests/unit/master-validation.spec.ts`, `tests/unit/master-service.spec.ts`, `tests/e2e/phase4.spec.ts`.
- Catatan demo — Ayam Fillet dibuktikan lewat repository test; alur UI multi-unit memakai Siomay. Demo UI Ayam Fillet terpisah dapat ditambahkan bila diminta.

**Exit criteria:**
- Master data siap.
- Multi-unit tervalidasi.
- Opening lot siap.
- Fase 5 boleh dimulai setelah Phase 4 disetujui.

---

## Phase 5 — Pembelian, Lot, Expiry, HPP, Kamus Istilah

**Status:** `Done` — disetujui product owner pada 25 Oktober 2026.

**Tujuan:** Mencatat pembelian yang menghasilkan lot dengan expiry dan HPP per base.

**Deliverable:**
- List/form pembelian.
- Multi-unit item.
- Expiry + lot code.
- Diskon item/header.
- Biaya angkut masuk.
- Alokasi HPP ke lot.
- Draft/complete/cancel.
- Guard pembatalan berbasis lot.
- Detail pembelian + lot.
- Stock movement `purchase_in`/`purchase_cancel`.
- Kamus istilah di menu Lainnya dengan pencarian.

**Checklist:**
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
- [x] Kamus istilah menjelaskan lot, base unit, expiry, HPP, dan istilah operasional terkait.

**Demo script:**
1. Buat pembelian Siomay 2 dus, expiry 12/12/2026.
2. Isi diskon header + biaya angkut.
3. Selesaikan → lot 200 pcs, HPP per pcs.
4. Buka detail → lot, expiry, HPP.
5. Coba batalkan setelah lot dikonsumsi (fixture/test) → ditolak.
6. Batalkan pembelian yang lot-nya utuh → berhasil.
7. Buka Lainnya → Kamus Istilah, lalu cari “lot” atau “HPP”.

**Test gate:**
- [x] Qty base benar.
- [x] Lot terbentuk.
- [x] Expiry tersimpan.
- [x] HPP per base benar.
- [x] Diskon/angkut teralokasi.
- [x] Cancel guard bekerja.
- [x] Movement benar.
- [x] Draft tidak mengubah stok.
- [x] Transaksi atomik.
- [x] Kamus istilah dapat dibuka dari menu Lainnya dan dicari.

**Bukti gate Phase 5:**
- `npm run check` — lulus: lint, typecheck, **22 file / 76 unit test**, production build `0.5.0`.
- `npm run test:e2e` — **14 test Chromium lulus**, termasuk 2 test Phase 5.
- `npm run format:check` — lulus.
- Demo pembelian Siomay **2 dus** harga `150.000/dus`, expiry `12/12/2026`, diskon header `10.000`, biaya angkut `5.000` — total `Rp 295.000`, qty base `200 pcs`, HPP `Rp 1.475/pcs`.
- Detail pembelian menampilkan lot `LOT-PB-...-1`, expiry, HPP per base, dan sisa lot `200 pcs`.
- Pembatalan lot utuh — status `Batal`, stok kembali `0`, lot menjadi `depleted`, movement `purchase_cancel` tercatat.
- Guard konsumsi — unit test menambahkan `sale_lot_consumptions`; pembatalan ditolak dengan pesan “sebagian lot sudah terpakai”.
- Draft — tidak membuat lot/movement dan stok tetap `0` (unit test + E2E).
- Layout form pembelian dan detail — tidak overflow pada 360px dan 390px.
- Test file — `tests/unit/purchase-validation.spec.ts`, `tests/unit/purchase-service.spec.ts`, `tests/e2e/phase5.spec.ts`.
- Sample data ditambah satuan `Dus` dan konversi Siomay `dus = 100 pcs` untuk demo pembelian.
- Kamus Istilah tersedia di `/lainnya/kamus-istilah`; mencakup lot, lot code, base unit, konversi satuan, qty, expiry, HPP/COGS, FEFO, FIFO, laba kotor, konsumsi lot, stok layak jual, karantina, walk-in, kembalian, diskon item/header, draft, stock opname, write-off, dan supplier.

**Exit criteria:**
- Pembelian menghasilkan lot yang benar.
- HPP lot akurat.
- Guard pembatalan aman.
- Fase 6 dapat dimulai.

---

## Phase 6 — Penjualan, FEFO, COGS

**Status:** `Done`

**Tujuan:** Menjual multi-satuan, mengonsumsi lot FEFO/FIFO, dan menghitung COGS.

**Deliverable:**
- List/form penjualan.
- Multi-unit item.
- Validasi stok non-expired.
- FEFO/FIFO allocation.
- `sale_lot_consumptions`.
- COGS + laba kotor.
- Cancel restore lot + reverse COGS.
- Detail penjualan + lot.
- Movement `sale_out`/`sale_cancel`.
- Expired/quarantine blocked.

**Checklist:**
- [x] Form penjualan.
- [x] Satuan jual per item.
- [x] Stok tersedia dalam satuan jual.
- [x] Cek lot non-expired.
- [x] FEFO untuk track expiry.
- [x] FIFO untuk non-expiry.
- [x] Expired skip; expiry hari ini masih bisa dijual.
- [x] Quarantine block.
- [x] Konsumsi lot secara atomik.
- [x] `hpp_total` + `gross_profit`.
- [x] Movement per lot.
- [x] Cancel restore stok; lot expired tetap tidak bisa dijual.
- [x] Detail lot + COGS.
- [x] Draft warning stok kurang.
- [x] Payment Tunai/Transfer/QRIS + kembalian tunai.

**Demo script:**
1. Buat dua lot: expiry November dan Desember.
2. Jual 3 pack.
3. Tunjukkan lot November dikonsumsi lebih dulu.
4. Tunjukkan HPP dan laba kotor.
5. Coba jual melebihi stok non-expired → ditolak.
6. Batalkan penjualan → lot kembali, COGS berbalik.

**Test gate:**
- [x] FEFO memilih expiry terdekat.
- [x] FIFO untuk non-expiry.
- [x] Expired tidak dipakai; expiry hari ini masih dapat dijual.
- [x] Quarantine tidak dipakai.
- [x] Stok kurang ditolak tanpa mutasi parsial.
- [x] COGS = konsumsi lot, termasuk alokasi lintas lot.
- [x] Cancel restore benar dan membuat movement balik.
- [x] Tidak ada stok negatif.
- [x] Kembalian benar.

**Bukti gate Phase 6:**
- `npm run check` — lint, typecheck, **24 test files / 86 unit tests**, production build lulus.
- `npm run test:e2e -- --workers=1` — **18 test Chromium lulus**, termasuk 2 test Phase 6.
- Form/detail penjualan — layout diuji tanpa horizontal overflow pada 360px dan 390px.
- FEFO: lot dengan expiry terdekat dikonsumsi dulu; FIFO memakai `received_at` paling lama untuk produk non-expiry.
- Expired dan quarantine tidak masuk alokasi; lot dengan expiry hari ini masih dapat dijual.
- Penjualan multi-unit mengurangi stok base, merekam konsumsi dan movement per lot, lalu menyimpan COGS serta laba kotor.
- Stok kurang menampilkan peringatan untuk draft dan menolak penyelesaian tanpa perubahan data.
- Pembatalan mengembalikan qty ke lot asal, mencatat `sale_cancel`, dan mengecualikan penjualan batal dari COGS; lot yang sudah expired tetap tidak layak jual.
- Payment Tunai/Transfer/QRIS, validasi pembayaran non-tunai, dan perhitungan kembalian tunai diuji.
- Product owner menyetujui Phase 6; Phase 7 dimulai.
- Test file — `tests/unit/sale-validation.spec.ts`, `tests/unit/sale-service.spec.ts`, `tests/e2e/phase6.spec.ts`.

**Exit criteria:**
- Penjualan FEFO stabil.
- COGS akurat.
- Cancel aman.
- Fase 7 boleh dimulai setelah Phase 6 disetujui product owner.

---

## Phase 7 — Beban & Pemisahan P&L

**Status:** `Done`

**Tujuan:** Mencatat beban operasional dan memisahkannya dari HPP.

**Deliverable:**
- CRUD beban.
- Status draft/completed/cancelled.
- Kategori beban operasional.
- Form help text klasifikasi.
- P&L service: revenue, COGS, gross profit, inventory loss, opex, net profit.
- Laporan beban dasar.
- Dashboard KPI dasar (opsional).

**Checklist:**
- [x] Form, daftar, detail, dan aksi lifecycle beban.
- [x] Hanya kategori aktif yang dapat dipilih.
- [x] Validasi tanggal, kategori, keterangan, metode bayar, dan nominal integer > 0.
- [x] Status draft/completed/cancelled; hanya draft yang dapat diubah atau dihapus.
- [x] Beban tidak mengubah stok, lot, atau movement.
- [x] P&L menghitung penjualan, COGS dari item penjualan selesai, laba kotor, placeholder kerugian persediaan, opex, dan laba bersih.
- [x] HPP vs opex ditampilkan terpisah.
- [x] Help text klasifikasi beban vs pembelian barang dagang dan kerugian persediaan.
- [x] Laporan beban dikelompokkan berdasarkan kategori dan rentang tanggal inklusif.
- [x] Test lifecycle, tanpa mutasi stok, filter periode, dan formula P&L.

**Demo script:**
1. Catat listrik freezer Rp 800.000.
2. Catat sewa Rp 500.000.
3. Selesaikan.
4. Buka laba/rugi → beban mengurangi laba bersih, HPP tetap dari penjualan.
5. Batalkan beban → laba kembali.

**Test gate:**
- [x] Beban completed dihitung.
- [x] Draft/cancelled tidak dihitung.
- [x] Beban tidak mengubah stok.
- [x] Laba kotor = revenue - COGS.
- [x] Laba bersih = laba kotor - inventory loss - opex.
- [x] HPP tidak berubah karena beban.

**Bukti gate Phase 7:**
- `npm run check` — lint, typecheck, **26 test files / 93 unit tests**, dan production build lulus.
- `npm run test:e2e -- --workers=1` — **20 test Chromium lulus**, termasuk alur Phase 7.
- Format Prettier pada seluruh file Phase 7 lulus.
- Test unit membuktikan lifecycle, kategori nonaktif ditolak, beban tidak memutasi stok/lot/movement, periode inklusif, serta P&L mengecualikan penjualan dan beban batal.
- Pada Phase 7, laporan memakai inventory loss Rp 0 sebagai placeholder; Phase 8 sudah menggantinya dengan perhitungan write-off dan opname.
- Product owner menyetujui Phase 7; Phase 8 dimulai.

**Exit criteria:**
- Beban stabil.
- P&L service siap.
- Fase 8 dimulai setelah persetujuan product owner.

---

## Phase 8 — Stok, Expiry, Write-Off, Opname

**Status:** **Done**

**Tujuan:** Mengontrol lot, expiry, write-off, dan opname berbasis alokasi lot.

**Deliverable:**
- Daftar stok + kartu stok.
- Ringkasan lot + expiry.
- Laporan expiry.
- Write-off draft/complete/cancel.
- Opname draft/complete + alokasi lot.
- Cek konsistensi stok.
- P&L inventory loss integration.

**Checklist:**
- [x] Daftar stok base/display, nilai persediaan, dan saldo per lot.
- [x] Filter stok menipis/habis/expired/karantina.
- [x] Kartu stok per lot dan ledger movement.
- [x] Daftar expiry: expired, mendekati expiry, serta quarantine/expiry tidak diketahui.
- [x] Write-off multi-lot: draft, selesai, batal, hapus draft, detail.
- [x] Write-off mengurangi stok dan mencatat movement per lot.
- [x] Pembatalan write-off memulihkan stok/lot dan membuat movement pembalik.
- [x] Sesi opname draft, finalisasi, hapus draft, dan detail.
- [x] Kekurangan dialokasikan ke lot expiry paling awal/expired lebih dulu.
- [x] Surplus membuat lot baru dengan HPP rata-rata tersisa atau biaya beli terakhir; tanpa expiry masuk karantina.
- [x] Pemeriksaan konsistensi stok produk terhadap jumlah stok lot dan blok finalisasi bila tidak konsisten.
- [x] P&L menghitung write-off dan selisih opname; surplus mengurangi kerugian persediaan.
- [x] Lot expired/quarantine tetap diblokir dari penjualan.

**Demo script:**
1. Buat lot expired.
2. Buka expiry → write-off 10 pcs.
3. Tunjukkan stok turun + kerugian persediaan.
4. Lakukan opname: sistem 20, fisik 18.
5. Tunjukkan shortage FEFO + movement.
6. Coba jual lot expired → ditolak.

**Test gate:**
- [x] Write-off mengurangi lot/stok.
- [x] Nilai kerugian benar.
- [x] Write-off cancel restore.
- [x] Opname shortage FEFO.
- [x] Opname surplus lot.
- [x] Consistency check mendeteksi selisih.
- [x] P&L inventory loss.
- [x] Expired/quarantine tidak bisa dijual.

**Bukti gate Phase 8:**
- `npm run check` — lint, typecheck, **27 test files / 99 unit tests**, dan production build lulus.
- `npm run test:e2e -- --workers=1` — **21 test Chromium lulus**, termasuk alur Phase 8.
- Prettier check seluruh file Phase 8 lulus.
- Unit test membuktikan biaya write-off sesuai HPP lot, draft tidak memutasi stok, pembatalan memulihkan saldo dan membalik kerugian, shortage FEFO, surplus dengan weighted cost/quarantine, serta blok finalisasi saat stok tidak konsisten.
- E2E membuktikan alur pembelian lot expiry → write-off → opname kurang/lebih → saldo kartu stok dan P&L.
- P&L menghitung kerugian persediaan sebagai write-off selesai + kekurangan opname − surplus opname.

**Exit criteria:**
- Stok dan expiry terkontrol.
- Opname akurat.
- Fase 9 boleh dimulai setelah Phase 8 disetujui product owner.

---

## Phase 9 — Dashboard & Expiry Alert

**Status:** **Done**

**Tujuan:** Menampilkan kondisi usaha dan stok dalam satu layar.

**Deliverable:**
- Dashboard header, periode, hero card.
- KPI grid.
- Grafik 6 bulan.
- Kartu stok/expiry.
- Aktivitas terbaru.
- Banner backup.
- Empty state.
- Filter periode.

**Checklist:**
- [x] Header sapaan, nama usaha, monogram, dan status backup.
- [x] Hero penjualan bersih/laba dengan label periode.
- [x] KPI HPP/beban/laba.
- [x] Grafik 6 bulan penjualan vs HPP.
- [x] Stok menipis/habis dan nilai persediaan.
- [x] Lot expired/hampir expired dengan tautan ke daftar terfilter.
- [x] Maksimal lima aktivitas terbaru, diurutkan tanggal dan waktu pembuatan, menuju detail.
- [x] Aksi cepat penjualan, pembelian, dan beban.
- [x] Banner pengingat backup dengan CTA.
- [x] Empty state dan CTA transaksi pertama.
- [x] Filter hari ini, minggu ini, bulan ini, tahun ini, dan custom; satu baris dengan geser horizontal di layar sempit.
- [x] Filter stok dan expiry satu baris, dapat digeser horizontal tanpa menambah tinggi halaman.
- [x] Aksi cepat Beban memiliki border/warna kontras agar tampil jelas sebagai tombol.

**Demo script:**
1. Buka dashboard dengan sample data.
2. Ganti periode.
3. Tap kartu expired → daftar expiry.
4. Tap aktivitas → detail.
5. Hapus data → empty state.
6. Backup lama → banner.

**Test gate:**
- [x] KPI sesuai data dan mengecualikan draft/batal dari perhitungan laba-rugi.
- [x] Filter periode memengaruhi KPI dan aktivitas.
- [x] Grafik selalu menampilkan enam bulan dan hanya penjualan selesai.
- [x] Expiry count dan nilai persediaan benar.
- [x] Status backup dan banner pengingat.
- [x] Empty state saat periode tidak memiliki transaksi.
- [x] Kartu dashboard membuka filter stok/expiry dan aktivitas membuka detail transaksi.
- [x] Tidak ada horizontal scroll pada viewport 360px.

**Bukti gate Phase 9:**
- `npm run check` — lint, typecheck, **28 file test / 102 unit test**, dan production build lulus.
- `npm run test:e2e -- --workers=1` — **23 test Chromium lulus**, termasuk pergantian periode, kartu stok/expiry terfilter, tautan aktivitas ke detail, pengingat backup, empty state, dan viewport mobile.
- Prettier check pada seluruh file yang berubah lulus.
- Unit test menguji rentang tanggal, P&L, grafik enam bulan, urutan aktivitas, stok menipis, nilai persediaan, dan expiry lot.

**Exit criteria:**
- Dashboard siap.
- Alert terlihat.
- Fase 10 boleh dimulai.

---

## Phase 10 — Laporan & Export

**Status:** `Done` — disetujui product owner 27 Oktober 2026.

**Tujuan:** Menyediakan laporan lengkap dan export/print.

**Deliverable:**
- Laporan penjualan (+HPP/laba kotor).
- Laporan pembelian (+biaya angkut).
- Laporan stok (+lot/expiry/value).
- Laporan beban.
- Laporan expiry.
- Laporan laba/rugi baru.
- Export Excel 6 laporan.
- Print.
- Label HPP estimasi historis.

**Checklist:**
- [x] Filter periode hari ini, minggu ini, bulan ini, tahun ini, dan custom.
- [x] Penjualan kotor/diskon/bersih/COGS/laba.
- [x] Pembelian kotor/diskon/angkut/bersih.
- [x] Stok qty/value/expiry.
- [x] Beban per kategori.
- [x] Expiry report termasuk write-off dalam periode.
- [x] P&L formula dari penjualan, COGS, beban, dan kerugian persediaan.
- [x] Export xlsx untuk keenam laporan.
- [x] Print CSS.
- [x] Empty state.
- [x] Label estimasi HPP historis berdasarkan cutover date.
- [x] Rekonsiliasi total.

**Demo script:**
1. Buka laporan penjualan → HPP/laba kotor.
2. Buka laporan stok → nilai + expiry.
3. Buka laporan laba/rugi → laba bersih.
4. Export Excel → buka file.
5. Print → layout rapi.

**Test gate:**
- [x] Total laporan = data dan mengecualikan draft/batal.
- [x] HPP = Σ sale item hpp.
- [x] Laba bersih = formula.
- [x] Export sesuai filter/periode.
- [x] Print rapi dan elemen navigasi/aksi tersembunyi.
- [x] Empty state dan validasi rentang tanggal.
- [x] Historical estimate label.

**Bukti gate Phase 10 (2026-10-26):**
- `npm run check` — lint, typecheck, **29 file test / 106 unit test**, dan production build lulus.
- `npm run test:e2e -- --workers=1` — **25 test Chromium lulus**, mencakup enam laporan, export, print, empty state, periode invalid, dan regresi Phase 1–9.
- Prettier check pada seluruh file yang berubah lulus.
- `npm audit` dan `npm audit --omit=dev` — 0 vulnerabilities.
- Unit test memverifikasi rentang tanggal, COGS berdasarkan `sale_items.hpp_total`, rekonsiliasi laporan, estimasi HPP historis, serta workbook.
- Build menghasilkan workbook exporter sebagai dynamic chunk; Vite masih melaporkan ukuran chunk aplikasi utama di atas 500 kB.

**Exit criteria:**
- [x] Laporan siap.
- [x] Export siap.
- [x] Phase 10 disetujui; Phase 11 boleh dimulai.

---

## Phase 11 — Migrasi Laravel & Opening Lot

**Status:** `Done` — gate aplikasi lulus dan product owner mengarahkan lanjut ke Phase 12 pada 27 Oktober 2026; migrasi aktual dari database Laravel tidak diwajibkan.

**Tujuan:** Memindahkan data Laravel dengan aman dan membentuk opening lot.

**Deliverable:**
- Perintah Laravel `php artisan stokplus:export-json`.
- File export JSON.
- Import wizard.
- Cutover date.
- Mapping ID/relasi.
- Opening lot wizard.
- Expiry wizard.
- Estimasi HPP historis.
- Rekonsiliasi.
- Rollback.
- Laporan hasil migrasi.

**Checklist:**
- [x] Perintah meminta konfirmasi backup database Laravel dan transaksi tidak aktif; transaksi draft ditolak.
- [x] Export diblokir pada PHP di bawah 8.3.36.
- [x] Export command `stokplus:export-json` menghasilkan file JSON sesuai format PRD, berurutan per ID dan ditulis dengan permission privat.
- [x] Validasi metadata, tabel, ID unik, relasi, status, pembayaran, tanggal, dan rekonsiliasi total sebelum import.
- [x] Mapping master ke UUID v5 deterministik dengan `legacy_id`.
- [x] Mapping transaksi dan detail; metode pembayaran historis `kredit` dipertahankan tanpa menambah opsi pembayaran baru.
- [x] Opening lot dari stok produk dan ledger baru dimulai dari mutasi opening.
- [x] Wizard cutover dan expiry per produk.
- [x] Produk track-expiry tanpa tanggal expiry masuk quarantine.
- [x] HPP historis memakai weighted average pembelian setelah diskon, fallback pembelian terakhir/harga beli produk, dan ditandai estimasi.
- [x] Rekonsiliasi stok per produk.
- [x] Import dalam satu transaksi IndexedDB; kegagalan membatalkan seluruh perubahan.
- [x] Audit log laporan hasil migrasi tersimpan dan dapat ditampilkan kembali.

**Demo script:**
1. Jalankan export dari Laravel sample.
2. Import ke StokPlus.
3. Tentukan cutover date.
4. Isi expiry opening lot.
5. Tunjukkan stok awal = stok Laravel.
6. Tunjukkan HPP historis berlabel estimasi.
7. Coba file invalid → rollback.

**Test gate:**
- [x] Migrasi langsung dari database Laravel tidak diwajibkan; pengujian memakai fixture export sesuai struktur sumber.
- [x] Import master/transaksi diuji dengan fixture Laravel.
- [x] Relasi sumber yang yatim ditolak sebelum data lokal berubah.
- [x] Opening lot = stok sumber per produk.
- [x] Expiry/quarantine.
- [x] Estimasi HPP dan metode pembayaran historis.
- [x] Rekonsiliasi stok dan nilai laporan fixture.
- [x] Rollback transaksi diuji ketika penulisan data gagal.
- [x] Tidak ada data setengah jadi setelah kegagalan import.

**Bukti gate Phase 11 (2026-10-27):**
- `npm run check` — lint, typecheck, **30 file test / 111 unit test**, dan production build lulus.
- `npm run test:e2e -- --workers=1` — **27 test Chromium lulus**, termasuk wizard migrasi, backup pengaman, quarantine, dan penolakan file dengan relasi rusak.
- Test unit migrasi meliputi UUID deterministik, rekonsiliasi, weighted-average HPP, kredit historis, expiry/quarantine, audit, dan rollback atomik.
- Prettier check dan `npm audit` / `npm audit --omit=dev` lulus; 0 vulnerabilities.
- `php -l app/Console/Commands/ExportStokPlusJson.php` — lulus.
- Uji perintah pada runtime lokal PHP 8.3.6 — sengaja ditolak dengan pesan wajib PHP 8.3.36+. Sesuai persetujuan product owner, proses migrasi database Laravel aktual tidak diwajibkan.

**Exit criteria:**
- [x] Gate migrasi database Laravel aktual dikecualikan sesuai keputusan product owner; alur import tetap diuji menggunakan fixture sesuai format export.
- [x] Stok awal fixture tervalidasi per produk.
- [x] Phase 11 dilanjutkan ke Phase 12 atas arahan product owner; migrasi database Laravel aktual tetap dikecualikan dan dapat dijalankan terpisah saat data sumber siap.

---

## Phase 12 — PWA Polish, UAT, Release

**Status:** `Review` — implementasi, otomasi, Lighthouse, dan konfigurasi rilis selesai; UAT perangkat, deploy produksi, dan sign-off masih menunggu.

**Tujuan:** Merilis PWA yang stabil, offline, installable, dan disetujui UAT.

**Deliverable:**
- PWA manifest + ikon StokPlus.
- Service worker + update prompt.
- Offline test.
- Install Android/iOS.
- Accessibility pass.
- Device matrix test.
- UAT script + sign-off.
- User guide singkat.
- Release checklist.
- Deploy statis.

**Checklist:**
- [x] Manifest StokPlus.
- [x] Ikon 192/512/maskable/apple-touch.
- [x] Offline app shell.
- [x] Update prompt.
- [ ] Install Android.
- [ ] Install iOS.
- [x] Lighthouse.
- [x] Accessibility.
- [ ] Device matrix.
- [ ] UAT.
- [x] User guide.
- [ ] Deploy.
- [ ] Backup/restore final.
- [ ] Migration dry run final.
- [x] Rollback plan.

**Demo script:**
1. Install di Android.
2. Mode pesawat → transaksi.
3. Update prompt.
4. Backup/restore.
5. Jalankan UAT script.
6. Tunjukkan Lighthouse.
7. Tunjukkan user guide.

**Test gate:**
- [ ] Installable.
- [x] Offline.
- [ ] Update tidak menghilangkan data.
- [ ] UAT ≥ 90% tanpa bantuan.
- [ ] Tidak ada bug kritis.
- [ ] Backup/restore final.
- [ ] Migration final.
- [x] Lighthouse performance ≥ 85.
- [x] Accessibility dasar.
- [ ] Sign-off.

**Bukti gate Phase 12 (2026-10-27):**
- `npm run check` — lint, typecheck, **32 file test / 121 unit test**, production build, dan PWA artifact check lulus.
- `npm run test:e2e -- --workers=1` — **30 test Chromium lulus** (regresi Phase 1–12).
- `npm run test:e2e:pwa` — **1 test produksi lulus**: manifest, ikon, service worker aktif, reload offline, dan transaksi offline.
- `npm run format:check` lulus.
- Lighthouse 13.5.0 mobile pada production preview — **Performance 96**, **Accessibility 100**, **Best Practices 100**, **SEO 100**; FCP 2,1 s, LCP 2,3 s, TBT 20 ms, CLS 0.
- Build menghasilkan chunk utama `dist/assets/index-BlKsYE_U.js` 140,25 kB (gzip 42,88 kB); precache 117 entri.
- Uji E2E perangkat memakai Chromium viewport 390×844; install Android/iOS, matriks perangkat, UAT 15 skenario, dan sign-off **belum** dijalankan karena memerlukan perangkat dan validasi manusia.
- Panduan rilis, rollback, Lighthouse, dan matriks perangkat dicatat di `docs/RELEASE.md`. **Phase 12 belum `Done`.**

**Exit criteria:**
- Rilis MVP.
- Dokumentasi tersedia.
- Backlog prioritas berikutnya disepakati.

---

## 5. Test Gates per Phase

| Fase | Unit | Integration | E2E | Manual |
|---|---|---|---|---|
| 0 | — | — | — | Review dokumen |
| 1 | Contoh test | Dexie smoke | Shell load | 360px + nav |
| 2 | PIN hash | Schema migrate | Onboarding/lock | Restart |
| 3 | Checksum | Backup/restore | Reset/restore | File corrupt |
| 4 | Konversi | CRUD + opening lot | Buat produk multi-unit | Base unit lock |
| 5 | HPP lot | Lot + movement | Pembelian + expiry | Cancel guard |
| 6 | FEFO/COGS | Konsumsi + movement | Penjualan + cancel | Expired block |
| 7 | P&L | Expense CRUD | Beban + laporan | Klasifikasi |
| 8 | Write-off/opname | Lot adjust | Expiry + opname | Consistency |
| 9 | KPI | Query dashboard | Dashboard filter | Empty state |
| 10 | Formula laporan | Export | Laporan + export | Print |
| 11 | Mapping/estimate | Import/reconcile | Import wizard | Rollback |
| 12 | — | — | Offline/install | UAT + device |

---

## 6. Cross-Phase Test Matrix

| ID | Test | Fase | Tipe | Expected |
|---|---|---|---|---|
| T-01 | 2 dus × 100 pcs | 4/5 | Unit | qty base 200 |
| T-02 | 0,5 kg × 1.000 g | 4/5 | Unit | qty base 500 |
| T-03 | 0,333 pcs | 4 | Unit | Ditolak |
| T-04 | Diskon header + angkut | 5 | Unit | HPP lot teralokasi |
| T-05 | Lot expiry terdekat | 6 | Unit | FEFO memilih lot A |
| T-06 | Lot expired | 6/8 | Unit | Tidak bisa dijual |
| T-07 | Lot quarantine | 6/8 | Unit | Tidak bisa dijual |
| T-08 | Stok non-expired kurang | 6 | Unit | Transaksi ditolak |
| T-09 | COGS 3 pack | 6 | Unit | HPP = 3 × unit cost |
| T-10 | Cancel sale | 6 | Integration | Lot restored + COGS reverse |
| T-11 | Cancel purchase utuh | 5 | Integration | Lot dihapus + stok turun |
| T-12 | Cancel purchase terpakai | 5 | Integration | Ditolak |
| T-13 | Write-off expired | 8 | Integration | Stok turun + loss |
| T-14 | Write-off cancel | 8 | Integration | Stok/restore loss |
| T-15 | Opname shortage | 8 | Integration | FEFO consume + loss |
| T-16 | Opname surplus | 8 | Integration | Lot baru + expiry |
| T-17 | P&L | 7/10 | Unit | Laba bersih benar |
| T-18 | Backup/restore lot | 3 | Integration | Identik |
| T-19 | Restore file rusak | 3 | Integration | Ditolak, data utuh |
| T-20 | Import opening lot | 11 | Integration | Stok = sumber |
| T-21 | HPP historis | 11 | Unit | Label estimasi |
| T-22 | PIN lock | 2 | E2E | Minta PIN |
| T-23 | Offline | 12 | E2E | Transaksi jalan |
| T-24 | Install PWA | 12 | Manual | Standalone |
| T-25 | Export Excel | 10 | E2E | File valid |
| T-26 | Konsistensi stok | 8/14 | Integration | Deteksi selisih |
| T-27 | No admin/email | 12 | Manual | Menu tidak ada |

---

## 7. Demo Data

Gunakan data berikut untuk demo dan UAT:

### 7.1 Produk

| Produk | Base | Satuan | Konversi | Harga beli | Harga jual | Expiry |
|---|---|---|---|---:|---:|---|
| Siomay Frozen | pcs | pcs | 1 | Rp 1.500 | Rp 2.500 | Ya, 60 hari |
| Siomay Frozen | pcs | pack | 10 | — | Rp 20.000 | Ya |
| Siomay Frozen | pcs | dus | 100 | Rp 150.000 | — | Ya |
| Ayam Fillet | gram | gram | 1 | Rp 50 | Rp 70 | Ya, 90 hari |
| Ayam Fillet | gram | kg | 1.000 | Rp 50.000 | Rp 70.000 | Ya |
| Ayam Fillet | gram | pack 500g | 500 | — | Rp 38.000 | Ya |
| Kentang Goreng | gram | gram | 1 | Rp 25 | Rp 40 | Ya, 180 hari |
| Kentang Goreng | gram | kg | 1.000 | Rp 25.000 | Rp 40.000 | Ya |
| Plastik Pack | pcs | pcs | 1 | Rp 200 | Rp 500 | Tidak |

### 7.2 Supplier & Customer

- Supplier: PT Frozen Nusantara, CV Ayam Segar.
- Customer: Warung Seblak Bu Rina, Siomay Mas Budi, Umum.

### 7.3 Skenario Stok

```text
Siomay:
  Lot A: 200 pcs, expiry 30 hari, HPP Rp 1.500
  Lot B: 200 pcs, expiry 90 hari, HPP Rp 1.600

Ayam:
  Lot C: 5.000 g, expiry 60 hari, HPP Rp 50
  Lot D: 10.000 g, expiry 120 hari, HPP Rp 52

Kentang:
  Lot E: 10.000 g, expiry 45 hari, HPP Rp 25
```

### 7.4 Skenario Transaksi

- Pembelian Siomay 2 dus, diskon Rp 10.000, biaya angkut Rp 5.000.
- Penjualan Siomay 3 pack → FEFO lot A.
- Penjualan Ayam 2 pack 500g → FEFO lot C.
- Beban listrik Rp 800.000, sewa Rp 500.000, sampah Rp 80.000.
- Write-off Siomay lot A 10 pcs expired.
- Opname Kentang: sistem 10.000 g, fisik 9.800 g.

---

## 8. Backlog

| Fitur | Prioritas | Fase/Target | Catatan |
|---|---|---|---|
| Barcode scanner | Tinggi | Setelah MVP | Field `product_units.barcode` siap |
| Cloud backup | Tinggi | Setelah MVP | Google Drive |
| Multi-device sync | Sedang | Future | Butuh backend |
| Multi-user + role | Sedang | Future | Bertentangan dengan single-user |
| Retur pembelian | Sedang | Future | Mengembalikan lot ke supplier |
| Pilih lot manual | Sedang | Future | Untuk kondisi khusus |
| Average cost | Rendah | Future | Alternatif HPP |
| Tiered pricing | Rendah | Future | Grosir/retail |
| Cetak struk Bluetooth | Sedang | Future | Thermal |
| Multi-gudang | Rendah | Future | Transfer stok |
| Dark mode | Rendah | Future | |
| Push notification | Rendah | Future | Expiry alert |
| Expiry auto shelf life | Rendah | Future | Dari received date |
| Supplier lead time | Rendah | Future | Reorder point |
| Rekonstruksi lot historis | Rendah | Future | Jika opening lot kurang |
| Transfer stok | Rendah | Future | Multi-gudang |
| Landed cost multi-angsuran | Rendah | Future | Alokasi berat/volume |

---

## 9. Decision Log

| Tanggal | Keputusan | Alasan | Dampak |
|---|---|---|---|
| 2026-10-24 | Brand **StokPlus** | Identitas baru untuk target frozen food | Semua dokumen, manifest, backup |
| 2026-10-24 | Monogram `S+`, tanpa logo upload | Tidak perlu aset gambar | Hapus field logo |
| 2026-10-24 | Satu HP, satu pengguna, PIN lokal | Local-first, sederhana | Tidak ada role/user management |
| 2026-10-24 | Hapus admin/owner/master user/email login | Scope MVP | Parity matrix |
| 2026-10-24 | Vue 3 + Vite + TS + Tailwind + DaisyUI | Sesuai rencana | Stack |
| 2026-10-24 | Dexie/IndexedDB | Local-first | Data model |
| 2026-10-24 | Backup JSON wajib | Risiko storage HP | Backup/restore |
| 2026-10-24 | Multi-unit dengan base unit terkecil | Pembelian dus/kg, jual pack/gram/pcs | `product_units` |
| 2026-10-24 | FEFO untuk expiry, FIFO untuk non-expiry | Frozen food | Lot allocation |
| 2026-10-24 | Expiry tracking per produk | Tidak semua produk expired | `track_expiry` |
| 2026-10-24 | Batal pembelian hanya jika lot utuh | Mencegah stok/COGS rusak | Guard |
| 2026-10-24 | Batal penjualan restore lot + reverse COGS | Akurasi stok/laba | `sale_lot_consumptions` |
| 2026-10-24 | Write-off terpisah di P&L | Laba bersih akurat | Kerugian Persediaan |
| 2026-10-24 | Biaya angkut masuk opsional ke HPP | HPP lebih akurat | Alokasi lot |
| 2026-10-24 | Opening lot saat cutover | Migrasi aman | Import |
| 2026-10-24 | HPP historis estimasi | Tidak ada lot historis | Label estimasi |
| 2026-10-24 | Lot expiry null = quarantine | FEFO tidak salah | Tidak bisa dijual |
| 2026-10-24 | Barcode field di `product_units` | Barcode per satuan jual | Future |
| 2026-10-24 | Average cost bukan MVP | FEFO lebih penting | Future |
| 2026-10-25 | Enkripsi backup default **off**, passphrase opsional | UX aman untuk pengguna awam; data tetap bisa dipulihkan tanpa lupa passphrase | Backup Phase 3 |
| 2026-10-25 | `app_meta` tidak masuk backup | Metadata teknis internal; schemaVersion sudah ada di metadata backup | Backup Phase 3 |
| 2026-10-25 | Restore mengunci aplikasi dan memakai PIN dari backup | Menghindari state session lama setelah seluruh data diganti | Restore Phase 3 |
| 2026-10-25 | Reset wajib backup pengaman yang diunduh | Memenuhi NFR backup sebelum operasi berisiko | Reset Phase 3 |
| 2026-10-25 | Kode produk otomatis `{KODE_KATEGORI}-{URUT_3_DIGIT}` dan dapat diedit | Mempercepat input, tetap fleksibel | Master Phase 4 |
| 2026-10-25 | Opening stock pada produk track_expiry wajib expiry | Mencegah lot tanpa expiry masuk stok | Master Phase 4 |
| 2026-10-25 | Base unit dan konversi terkunci setelah ada lot/movement/transaksi | Mencegah stok dan COGS historis berubah | Master Phase 4 |
| 2026-10-25 | Master terpakai dinonaktifkan, bukan dihapus | Menjaga histori transaksi | Master Phase 4 |
| 2026-10-25 | Picker data baru hanya menampilkan master aktif | Mencegah pemilihan data nonaktif | Master Phase 4 |
| 2026-10-25 | Lot code otomatis `LOT-{nomor_nota}-{baris}` | Mempercepat input dan menjaga keterlacakan | Pembelian Phase 5 |
| 2026-10-25 | Diskon header dan biaya angkut dialokasikan proporsional terhadap subtotal item | HPP per lot lebih adil untuk pembelian campuran | Pembelian Phase 5 |
| 2026-10-25 | Pembatalan pembelian menandai lot `depleted` dan tetap menyimpan histori | Ledger dan detail nota tetap dapat diaudit | Pembelian Phase 5 |
| 2026-10-25 | Draft pembelian wajib punya supplier dan minimal satu item; validasi bayar cukup saat selesai | Draft tetap bermakna, tetapi bisa disimpan sebelum pembayaran final | Pembelian Phase 5 |

### 9.1 Keputusan yang Masih Terbuka

| # | Keputusan | Default | Kapan |
|---|---|---|---|
| 1 | Hosting PWA | Cloudflare Workers/Netlify | Phase 1/12 |
| 2 | Cutover date migrasi | Tanggal migrasi | Phase 11 |
| 3 | UAT date | Setelah Phase 11 | Phase 12 |
| 4 | Biaya angkut default | 0 — **diputuskan Phase 5**, diisi manual per pembelian | Selesai Phase 5 |
| 5 | Expiry alert default | 30 hari — **diputuskan Phase 4**, dapat dioverride per produk | Selesai Phase 4 |
| 6 | Metode estimasi HPP historis | Weighted average purchase | Phase 11 |
| 7 | Apakah opening stock wajib expiry | **Ya untuk track_expiry**; data migrasi tanpa expiry → quarantine | Phase 11 |

---

## 10. Change Log

| Tanggal | Versi | Perubahan |
|---|---|---|
| 2026-10-24 | PRD 1.0 | PRD awal SMPP |
| 2026-10-24 | PRD 2.0 | Rebrand StokPlus, multi-unit, FEFO, expiry, write-off, P&L, migrasi opening lot |
| 2026-10-24 | PHASES 1.0 | Phase tracking awal 0–12 |
| 2026-10-24 | PHASES 1.1 | Phase 0 `Done`; Phase 1 `Review`; tambah bukti gate Phase 1; schema Dexie v2 untuk Phase 2 |
| 2026-10-25 | PHASES 1.2 | Phase 1 `Done`; Phase 2 `In progress`; bukti gate Phase 1 |
| 2026-10-25 | PHASES 1.3 | Phase 2 `Done`; Phase 3 `In progress`; bukti gate Phase 2 |
| 2026-10-25 | PHASES 1.4 | Phase 3 `Review`; bukti gate Phase 3; backup JSON, checksum, enkripsi, restore atomik, safety backup, reminder, reset wajib backup |
| 2026-10-25 | PHASES 1.5 | Phase 3 `Done` setelah review; Phase 4 `In progress`; catatan progres dipindahkan ke `docs/PROGRESS.md` |
| 2026-10-25 | PHASES 1.6 | Phase 4 `Review`; master data, multi-unit, opening lot, expiry, base lock, picker aktif; bukti gate Phase 4 |
| 2026-10-25 | PHASES 1.7 | Phase 4 `Done` setelah persetujuan; Phase 5 `In progress`; tombol tambah produk disamakan dengan toolbar |
| 2026-10-25 | PHASES 1.8 | Phase 5 `Review`; pembelian draft/selesai/batal, lot + expiry, alokasi diskon/angkut, HPP 4 desimal, cancel guard; bukti gate Phase 5 |
| 2026-10-26 | PHASES 1.9 | Phase 6 `Implemented — menunggu review`; penjualan multi-unit, alokasi FEFO/FIFO, COGS, pembayaran, cancel restore; bukti gate Phase 6 |
| 2026-10-26 | PHASES 1.10 | Phase 6 `Done` setelah persetujuan; Phase 7 `Review`; beban, lifecycle, laporan beban, P&L terpisah; bukti gate Phase 7 |
| 2026-10-26 | PHASES 1.11 | Phase 7 `Done` setelah persetujuan; Phase 8 `Review`; stok/expiry, write-off, opname, konsistensi, integrasi kerugian persediaan |
| 2026-10-26 | PHASES 1.12 | Phase 8 `Done` setelah persetujuan; Phase 9 `Review`; dashboard KPI, grafik, stok/expiry, aktivitas, status backup, filter periode, dan empty state |
| 2026-10-26 | PHASES 1.13 | Penyesuaian review Phase 9: filter satu baris dengan geser horizontal dan tombol Beban lebih kontras |
| 2026-10-26 | PHASES 1.14 | Phase 9 `Done` setelah pengujian dan persetujuan product owner |
| 2026-10-26 | PHASES 1.15 | Phase 10 `Implemented — menunggu review`; enam laporan, filter periode, export Excel, print, empty state, label HPP estimasi, dan bukti gate |
| 2026-10-27 | PHASES 1.16 | Phase 10 `Done` setelah persetujuan product owner; Phase 11 `In progress` |
| 2026-10-27 | PHASES 1.17 | Phase 11 implementasi export Laravel dan import wizard StokPlus; gate aplikasi lulus, migrasi database Laravel aktual tidak diwajibkan sesuai keputusan product owner |
| 2026-10-27 | PHASES 1.18 | Phase 11 `Done`; product owner mengarahkan lanjut ke Phase 12; Phase 12 `In progress` |
| 2026-10-27 | PHASES 2.0 | Phase 12 implementasi PWA polish, UAT runner, panduan pengguna, deploy statis, dan dokumentasi rilis; 121 unit test, 30 E2E, 1 E2E PWA, dan Lighthouse 96 lulus; Phase 12 `Review` menunggu UAT perangkat dan sign-off |
| 2026-10-27 | PHASES 2.1 | Perbaikan deploy Cloudflare Workers: `wrangler.jsonc` dengan SPA fallback, hapus `_redirects`, tambah `netlify.toml`; `check:pwa` memvalidasi config Worker dan menolak `_redirects` |

---

## 11. Risk Register

| Risiko | Fase | Dampak | Mitigasi | Status |
|---|---|---|---|---|
| Expiry tidak diisi | 4/5/11 | FEFO salah | Wajib track_expiry + quarantine; opening stock dan pembelian track_expiry ditolak tanpa expiry | Mitigated Phase 4/5, open Phase 11 |
| Disiplin lot rendah | 5/6 | Stok tidak akurat | Auto lot code, form lot, audit, detail lot, konsumsi FEFO/FIFO | Mitigated Phase 5/6 |
| Konversi satuan salah | 4/5/6 | Stok/COGS salah | Base unit terkecil, test | Open |
| Performa FEFO | 6/8 | Transaksi lambat | Index produk+expiry | Open |
| Migrasi stok tidak cocok | 11 | Data rusak | Rekonsiliasi + rollback | Open |
| HPP historis estimasi | 11 | Laporan historis tidak presisi | Label estimasi | Accepted |
| Storage HP terhapus | Semua | Data hilang | Backup + persistent storage | Open |
| Scope creep | Semua | Rilis mundur | Backlog + gate | Open |
| User bingung HPP vs opex | 7/10 | Salah catat | Help text + UAT | Open |
| Bug cancel lot | 5/6 | Stok negatif | Test guard + restore dan movement balik | Mitigated Phase 5/6 |
| Data entry lambat | 4/5 | User tidak disiplin | Keypad, picker, default | Open |
| PHP source rentan | 11 | Eksploitasi | Patch 8.3.36+ | Open |

---

## 12. Release Checklist

### 12.1 Pre-Release

- [ ] Semua fase 0–12 `Done`.
- [x] Unit/integration/E2E lulus.
- [ ] UAT sign-off.
- [ ] Backup/restore final.
- [ ] Migrasi dry run final.
- [ ] Tidak ada bug kritis.
- [x] User guide siap.
- [x] Data sample tidak terbawa produksi.

### 12.2 PWA

- [x] Manifest StokPlus.
- [x] Ikon 192/512/maskable/apple-touch.
- [x] Offline app shell.
- [x] Update prompt.
- [ ] Install Android.
- [ ] Install iOS.
- [x] Lighthouse performance ≥ 85.
- [x] Accessibility dasar.
- [x] Tidak ada horizontal scroll.
- [x] Safe area iOS.

### 12.3 Data

- [ ] Backup sebelum rilis.
- [ ] Schema version final.
- [ ] Migration path final.
- [ ] Cek konsistensi stok.
- [ ] Cutover date.
- [ ] Opening lot + expiry.
- [ ] HPP estimasi label.

### 12.4 Operasional

- [x] User guide singkat.
- [ ] Checklist backup mingguan.
- [ ] Kontak bantuan.
- [x] Rollback plan.
- [ ] Monitoring error lokal.

---

## 13. UAT Script

| # | Skenario | Langkah | Expected |
|---|---|---|---|
| UAT-01 | Onboarding | Buat usaha + PIN | Dashboard |
| UAT-02 | Master multi-unit | Buat Siomay pcs/pack/dus | Konversi benar |
| UAT-03 | Opening lot | Isi stok + expiry | Lot terbentuk |
| UAT-04 | Pembelian | 2 dus + expiry | Stok naik + lot |
| UAT-05 | Penjualan FEFO | Jual 3 pack | Lot expiry terdekat |
| UAT-06 | Stok kurang | Jual > stok non-expired | Ditolak |
| UAT-07 | Beban | Listrik + sewa | Laba bersih turun |
| UAT-08 | Expiry | Write-off lot expired | Stok turun + loss |
| UAT-09 | Opname | Fisik < sistem | Shortage FEFO |
| UAT-10 | Laporan | Buka P&L | Laba bersih benar |
| UAT-11 | Export | Export penjualan | File xlsx |
| UAT-12 | Backup/restore | Backup → reset → restore | Data kembali |
| UAT-13 | Offline | Mode pesawat | Transaksi jalan |
| UAT-14 | Install | Add to home screen | Standalone |
| UAT-15 | Migrasi | Import sample | Stok awal benar |

### 13.1 Sign-off

| Peran | Nama | Tanggal | Status |
|---|---|---|---|
| Product Owner | | | Menunggu |
| Developer | | | Menunggu |
| QA/UAT | | | Menunggu |

---

## 14. Definition of Done

### 14.1 Per Fase

- Deliverable lengkap.
- Demo berhasil.
- Test gate lulus.
- Tidak ada blocker.
- Status board diperbarui.
- Change log diperbarui.
- Product owner menyetujui.

### 14.2 MVP

- Semua FR MVP berfungsi.
- Multi-unit, FEFO, expiry, write-off, COGS, P&L terbukti.
- Backup/restore termasuk lot.
- Migrasi Laravel terbukti.
- PWA installable + offline.
- UAT ≥ 90%.
- User guide tersedia.
- Tidak ada bug kritis.

---

## 15. Next Action

1. Jalankan UAT 15 skenario di Android Chrome dan iPhone Safari menggunakan `docs/UAT.md` dan `/lainnya/uat`.
2. Isi matriks perangkat, screenshot install/offline, dan bug log di `docs/RELEASE.md` serta `docs/UAT.md`.
3. Verifikasi update prompt dengan dua deployment nyata dan pastikan data tetap ada.
4. Deploy ke HTTPS (Cloudflare Workers default), lalu catat URL, versi, dan tanggal deploy.
5. Setelah UAT ≥ 90%, tidak ada bug kritis, dan sign-off terisi, ubah Phase 12 menjadi `Done`.

---

**Akhir dokumen.**
