import { describe, it, expect } from 'vitest'
import { seedKnockout, thirdPlaceComboKey } from './knockout'
import type { KnockoutMatch } from '@/types'
import type { TeamStanding, ThirdPlaceEntry } from './standings'

it('builds a stable combo key from qualifying groups', () => {
  expect(thirdPlaceComboKey(['C', 'A', 'B'])).toBe('ABC')
})

it('resolves R32 group sources and one third-place source', () => {
  const bracket: KnockoutMatch[] = [
    { id: 'M1', round: 'R32', order: 1,
      homeSource: { type: 'groupWinner', group: 'A' },
      awaySource: { type: 'groupRunnerUp', group: 'B' } },
    { id: 'M2', round: 'R32', order: 2,
      homeSource: { type: 'groupWinner', group: 'B' },
      awaySource: { type: 'thirdPlace', slotId: 'T1' } },
  ]
  const standings: Record<string, TeamStanding[]> = {
    A: [s('A0', 1), s('A1', 2), s('A2', 3), s('A3', 4)],
    B: [s('B0', 1), s('B1', 2), s('B2', 3), s('B3', 4)],
  }
  const thirds: ThirdPlaceEntry[] = [
    { teamId: 'A2', groupId: 'A', points: 3, gd: 0, gf: 1, rankAmongThirds: 1, qualified: true },
    { teamId: 'B2', groupId: 'B', points: 3, gd: 0, gf: 1, rankAmongThirds: 2, qualified: true },
  ]
  const assignment = { AB: { T1: 'A' as const } }

  const resolved = seedKnockout(bracket, standings, thirds, assignment)
  expect(resolved.find((m) => m.id === 'M1')!.homeTeamId).toBe('A0')
  expect(resolved.find((m) => m.id === 'M1')!.awayTeamId).toBe('B1')
  expect(resolved.find((m) => m.id === 'M2')!.awayTeamId).toBe('A2')
})

function s(teamId: string, rank: number): TeamStanding {
  return { teamId, played: 3, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank }
}
