import { it, expect } from 'vitest'
import { extractPrediction, aggregateStats } from './predict'
import type { ResolvedMatch } from './knockout'
import type { KnockoutRound } from '@/types'

function rm(id: string, round: KnockoutRound, home: string | null, away: string | null): ResolvedMatch {
  return {
    id,
    round,
    order: 1,
    homeSource: { type: 'winnerOf', matchId: 'x' },
    awaySource: { type: 'winnerOf', matchId: 'y' },
    homeTeamId: home,
    awayTeamId: away,
  }
}

const complete: ResolvedMatch[] = [
  rm('QF1', 'QF', 'q1', 'q2'), rm('QF2', 'QF', 'q3', 'q4'),
  rm('QF3', 'QF', 'q5', 'q6'), rm('QF4', 'QF', 'q7', 'q8'),
  rm('SF1', 'SF', 's1', 's2'), rm('SF2', 'SF', 's3', 's4'),
  rm('F1', 'F', 's1', 's3'),
]

it('extracts tier picks from a completed bracket', () => {
  const picks = extractPrediction(complete, { F1: 's1' })
  expect(picks).not.toBeNull()
  expect(picks!.champion).toBe('s1')
  expect(picks!.finalists.slice().sort()).toEqual(['s1', 's3'])
  expect(picks!.semifinalists.slice().sort()).toEqual(['s1', 's2', 's3', 's4'])
  expect(picks!.quarterfinalists.slice().sort()).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'])
})

it('returns null when champion is not decided', () => {
  expect(extractPrediction(complete, {})).toBeNull()
})

it('returns null when a slot is empty', () => {
  const incomplete = complete.map((m) => (m.id === 'SF2' ? rm('SF2', 'SF', 's3', null) : m))
  expect(extractPrediction(incomplete, { F1: 's1' })).toBeNull()
})

it('aggregates per-tier counts and pct', () => {
  const rows = [
    { champion: 'A', finalists: ['A', 'B'], semifinalists: ['A', 'B', 'C', 'D'], quarterfinalists: [] },
    { champion: 'A', finalists: ['A', 'C'], semifinalists: ['A', 'C', 'E', 'F'], quarterfinalists: [] },
    { champion: 'B', finalists: ['A', 'B'], semifinalists: ['A', 'B', 'G', 'H'], quarterfinalists: [] },
  ]
  const stats = aggregateStats(rows)
  expect(stats.total).toBe(3)
  expect(stats.champion[0]).toMatchObject({ teamId: 'A', count: 2 })
  expect(Math.round(stats.champion[0].pct)).toBe(67)
  expect(stats.finalists[0]).toMatchObject({ teamId: 'A', count: 3, pct: 100 })
})
