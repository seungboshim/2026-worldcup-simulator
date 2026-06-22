import type { GroupMatch, ScoreMap, GroupId } from '@/types'

export interface TeamStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  rank: number
}

function blank(teamId: string): TeamStanding {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank: 0 }
}

export function computeGroupStandings(
  teamIds: string[],
  matches: GroupMatch[],
  scores: ScoreMap,
): TeamStanding[] {
  const rows = new Map(teamIds.map((id) => [id, blank(id)]))

  for (const m of matches) {
    const s = scores[m.id]
    if (!s) continue
    const home = rows.get(m.homeId)
    const away = rows.get(m.awayId)
    if (!home || !away) continue
    home.played++; away.played++
    home.gf += s.home; home.ga += s.away
    away.gf += s.away; away.ga += s.home
    if (s.home > s.away) { home.won++; home.points += 3; away.lost++ }
    else if (s.home < s.away) { away.won++; away.points += 3; home.lost++ }
    else { home.drawn++; away.drawn++; home.points++; away.points++ }
  }

  const table = [...rows.values()]
  for (const r of table) r.gd = r.gf - r.ga

  table.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.teamId.localeCompare(b.teamId),
  )
  table.forEach((r, i) => (r.rank = i + 1))
  return table
}

export interface GroupInput {
  groupId: GroupId
  teamIds: string[]
  matches: GroupMatch[]
}

export interface ThirdPlaceEntry {
  teamId: string
  groupId: GroupId
  points: number
  gd: number
  gf: number
  rankAmongThirds: number
  qualified: boolean
}

export function computeThirdPlaceRanking(
  groups: GroupInput[],
  scores: ScoreMap,
): ThirdPlaceEntry[] {
  const thirds: ThirdPlaceEntry[] = groups.map((g) => {
    const table = computeGroupStandings(g.teamIds, g.matches, scores)
    const third = table[2]
    return { teamId: third.teamId, groupId: g.groupId, points: third.points, gd: third.gd, gf: third.gf, rankAmongThirds: 0, qualified: false }
  })
  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.groupId.localeCompare(b.groupId))
  thirds.forEach((t, i) => { t.rankAmongThirds = i + 1; t.qualified = i < 8 })
  return thirds
}

export interface QualEntry {
  teamId: string
  groupId: GroupId
  points: number
  gd: number
  gf: number
  tier: 1 | 2 | 3 | 4   // 1=조1위, 2=조2위, 3=진출 3위, 4=미진출 3위
  overall: number       // 1..36
  qualified: boolean    // overall <= 32
}

export function computeQualificationRanking(
  groups: GroupInput[],
  scores: ScoreMap,
): QualEntry[] {
  const cmp = (a: { points: number; gd: number; gf: number; groupId: GroupId },
               b: { points: number; gd: number; gf: number; groupId: GroupId }) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.groupId.localeCompare(b.groupId)

  const winners: Omit<QualEntry, 'overall' | 'qualified'>[] = []
  const runners: Omit<QualEntry, 'overall' | 'qualified'>[] = []
  for (const g of groups) {
    const t = computeGroupStandings(g.teamIds, g.matches, scores)
    winners.push({ teamId: t[0].teamId, groupId: g.groupId, points: t[0].points, gd: t[0].gd, gf: t[0].gf, tier: 1 })
    runners.push({ teamId: t[1].teamId, groupId: g.groupId, points: t[1].points, gd: t[1].gd, gf: t[1].gf, tier: 2 })
  }
  winners.sort(cmp); runners.sort(cmp)

  const thirds = computeThirdPlaceRanking(groups, scores)
  const mapThird = (t: ThirdPlaceEntry, tier: 3 | 4): Omit<QualEntry, 'overall' | 'qualified'> =>
    ({ teamId: t.teamId, groupId: t.groupId, points: t.points, gd: t.gd, gf: t.gf, tier })
  const tier3 = thirds.filter((t) => t.qualified).map((t) => mapThird(t, 3))
  const tier4 = thirds.filter((t) => !t.qualified).map((t) => mapThird(t, 4))

  return [...winners, ...runners, ...tier3, ...tier4].map((e, i) => ({ ...e, overall: i + 1, qualified: i < 32 }))
}
