import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function addExpense(
  page: Page,
  options: { category: string; description: string; amount: string; complete: boolean },
) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Transaksi' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
  await page.getByRole('link', { name: /Beban operasional/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Beban operasional' })).toBeVisible()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tambah beban operasional' })).toBeVisible()

  await page.getByLabel('Kategori beban').selectOption({ label: options.category })
  await page.getByLabel('Keterangan').fill(options.description)
  await page.getByLabel('Nominal').fill(options.amount)
  await page.getByRole('button', { name: options.complete ? 'Selesaikan' : 'Simpan draft' }).click()
  await expect(page.getByRole('heading', { name: 'Detail beban' })).toBeVisible()
}

test.describe('Phase 7 operating expenses and profit/loss', () => {
  test('separates expenses from COGS, excludes drafts and cancellations from reports', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })

    await addExpense(page, {
      category: 'Listrik & Air',
      description: 'Tagihan listrik freezer',
      amount: '800000',
      complete: true,
    })
    await addExpense(page, {
      category: 'Sewa Tempat',
      description: 'Sewa tempat bulan ini',
      amount: '500000',
      complete: true,
    })
    await addExpense(page, {
      category: 'Operasional',
      description: 'Draft kebutuhan toko',
      amount: '25000',
      complete: false,
    })
    await expect(page.getByText('Draft belum dihitung dalam laba/rugi.')).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Laporan' })
      .click()
    await expect(page.getByRole('heading', { name: 'Laba / rugi' })).toBeVisible()
    await expect(page.getByText('− Rp 1.300.000', { exact: true })).toBeVisible()
    await expect(page.getByText('2 transaksi ·', { exact: false })).toBeVisible()
    await expect(page.getByText('Rp 0', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('HPP terpisah dari beban operasional')).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Transaksi' })
      .click()
    await page.getByRole('link', { name: /Beban operasional/ }).click()
    await page.getByLabel('Cari beban').fill('Tagihan listrik freezer')
    await page.getByText('Tagihan listrik freezer').click()
    await page.getByRole('button', { name: 'Batalkan beban' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Batalkan beban' }).click()
    await expect(
      page.getByText('Beban dibatalkan dan tidak dihitung dalam laba/rugi.'),
    ).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Laporan' })
      .click()
    await expect(page.getByRole('heading', { name: 'Laba / rugi' })).toBeVisible()
    await expect(page.getByText('− Rp 500.000', { exact: true })).toBeVisible()
    await expect(page.getByText('1 transaksi ·', { exact: false })).toBeVisible()
  })
})
