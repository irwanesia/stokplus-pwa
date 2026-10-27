import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PinPad from '@/components/ui/PinPad.vue'

describe('PinPad', () => {
  it('emits digits and complete when six digits are present', async () => {
    const wrapper = mount(PinPad, {
      props: { modelValue: '12345' },
    })

    await wrapper.get('button[aria-label="6"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['123456'])

    await wrapper.setProps({ modelValue: '123456' })
    expect(wrapper.emitted('complete')?.[0]).toEqual(['123456'])
  })

  it('renders an error and hides the triple-zero key', () => {
    const wrapper = mount(PinPad, {
      props: { modelValue: '', error: 'PIN salah.' },
    })

    expect(wrapper.get('[role="alert"]').text()).toBe('PIN salah.')
    expect(wrapper.find('button[aria-label="Tiga nol"]').exists()).toBe(false)
  })
})
