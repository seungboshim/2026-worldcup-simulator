import { describe, it, expect } from 'vitest'
import { computeGroupStandings } from './standings'
import type { GroupMatch, ScoreMap } from '@/types'

const matches: GroupMatch[] = [
  { id: 'm01', groupId: 'A', homeId: 't0', awayId: 't1', played: true, defaultHome: null, defaultAway: null },
  { id: 'm02', groupId: 'A', homeId: 't0', awayId: 't2', played: true, defaultHome: null, defaultAway: null },
  { id: 'm12', groupId: 'A', homeId: 't1', awayId: 't2', played: true, defaultHome: null, defaultAway: null },
  { id: 'm03', groupId: 'A', homeId: 't0', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
  { id: 'm13', groupId: 'A', homeId: 't1', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
  { id: 'm23', groupId: 'A', homeId: 't2', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
]
const teamIds = ['t0', 't1', 't2', 't3']

it('ranks a team that wins all matches first', () => {
  const scores: ScoreMap = {
    m01: { home: 2, away: 0 }, m02: { home: 1, away: 0 }, m03: { home: 3, away: 0 },
    m12: { home: 1, away: 1 }, m13: { home: 0, away: 1 }, m23: { home: 0, away: 0 },
  }
  const table = computeGroupStandings(teamIds, matches, scores)
  expect(table[0].teamId).toBe('t0')
  expect(table[0].points).toBe(9)
  expect(table[0].rank).toBe(1)
})

it('breaks ties by goal difference then goals for', () => {
  const scores: ScoreMap = {
    m01: { home: 1, away: 1 }, m02: { home: 5, away: 0 }, m03: { home: 1, away: 0 },
    m12: { home: 2, away: 0 }, m13: { home: 1, away: 0 }, m23: { home: 0, away: 0 },
  }
  const table = computeGroupStandings(teamIds, matches, scores)
  const t0 = table.find((r) => r.teamId === 't0')!
  const t1 = table.find((r) => r.teamId === 't1')!
  expect(t0.points).toBe(7)
  expect(t1.points).toBe(7)
  expect(t0.rank).toBeLessThan(t1.rank)
})

it('ignores matches with no score (unplayed)', () => {
  const scores: ScoreMap = { m01: { home: 2, away: 0 } }
  const table = computeGroupStandings(teamIds, matches, scores)
  const t0 = table.find((r) => r.teamId === 't0')!
  expect(t0.played).toBe(1)
  expect(t0.points).toBe(3)
})
