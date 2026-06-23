import { it, expect } from 'vitest'
import wc from '../../data/worldcup-2026.json'
import { bracketLayoutRank } from './bracket-layout'
import type { KnockoutMatch, WorldCupData } from '@/types'

const km = (wc as unknown as WorldCupData).knockoutMatches
const rank = bracketLayoutRank(km)

function sortedRound(round: KnockoutMatch['round']): string[] {
  return km
    .filter((m) => m.round === round)
    .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
    .map((m) => m.id)
}

it('places the two feeders of every match adjacent in their round', () => {
  const orderByRound = new Map<string, string[]>()
  for (const r of ['R32', 'R16', 'QF', 'SF'] as const) orderByRound.set(r, sortedRound(r))

  for (const m of km) {
    const srcIds = [m.homeSource, m.awaySource]
      .filter((s) => s.type === 'winnerOf')
      .map((s) => (s as { matchId: string }).matchId)
    if (srcIds.length !== 2) continue
    const childRound = km.find((x) => x.id === srcIds[0])!.round
    const order = orderByRound.get(childRound)!
    const i = order.indexOf(srcIds[0])
    const j = order.indexOf(srcIds[1])
    expect(Math.abs(i - j)).toBe(1)
  }
})

it('orders R32 top-to-bottom like the official bracket (matches Naver layout)', () => {
  // 네이버 공식 대진표 상단 4경기: A2vB2(M73), F1vC2(M75), E1v3rd(M74), I1v3rd(M77)
  expect(sortedRound('R32').slice(0, 4)).toEqual(['M73', 'M75', 'M74', 'M77'])
})
