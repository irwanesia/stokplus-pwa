import { expect, test } from '@playwright/test'

import { completeOnboarding, enterPin, unlock } from './helpers'

test.describe('Phase 2 onboarding, PIN, and settings', () => {
  test('completes onboarding, rejects wrong PIN, and shows settings', async ({ page }) => {
    test.setTimeout(60_000)

    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Mulai Baru' })).toBeVisible()

    await page.getByRole('button', { name: 'Pulihkan Backup' }).click()
    const restoreDialog = page.getByRole('dialog')
    await expect(restoreDialog.getByText('Restore mengganti seluruh data')).toBeVisible()
    await expect(restoreDialog.locator('input[type="file"]')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(restoreDialog).toBeHidden()

    await page.getByRole('button', { name: 'Mulai Baru' }).click()
    await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
    await expect(page.getByText('Nama usaha wajib diisi.', { exact: true })).toBeVisible()

    await page.getByLabel('Nama usaha').fill('Frozen Food Bu Rina')
    await page.getByLabel('Nama pemilik').fill('Rina')
    await page.getByRole('button', { name: 'Lanjut', exact: true }).click()

    await enterPin(page, '123456')
    await expect(page.getByText('Ulangi PIN 6 digit', { exact: true })).toBeVisible()
    await enterPin(page, '654321')
    await expect(page.getByText('PIN tidak cocok. Ulangi PIN yang sama.')).toBeVisible()
    await enterPin(page, '123456')

    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('status')).toContainText('Setup selesai', { timeout: 15_000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Masukkan PIN' })).toBeVisible()
    await expect(page.getByText('Frozen Food Bu Rina')).toBeVisible()

    await enterPin(page, '111111')
    await expect(page.getByText('PIN salah. Coba lagi.')).toBeVisible()
    await unlock(page)

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Lainnya' })).toBeVisible()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pengaturan' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lainnya', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await page.getByRole('link', { name: /Keamanan/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Keamanan' })).toBeVisible()
    await page.getByLabel('Batas waktu').selectOption('1')
    await expect(page.getByRole('status')).toContainText('Auto-lock diperbarui.')

    await page.getByRole('link', { name: 'Kembali', exact: true }).click()
    await page.getByRole('link', { name: /Profil usaha/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Profil usaha' })).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await expect(page.getByLabel(/logo/i)).toHaveCount(0)
    await expect(page.getByText('Tidak ada field logo.', { exact: false })).toBeVisible()

    await page.getByRole('link', { name: 'Kembali', exact: true }).click()
    await page.getByRole('link', { name: /Tentang aplikasi/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Tentang aplikasi' })).toBeVisible()
    await expect(page.getByText('Schema Dexie')).toBeVisible()
    await expect(page.getByText('v2', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Kembali', exact: true }).click()
    await page.getByRole('link', { name: /Storage/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Storage' })).toBeVisible()
    await expect(page.getByText('Pemakaian storage')).toBeVisible()

    await page.setViewportSize({ width: 360, height: 800 })
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
  })

  test('activates sample data and records the audit log', async ({ page }) => {
    test.setTimeout(60_000)

    await completeOnboarding(page, { sampleData: true })

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await expect(page.getByText('Data contoh sudah aktif', { exact: false })).toBeVisible()

    await page.getByRole('link', { name: /Tentang aplikasi/ }).click()
    await expect(page.getByText('Data contoh diisi')).toBeVisible()
  })

  test('auto-locks after the configured inactivity window', async ({ page }) => {
    test.setTimeout(60_000)
    await page.clock.install()

    await completeOnboarding(page)

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await page.getByRole('link', { name: /Keamanan/ }).click()
    await page.getByLabel('Batas waktu').selectOption('1')
    await expect(page.getByRole('status')).toContainText('Auto-lock diperbarui.')

    await page.clock.fastForward(60_000)

    await expect(page.getByRole('heading', { name: 'Masukkan PIN' })).toBeVisible()
  })
})
