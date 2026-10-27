import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAutoLock } from '@/composables/useAutoLock'

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoLock', () => {
  it('locks after inactivity and resets on activity', () => {
    vi.useFakeTimers()
    const onLock = vi.fn()
    const scope = effectScope()
    let controller: ReturnType<typeof useAutoLock> | undefined

    scope.run(() => {
      controller = useAutoLock(onLock)
    })

    controller?.start(1)
    vi.advanceTimersByTime(59_999)
    expect(onLock).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('keydown'))
    vi.advanceTimersByTime(59_999)
    expect(onLock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLock).toHaveBeenCalledTimes(1)

    scope.stop()
  })

  it('does not schedule a timer when disabled', () => {
    vi.useFakeTimers()
    const onLock = vi.fn()
    const scope = effectScope()
    let controller: ReturnType<typeof useAutoLock> | undefined

    scope.run(() => {
      controller = useAutoLock(onLock)
    })

    controller?.start(0)
    vi.advanceTimersByTime(60 * 60_000)
    expect(onLock).not.toHaveBeenCalled()

    scope.stop()
  })

  it('stops the active timer', () => {
    vi.useFakeTimers()
    const onLock = vi.fn()
    const scope = effectScope()
    let controller: ReturnType<typeof useAutoLock> | undefined

    scope.run(() => {
      controller = useAutoLock(onLock)
    })

    controller?.start(1)
    controller?.stop()
    vi.advanceTimersByTime(60_000)

    expect(onLock).not.toHaveBeenCalled()
    scope.stop()
  })
})
