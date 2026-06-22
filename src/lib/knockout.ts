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
