import { it, expect, beforeEach } from 'vitest'
import { useSimulator } from './useSimulator'

beforeEach(() => {
  localStorage.clear()
  useSimulator.getState().resetToDefault()
})

it('initializes group scores from played defaults', () => {
  const { scores } = useSimulator.getState()
  expect(typeof scores).toBe('object')
})

it('setScore updates a match score', () => {
  const { setScore } = useSimulator.getState()
  const anyMatchId = Object.keys(useSimulator.getState().scores)[0] ?? 'GA-1'
  setScore(anyMatchId, { home: 3, away: 1 })
  expect(useSimulator.getState().scores[anyMatchId]).toEqual({ home: 3, away: 1 })
})

it('setWinner updates a knockout winner', () => {
  useSimulator.getState().setWinner('M73', 'FRA')
  expect(useSimulator.getState().winners['M73']).toBe('FRA')
})

it('clearAll empties scores and winners', () => {
  useSimulator.getState().setWinner('M73', 'FRA')
  useSimulator.getState().clearAll()
  expect(useSimulator.getState().winners['M73']).toBeUndefined()
  expect(Object.values(useSimulator.getState().scores).every((v) => v === null)).toBe(true)
})

it('resetToDefault restores seed defaults', () => {
  useSimulator.getState().clearAll()
  useSimulator.getState().resetToDefault()
  const hasDefault = Object.values(useSimulator.getState().scores).some((v) => v !== null)
  expect(hasDefault).toBe(true)
})
