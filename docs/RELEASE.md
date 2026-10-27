# Release — StokPlus PWA v1.0.0

**Rilis MVP local-first untuk usaha frozen food.**

| Item | Nilai |
|---|---|
| Versi aplikasi | `1.0.0` |
| Schema Dexie | `2` |
| Target rilis | Static hosting HTTPS (Cloudflare Pages default) |
| Status | **Release candidate** — otomasi lulus; UAT perangkat dan sign-off product owner masih menunggu |
| Tanggal pemeriksaan | 27 Oktober 2026 |
| Panduan deploy | `docs/DEPLOY.md` |
| Panduan UAT | `docs/UAT.md` |
| Panduan pengguna | `docs/USER-GUIDE.md` |

> Dokumen ini mencatat bukti rilis, hasil Lighthouse, matriks perangkat, rollback, dan keputusan rilis. Jangan tandai rilis final sebelum UAT perangkat dan sign-off diisi.

---

## 1. Ringkasan Kandidat Rilis

### Sudah terverifikasi otomatis

- [x] Lint, typecheck, unit test, production build, dan PWA artifact check.
- [x] E2E dev seluruh fase 1–12.
- [x] E2E produksi: manifest, ikon, service worker aktif, reload offline, dan transaksi offline.
- [x] Manifest `standalone`, ikon 192/512/maskable/apple-touch, shortcut Penjualan/Pembelian.
- [x] Route lazy-load; chunk utama ±140 kB (sebelumnya >500 kB).
- [x] `_redirects` dan `_headers` tersedia di `dist`.
- [x] Kontras teks, target sentuh, focus trap bottom sheet, safe area, dan reduced motion.
- [x] Lighthouse performance 96, accessibility 100, best practices 100, SEO 100.

### Masih menunggu validasi manusia

- [ ] Install di Android Chrome dan iPhone Safari.
- [ ] UAT 15 skenario di perangkat nyata (≥90%, tanpa bug kritis).
- [ ] Matriks perangkat (Android, iOS, desktop, tablet).
- [ ] Backup/restore final dengan data UAT.
- [ ] Migrasi final/dry run dengan data Laravel aktual (bila ada).
- [ ] Sign-off product owner, developer, dan QA/UAT.
- [ ] Deploy ke domain HTTPS produksi.
- [ ] Update prompt diuji dengan dua deployment nyata.

---

## 2. Bukti Otomasi

| Pemeriksaan | Perintah | Hasil | Tanggal |
|---|---|---|---|
| Format | `npm run format:check` | Lulus | 2026-10-27 |
| Lint + typecheck + unit + build + PWA | `npm run check` | Lulus — 32 file / 121 unit test | 2026-10-27 |
| E2E dev | `npm run test:e2e -- --workers=1` | 30 test lulus | 2026-10-27 |
| E2E produksi PWA | `npm run test:e2e:pwa` | 1 test lulus — manifest, SW, offline, transaksi offline | 2026-10-27 |
| PWA artifact | `npm run check:pwa` | Lulus | 2026-10-27 |
| Build | `npm run build` | Lulus | 2026-10-27 |

Catatan:

- E2E dijalankan dengan Chromium Playwright pada viewport 390×844.
- E2E produksi memakai `vite preview` di `http://127.0.0.1:4174` dan menguji service worker nyata.
- Dua kegagalan sementara saat regresi penuh disebabkan HMR dev server ketika file diformat bersamaan; setelah server dev distart ulang dan format selesai, kedua test lulus (Phase 5 cancellation guard dan Phase 6 FEFO/COGS).
- Unit test menggunakan `fake-indexeddb`; bukan pengganti UAT perangkat.

---

## 3. Lighthouse

**Target:** Performance ≥ 85, Accessibility dasar, Best Practices, dan PWA installable.

**Hasil audit (Lighthouse 13.5.0, mobile, Chrome headless, production preview):**

| Kategori | Skor | Target | Status |
|---|---|---|---|
| Performance | **96** | ≥ 85 | Lulus |
| Accessibility | **100** | ≥ 90 | Lulus |
| Best Practices | **100** | ≥ 90 | Lulus |
| SEO | **100** | ≥ 90 | Lulus |
| PWA | — | Installable | Diverifikasi terpisah |

**Metrik inti:**

| Metrik | Nilai |
|---|---|
| First Contentful Paint | 2,1 s |
| Largest Contentful Paint | 2,3 s |
| Total Blocking Time | 20 ms |
| Cumulative Layout Shift | 0 |

Catatan:

- Lighthouse 13.5.0 tidak lagi menyediakan kategori PWA. Status installable diverifikasi oleh `npm run check:pwa` dan `npm run test:e2e:pwa` (manifest, ikon, service worker aktif, reload offline, transaksi offline).
- Audit dilakukan pada build produksi `1.0.0` di `http://127.0.0.1:4174`, viewport mobile 412×823, tanpa throttle tambahan dari aplikasi.
- Perbaikan dari audit pertama: `aria-label` pada elemen tanpa role di progres onboarding dan loading form produk diubah menjadi `role="group"`, sehingga Accessibility naik dari 95 ke 100.

