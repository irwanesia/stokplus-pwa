import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from '@/components/ui/AppButton.vue'

describe('AppButton', () => {
  it('renders the slot and emits click', async () => {
    const wrapper = mount(AppButton, {
      slots: { default: 'Simpan' },
    })

    expect(wrapper.text()).toContain('Simpan')

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('blocks interaction while loading', async () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      slots: { default: 'Menyimpan' },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
