import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

test.describe('Phase 10 reports and export', () => {
  test('filters all six reports, exports workbooks, and prepares a clean print layout', async ({
    page,
  }) => {
    await completeOnboarding(page, { sampleData: true })
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Laporan' })
      .click()
    await expect(page.getByRole('tablist', { name: 'Jenis laporan' })).toBeVisible()

    await page.getByRole('button', { name: 'Tahun ini' }).click()
    const reportToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    const reportYear = reportToday.slice(0, 4)
    const formatDate = (value: string) =>
      new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(
        new Date(`${value}T00:00:00+07:00`),
      )
    const yearRange = `${formatDate(`${reportYear}-01-01`)} – ${formatDate(reportToday)}`
    await expect(page.getByText(yearRange, { exact: true }).first()).toBeVisible()

    const reports = [
      { kind: 'sales', label: 'Penjualan', filename: 'penjualan', heading: 'Transaksi penjualan' },
      {
        kind: 'purchases',
        label: 'Pembelian',
        filename: 'pembelian',
        heading: 'Transaksi pembelian',
      },
      { kind: 'stock', label: 'Stok', filename: 'stok', heading: 'Saldo per produk' },
      { kind: 'expenses', label: 'Beban', filename: 'beban', heading: 'Total beban' },
      { kind: 'expiry', label: 'Expiry', filename: 'expiry', heading: 'Lot expiry' },
      { kind: 'profit-loss', label: 'Laba/rugi', filename: 'laba-rugi', heading: 'Laba / rugi' },
    ]

    for (const report of reports) {
      await page.getByRole('tab', { name: report.label }).click()
      await expect(page.getByRole('heading', { name: report.heading })).toBeVisible()
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Excel' }).click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(
        new RegExp(`^laporan-${report.filename}-${reportYear}-01-01-\\d{4}-\\d{2}-\\d{2}\\.xlsx$`),
      )
    }

    await page.getByRole('button', { name: 'Custom' }).click()
    await page.getByLabel('Dari tanggal').fill('2026-10-10')
    await page.getByLabel('Sampai tanggal').fill('2026-10-20')
    await expect(page.getByText('10 Okt 2026 – 20 Okt 2026', { exact: true }).last()).toBeVisible()

    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.print-report > header')).toBeVisible()
    await expect(page.locator('.no-print').first()).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
  })

  test('shows empty report states and rejects an invalid date range', async ({ page }) => {
    await completeOnboarding(page)
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Laporan' })
      .click()
    await expect(
      page.getByText('Belum ada data untuk laporan ini pada periode terpilih.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.getByLabel('Dari tanggal').fill('2026-10-20')
    await page.getByLabel('Sampai tanggal').fill('2026-10-10')
    await expect(page.getByRole('alert')).toContainText(
      'Tanggal awal tidak boleh melewati tanggal akhir.',
    )
  })
})