**Cara mengukur:**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
npx lighthouse http://127.0.0.1:4174 \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path=/tmp/stokplus-lighthouse.json
```

Gunakan mode produksi, bukan dev server. Untuk skor yang representatif, jalankan pada mesin idle dengan Chrome headless dan viewport mobile.

---

## 4. Matriks Perangkat

Uji minimal satu perangkat Android dan satu perangkat iOS. Isi versi OS/browser dan hasilnya.

| Perangkat | OS / Browser | Install | Offline | Layout | Update | Catatan |
|---|---|---|---|---|---|---|
| Android utama | _diisi_ | [ ] | [ ] | [ ] | [ ] | |
| iPhone utama | _diisi_ | [ ] | [ ] | [ ] | [ ] | |
| Desktop Chrome | _diisi_ | [ ] | [ ] | [ ] | [ ] | |
| Tablet | _diisi_ | [ ] | [ ] | [ ] | [ ] | |

**Kriteria lulus:**

- Install menghasilkan mode standalone tanpa address bar.
- Reload saat mode pesawat membuka app shell dan transaksi tetap tersimpan.
- Tidak ada horizontal scroll pada 360–430 px.
- Safe area iOS tidak menutupi bottom navigation.
- Update prompt muncul dan data tetap ada setelah reload versi baru.

---

## 5. Checklist Rilis

### 5.1 Kode dan build

- [x] Versi `package.json` = `1.0.0` dan tercermin di `src/config.ts`.
- [x] Schema Dexie final `v2`; tidak ada perubahan schema pada Phase 12.
- [x] `npm run format:check`.
- [x] `npm run check`.
- [x] `npm run test:e2e -- --workers=1`.
- [x] `npm run test:e2e:pwa`.
- [x] `npm run build` + `npm run check:pwa`.
- [x] Tidak ada `console.error` pada alur E2E utama.

### 5.2 PWA

- [x] Manifest StokPlus, `display: standalone`, `start_url`, `scope`, theme color.
- [x] Ikon 192, 512, maskable 512, apple-touch 180.
- [x] Service worker dengan precache app shell dan update prompt.
- [x] Banner offline dan halaman status aplikasi.
- [x] Route fallback SPA untuk hosting statis.
- [ ] Install Android.
- [ ] Install iOS.
- [ ] Update prompt diuji dengan deployment kedua.
- [x] Lighthouse performance ≥ 85 (96).
- [ ] Safe area dan layout diverifikasi di perangkat nyata.

### 5.3 Data

- [ ] Backup final dibuat dari data UAT.
- [ ] Restore backup final diverifikasi.
- [ ] Konsistensi stok diperiksa (stok = Σ lot).
- [ ] Cutover date dan opening lot final (bila migrasi dipakai).
- [ ] HPP historis berlabel estimasi.
- [ ] Data contoh tidak terbawa ke produksi.

### 5.4 Operasional

- [x] `docs/USER-GUIDE.md` tersedia dan dapat dibuka dari aplikasi.
- [x] `docs/UAT.md` dan runner UAT tersedia.
- [x] `docs/DEPLOY.md` memuat Cloudflare Pages, Netlify, static hosting, dan rollback.
- [ ] Checklist backup mingguan disosialisasikan.
- [ ] Kontak bantuan diisi.
- [ ] Sign-off product owner, developer, QA/UAT.

---

## 6. Rollback

Data pengguna tersimpan di IndexedDB perangkat. Rollback aplikasi tidak menghapus data selama schema tetap kompatibel.

### 6.1 Rollback cepat (hosting)

1. Buka Cloudflare Pages → Deployments (atau panel hosting).
2. Pilih deployment stabil terakhir.
3. Jalankan **Rollback**.
4. Verifikasi manifest, service worker, dan halaman utama.
5. Umumkan ke pengguna untuk memuat ulang saat prompt update muncul.

### 6.2 Rollback dari source

```bash
git revert <commit-rilis>
npm ci
npm run check
npm run build
# deploy ulang dist/
```

### 6.3 Aturan schema

- **Jangan** menurunkan `SCHEMA_VERSION` tanpa migrasi mundur.
- Jangan menghapus tabel/field yang masih dipakai versi sebelumnya.
- Jika rilis bermasalah mengubah schema secara tidak kompatibel:
  1. Minta pengguna membuat backup sebelum rollback.
  2. Deploy versi stabil terakhir.
  3. Minta pengguna restore backup yang dibuat sebelum update.
  4. Catat insiden, versi, dan tindakan.

### 6.4 Pencegahan

- Backup sebelum rilis.
- Uji migrasi pada salinan data.
- Simpan minimal satu deployment sebelumnya.
- Deploy bertahap dan pantau error lokal.
- Jangan mengubah `start_url`, `scope`, atau lokasi service worker tanpa uji install ulang.

---

## 7. Komunikasi Rilis

Template pesan ke pengguna:

```text
StokPlus v1.0.0 sudah tersedia.

Yang baru:
- Aplikasi dapat dipasang di layar utama (Android/iOS).
- Aplikasi tetap terbuka dan transaksi tetap bisa dicatat saat offline.
- Panduan pengguna dan UAT tersedia di menu Lainnya.

Langkah yang disarankan:
1. Buka aplikasi.
2. Jika muncul "Versi baru tersedia", ketuk "Muat ulang".
3. Buat backup dari Pengaturan → Backup.
4. Pasang StokPlus ke layar utama.

Data tetap tersimpan di perangkat ini. Tidak ada upload ke server.
```

---

## 8. Keputusan Rilis

| Peran | Nama | Tanggal | Status |
|---|---|---|---|
| Product Owner | | | Menunggu |
| Developer | | | Menunggu |
| QA/UAT | | | Menunggu |

**Keputusan:** [ ] Disetujui [ ] Disetujui dengan catatan [ ] Ditolak

**Catatan:**

```text

```

---

## 9. Setelah Rilis

- [ ] Catat URL produksi, versi, dan tanggal deploy.
- [ ] Simpan hasil Lighthouse dan rekap UAT.
- [ ] Pantau laporan bug 7 hari pertama.
- [ ] Pastikan minimal satu backup pengguna berhasil dipulihkan.
- [ ] Jadwalkan rilis patch berikutnya bila ada bug Major.
- [ ] Perbarui `docs/PHASES.md`, `docs/PROGRESS.md`, dan `README.md`.
