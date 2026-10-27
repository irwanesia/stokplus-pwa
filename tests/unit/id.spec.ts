import { describe, expect, it } from 'vitest'

import { uuidv7 } from '@/utils/id'

describe('uuidv7', () => {
  it('returns a valid UUID with version 7 and RFC variant bits', () => {
    const id = uuidv7()

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(id[14]).toBe('7')
    expect(['8', '9', 'a', 'b']).toContain(id[19])
  })
})
