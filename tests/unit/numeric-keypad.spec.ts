import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NumericKeypad from '@/components/ui/NumericKeypad.vue'

function lastValue(wrapper: ReturnType<typeof mount>) {
  const events = wrapper.emitted('update:modelValue') as string[][] | undefined
  return events?.at(-1)?.[0]
}

describe('NumericKeypad', () => {
  it('appends digits and removes the last character', async () => {
    const wrapper = mount(NumericKeypad, {
      props: { modelValue: '12' },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '7')
      ?.trigger('click')
    expect(lastValue(wrapper)).toBe('127')

    await wrapper.get('button[aria-label="Hapus angka"]').trigger('click')
    expect(lastValue(wrapper)).toBe('1')
  })

  it('does not append 000 to an empty value', async () => {
    const wrapper = mount(NumericKeypad, {
      props: { modelValue: '' },
    })

    await wrapper.get('button[aria-label="Tiga nol"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('supports decimal mode and confirm', async () => {
    const wrapper = mount(NumericKeypad, {
      props: { modelValue: '12', allowDecimal: true, showConfirm: true },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '.')
      ?.trigger('click')
    expect(lastValue(wrapper)).toBe('12.')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Lanjut')
      ?.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['12'])
  })

  it('respects maxLength', async () => {
    const wrapper = mount(NumericKeypad, {
      props: { modelValue: '123', maxLength: 3 },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '4')
      ?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('can hide the triple-zero key for PIN entry', () => {
    const wrapper = mount(NumericKeypad, {
      props: { modelValue: '', showTripleZero: false },
    })

    expect(wrapper.find('button[aria-label="Tiga nol"]').exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(11)
  })
})
