import { describe, expect, it } from 'vitest'

import { formatCounterPreview, normalizePrefix, validatePrefix } from '@/utils/numbering'

describe('numbering helpers', () => {
  it('validates and normalizes prefixes', () => {
    expect(validatePrefix('PJ')).toBeNull()
    expect(validatePrefix('pj')).toBeNull()
    expect(validatePrefix('A1')).toBeNull()
    expect(validatePrefix('P')).not.toBeNull()
    expect(validatePrefix('ABCDEF')).not.toBeNull()
    expect(validatePrefix('PJ-')).not.toBeNull()
    expect(normalizePrefix(' pj ')).toBe('PJ')
  })

  it('builds a deterministic counter preview in Jakarta time', () => {
    const date = new Date('2026-10-24T10:30:00+07:00')
    expect(formatCounterPreview('PJ', date)).toBe('PJ-20261024-0001')
    expect(formatCounterPreview(' pj ', date)).toBe('PJ-20261024-0001')
  })
})
