import { describe, expect, it } from 'vitest'

import { formatBytes, getStorageInfo } from '@/utils/storage'

describe('storage helpers', () => {
  it('formats byte values for the UI', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1,5 MB')
  })

  it('reports unsupported Storage API safely', async () => {
    const info = await getStorageInfo()

    if (!navigator.storage?.estimate) {
      expect(info.supported).toBe(false)
      expect(info.percent).toBe(0)
    }
  })
})
