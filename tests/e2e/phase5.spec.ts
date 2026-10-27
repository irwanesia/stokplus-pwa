import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

async function openPurchases(page: Page) {
  await page.getByRole('link', { name: 'Transaksi', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
  await page.getByRole('link', { name: /^Pembelian/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pembelian' })).toBeVisible()
}

async function openPurchaseCreate(page: Page) {
  await openPurchases(page)
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tambah pembelian' })).toBeVisible()
}

async function addSiomayItem(
  page: Page,
  options: { qty?: string; expiry?: string; price?: string } = {},
) {
  const { qty = '2', expiry = '2026-12-12', price = '150000' } = options

  await page.getByRole('button', { name: 'Tambah barang' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Tambah barang' })).toBeVisible()
  await dialog.getByLabel('Produk').selectOption({ label: 'Siomay Ayam · SIO-001' })
  await dialog.getByLabel('Satuan beli').selectOption({ label: 'dus · 100 pcs' })
  const qtyInput = dialog.getByLabel('Qty')
  await qtyInput.click()
  await page.waitForTimeout(50)
  await page.keyboard.type(qty)
  await expect(qtyInput).toHaveValue(qty)

  const priceInput = dialog.getByLabel('Harga / satuan')
  await priceInput.click()
  await page.waitForTimeout(50)
  await page.keyboard.type(price)
  await expect(priceInput).toHaveValue(price)
  if (expiry) {
    await dialog.getByLabel('Expiry').fill(expiry)
  }
  await dialog.getByRole('button', { name: 'Tambah ke pembelian' }).click()
  await expect(dialog).toBeHidden()
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 })
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
}

test.describe('Phase 5 purchases, lots, expiry, and HPP', () => {
  test('completes a purchase with lot, HPP, and guarded cancellation', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })
    await openPurchaseCreate(page)

    await expect(page.getByLabel('Supplier')).toHaveValue(/.+/)
    await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
    await addSiomayItem(page)

    await expect(page.getByText('2 dus')).toBeVisible()
    await expect(page.getByText('200 pcs')).toBeVisible()

    await page.getByLabel('Diskon header').click()
    await page.waitForTimeout(50)
    await page.keyboard.type('10000')
    await expect(page.getByLabel('Diskon header')).toHaveValue('10000')
    await page.getByLabel('Biaya angkut').click()
    await page.waitForTimeout(50)
    await page.keyboard.type('5000')
    await expect(page.getByLabel('Biaya angkut')).toHaveValue('5000')
    await page.getByRole('button', { name: 'Sesuai total' }).click()
    await expect(page.getByLabel('Jumlah bayar')).toHaveValue('295000')

    await expectNoHorizontalOverflow(page, 360)
    await expectNoHorizontalOverflow(page, 390)

    await page.getByRole('button', { name: 'Sesuai total' }).click()
    await page.getByRole('button', { name: 'Selesaikan' }).click()
    await expect(page).toHaveURL(/\/transaksi\/pembelian\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Detail pembelian' })).toBeVisible()
    await expect(page.getByText('Rp 295.000', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rp 1.475', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/LOT-PB-\d{8}-\d{4}-1/)).toBeVisible()
    await expect(page.getByText('200 pcs', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Selesai', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Batalkan pembelian' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/semua lot dari pembelian ini masih utuh/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Batalkan pembelian' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Batal', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Stok sudah dikembalikan/)).toBeVisible()
    await expect(page.getByText('0 pcs', { exact: true }).first()).toBeVisible()
  })

  test('blocks cancellation after a lot has been consumed', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })
    await openPurchaseCreate(page)

    await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
    await addSiomayItem(page)
    await page.getByRole('button', { name: 'Sesuai total' }).click()
    await page.getByRole('button', { name: 'Selesaikan' }).click()
    await expect(page).toHaveURL(/\/transaksi\/pembelian\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Detail pembelian' })).toBeVisible()

    // Simulasi konsumsi lot dari penjualan sampai modul Penjualan tersedia di Phase 6.
    await page.evaluate(async () => {
      const request = indexedDB.open('stokplus')
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const lot = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
        const transaction = database.transaction('stock_lots', 'readonly')
        const all = transaction.objectStore('stock_lots').getAll()
        all.onsuccess = () => resolve(all.result[0])
        all.onerror = () => reject(all.error)
      })

      if (!lot) throw new Error('Lot pembelian tidak ditemukan.')

      const now = new Date().toISOString()
      const qtyBase = 50
      const unitCostBase = Number(lot.unit_cost_base)
      const updatedLot = {
        ...lot,
        qty_remaining_base: Number(lot.qty_received_base) - qtyBase,
        updated_at: now,
      }

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          ['stock_lots', 'sale_lot_consumptions'],
          'readwrite',
        )
        transaction.objectStore('stock_lots').put(updatedLot)
        transaction.objectStore('sale_lot_consumptions').add({
          id: crypto.randomUUID(),
          sale_id: crypto.randomUUID(),
          sale_item_id: crypto.randomUUID(),
          lot_id: lot.id,
          qty_base: qtyBase,
          unit_cost_base: unitCostBase,
          total_cost: qtyBase * unitCostBase,
          created_at: now,
        })
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })

      database.close()
    })

    const nota = await page.locator('h2').first().textContent()
    await page.getByRole('link', { name: 'Kembali', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pembelian' })).toBeVisible()
    await page.getByRole('link', { name: new RegExp(nota ?? '') }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detail pembelian' })).toBeVisible()
    await expect(page.getByText('Terpakai', { exact: true })).toBeVisible()
    await expect(page.getByText('50 pcs', { exact: true })).toBeVisible()
    await expect(page.getByText(/Sebagian lot sudah terpakai/)).toBeVisible()

    await page.getByRole('button', { name: 'Batalkan pembelian' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Batalkan pembelian' }).click()
    await expect(dialog.getByText(/sebagian lot sudah terpakai/)).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  test('lists all active products and explains missing purchase units', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Master data/ }).click()
    await page.getByRole('link', { name: /^Produk/ }).click()
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()

    await page.getByLabel('Nama produk').fill('Kentang Goreng')
    await page.getByLabel('Kategori').selectOption({ label: 'Frozen Food' })
    await page.getByLabel('Base unit').selectOption({ label: 'Pcs (pcs)' })
    await page.getByLabel('Bisa dibeli').uncheck()
    await page.getByRole('button', { name: 'Simpan produk' }).click()
    await expect(page).toHaveURL(/\/master\/produk$/)

    await openPurchaseCreate(page)
    await expect(page.getByText('1 produk aktif belum punya satuan beli')).toBeVisible()
    await expect(page.getByText(/Kentang Goreng/)).toBeVisible()

    await page.getByRole('button', { name: 'Tambah barang' }).click()
    const dialog = page.getByRole('dialog')
    const options = dialog.getByLabel('Produk').locator('option')
    await expect(options).toHaveCount(5)

    const missingOption = options.filter({ hasText: 'Kentang Goreng' })
    await expect(missingOption).toHaveCount(1)
    await expect(missingOption).toContainText('belum ada satuan beli')

    const missingValue = await missingOption.getAttribute('value')
    await dialog.getByLabel('Produk').selectOption(missingValue ?? '')
    await expect(dialog.getByText(/belum punya satuan yang bisa dibeli/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Tambah ke pembelian' })).toBeDisabled()
  })

  test('keeps draft stock unchanged and explains the next step', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page, { sampleData: true })
    await openPurchaseCreate(page)

    await page.getByLabel('Supplier').selectOption({ label: 'CV Frozen Nusantara' })
    await addSiomayItem(page, { qty: '1' })
    await page.getByRole('button', { name: 'Simpan draft' }).click()

    await expect(page).toHaveURL(/\/transaksi\/pembelian\/[^/]+$/)
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Draft belum mengubah stok/)).toBeVisible()
    await expect(page.getByText('Belum ada lot', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Master data/ }).click()
    await page.getByRole('link', { name: /^Produk/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Siomay Ayam' })).toBeVisible()
    await expect(page.getByText('0 pcs', { exact: true }).first()).toBeVisible()
  })
})
