import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function openMaster(page: Page) {
  await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
  await page.getByRole('link', { name: /Master data/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Master data' })).toBeVisible()
}

async function backToMaster(page: Page) {
  await page.getByRole('link', { name: 'Kembali', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Master data' })).toBeVisible()
}

async function addCategory(page: Page, kode: string, nama: string, status = 'active') {
  await page.getByRole('link', { name: /Kategori produk/ }).click()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Kode').fill(kode)
  await dialog.getByLabel('Nama kategori').fill(nama)
  await dialog.getByLabel('Status').selectOption(status)
  await dialog.getByRole('button', { name: 'Simpan' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { level: 2, name: nama })).toBeVisible()
}

async function addUnit(page: Page, nama: string, simbol: string, status = 'active') {
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nama satuan').fill(nama)
  await dialog.getByLabel('Simbol').fill(simbol)
  await dialog.getByLabel('Status').selectOption(status)
  await dialog.getByRole('button', { name: 'Simpan' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { level: 2, name: nama })).toBeVisible()
}

async function setupCategoryAndUnits(page: Page) {
  await openMaster(page)
  await addCategory(page, 'FRZ', 'Frozen Food')
  await backToMaster(page)

  await page.getByRole('link', { name: /Satuan global/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Satuan global' })).toBeVisible()
  await addUnit(page, 'Pcs', 'pcs')
  await addUnit(page, 'Pack', 'pack')
  await addUnit(page, 'Dus', 'dus')
  await backToMaster(page)
}

async function openProductCreate(page: Page) {
  await page.getByRole('link', { name: /^Produk/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Produk' })).toBeVisible()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tambah produk' })).toBeVisible()
}

async function addProductUnit(page: Page) {
  await page.getByRole('button', { name: 'Tambah satuan' }).click()
}

function unitCard(page: Page, index: number) {
  return page.locator('article').filter({ has: page.locator(`#unit-conversion-${index}`) })
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 })
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
}

test.describe('Phase 4 master data and multi-unit', () => {
  test('creates a multi-unit product with opening lot and locks the base unit', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page)
    await setupCategoryAndUnits(page)
    await openProductCreate(page)

    await page.getByLabel('Nama produk').fill('Siomay Ayam')
    await page.getByLabel('Kategori').selectOption({ label: 'Frozen Food' })
    await page.getByLabel('Base unit').selectOption({ label: 'Pcs (pcs)' })

    await expect(page.locator('#unit-conversion-0')).toBeVisible()
    await expect(page.locator('#unit-conversion-0')).toHaveValue('1')

    await addProductUnit(page)
    await addProductUnit(page)

    const dusCard = unitCard(page, 1)
    const packCard = unitCard(page, 2)

    await page.locator('#unit-conversion-1').fill('100')
    await page.locator('#unit-purchase-price-1').fill('150000')
    await dusCard.getByLabel('Bisa dibeli').check()
    await dusCard.getByLabel('Default beli').check()

    await page.locator('#unit-conversion-2').fill('10')
    await page.locator('#unit-purchase-price-2').fill('20000')
    await page.locator('#unit-sale-price-2').fill('24000')
    await packCard.getByLabel('Bisa dibeli').check()
    await packCard.getByLabel('Bisa dijual').check()

    await page.getByRole('checkbox', { name: 'Aktifkan track expiry' }).check()
    await page.getByLabel('Qty stok awal').fill('25')
    await page.getByLabel('Expiry stok awal').fill('2026-12-31')
    await page.getByRole('button', { name: 'Simpan produk' }).click()

    await expect(page).toHaveURL(/\/master\/produk$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Siomay Ayam' })).toBeVisible()
    await expect(page.getByText('FRZ-001', { exact: true })).toBeVisible()
    await expect(page.getByText('25 pcs', { exact: true })).toBeVisible()
    await expect(page.getByText('Expiry 30 hari', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Edit produk Siomay Ayam' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Edit produk' })).toBeVisible()
    await expect(page.getByText('Base unit dan konversi terkunci')).toBeVisible()
    await expect(page.getByLabel('Base unit')).toBeDisabled()
    await expect(page.locator('#unit-conversion-1')).toBeDisabled()
    await expect(page.locator('#unit-conversion-2')).toBeDisabled()
    await expectNoHorizontalOverflow(page, 360)
    await expectNoHorizontalOverflow(page, 390)
  })

  test('rejects invalid conversion and duplicate barcode, then manages other masters', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page)
    await setupCategoryAndUnits(page)

    await openProductCreate(page)
    await page.getByLabel('Nama produk').fill('Siomay Ayam')
    await page.getByLabel('Base unit').selectOption({ label: 'Pcs (pcs)' })
    await addProductUnit(page)
    await page.locator('#unit-conversion-1').fill('10')
    await page.locator('#unit-barcode-1').fill('8991234567890')
    await page.getByRole('button', { name: 'Simpan produk' }).click()
    await expect(page).toHaveURL(/\/master\/produk$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Siomay Ayam' })).toBeVisible()

    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    await page.getByLabel('Nama produk').fill('Nugget Ayam')
    await page.getByLabel('Base unit').selectOption({ label: 'Pcs (pcs)' })
    await addProductUnit(page)
    await page.locator('#unit-conversion-1').fill('0')
    await page.getByRole('button', { name: 'Simpan produk' }).click()
    await expect(page.getByText('Konversi minimal 1.', { exact: true }).first()).toBeVisible()

    await page.locator('#unit-conversion-1').fill('10')
    await page.locator('#unit-barcode-1').fill('8991234567890')
    await page.getByRole('button', { name: 'Simpan produk' }).click()
    await expect(
      page.getByText('Barcode 8991234567890 sudah dipakai produk lain.', { exact: true }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Batal' }).click()
    await backToMaster(page)

    await page.getByRole('link', { name: /Supplier/ }).click()
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    const supplierDialog = page.getByRole('dialog')
    await supplierDialog.getByLabel('Nama').fill('CV Beku Nusantara')
    await supplierDialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('SUP-001', { exact: true })).toBeVisible()

    await backToMaster(page)
    await page.getByRole('link', { name: /Pelanggan/ }).click()
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    const customerDialog = page.getByRole('dialog')
    await customerDialog.getByLabel('Nama').fill('Warung Bu Sari')
    await customerDialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('CUST-001', { exact: true })).toBeVisible()

    await backToMaster(page)
    await page.getByRole('link', { name: /Kategori beban/ }).click()
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    const expenseDialog = page.getByRole('dialog')
    await expenseDialog.getByLabel('Nama kategori').fill('Listrik & Air')
    await expenseDialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('BB-001', { exact: true })).toBeVisible()
  })

  test('shows only active categories and units in new product pickers', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page)
    await setupCategoryAndUnits(page)

    await addCategory(page, 'OLD', 'Kategori Lama', 'inactive')
    await backToMaster(page)

    await page.getByRole('link', { name: /Satuan global/ }).click()
    await page.getByRole('button', { name: 'Edit satuan Pack' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Status').selectOption('inactive')
    await dialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(dialog).toBeHidden()
    await expect(
      page.locator('article').filter({ hasText: 'Pack' }).getByText('Nonaktif', { exact: true }),
    ).toBeVisible()
    await backToMaster(page)

    await openProductCreate(page)

    const categoryOptions = await page.getByLabel('Kategori').locator('option').allTextContents()
    expect(categoryOptions.join('|')).not.toContain('Kategori Lama')

    const baseOptions = await page.getByLabel('Base unit').locator('option').allTextContents()
    expect(baseOptions.join('|')).not.toContain('Pack')

    await page.getByLabel('Base unit').selectOption({ label: 'Pcs (pcs)' })
    await addProductUnit(page)

    const unitOptions = await page.locator('#unit-select-1').locator('option').allTextContents()
    expect(unitOptions.join('|')).not.toContain('Pack')
    expect(unitOptions.join('|')).toContain('Dus')
  })
})
