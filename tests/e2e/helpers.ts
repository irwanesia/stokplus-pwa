import { expect, type Page } from '@playwright/test'

export const DEFAULT_PIN = '123456'

export async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
}

export async function completeOnboarding(
  page: Page,
  options: { name?: string; owner?: string; sampleData?: boolean } = {},
) {
  const { name = 'Frozen Food Bu Rina', owner = 'Rina', sampleData = false } = options

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Mulai Baru' })).toBeVisible()
  await page.getByRole('button', { name: 'Mulai Baru' }).click()

  await page.getByLabel('Nama usaha').fill(name)
  await page.getByLabel('Nama pemilik').fill(owner)

  if (sampleData) {
    await page.getByRole('checkbox', { name: /Isi data contoh/ }).check()
  }

  await page.getByRole('button', { name: 'Lanjut', exact: true }).click()
  await expect(page.getByText('Buat PIN 6 digit', { exact: true })).toBeVisible()
  await enterPin(page, DEFAULT_PIN)

  await expect(page.getByText('Ulangi PIN 6 digit', { exact: true })).toBeVisible()
  await enterPin(page, DEFAULT_PIN)

  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole('status')).toContainText(/Setup selesai/, { timeout: 15_000 })
}

export async function unlock(page: Page, pin = DEFAULT_PIN) {
  await expect(page.getByRole('heading', { name: 'Masukkan PIN' })).toBeVisible()
  await enterPin(page, pin)
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible({
    timeout: 15_000,
  })
}
