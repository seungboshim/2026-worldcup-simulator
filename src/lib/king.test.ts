import { it, expect } from 'vitest'
import { matchday3Matches, projectKorRank, analyzeScenario, SCENARIO_TEAM } from './king'
import { useSimulator } from '@/store/useSimulator'

it('matchday3Matches = 각 조 마지막 2경기 = 24', () => {
  const md3 = matchday3Matches()
  expect(md3.length).toBe(24)
  expect(md3.every((m) => /-(5|6)$/.test(m.id))).toBe(true)
})

it('projectKorRank: 실제 데이터에서 KOR 종합순위 1..48', () => {
  const scores = useSimulator.getState().scores
  const r = projectKorRank(scores)
  expect(r).not.toBeNull()
  expect(r!.overall).toBeGreaterThanOrEqual(1)
  expect(r!.overall).toBeLessThanOrEqual(48)
  expect(SCENARIO_TEAM).toBe('KOR')
})

it('빙고: 우리 조 제외 11개조 3위 vs KOR, 색은 유리/불리/미정', () => {
  const a = analyzeScenario(useSimulator.getState().scores)
  expect(a.bingo.cells.length).toBe(11)
  expect(a.bingo.cells.every((c) => ['fav', 'unfav', 'pending'].includes(c.color))).toBe(true)
  expect(a.bingo.fav).toBe(a.bingo.cells.filter((c) => c.color === 'fav').length)
  expect(a.bingo.unfav).toBe(a.bingo.cells.filter((c) => c.color === 'unfav').length)
  expect(a.bingo.fav + a.bingo.unfav).toBeLessThanOrEqual(11)
})

it('빙고: 우리 조(A) 경기는 matchColor=kor, 나머지는 조 색과 일치', () => {
  const a = analyzeScenario(useSimulator.getState().scores)
  const md3 = matchday3Matches()
  const korGroupMatches = md3.filter((m) => a.matchColor[m.id] === 'kor')
  expect(korGroupMatches.length).toBe(2) // A조 MD3 2경기
  expect(korGroupMatches.every((m) => m.id.startsWith('GA'))).toBe(true)
})
