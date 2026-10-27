import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

test.describe('Phase 1 app shell', () => {
  test('navigates the five tabs without browser errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })

    await completeOnboarding(page)

    await expect(page.getByRole('heading', { level: 1, name: 'StokPlus' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible()

    const transactionsLink = page.getByRole('link', { name: 'Transaksi', exact: true })
    await transactionsLink.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
    await expect(page).toHaveURL(/\/transaksi$/)
    await expect(transactionsLink).toHaveAttribute('aria-current', 'page')

    const tabs = [
      { label: 'Stok', heading: 'Stok', path: '/stok' },
      { label: 'Laporan', heading: 'Laporan', path: '/laporan' },
      { label: 'Lainnya', heading: 'Lainnya', path: '/lainnya' },
    ]

    for (const tab of tabs) {
      await page.getByRole('link', { name: tab.label, exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: tab.heading })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${tab.path}$`))
    }

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'StokPlus' })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('has no horizontal overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await completeOnboarding(page)

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible()
  })
})
