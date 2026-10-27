import { expect, type Page, test } from '@playwright/test'

import { completeOnboarding, unlock } from '../e2e/helpers'

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        })
      })
    }
  })
}

async function addExpenseOffline(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Transaksi' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transaksi' })).toBeVisible()
  await page.getByRole('link', { name: /Beban operasional/ }).click()
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tambah beban operasional' })).toBeVisible()

  await page.getByLabel('Kategori beban').selectOption({ label: 'Listrik & Air' })
  await page.getByLabel('Keterangan').fill('Beban dicatat saat offline')
  await page.getByLabel('Nominal').fill('125000')
  await page.getByRole('button', { name: 'Selesaikan' }).click()
  await expect(page.getByRole('heading', { name: 'Detail beban' })).toBeVisible()
  await expect(page.getByText('Beban dicatat saat offline')).toBeVisible()
}

test.describe('Phase 12 production PWA', () => {
  test('ships a valid manifest, controls the page, reloads offline, and records a transaction offline', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const manifestResponse = await page.request.get('/manifest.webmanifest')
    expect(manifestResponse.ok()).toBeTruthy()
    const manifest = await manifestResponse.json()
    expect(manifest.name).toBe('StokPlus')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512', '180x180']),
    )

    for (const icon of [
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/icons/maskable-512x512.png',
      '/icons/apple-touch-icon-180x180.png',
    ]) {
      const response = await page.request.get(icon)
      expect(response.ok(), `${icon} harus tersedia`).toBeTruthy()
      expect(response.headers()['content-type']).toContain('image/png')
    }

    await page.goto('/')
    await completeOnboarding(page, { sampleData: true })

    await page.reload()
    await unlock(page)
    await waitForServiceWorkerControl(page)

    const swStatus = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return {
        controlled: Boolean(navigator.serviceWorker.controller),
        active: registration?.active?.state ?? null,
      }
    })
    expect(swStatus).toEqual({ controlled: true, active: 'activated' })

    await page.context().setOffline(true)
    await page.reload()
    await unlock(page)
    await expect(page.getByRole('heading', { level: 1, name: 'StokPlus' })).toBeVisible()
    await expect(page.getByText('Mode offline')).toBeVisible()
    await addExpenseOffline(page)

    await page.context().setOffline(false)
  })
})
