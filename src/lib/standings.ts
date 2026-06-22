import type { GroupMatch, ScoreMap } from '@/types'

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
