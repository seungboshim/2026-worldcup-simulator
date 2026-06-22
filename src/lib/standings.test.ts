import { describe, it, expect } from 'vitest'
import { computeGroupStandings, computeThirdPlaceRanking, computeQualificationRanking } from './standings'
import type { GroupMatch, ScoreMap, GroupId } from '@/types'

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

function makeGroup(g: GroupId) {
  const ids = [`${g}0`, `${g}1`, `${g}2`, `${g}3`]
  const ms: GroupMatch[] = [
    { id: `${g}-01`, groupId: g, homeId: ids[0], awayId: ids[1], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-02`, groupId: g, homeId: ids[0], awayId: ids[2], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-12`, groupId: g, homeId: ids[1], awayId: ids[2], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-03`, groupId: g, homeId: ids[0], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-13`, groupId: g, homeId: ids[1], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-23`, groupId: g, homeId: ids[2], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
  ]
  return { groupId: g, teamIds: ids, matches: ms }
}

const ALL_LETTERS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
function strengthScores(): ScoreMap {
  const scores: ScoreMap = {}
  ALL_LETTERS.forEach((g, gi) => {
    scores[`${g}-23`] = { home: gi + 1, away: 0 }   // g2(3위 후보)가 g3 이김, 강도 차등
    scores[`${g}-02`] = { home: 3, away: 0 }         // g0 > g2
    scores[`${g}-12`] = { home: 2, away: 0 }         // g1 > g2
    scores[`${g}-01`] = { home: 3, away: 0 }         // g0 > g1
    scores[`${g}-03`] = { home: 3, away: 0 }         // g0 > g3
    scores[`${g}-13`] = { home: 2, away: 0 }         // g1 > g3
  })
  return scores
}

it('ranks 12 third-placed teams and flags top 8 as qualified', () => {
  const groups = ALL_LETTERS.map(makeGroup)
  const ranking = computeThirdPlaceRanking(groups, strengthScores())
  expect(ranking).toHaveLength(12)
  expect(ranking[0].rankAmongThirds).toBe(1)
  expect(ranking.filter((r) => r.qualified)).toHaveLength(8)
  expect(ranking[0].groupId).toBe('L')   // 강도 최댓값 조
})

it('ranks 36 teams by tier: winners 1-12, runners 13-24, thirds 25-36', () => {
  const groups = ALL_LETTERS.map(makeGroup)
  const q = computeQualificationRanking(groups, strengthScores())
  expect(q).toHaveLength(36)
  expect(q.slice(0, 12).every((e) => e.tier === 1)).toBe(true)
  expect(q.slice(12, 24).every((e) => e.tier === 2)).toBe(true)
  expect(q.slice(24, 32).every((e) => e.tier === 3 && e.qualified)).toBe(true)
  expect(q.slice(32).every((e) => e.tier === 4 && !e.qualified)).toBe(true)
  expect(q[0].overall).toBe(1)
})
