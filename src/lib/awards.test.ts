import { it, expect } from 'vitest'
import { aggregateAwards } from './awards'

it('aggregates golden ball / golden boot picks with pct', () => {
  const rows = [
    { golden_ball: 'FRA-mbappe', golden_boot: 'FRA-mbappe' },
    { golden_ball: 'FRA-mbappe', golden_boot: 'ENG-kane' },
    { golden_ball: 'ARG-messi', golden_boot: 'ENG-kane' },
  ]
  const s = aggregateAwards(rows)
  expect(s.total).toBe(3)
  expect(s.goldenBall[0]).toMatchObject({ playerId: 'FRA-mbappe', count: 2 })
  expect(Math.round(s.goldenBall[0].pct)).toBe(67)
  expect(s.goldenBoot[0]).toMatchObject({ playerId: 'ENG-kane', count: 2 })
})

it('handles empty rows', () => {
  const s = aggregateAwards([])
  expect(s).toEqual({ total: 0, goldenBall: [], goldenBoot: [] })
})
