import { describe, expect, it } from 'vitest'

import {
  createEmptyUatState,
  loadUatState,
  saveUatState,
  signOffReady,
  uatSummary,
  UAT_SCENARIOS,
  UAT_STORAGE_KEY,
  type UatState,
} from '@/features/release/uat'

function fakeStorage() {
  const memory = new Map<string, string>()

  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    memory,
  }
}

function mark(state: UatState, count: number, result: 'pass' | 'fail' = 'pass') {
  for (const scenario of UAT_SCENARIOS.slice(0, count)) {
    state.results[scenario.id] = result
  }
}

describe('UAT release gate', () => {
  it('starts with every scenario pending', () => {
    const state = createEmptyUatState()

    expect(Object.keys(state.results)).toHaveLength(UAT_SCENARIOS.length)
    expect(Object.values(state.results).every((result) => result === 'pending')).toBe(true)
    expect(uatSummary(state)).toMatchObject({
      total: 15,
      passed: 0,
      failed: 0,
      pending: 15,
      percent: 0,
      requiredPassed: 14,
      gateMet: false,
    })
  })

  it('requires 90 percent and no failures', () => {
    const state = createEmptyUatState()
    mark(state, 13)
    expect(uatSummary(state).gateMet).toBe(false)

    mark(state, 14)
    expect(uatSummary(state).percent).toBe(93)
    expect(uatSummary(state).gateMet).toBe(true)

    state.results[UAT_SCENARIOS[0].id] = 'fail'
    expect(uatSummary(state).gateMet).toBe(false)
  })

  it('requires sign-off names and a date after the gate is met', () => {
    const state = createEmptyUatState()
    mark(state, 14)
    expect(signOffReady(state)).toBe(false)

    state.signOff = {
      productOwner: 'Rina',
      developer: 'Dev',
      qa: 'QA',
      date: '2026-10-27',
      approvedAt: null,
    }
    expect(signOffReady(state)).toBe(true)

    state.signOff.qa = '   '
    expect(signOffReady(state)).toBe(false)
  })

  it('persists, normalizes, and resets local UAT state', () => {
    const storage = fakeStorage()
    const state = createEmptyUatState()
    mark(state, 15)
    state.notes['UAT-01'] = 'Lulus di Android'

    const saved = saveUatState(state, storage)
    expect(saved.updatedAt).not.toBeNull()
    expect(storage.memory.has(UAT_STORAGE_KEY)).toBe(true)

    const loaded = loadUatState(storage)
    expect(loaded.results['UAT-01']).toBe('pass')
    expect(loaded.notes['UAT-01']).toBe('Lulus di Android')
    expect(uatSummary(loaded).percent).toBe(100)
  })

  it('falls back to an empty state for corrupt or partial storage', () => {
    const storage = fakeStorage()
    storage.memory.set(UAT_STORAGE_KEY, '{bukan json')
    expect(loadUatState(storage)).toEqual(createEmptyUatState())

    storage.memory.set(
      UAT_STORAGE_KEY,
      JSON.stringify({ results: { 'UAT-01': 'pass', unknown: 'pass' }, notes: null }),
    )
    const loaded = loadUatState(storage)
    expect(loaded.results['UAT-01']).toBe('pass')
    expect(loaded.results['UAT-02']).toBe('pending')
    expect(Object.keys(loaded.results)).toHaveLength(UAT_SCENARIOS.length)
  })
})
