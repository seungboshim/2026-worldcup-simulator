import { it, expect } from 'vitest'
import { applyGroupResults, type ApiMatch } from './results-merge'
import type { WorldCupData } from '@/types'

const base = {
  competition: 'test',
  teams: [],
  knockoutMatches: [],
  groupMatches: [
    { id: 'GA-1', groupId: 'A', homeId: 'MEX', awayId: 'RSA', played: false, defaultHome: null, defaultAway: null },
    { id: 'GA-2', groupId: 'A', homeId: 'KOR', awayId: 'CZE', played: true, defaultHome: 2, defaultAway: 1 },
  ],
} as unknown as WorldCupData

const fin = (home: string, away: string, h: number | null, a: number | null, over: Partial<ApiMatch> = {}): ApiMatch => ({
  stage: 'GROUP_STAGE',
  status: 'FINISHED',
  homeTeam: { tla: home },
  awayTeam: { tla: away },
  score: { fullTime: { home: h, away: a } },
  ...over,
})

it('applies a new finished group result', () => {
  const { data, changed } = applyGroupResults(base, [fin('MEX', 'RSA', 2, 0)])
  expect(data.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ played: true, defaultHome: 2, defaultAway: 0 })
  expect(changed).toEqual([{ matchId: 'GA-1', before: null, after: { home: 2, away: 0 } }])
})

it('orients scores when API home/away is swapped vs our data', () => {
  // our GA-1: home MEX / away RSA. API: RSA(home) 0 - MEX(away) 2
  const { data } = applyGroupResults(base, [fin('RSA', 'MEX', 0, 2)])
  expect(data.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ defaultHome: 2, defaultAway: 0 })
})

it('reports no change when the stored result already matches', () => {
  const { changed } = applyGroupResults(base, [fin('KOR', 'CZE', 2, 1)])
  expect(changed).toEqual([])
})

it('ignores non-group / unfinished / null-score / unknown-pair matches', () => {
  const { changed } = applyGroupResults(base, [
    fin('MEX', 'RSA', 1, 0, { stage: 'LAST_16' }),
    fin('MEX', 'RSA', null, null, { status: 'TIMED' }),
    fin('BRA', 'ARG', 1, 0),
  ])
  expect(changed).toEqual([])
})

it('does not mutate the input', () => {
  applyGroupResults(base, [fin('MEX', 'RSA', 3, 1)])
  expect(base.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ played: false, defaultHome: null })
})
