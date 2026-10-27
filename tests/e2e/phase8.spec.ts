import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function createExpiringPurchase(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Transaksi' })
    .click()
  await page.getByRole('link', { name: /^Pembelian/ }).click()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
  await page.getByRole('button', { name: 'Tambah barang' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produk').selectOption({ label: 'Siomay Ayam · SIO-001' })
  await dialog.getByLabel('Satuan beli').selectOption({ label: 'dus · 100 pcs' })
  await dialog.getByLabel('Qty').fill('1')
  await dialog.getByLabel('Harga / satuan').fill('150000')
  await dialog.getByLabel('Expiry').fill('2026-11-10')
  await dialog.getByRole('button', { name: 'Tambah ke pembelian' }).click()
  await page.getByRole('button', { name: 'Sesuai total' }).click()
  await page.getByRole('button', { name: 'Selesaikan' }).click()
  await expect(page.getByRole('heading', { name: 'Detail pembelian' })).toBeVisible()
}

async function openStock(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Stok' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Stok' })).toBeVisible()
}

async function openReport(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Laporan' })
    .click()
  await expect(page.getByRole('heading', { name: 'Laba / rugi' })).toBeVisible()
}

test.describe('Phase 8 lot stock, write-off, and stocktake', () => {
  test('records write-off and stocktake shortage/surplus with lot costs and P&L', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await completeOnboarding(page, { sampleData: true })
    await createExpiringPurchase(page)

    await openStock(page)
    await expect(page.getByRole('link', { name: /Siomay Ayam.*100 pcs/ })).toBeVisible()
    await page.getByRole('link', { name: /Expiry/ }).click()
    await expect(page.getByRole('heading', { name: 'Expiry & lot' })).toBeVisible()
    await expect(page.getByText('Siomay Ayam')).toBeVisible()
    await page.getByRole('link', { name: 'Catat write-off' }).click()
    await expect(page.getByRole('heading', { name: 'Buat write-off' })).toBeVisible()
    await page.locator('select').first().selectOption('damaged')
    await page.getByLabel('Qty base').fill('10')
    await page.getByRole('button', { name: 'Selesaikan' }).click()
    await expect(page.getByRole('heading', { name: 'Detail write-off' })).toBeVisible()
    await expect(page.getByText('Rp 15.000', { exact: true }).first()).toBeVisible()

    await openStock(page)
    await expect(page.getByRole('link', { name: /Siomay Ayam.*90 pcs/ })).toBeVisible()
    await page.getByRole('link', { name: 'Opname Stok fisik' }).click()
    await page.getByRole('link', { name: 'Buat sesi opname' }).click()
    await expect(page.getByRole('heading', { name: 'Buat sesi opname' })).toBeVisible()
    await page.locator('select').first().selectOption({ label: 'Siomay Ayam · stok 90 pcs' })
    await page.getByLabel(/Stok fisik/).fill('88')
    await page.getByRole('button', { name: 'Finalisasi' }).click()
    await expect(page.getByRole('heading', { name: 'Detail opname' })).toBeVisible()
    await expect(page.getByText('Sistem 90 · Fisik 88 pcs')).toBeVisible()
    await expect(page.getByText('Kerugian: Rp 3.000')).toBeVisible()

    await page.getByRole('link', { name: 'Stok', exact: true }).click()
    await page.getByRole('link', { name: 'Opname Stok fisik' }).click()
    await page.getByRole('link', { name: 'Buat sesi opname' }).click()
    await page.locator('select').first().selectOption({ label: 'Siomay Ayam · stok 88 pcs' })
    await page.getByLabel(/Stok fisik/).fill('90')
    await page.getByRole('button', { name: 'Finalisasi' }).click()
    await expect(page.getByRole('heading', { name: 'Detail opname' })).toBeVisible()
    await expect(page.getByText('Surplus tanpa expiry dibuat sebagai lot karantina.')).toBeVisible()

    await openStock(page)
    await expect(page.getByRole('link', { name: /Siomay Ayam.*90 pcs/ })).toBeVisible()
    await page.getByRole('link', { name: /Siomay Ayam/ }).click()
    await expect(page.getByRole('heading', { name: 'Kartu stok' })).toBeVisible()
    await expect(page.getByText('Opname kurang')).toBeVisible()
    await expect(page.getByText('Opname lebih')).toBeVisible()
    await expect(page.getByText('Karantina', { exact: true })).toBeVisible()

    await openReport(page)
    await expect(page.getByText('− Rp 15.000', { exact: true })).toBeVisible()
    await expect(page.getByText('Kerugian persediaan', { exact: true })).toBeVisible()
  })
})
