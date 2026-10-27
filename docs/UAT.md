# UAT — StokPlus PWA v1.0.0

**User Acceptance Test untuk rilis MVP.**

| Item | Nilai |
|---|---|
| Versi aplikasi | 1.0.0 |
| Schema Dexie | v2 |
| Tanggal script | 27 Oktober 2026 |
| Status | Menunggu pelaksanaan di perangkat |
| Acuan | `docs/PHASES.md` §13 |
| Alat bantu | `/lainnya/uat` di aplikasi |

---

## 1. Persiapan

1. Jalankan `npm run check` dan `npm run test:e2e:all` sampai lulus.
2. Build produksi: `npm run build`.
3. Jalankan `npm run preview` dan buka `http://127.0.0.1:4173`.
4. Siapkan dua perangkat bila memungkinkan:
   - Android + Chrome (utama).
   - iPhone/iPad + Safari (install dan safe area).
5. Siapkan data contoh dari **Pengaturan → Data contoh** atau gunakan data UAT yang disepakati.
6. Buat backup awal sebelum mengubah data UAT.
7. Buka **Lainnya → UAT & sign-off** untuk mencatat hasil per skenario.

> Jangan memakai data produksi untuk UAT. Gunakan data contoh atau salinan anonim.

---

## 2. Skenario UAT

| # | Skenario | Langkah | Expected | Hasil |
|---|---|---|---|---|
| UAT-01 | Onboarding | Buat usaha + PIN 6 digit, lalu tutup dan buka ulang aplikasi | Dashboard terbuka; PIN diminta setelah reload | [ ] Lulus [ ] Gagal |
| UAT-02 | Master multi-unit | Buat Siomay pcs/pack/dus; coba barcode duplikat | Konversi benar; barcode duplikat ditolak | [ ] Lulus [ ] Gagal |
| UAT-03 | Opening lot | Isi stok awal + expiry produk track-expiry | Lot terbentuk dan stok awal benar | [ ] Lulus [ ] Gagal |
| UAT-04 | Pembelian | Catat 2 dus Siomay + expiry, diskon, angkut | Stok naik; lot, expiry, dan HPP tampil | [ ] Lulus [ ] Gagal |
| UAT-05 | Penjualan FEFO | Jual 3 pack saat ada dua lot berbeda expiry | Lot expiry terdekat dikonsumsi; laba kotor tampil | [ ] Lulus [ ] Gagal |
| UAT-06 | Stok kurang | Jual melebihi stok non-expired | Ditolak tanpa mutasi stok/lot | [ ] Lulus [ ] Gagal |
| UAT-07 | Beban | Catat listrik + sewa, selesaikan | Laba bersih turun; HPP tidak berubah | [ ] Lulus [ ] Gagal |
| UAT-08 | Expiry | Write-off lot expired | Stok turun; kerugian persediaan tampil | [ ] Lulus [ ] Gagal |
| UAT-09 | Opname | Fisik lebih kecil dari sistem | Shortage FEFO; laba/rugi menyesuaikan | [ ] Lulus [ ] Gagal |
| UAT-10 | Laporan | Buka P&L periode UAT | Penjualan, HPP, beban, loss, laba bersih konsisten | [ ] Lulus [ ] Gagal |
| UAT-11 | Export | Export laporan penjualan | File xlsx terunduh dan terbuka | [ ] Lulus [ ] Gagal |
| UAT-12 | Backup/restore | Backup → reset → restore dari onboarding | Profil, PIN, master, transaksi, lot, expiry kembali | [ ] Lulus [ ] Gagal |
| UAT-13 | Offline | Mode pesawat, buka aplikasi, catat transaksi | App shell terbuka; transaksi tersimpan | [ ] Lulus [ ] Gagal |
| UAT-14 | Install | Add to home screen di Android/iOS | Standalone tanpa address bar | [ ] Lulus [ ] Gagal |
| UAT-15 | Migrasi | Import sample Laravel + opening lot | Stok = sumber; HPP estimasi berlabel; rekonsiliasi cocok | [ ] Lulus [ ] Gagal |

**Ambang gate:** minimal **14 dari 15** skenario lulus (≥90%), **tidak ada skenario gagal**, dan tidak ada bug kritis.

---

## 3. Bukti pendukung

Lampirkan atau catat:

- [ ] Hasil `npm run check` (lint, typecheck, unit test, build, PWA check).
- [ ] Hasil `npm run test:e2e -- --workers=1`.
- [ ] Hasil `npm run test:e2e:pwa`.
- [ ] Lighthouse performance ≥ 85 (lihat `docs/RELEASE.md`).
- [ ] Screenshot install Android dan iOS.
- [ ] Screenshot mode offline + transaksi offline.
- [ ] Backup final dan hasil restore.
- [ ] Rekap UAT dari `/lainnya/uat` (print/PDF).
- [ ] Device matrix tervalidasi.

---

## 4. Device Matrix

| Perangkat / Browser | Versi | Install | Offline | Layout | Catatan |
|---|---|---|---|---|---|
| Android — Chrome | | [ ] | [ ] | [ ] | |
| iPhone — Safari | | [ ] | [ ] | [ ] | |
| Desktop — Chrome | | [ ] | [ ] | [ ] | |
| Tablet — Chrome/Safari | | [ ] | [ ] | [ ] | |

---

## 5. Bug Log

| # | Skenario | Deskripsi | Severity | Status | Perbaikan |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

Severity: **Blocker**, **Critical**, **Major**, **Minor**, **Cosmetic**. Blocker/Critical harus nol sebelum rilis.

---

## 6. Sign-off

| Peran | Nama | Tanggal | Status |
|---|---|---|---|
| Product Owner | | | Menunggu |
| Developer | | | Menunggu |
| QA/UAT | | | Menunggu |

**Keputusan rilis:** [ ] Disetujui [ ] Disetujui dengan catatan [ ] Ditolak

Catatan:

```text

```

Setelah sign-off, salin hasil dan tanggal ke `docs/PHASES.md` §13.1 serta ubah status Phase 12 sesuai gate.
