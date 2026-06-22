import type { GroupId, KnockoutMatch, ThirdPlaceAssignmentTable } from '@/types'
import type { ThirdPlaceEntry, TeamStanding } from './standings'

export interface ResolvedMatch extends KnockoutMatch {
  homeTeamId: string | null
  awayTeamId: string | null
}

export function thirdPlaceComboKey(groups: GroupId[]): string {
  return [...groups].sort().join('')
}

export function seedKnockout(
  bracket: KnockoutMatch[],
  standings: Record<string, TeamStanding[]>,
  thirds: ThirdPlaceEntry[],
  assignment: ThirdPlaceAssignmentTable,
): ResolvedMatch[] {
  const qualifiedThirds = thirds.filter((t) => t.qualified)
  const comboKey = thirdPlaceComboKey(qualifiedThirds.map((t) => t.groupId))
  const slotMap = assignment[comboKey] ?? {}
  const thirdByGroup = new Map(qualifiedThirds.map((t) => [t.groupId, t.teamId]))

  const resolveSource = (src: KnockoutMatch['homeSource']): string | null => {
    switch (src.type) {
      case 'groupWinner':
        return standings[src.group]?.find((r) => r.rank === 1)?.teamId ?? null
      case 'groupRunnerUp':
        return standings[src.group]?.find((r) => r.rank === 2)?.teamId ?? null
      case 'thirdPlace': {
        const g = slotMap[src.slotId]
        return g ? thirdByGroup.get(g) ?? null : null
      }
      case 'winnerOf':
        return null
    }
  }

  return bracket
    .filter((m) => m.round === 'R32')
    .map((m) => ({
      ...m,
      homeTeamId: resolveSource(m.homeSource),
      awayTeamId: resolveSource(m.awaySource),
    }))
}

export function advanceBracket(
  bracket: KnockoutMatch[],
  r32Resolved: ResolvedMatch[],
  winners: Record<string, string | null>,
): ResolvedMatch[] {
  const resolved = new Map<string, ResolvedMatch>()
  for (const m of r32Resolved) resolved.set(m.id, m)

  const roundOrder: KnockoutMatch['round'][] = ['R32', 'R16', 'QF', 'SF', 'F']
  const teamOf = (matchId: string): string | null => winners[matchId] ?? null

  const resolveSource = (src: KnockoutMatch['homeSource']): string | null => {
    if (src.type === 'winnerOf') return teamOf(src.matchId)
    return null
  }

  for (const round of roundOrder.slice(1)) {
    for (const m of bracket.filter((b) => b.round === round)) {
      resolved.set(m.id, {
        ...m,
        homeTeamId: resolveSource(m.homeSource),
        awayTeamId: resolveSource(m.awaySource),
      })
    }
  }
  return [...resolved.values()]
}
