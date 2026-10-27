import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import AppBottomSheet from '@/components/ui/AppBottomSheet.vue'

describe('AppBottomSheet', () => {
  it('renders an accessible dialog and closes on Escape', async () => {
    const wrapper = mount(AppBottomSheet, {
      props: { modelValue: true, title: 'Panel uji' },
      global: { stubs: { teleport: true } },
    })

    await nextTick()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Panel uji')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })
})
