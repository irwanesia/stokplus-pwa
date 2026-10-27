import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function createPurchaseLot(page: Page, expiry: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Transaksi' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
  await page.getByRole('link', { name: /^Pembelian/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pembelian' })).toBeVisible()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tambah pembelian' })).toBeVisible()
  await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
  await page.getByRole('button', { name: 'Tambah barang' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produk').selectOption({ label: 'Siomay Ayam · SIO-001' })
  await dialog.getByLabel('Satuan beli').selectOption({ label: 'dus · 100 pcs' })
  await dialog.getByLabel('Qty').fill('1')
  await dialog.getByLabel('Harga / satuan').fill('150000')
  await dialog.getByLabel('Expiry').fill(expiry)
  await dialog.getByRole('button', { name: 'Tambah ke pembelian' }).click()
  await page.getByRole('button', { name: 'Sesuai total' }).click()
  await page.getByRole('button', { name: 'Selesaikan' }).click()
  await expect(page.getByRole('heading', { name: 'Detail pembelian' })).toBeVisible()
}

async function fillSale(page: Page, qty: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Transaksi' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
  await page.getByRole('link', { name: /^Penjualan/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Penjualan' })).toBeVisible()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tambah penjualan' })).toBeVisible()
  await page.getByRole('button', { name: 'Tambah barang' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produk').selectOption({ label: 'Siomay Ayam · SIO-001' })
  await dialog.getByLabel('Satuan jual').selectOption({ label: 'pack · 10 pcs' })
  await dialog.getByLabel('Qty').fill(qty)
  await dialog.getByRole('button', { name: 'Tambah ke penjualan' }).click()
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 })
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
}

test.describe('Phase 6 sales, FEFO, and COGS', () => {
  test('consumes FEFO lot, calculates COGS and gross profit, then restores stock on cancel', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })
    await createPurchaseLot(page, '2026-11-10')
    await createPurchaseLot(page, '2026-12-10')

    await fillSale(page, '3')
    await expect(page.getByText('30 pcs', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sesuai total' }).click()
    await expect(page.getByLabel('Jumlah bayar')).toHaveValue('72000')
    await page.getByLabel('Jumlah bayar').fill('73000')
    await expect(page.getByText(/Kembalian/)).toBeVisible()
    await expect(page.getByText('Rp 1.000', { exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page, 360)
    await expectNoHorizontalOverflow(page, 390)
    await page.getByRole('button', { name: 'Selesaikan' }).click()

    await expect(page).toHaveURL(/\/transaksi\/penjualan\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { name: 'Detail penjualan' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 360)
    await expectNoHorizontalOverflow(page, 390)
    await expect(page.getByText('Rp 45.000', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rp 27.000', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('10 Nov 2026')).toBeVisible()
    await expect(page.getByText('Selesai', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Batalkan penjualan' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Batalkan penjualan' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Batal', { exact: true }).first()).toBeVisible()
  })

  test('warns on draft stock shortage and blocks completing an over-stock sale', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })
    await createPurchaseLot(page, '2026-11-10')
    await fillSale(page, '11')
    await expect(page.getByText('Stok layak jual kurang')).toBeVisible()
    await page.getByRole('button', { name: 'Sesuai total' }).click()
    await page.getByRole('button', { name: 'Selesaikan' }).click()
    await expect(page.getByText(/stok non-expired tidak cukup/)).toBeVisible()
    await expect(page).toHaveURL(/\/transaksi\/penjualan\/baru$/)
  })

  test('explains COGS and sales terms in the searchable glossary', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page)
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Lainnya' })
      .click()
    await page.getByRole('link', { name: /Kamus istilah/ }).click()

    const search = page.getByRole('searchbox', { name: 'Cari istilah' })
    await search.fill('COGS')
    await expect(page.getByRole('heading', { name: 'COGS' })).toBeVisible()
    await expect(page.getByText(/Cost of Goods Sold/)).toBeVisible()
    await expect(
      page.getByText(/COGS item = Σ \(qty base dari lot × HPP per base lot\)/),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Laba kotor' })).toBeVisible()

    await search.fill('200 pcs')
    await expect(page.getByRole('heading', { name: 'Konversi satuan' })).toBeVisible()
    await expect(page.getByText('Qty base = qty satuan × jumlah konversi')).toBeVisible()

    await search.fill('walk-in')
    await expect(page.getByRole('heading', { name: 'Walk-in' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'COGS' })).toHaveCount(0)

    await search.fill('karantina')
    await expect(page.getByRole('heading', { name: 'Karantina' })).toBeVisible()
  })
})
