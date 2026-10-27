# Deploy — StokPlus PWA

**Target deploy:** static hosting dengan HTTPS. Tidak ada backend, API, atau database server.

| Item | Nilai |
|---|---|
| Build command | `npm run build` |
| Output | `dist/` |
| Node.js | `>=22.12.0` (disarankan 24, lihat `.nvmrc`) |
| Hosting default | Cloudflare Pages |
| Alternatif | Netlify, GitHub Pages, VPS static |
| SPA fallback | `public/_redirects` → `/* /index.html 200` |
| Headers | `public/_headers` |

> PWA **wajib HTTPS** (kecuali `localhost`). Tanpa HTTPS service worker dan install prompt tidak berjalan.

---

## 1. Build lokal

```bash
nvm use
npm ci
npm run check
npm run build
npm run preview
```

Buka `http://127.0.0.1:4173`. Verifikasi:

- Manifest terbaca di DevTools → Application → Manifest.
- Service worker `activated`.
- Reload offline berhasil.
- `npm run check:pwa` lulus.
- `npm run test:e2e:pwa` lulus (butuh Chromium Playwright).

---

## 2. Cloudflare Pages (default)

1. Push repository ke GitHub/GitLab.
2. Buka Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pilih repository.
4. Konfigurasi:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `22` atau `24` (set `NODE_VERSION=24` bila perlu)
   - **Environment variables:** tidak ada
5. Deploy.
6. Buka domain `*.pages.dev`, lalu verifikasi manifest, install, dan offline.

`public/_redirects` dan `public/_headers` otomatis disalin ke `dist` dan dipakai Cloudflare Pages.

### Custom domain

1. Pages → Custom domains → Set up a domain.
2. Tambahkan CNAME sesuai instruksi Cloudflare.
3. Tunggu SSL aktif, lalu uji ulang install PWA.

---

## 3. Netlify

1. New site from Git → pilih repository.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Node version: `22` atau `24` (misalnya `NODE_VERSION=24`).
5. Deploy.

Netlify membaca `dist/_redirects` dan `dist/_headers` secara otomatis.

---

## 4. Static hosting lain

Salin seluruh isi `dist/` ke web root. Pastikan:

- Semua request yang tidak menemukan file diarahkan ke `/index.html` (SPA fallback).
- `sw.js` dan `manifest.webmanifest` tidak di-cache lama (`Cache-Control: no-cache`).
- Asset ber-hash di `/assets/*` boleh di-cache immutable.
- HTTPS aktif.

Contoh Nginx:

```nginx
server {
  listen 443 ssl;
  server_name stokplus.example.com;
  root /var/www/stokplus/dist;
  index index.html;

  location = /sw.js {
    add_header Cache-Control "no-cache";
    try_files $uri =404;
  }

  location = /manifest.webmanifest {
    add_header Cache-Control "no-cache";
    try_files $uri =404;
  }

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 5. Base path

Konfigurasi saat ini memakai root `/` (`start_url`, `scope`, manifest, dan service worker). Deploy di subpath (misalnya `https://example.com/stokplus/`) memerlukan perubahan:

1. `vite.config.ts` → `base: '/stokplus/'`.
2. Manifest → `start_url: '/stokplus/'`, `scope: '/stokplus/'`.
3. Workbox → `navigateFallback: '/stokplus/index.html'`.
4. `public/_redirects` → `/* /stokplus/index.html 200`.
5. Uji ulang install dan offline.

Untuk MVP, deploy di root domain/subdomain lebih sederhana.

---

## 6. Verifikasi pasca-deploy

- [ ] Halaman terbuka tanpa error console.
- [ ] Manifest: nama StokPlus, ikon 192/512/maskable/apple-touch.
- [ ] Service worker aktif dan mengontrol halaman.
- [ ] Reload offline berhasil.
- [ ] Install Android dan iOS berhasil (lihat `docs/UAT.md`).
- [ ] Update prompt muncul saat versi baru (uji dengan deploy kedua).
- [ ] Data tetap ada setelah update.
- [ ] Backup/restore berjalan.
- [ ] Security headers terpasang.
- [ ] Lighthouse performance ≥ 85.

---

## 7. Rollback

Data pengguna tersimpan lokal, jadi rollback aplikasi tidak menghapus data. Namun schema Dexie harus tetap kompatibel.

1. Identifikasi commit/versi terakhir yang stabil.
2. Deploy ulang commit tersebut (Cloudflare Pages → Deployments → Rollback, atau `git revert` + deploy).
3. Jangan menurunkan `SCHEMA_VERSION` tanpa migrasi mundur.
4. Minta pengguna memuat ulang saat prompt update muncul.
5. Jika ada perubahan schema yang tidak kompatibel, arahkan pengguna untuk restore backup sebelum rollback.
6. Catat insiden dan langkah rollback di `docs/RELEASE.md`.

**Pencegahan:**

- Backup sebelum rilis.
- Uji migrasi schema di salinan data.
- Jangan hapus field/table tanpa masa transisi.
- Simpan minimal satu versi deployment sebelumnya.

---

## 8. Cache dan update

- `registerType: 'prompt'` — service worker baru menunggu konfirmasi pengguna.
- Prompt **Versi baru tersedia** muncul di aplikasi; tombol **Muat ulang** mengaktifkan versi baru.
- `cleanupOutdatedCaches: true` membersihkan cache lama.
- Jika pengguna tidak pernah menutup aplikasi, pengecekan pembaruan berjalan periodik dan saat tab kembali aktif.

---

## 9. Checklist deploy

- [ ] `npm run check` lulus.
- [ ] `npm run test:e2e:all` lulus.
- [ ] `npm run build` lulus.
- [ ] `npm run check:pwa` lulus.
- [ ] Environment tanpa data produksi.
- [ ] Backup final dibuat.
- [ ] Migrasi dry run final (bila ada data Laravel).
- [ ] UAT sign-off.
- [ ] Deploy ke HTTPS.
- [ ] Verifikasi install/offline.
- [ ] Catat versi dan tanggal deploy.
- [ ] Siapkan rollback plan.
