import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type RegisterSwOptions = {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void
  onRegisterError?: (error: Error) => void
}

type RegisterSw = (options?: RegisterSwOptions) => (reloadPage?: boolean) => Promise<void>

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

function detectStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const standaloneDisplay = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone

  return standaloneDisplay || iosStandalone === true
}

export const usePwaStore = defineStore('pwa', () => {
  const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const isStandalone = ref(detectStandalone())
  const installAvailable = ref(false)
  const installAccepted = ref(false)
  const needRefresh = ref(false)
  const offlineReady = ref(false)
  const swSupported = ref(typeof navigator !== 'undefined' && 'serviceWorker' in navigator)
  const swRegistered = ref(false)
  const swControlled = ref(
    typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller),
  )
  const registrationError = ref('')
  const checkingForUpdate = ref(false)
  const lastUpdateCheck = ref<string | null>(null)

  let deferredPrompt: BeforeInstallPromptEvent | null = null
  let registration: ServiceWorkerRegistration | null = null
  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null
  let updateTimer: ReturnType<typeof setInterval> | undefined
  let registrationStarted = false
  let initialized = false

  const installHint = computed(() => {
    if (isStandalone.value) {
      return 'StokPlus berjalan sebagai aplikasi terpasang.'
    }

    if (installAvailable.value) {
      return 'Browser siap memasang StokPlus di layar utama.'
    }

    return 'Gunakan menu browser untuk memasang atau menambahkan StokPlus ke layar utama.'
  })

  function setOnline(value: boolean) {
    isOnline.value = value
  }

  function setStandalone(value: boolean) {
    isStandalone.value = value
  }

  function handleOnline() {
    setOnline(true)
  }

  function handleOffline() {
    setOnline(false)
  }

  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    installAvailable.value = true
  }

  function handleInstalled() {
    deferredPrompt = null
    installAvailable.value = false
    installAccepted.value = true
    isStandalone.value = detectStandalone()
  }

  function handleDisplayModeChange() {
    isStandalone.value = detectStandalone()
  }

  function handleControllerChange() {
    swControlled.value = true
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && registration) {
      void checkForUpdate()
    }
  }

  function startUpdateTimer() {
    if (updateTimer) {
      clearInterval(updateTimer)
    }

    updateTimer = setInterval(() => {
      if (registration) {
        void checkForUpdate()
      }
    }, UPDATE_CHECK_INTERVAL_MS)
  }

  function initialize() {
    if (initialized || typeof window === 'undefined') {
      return
    }

    initialized = true
    isOnline.value = navigator.onLine
    isStandalone.value = detectStandalone()
    swSupported.value = 'serviceWorker' in navigator
    swControlled.value = Boolean(navigator.serviceWorker?.controller)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange)

    const displayMode = window.matchMedia?.('(display-mode: standalone)')
    displayMode?.addEventListener?.('change', handleDisplayModeChange)
  }

  function dispose() {
    if (typeof window === 'undefined') {
      return
    }

    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleInstalled)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange)

    const displayMode = window.matchMedia?.('(display-mode: standalone)')
    displayMode?.removeEventListener?.('change', handleDisplayModeChange)

    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = undefined
    }

    initialized = false
    deferredPrompt = null
  }

  function registerServiceWorker(register: RegisterSw) {
    if (registrationStarted || swRegistered.value || !swSupported.value) {
      return
    }

    registrationStarted = true

    const update = register({
      immediate: true,
      onNeedRefresh: () => {
        needRefresh.value = true
      },
      onOfflineReady: () => {
        offlineReady.value = true
      },
      onRegisteredSW: (_swUrl, swRegistration) => {
        registration = swRegistration ?? null
        swRegistered.value = Boolean(swRegistration)
        if (swRegistration) {
          startUpdateTimer()
        }
      },
      onRegisterError: (error) => {
        registrationStarted = false
        registrationError.value = error.message
      },
    })

    updateServiceWorker = update
  }

  async function promptInstall(): Promise<InstallResult> {
    if (!deferredPrompt) {
      return 'unavailable'
    }

    const prompt = deferredPrompt
    deferredPrompt = null
    installAvailable.value = false
    await prompt.prompt()
    const choice = await prompt.userChoice

    if (choice.outcome === 'accepted') {
      installAccepted.value = true
      return 'accepted'
    }

    return 'dismissed'
  }

  async function checkForUpdate(): Promise<boolean> {
    if (!registration || checkingForUpdate.value) {
      return false
    }

    checkingForUpdate.value = true

    try {
      await registration.update()
      lastUpdateCheck.value = new Date().toISOString()
      return true
    } catch (caught) {
      registrationError.value =
        caught instanceof Error ? caught.message : 'Pemeriksaan pembaruan gagal.'
      return false
    } finally {
      checkingForUpdate.value = false
    }
  }

  async function applyUpdate(): Promise<boolean> {
    if (!updateServiceWorker) {
      return false
    }

    await updateServiceWorker(true)
    needRefresh.value = false
    return true
  }

  function dismissUpdate() {
    needRefresh.value = false
  }

  function dismissOfflineReady() {
    offlineReady.value = false
  }

  return {
    isOnline,
    isStandalone,
    installAvailable,
    installAccepted,
    needRefresh,
    offlineReady,
    swSupported,
    swRegistered,
    swControlled,
    registrationError,
    checkingForUpdate,
    lastUpdateCheck,
    installHint,
    initialize,
    dispose,
    setOnline,
    setStandalone,
    registerServiceWorker,
    promptInstall,
    checkForUpdate,
    applyUpdate,
    dismissUpdate,
    dismissOfflineReady,
  }
})
