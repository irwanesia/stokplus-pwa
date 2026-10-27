import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const failures = []
const warnings = []

function fail(message) {
  failures.push(message)
}

function warn(message) {
  warnings.push(message)
}

function read(path) {
  if (!existsSync(path)) {
    fail(`File tidak ditemukan: ${path.replace(`${root}/`, '')}`)
    return null
  }

  return readFileSync(path)
}

function pngSize(path) {
  const buffer = read(path)
  if (!buffer) {
    return null
  }

  const signature = buffer.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') {
    fail(`Bukan PNG valid: ${path.replace(`${root}/`, '')}`)
    return null
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

const manifestPath = join(dist, 'manifest.webmanifest')
const manifestBuffer = read(manifestPath)

if (manifestBuffer) {
  let manifest

  try {
    manifest = JSON.parse(manifestBuffer.toString('utf8'))
  } catch {
    fail('manifest.webmanifest bukan JSON valid')
  }

  if (manifest) {
    const required = {
      name: 'StokPlus',
      short_name: 'StokPlus',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#1E2A78',
      background_color: '#F7F5F1',
    }

    for (const [key, expected] of Object.entries(required)) {
      if (manifest[key] !== expected) {
        fail(`Manifest ${key} harus "${expected}", ditemukan "${manifest[key]}"`)
      }
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : []
    const expectedIcons = [
      { src: 'icons/icon-192x192.png', sizes: '192x192' },
      { src: 'icons/icon-512x512.png', sizes: '512x512' },
      { src: 'icons/maskable-512x512.png', sizes: '512x512', purpose: 'maskable' },
      { src: 'icons/apple-touch-icon-180x180.png', sizes: '180x180' },
    ]

    for (const expected of expectedIcons) {
      const icon = icons.find((item) => item.src === expected.src)
      if (!icon) {
        fail(`Manifest kehilangan ikon ${expected.src}`)
        continue
      }

      if (icon.sizes !== expected.sizes) {
        fail(`Ukuran manifest ${expected.src} harus ${expected.sizes}`)
      }

      if (expected.purpose && icon.purpose !== expected.purpose) {
        fail(`Purpose manifest ${expected.src} harus ${expected.purpose}`)
      }

      const size = pngSize(join(dist, expected.src))
      if (size && `${size.width}x${size.height}` !== expected.sizes) {
        fail(
          `Dimensi PNG ${expected.src} ${size.width}x${size.height}, seharusnya ${expected.sizes}`,
        )
      }
    }

    if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 2) {
      warn('Manifest belum memiliki shortcut penjualan dan pembelian.')
    }
  }
}

const indexBuffer = read(join(dist, 'index.html'))
if (indexBuffer) {
  const index = indexBuffer.toString('utf8')

  for (const marker of ['manifest.webmanifest', 'theme-color', 'apple-touch-icon', 'viewport']) {
    if (!index.includes(marker)) {
      fail(`index.html kehilangan marker ${marker}`)
    }
  }
}

const swBuffer = read(join(dist, 'sw.js'))
if (swBuffer && !swBuffer.toString('utf8').includes('precacheAndRoute')) {
  fail('sw.js tidak berisi precache Workbox')
}

const redirectsBuffer = read(join(dist, '_redirects'))
if (redirectsBuffer && !redirectsBuffer.toString('utf8').includes('/index.html')) {
  fail('_redirects tidak mengarahkan SPA ke /index.html')
}

const headersBuffer = read(join(dist, '_headers'))
if (headersBuffer) {
  const headers = headersBuffer.toString('utf8')
  for (const header of ['X-Content-Type-Options', '/sw.js', '/assets/*']) {
    if (!headers.includes(header)) {
      fail(`_headers kehilangan konfigurasi ${header}`)
    }
  }
}

for (const file of ['registerSW.js', 'workbox-2fbc6a65.js']) {
  if (file === 'registerSW.js' && existsSync(join(dist, file))) {
    warn('registerSW.js masih ada; registrasi manual seharusnya tidak menghasilkan file ini.')
  }
}

const mainScript = indexBuffer?.toString('utf8').match(/<script[^>]+src="([^"]+\.js)"/)?.[1]

if (mainScript) {
  const mainPath = join(dist, mainScript.replace(/^\//, ''))
  if (existsSync(mainPath)) {
    const size = statSync(mainPath).size
    if (size > 500 * 1024) {
      warn(`Chunk utama ${(size / 1024).toFixed(0)} kB, di atas target 500 kB.`)
    }
  }
}

for (const warning of warnings) {
  console.warn(`WARN  ${warning}`)
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL  ${failure}`)
  }
  process.exit(1)
}

console.log('OK    Manifest, ikon, index.html, dan service worker valid.')
