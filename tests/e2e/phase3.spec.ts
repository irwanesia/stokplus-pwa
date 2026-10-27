import { expect, test, type Download, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { completeOnboarding, unlock } from './helpers'

async function openBackupPage(page: Page) {
  await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
  await page.getByRole('link', { name: /Pengaturan/ }).click()
  await page.getByRole('link', { name: /Backup & restore/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Backup' })).toBeVisible()
}

async function downloadedBackup(download: Download): Promise<{
  path: string
  raw: Record<string, unknown>
}> {
  const path = await download.path()

  if (!path) {
    throw new Error('Downloaded backup has no local path')
  }

  return {
    path,
    raw: JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>,
  }
}

test.describe('Phase 3 backup and restore', () => {
  test('creates a backup, downloads a safety backup, and restores data', async ({ page }) => {
    test.setTimeout(90_000)

    await completeOnboarding(page, { sampleData: true })
    await expect(page.getByRole('complementary', { name: 'Pengingat backup' })).toBeVisible()

    await page.getByRole('link', { name: 'Backup sekarang' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Backup' })).toBeVisible()

    const backupDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Buat backup sekarang' }).click()
    const backupDownload = await backupDownloadPromise
    expect(backupDownload.suggestedFilename()).toMatch(/^stokplus-backup-\d{8}-\d{4}\.json$/)

    const backup = await downloadedBackup(backupDownload)
    expect(backup.raw.app).toBe('StokPlus')
    expect(backup.raw.schemaVersion).toBe(2)
    expect(backup.raw.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(backup.raw.tables).toHaveProperty('stock_lots')

    await page.getByRole('link', { name: 'Buka restore' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Restore' })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(backup.path)
    await expect(page.getByText('Backup valid dan siap dipulihkan')).toBeVisible()
    await expect(page.getByText('Lot stok')).toBeVisible()

    await page.getByLabel('Ketik PULIHKAN untuk konfirmasi').fill('PULIHKAN')

    const safetyDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Pulihkan semua data' }).click()
    const safetyDownload = await safetyDownloadPromise
    expect(safetyDownload.suggestedFilename()).toMatch(/^stokplus-safety-backup-\d{8}-\d{4}\.json$/)

    await expect(page.getByRole('heading', { name: 'Masukkan PIN' })).toBeVisible()
    await unlock(page)

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Pengingat backup' })).toBeHidden()

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await page.getByRole('link', { name: /Backup & restore/ }).click()
    await expect(page.getByText('Belum pernah backup')).toHaveCount(0)
  })

  test('rejects corrupt files and the wrong schema without changing data', async ({ page }) => {
    test.setTimeout(90_000)

    await completeOnboarding(page, { sampleData: true })
    await openBackupPage(page)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Buat backup sekarang' }).click()
    const backup = await downloadedBackup(await downloadPromise)

    await page.getByRole('link', { name: 'Buka restore' }).click()

    const corrupt = { ...backup.raw, checksum: '0'.repeat(64) }
    await page.locator('input[type="file"]').setInputFiles({
      name: 'corrupt.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(corrupt)),
    })
    await expect(
      page.getByText('Checksum backup tidak cocok. File mungkin rusak atau sudah diubah.'),
    ).toBeVisible()
    await expect(page.getByText('Backup valid dan siap dipulihkan')).toHaveCount(0)

    const wrongSchema = { ...backup.raw, schemaVersion: 99 }
    await page.locator('input[type="file"]').setInputFiles({
      name: 'wrong-schema.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(wrongSchema)),
    })
    await expect(page.getByText(/Backup memakai schema v99/)).toBeVisible()
    await expect(page.getByText('Backup valid dan siap dipulihkan')).toHaveCount(0)

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await expect(page.getByText('Data contoh sudah aktif')).toBeVisible()
  })

  test('requires a safety backup before reset and restores from onboarding', async ({ page }) => {
    test.setTimeout(90_000)

    await completeOnboarding(page, { sampleData: true })
    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await page.getByRole('button', { name: 'Reset aplikasi' }).click()

    const resetDialog = page.getByRole('dialog')
    await expect(resetDialog.getByText('Backup wajib sebelum reset')).toBeVisible()
    await resetDialog.getByLabel(/Ketik HAPUS/).fill('HAPUS')
    await expect(resetDialog.getByRole('button', { name: 'Reset permanen' })).toBeDisabled()

    const resetBackupPromise = page.waitForEvent('download')
    await resetDialog.getByRole('button', { name: 'Buat backup sebelum reset' }).click()
    const resetBackup = await downloadedBackup(await resetBackupPromise)
    await expect(resetDialog.getByText(/Backup siap:/)).toBeVisible()

    await expect(resetDialog.getByRole('button', { name: 'Reset permanen' })).toBeEnabled()
    await resetDialog.getByRole('button', { name: 'Reset permanen' }).click()

    await expect(page.getByRole('button', { name: 'Mulai Baru' })).toBeVisible()
    await page.getByRole('button', { name: 'Pulihkan Backup' }).click()

    const restoreDialog = page.getByRole('dialog')
    await restoreDialog.locator('input[type="file"]').setInputFiles(resetBackup.path)
    await expect(restoreDialog.getByText('Backup valid dan siap dipulihkan')).toBeVisible()
    await restoreDialog.getByLabel('Ketik PULIHKAN untuk konfirmasi').fill('PULIHKAN')
    await restoreDialog.getByRole('button', { name: 'Pulihkan semua data' }).click()

    await expect(page.getByRole('heading', { name: 'Masukkan PIN' })).toBeVisible()
    await unlock(page)

    await page.getByRole('link', { name: 'Lainnya', exact: true }).click()
    await page.getByRole('link', { name: /Pengaturan/ }).click()
    await expect(page.getByText('Data contoh sudah aktif')).toBeVisible()
  })

  test('creates an encrypted backup and rejects a wrong passphrase', async ({ page }) => {
    test.setTimeout(90_000)

    await completeOnboarding(page, { sampleData: true })
    await openBackupPage(page)

    await page.getByRole('checkbox', { name: /Enkripsi dengan passphrase/ }).check()
    await page.getByLabel('Passphrase backup').fill('rahasia123')
    await page.getByLabel('Ulangi passphrase').fill('rahasia123')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Buat backup terenkripsi' }).click()
    const backup = await downloadedBackup(await downloadPromise)

    expect(backup.raw.format).toBe('stokplus-backup-encrypted')
    expect(backup.raw.ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(backup.raw).not.toHaveProperty('tables')

    await page.getByRole('link', { name: 'Buka restore' }).click()
    await page.locator('input[type="file"]').setInputFiles(backup.path)
    await expect(page.getByText('Backup terenkripsi', { exact: true })).toBeVisible()

    await page.getByLabel('Passphrase', { exact: true }).fill('passphrase-salah')
    await page.getByRole('button', { name: 'Buka file backup' }).click()
    await expect(page.getByText('Passphrase salah atau file backup rusak.')).toBeVisible()
    await expect(page.getByText('Backup valid dan siap dipulihkan')).toHaveCount(0)

    await page.getByLabel('Passphrase', { exact: true }).fill('rahasia123')
    await page.getByRole('button', { name: 'Buka file backup' }).click()
    await expect(page.getByText('Backup valid dan siap dipulihkan')).toBeVisible()
  })
})
