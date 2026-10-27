import { onScopeDispose } from 'vue'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const
const MINUTE = 60_000

/**
 * Mengunci aplikasi setelah tidak ada aktivitas. Timer dijeda saat tab
 * tersembunyi; ketika tab kembali, sisa waktu dihitung dari aktivitas terakhir.
 */
export function useAutoLock(onLock: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let minutes = 0
  let lastActivity = Date.now()
  let running = false

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function schedule(delay = minutes * MINUTE) {
    clearTimer()
    if (!running || minutes <= 0) {
      return
    }

    timer = setTimeout(
      () => {
        timer = undefined
        onLock()
      },
      Math.max(0, delay),
    )
  }

  function rememberActivity() {
    if (!running) {
      return
    }

    lastActivity = Date.now()
    schedule()
  }

  function handleVisibilityChange() {
    if (!running) {
      return
    }

    if (document.visibilityState === 'hidden') {
      clearTimer()
      lastActivity = Date.now()
      return
    }

    const elapsed = Date.now() - lastActivity
    const total = minutes * MINUTE

    if (elapsed >= total) {
      clearTimer()
      onLock()
      return
    }

    schedule(total - elapsed)
  }

  function addListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, rememberActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function removeListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, rememberActivity)
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function start(value: number) {
    stop()
    minutes = Number.isFinite(value) && value > 0 ? value : 0
    running = true
    lastActivity = Date.now()

    if (minutes === 0) {
      return
    }

    addListeners()
    schedule()
  }

  function stop() {
    running = false
    clearTimer()
    removeListeners()
  }

  onScopeDispose(stop)

  return { start, stop }
}
