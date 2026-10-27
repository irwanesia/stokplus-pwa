import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function createDashboardPurchase(page: Page) {
  await page.getByRole('link', { name: 'Transaksi', exact: true }).click()
  await page.getByRole('link', { name: /^Pembelian/ }).click()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
  await page.getByRole('button', { name: 'Tambah barang' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produk').selectOption({ label: 'Siomay Ayam · SIO-001' })
  await dialog.getByLabel('Satuan beli').selectOption({ label: 'pack · 10 pcs' })
  await dialog.getByLabel('Qty').fill('1')
  await dialog.getByLabel('Harga / satuan').fill('20000')
  await dialog.getByLabel('Expiry').fill('2026-11-10')
  await dialog.getByRole('button', { name: 'Tambah ke pembelian' }).click()
  await page.getByRole('button', { name: 'Sesuai total' }).click()
  await page.getByRole('button', { name: 'Selesaikan' }).click()
  await expect(page.getByRole('heading', { name: 'Detail pembelian' })).toBeVisible()
}

test.describe('Phase 9 dashboard and expiry alert', () => {
  test('shows dashboard KPIs, filters period, and links to filtered stock and activity', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await completeOnboarding(page, { sampleData: true })

    await expect(page.getByRole('heading', { level: 1, name: 'StokPlus' })).toBeVisible()
    await expect(page.locator('#main-content').getByText('Frozen Food Bu Rina')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Filter periode dashboard' })).toBeVisible()
    await expect(
      page.getByRole('img', { name: 'Grafik batang penjualan dan HPP enam bulan' }),
    ).toBeVisible()
    await expect(page.getByText('Mulai catat usaha')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Pengingat backup' })).toBeVisible()
    await expect(page.getByLabel('Status backup: perlu backup')).toBeVisible()
    await page.getByRole('button', { name: 'Hari ini' }).click()
    await page.getByRole('button', { name: 'Custom' }).click()
    await expect(page.getByLabel('Dari tanggal')).toHaveValue(/^\d{4}-\d{2}-01$/)

    await createDashboardPurchase(page)
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Aktivitas terbaru' })).toBeVisible()
    const purchaseActivity = page.getByRole('link').filter({ hasText: /Pembelian ·/ })
    await expect(purchaseActivity).toBeVisible()
    await purchaseActivity.click()
    await expect(page).toHaveURL(/\/transaksi\/pembelian\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { name: 'Detail pembelian' })).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await page.getByRole('link', { name: /Hampir expiry/ }).click()
    await expect(page).toHaveURL(/\/stok\/expiry\?filter=soon$/)
    await expect(page.getByRole('button', { name: 'Mendekati' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('Siomay Ayam')).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await page.setViewportSize({ width: 360, height: 844 })
    await page.getByRole('link', { name: /Menipis/ }).click()
    await expect(page).toHaveURL(/\/stok\?filter=low$/)
    const stockFilter = await page
      .getByRole('group', { name: 'Filter stok' })
      .evaluate((element) => ({
        flexWrap: getComputedStyle(element).flexWrap,
        scrollbarWidth: getComputedStyle(element).scrollbarWidth,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }))
    expect(stockFilter.flexWrap).toBe('nowrap')
    expect(stockFilter.scrollbarWidth).toBe('none')
    expect(stockFilter.scrollWidth).toBeGreaterThan(stockFilter.clientWidth)
    await expect(page.getByRole('button', { name: 'Menipis' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('Siomay Ayam')).toBeVisible()
  })

  test('keeps the dashboard within a mobile viewport', async ({ page }) => {
    await completeOnboarding(page)
    await page.setViewportSize({ width: 360, height: 844 })
    await expect(page.getByRole('heading', { name: 'Mulai catat usaha' })).toBeVisible()
    const periodFilter = await page
      .getByRole('group', { name: 'Filter periode dashboard' })
      .evaluate((element) => ({
        flexWrap: getComputedStyle(element).flexWrap,
        scrollbarWidth: getComputedStyle(element).scrollbarWidth,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }))
    expect(periodFilter.flexWrap).toBe('nowrap')
    expect(periodFilter.scrollbarWidth).toBe('none')
    expect(periodFilter.scrollWidth).toBeGreaterThan(periodFilter.clientWidth)

    const expenseAction = page.getByRole('link', { name: 'Beban' })
    await expect(expenseAction).toHaveClass(/border-brand-navy/)

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
  })
})
