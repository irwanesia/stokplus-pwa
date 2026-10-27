import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStore } from '@/stores/ui'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a toast and dismisses it after the duration', () => {
    const ui = useUiStore()

    ui.notify('Data tersimpan.', 'success', 1000)

    expect(ui.toast).toMatchObject({
      message: 'Data tersimpan.',
      tone: 'success',
    })

    vi.advanceTimersByTime(999)
    expect(ui.toast).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(ui.toast).toBeNull()
  })

  it('can dismiss immediately', () => {
    const ui = useUiStore()

    ui.notify('Halo', 'info', 0)
    ui.dismiss()

    expect(ui.toast).toBeNull()
  })
})
