import { it, expect } from 'vitest'
import {
  matchday3Matches, projectKorRank, summarizeFavorable, formatFavorable, SCENARIO_TEAM,
} from './king'
import { useSimulator } from '@/store/useSimulator'

it('matchday3Matches = 각 조 마지막 2경기 = 24', () => {
  const md3 = matchday3Matches()
  expect(md3.length).toBe(24)
  expect(md3.every((m) => /-(5|6)$/.test(m.id))).toBe(true)
})

const allScorelines = (pred: (h: number, a: number) => boolean): Array<[number, number]> => {
  const f: Array<[number, number]> = []
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) if (pred(h, a)) f.push([h, a])
  return f
}

it('summarizeFavorable: 원정 2점차 이상만 유리', () => {
  const cond = summarizeFavorable(allScorelines((h, a) => a - h >= 2))
  expect(cond.clauses).toEqual([{ side: 'away', minMargin: 2 }])
})

it('summarizeFavorable: 원정 4점차 이하로만 유리', () => {
  const cond = summarizeFavorable(allScorelines((h, a) => a > h && a - h <= 4))
  expect(cond.clauses).toEqual([{ side: 'away', maxMargin: 4 }])
})

it('summarizeFavorable: 홈승만(마진 무관)', () => {
  const cond = summarizeFavorable(allScorelines((h, a) => h > a))
  expect(cond.clauses).toEqual([{ side: 'home' }])
})

it('formatFavorable: 마진/무승부안됨 텍스트', () => {
  expect(formatFavorable({ clauses: [{ side: 'home' }] }, 'KOR', 'JPN', 'ko')).toBe('대한민국 승리 (무승부 안됨)')
  expect(formatFavorable({ clauses: [{ side: 'away', minMargin: 2 }] }, 'KOR', 'JPN', 'ko')).toBe('일본 2점차 이상 승리')
  expect(formatFavorable({ clauses: [{ side: 'home', maxMargin: 4 }] }, 'KOR', 'JPN', 'ko')).toBe('대한민국 4점차 이하로만 승리')
})

it('projectKorRank: 실제 데이터에서 KOR 종합순위 1..48', () => {
  const scores = useSimulator.getState().scores
  const r = projectKorRank(scores)
  expect(r).not.toBeNull()
  expect(r!.overall).toBeGreaterThanOrEqual(1)
  expect(r!.overall).toBeLessThanOrEqual(48)
  expect(SCENARIO_TEAM).toBe('KOR')
})
