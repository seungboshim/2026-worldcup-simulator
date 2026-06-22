import { it, expect } from 'vitest'
import { selectGroupStandings, selectThirdPlaceRanking, selectQualificationRanking } from './selectors'
import type { ScoreMap } from '@/types'

const empty: ScoreMap = {}

it('returns standings for all 12 groups, 4 teams each', () => {
  const result = selectGroupStandings(empty)
  expect(Object.keys(result)).toHaveLength(12)
  for (const g of Object.keys(result)) expect(result[g]).toHaveLength(4)
})

it('returns 12 third-place entries', () => {
  expect(selectThirdPlaceRanking(empty)).toHaveLength(12)
})

it('returns 36 qualification entries, top 32 qualified', () => {
  const q = selectQualificationRanking(empty)
  expect(q).toHaveLength(36)
  expect(q.filter((e) => e.qualified)).toHaveLength(32)
})
