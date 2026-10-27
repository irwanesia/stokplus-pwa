import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function openMigration(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Lainnya' })
    .click()
  await page.getByRole('link', { name: 'Pengaturan' }).click()
  await page.getByRole('link', { name: 'Migrasi Laravel' }).click()
}

const migrationExport = {
  meta: {
    app: 'SMPP Laravel',
    version: '1.0',
    exported_at: '2026-10-27T09:00:00+07:00',
    schema: 'mysql-2026-10',
    source_php: '8.3.36',
  },
  tables: {
    product_categories: [{ id: 1, kode: 'FRO', nama: 'Frozen Food', status: 1 }],
    units: [{ id: 1, nama: 'Pcs', status: 1 }],
    products: [
      {
        id: 1,
        kode: 'FR-001',
        nama: 'Siomay Ayam',
        kategori_id: 1,
        satuan_id: 1,
        harga_beli: '1200.00',
        harga_jual: '2000.00',
        min_stock: 2,
        stock: 5,
        status: 1,
      },
    ],
    suppliers: [],
    customers: [],
    expense_categories: [],
    purchases: [],
    purchase_details: [],
    sales: [],
    sale_details: [],
    expenses: [],
    stock_movements: [],
    stock_opnames: [],
    stock_opname_details: [],
  },
}

test.describe('Phase 11 Laravel migration', () => {
  test('validates export, creates opening lot, backs up local data, and reports quarantine', async ({
    page,
  }) => {
    await completeOnboarding(page)
    await openMigration(page)
    await expect(page.getByRole('heading', { name: 'Migrasi Laravel' })).toBeVisible()

    await page.getByLabel('Pilih file export Laravel').setInputFiles({
      name: 'stokplus-export-20261027-0900.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(migrationExport)),
    })
    await expect(page.getByText('PHP sumber: 8.3.36')).toBeVisible()
    await page.getByRole('button', { name: 'Validasi & siapkan preview' }).click()
    await expect(page.getByText(/1 lot akan dikarantina/)).toBeVisible()

    await page.getByLabel('Ketik MIGRASI untuk mengonfirmasi').fill('MIGRASI')
    const backupDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Import dan ganti data' }).click()
    expect((await backupDownload).suggestedFilename()).toMatch(/^stokplus-backup-/)

    await expect(page.getByText(/Import berhasil · cutover/)).toBeVisible()
    await expect(page.getByText('Opening lot: 1')).toBeVisible()
    await expect(page.getByText(/1 lot menunggu pelengkapan expiry/)).toBeVisible()
  })

  test('rejects an invalid source before replacing any local data', async ({ page }) => {
    await completeOnboarding(page)
    await openMigration(page)
    const invalidExport = structuredClone(migrationExport)
    invalidExport.tables.products[0].kategori_id = 404

    await page.getByLabel('Pilih file export Laravel').setInputFiles({
      name: 'invalid-export.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(invalidExport)),
    })
    await expect(page.getByRole('alert')).toContainText('data yang tidak tersedia')
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Lainnya' })
      .click()
    await page.getByRole('link', { name: 'Pengaturan' }).click()
    await expect(page.getByRole('main').getByText('Frozen Food Bu Rina')).toBeVisible()
  })
})
