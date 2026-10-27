import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding, unlock } from './helpers'

async function openMoreLink(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Lainnya' })
    .click()
  await page.getByRole('link', { name: label }).click()
}

test.describe('Phase 12 PWA polish and release readiness', () => {
  test('shows PWA status, install guidance, user guide, and persists UAT sign-off', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await completeOnboarding(page, { sampleData: true })

    await openMoreLink(page, 'Aplikasi & offline')
    await expect(page.getByRole('heading', { level: 1, name: 'Aplikasi & offline' })).toBeVisible()
    await expect(page.getByText('StokPlus v1.0.0')).toBeVisible()
    await expect(page.getByText('Online', { exact: true })).toBeVisible()
    await expect(page.getByText('Android / Chrome', { exact: true })).toBeVisible()
    await expect(page.getByText('iPhone / iPad (Safari)', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Periksa pembaruan' })).toBeDisabled()

    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('link', { name: 'Lainnya' })
      .click()
    await page.getByRole('link', { name: 'Panduan pengguna' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Panduan pengguna' })).toBeVisible()
    await expect(page.getByText('Alur harian singkat')).toBeVisible()
    await expect(page.getByText('Backup dan pemulihan')).toBeVisible()
    await expect(page.getByText('Pemecahan masalah')).toBeVisible()

    await openMoreLink(page, 'UAT & sign-off')
    await expect(page.getByRole('heading', { level: 1, name: 'UAT & sign-off' })).toBeVisible()
    await expect(page.getByText('0 / 15 skenario lulus · 0%')).toBeVisible()

    for (let index = 1; index <= 15; index += 1) {
      const id = String(index).padStart(2, '0')
      await page.getByRole('button', { name: `Lulus UAT-${id}` }).click()
    }

    await expect(page.getByText('15 / 15 skenario lulus · 100%')).toBeVisible()
    await expect(page.getByText('Memenuhi', { exact: true })).toBeVisible()

    await page.getByLabel('Product Owner').fill('Rina')
    await page.getByLabel('Developer').fill('Developer StokPlus')
    await page.getByLabel('QA/UAT').fill('QA Toko')
    await page.getByLabel('Tanggal UAT').fill('2026-10-27')
    await page.getByRole('button', { name: 'Simpan sign-off' }).click()
    await expect(page.getByText(/Sign-off disimpan/)).toBeVisible()

    await page.reload()
    await unlock(page)
    await expect(page.getByRole('heading', { level: 1, name: 'UAT & sign-off' })).toBeVisible()
    await expect(page.getByText('15 / 15 skenario lulus · 100%')).toBeVisible()
    await expect(page.getByText(/Sign-off disimpan/)).toBeVisible()
  })

  test('covers the device matrix without horizontal scrolling', async ({ page }) => {
    test.setTimeout(90_000)
    await completeOnboarding(page)

    const viewports = [
      { width: 360, height: 640, name: 'Android kecil' },
      { width: 390, height: 844, name: 'Android umum' },
      { width: 430, height: 932, name: 'iPhone besar' },
      { width: 768, height: 1024, name: 'Tablet' },
    ]

    const tabs = [
      { label: 'Dashboard', path: '/', heading: 'StokPlus' },
      { label: 'Transaksi', path: '/transaksi', heading: 'Transaksi' },
      { label: 'Stok', path: '/stok', heading: 'Stok' },
      { label: 'Laporan', path: '/laporan', heading: 'Laporan' },
      { label: 'Lainnya', path: '/lainnya', heading: 'Lainnya' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const tab of tabs) {
        await page
          .getByRole('navigation', { name: 'Navigasi utama' })
          .getByRole('link', { name: tab.label, exact: true })
          .click()
        await expect(page.getByRole('heading', { level: 1, name: tab.heading })).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`${tab.path}$`))

        const metrics = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }))

        expect(
          metrics.scrollWidth,
          `${viewport.name} ${tab.path} tidak boleh overflow horizontal`,
        ).toBeLessThanOrEqual(metrics.clientWidth + 1)
      }
    }
  })

  test('has accessible landmarks, labels, and keyboard skip link', async ({ page }) => {
    await completeOnboarding(page)

    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    const skipLink = page.getByRole('link', { name: 'Lewati ke konten' })
    await expect(skipLink).toHaveAttribute('href', '#main-content')
    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    const audit = await page.evaluate(() => {
      const emptyButtons = Array.from(document.querySelectorAll('button')).filter((button) => {
        const name =
          button.getAttribute('aria-label') ??
          button.getAttribute('title') ??
          button.textContent?.trim()
        return !name
      }).length

      const unlabeledFields = Array.from(
        document.querySelectorAll<HTMLInputElement>('input, select, textarea'),
      ).filter((field) => {
        if (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')) {
          return false
        }
        if (field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`)) {
          return false
        }
        return !field.closest('label')
      }).length

      const missingAlt = Array.from(document.querySelectorAll('img')).filter(
        (image) => !image.hasAttribute('alt'),
      ).length

      return { emptyButtons, unlabeledFields, missingAlt }
    })

    expect(audit).toEqual({ emptyButtons: 0, unlabeledFields: 0, missingAlt: 0 })
  })
})
