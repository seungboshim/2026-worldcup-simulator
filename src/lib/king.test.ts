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

it('빙고: 9개조(D~L) — 우리 조 A와 확정 전 끝난 B·C 제외, 색은 유리/불리/미정', () => {
  const a = analyzeScenario(useSimulator.getState().scores)
  expect(a.bingo.cells.length).toBe(9)
  expect(a.bingo.cells.map((c) => c.groupId).sort()).toEqual(['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'])
  expect(a.bingo.cells.every((c) => ['fav', 'unfav', 'pending'].includes(c.color))).toBe(true)
  expect(a.bingo.fav).toBe(a.bingo.cells.filter((c) => c.color === 'fav').length)
  expect(a.bingo.unfav).toBe(a.bingo.cells.filter((c) => c.color === 'unfav').length)
})

it('matchInfo: 결정전(칩)은 정확히 9경기 — 빙고조마다 1개씩, 형제 경기로 안 번짐', () => {
  const a = analyzeScenario(useSimulator.getState().scores)
  const md3 = matchday3Matches()
  const deciders = md3.filter((m) => a.matchInfo[m.id]?.kind === 'decider')
  expect(deciders.length).toBe(9)
  expect(new Set(deciders.map((m) => m.groupId)).size).toBe(9) // 9개 빙고조에 정확히 1개씩
  // 우리 조(A) 경기는 kor
  expect(md3.filter((m) => a.matchInfo[m.id]?.kind === 'kor').every((m) => m.id.startsWith('GA'))).toBe(true)
})

it('matchInfo: 미진행 결정전(J·K·L)은 유리 조건을 제공 (예측 전 디테일 힌트)', () => {
  const a = analyzeScenario(useSimulator.getState().scores)
  const md3 = matchday3Matches()
  const pendingDeciders = md3.filter((m) => a.matchInfo[m.id]?.kind === 'decider' && a.matchInfo[m.id]?.color === 'pending')
  expect(pendingDeciders.length).toBeGreaterThan(0)
  expect(pendingDeciders.every((m) => a.matchInfo[m.id].favorable !== null)).toBe(true)
})
