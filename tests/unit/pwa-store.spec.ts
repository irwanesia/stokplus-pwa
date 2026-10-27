import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePwaStore } from '@/stores/pwa'

describe('PWA store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks online and offline events', () => {
    const store = usePwaStore()
    store.initialize()

    window.dispatchEvent(new Event('offline'))
    expect(store.isOnline).toBe(false)

    window.dispatchEvent(new Event('online'))
    expect(store.isOnline).toBe(true)

    store.dispose()
  })

  it('captures the install prompt and reports the user choice', async () => {
    const store = usePwaStore()
    const prompt = vi.fn(async () => undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })

    store.initialize()
    window.dispatchEvent(event)
    expect(store.installAvailable).toBe(true)

    await expect(store.promptInstall()).resolves.toBe('accepted')
    expect(prompt).toHaveBeenCalledOnce()
    expect(store.installAvailable).toBe(false)
    expect(store.installAccepted).toBe(true)

    store.dispose()
  })

  it('returns unavailable when no install prompt was captured', async () => {
    const store = usePwaStore()
    await expect(store.promptInstall()).resolves.toBe('unavailable')
  })

  it('wires service worker callbacks, updates, and errors', async () => {
    const store = usePwaStore()
    store.swSupported = true

    const update = vi.fn(async () => undefined)
    const registration = {
      update: vi.fn(async () => undefined),
    } as unknown as ServiceWorkerRegistration
    let options:
      | {
          onNeedRefresh?: () => void
          onOfflineReady?: () => void
          onRegisteredSW?: (url: string, registration?: ServiceWorkerRegistration) => void
          onRegisterError?: (error: Error) => void
        }
      | undefined

    const register = vi.fn((nextOptions: typeof options) => {
      options = nextOptions
      return update
    })

    store.registerServiceWorker(register)
    expect(register).toHaveBeenCalledOnce()
    expect(store.swRegistered).toBe(false)

    options?.onRegisteredSW?.('/sw.js', registration)
    expect(store.swRegistered).toBe(true)

    options?.onNeedRefresh?.()
    expect(store.needRefresh).toBe(true)
    await store.applyUpdate()
    expect(update).toHaveBeenCalledWith(true)
    expect(store.needRefresh).toBe(false)

    options?.onOfflineReady?.()
    expect(store.offlineReady).toBe(true)
    store.dismissOfflineReady()
    expect(store.offlineReady).toBe(false)

    await expect(store.checkForUpdate()).resolves.toBe(true)
    expect(registration.update).toHaveBeenCalledOnce()
    expect(store.lastUpdateCheck).not.toBeNull()

    options?.onRegisterError?.(new Error('registrasi gagal'))
    expect(store.registrationError).toBe('registrasi gagal')

    store.dispose()
  })

  it('does not register twice and ignores update checks without a registration', async () => {
    const store = usePwaStore()
    store.swSupported = true
    const register = vi.fn(() => vi.fn(async () => undefined))

    store.registerServiceWorker(register)
    store.registerServiceWorker(register)

    expect(register).toHaveBeenCalledOnce()
    await expect(store.checkForUpdate()).resolves.toBe(false)
    await expect(store.applyUpdate()).resolves.toBe(true)

    store.dispose()
  })
})
