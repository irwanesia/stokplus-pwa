import { describe, expect, it } from 'vitest'

import { generatePinSalt, hashPin, isValidPin, verifyPin } from '@/utils/pin'

const TEST_ITERATIONS = 1_000

describe('PIN security helpers', () => {
  it('accepts only six numeric digits', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a456')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('hashes with salt and verifies the correct PIN', async () => {
    const salt = generatePinSalt()
    const hash = await hashPin('123456', salt, TEST_ITERATIONS)

    expect(salt).not.toBe('')
    expect(hash).not.toBe('123456')
    expect(await verifyPin('123456', salt, hash, TEST_ITERATIONS)).toBe(true)
    expect(await verifyPin('654321', salt, hash, TEST_ITERATIONS)).toBe(false)
  })

  it('generates a different salt for each setup', () => {
    expect(generatePinSalt()).not.toBe(generatePinSalt())
  })
})
