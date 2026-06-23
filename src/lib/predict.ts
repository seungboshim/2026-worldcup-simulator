import type { ResolvedMatch } from './knockout'

export interface PredictionPicks {
  champion: string
  finalists: string[]
  semifinalists: string[]
  quarterfinalists: string[]
}

const teamsOfRound = (matches: ResolvedMatch[], round: ResolvedMatch['round']): (string | null)[] =>
  matches.filter((m) => m.round === round).flatMap((m) => [m.homeTeamId, m.awayTeamId])

function allFilled(ids: (string | null)[]): ids is string[] {
  return ids.length > 0 && ids.every((x): x is string => !!x)
}

export function extractPrediction(
  matches: ResolvedMatch[],
  winners: Record<string, string | null>,
): PredictionPicks | null {
  const final = matches.find((m) => m.round === 'F')
  const champion = final ? winners[final.id] ?? null : null
  if (!champion) return null

  const finalists = teamsOfRound(matches, 'F')
  const semifinalists = teamsOfRound(matches, 'SF')
  const quarterfinalists = teamsOfRound(matches, 'QF')
  if (!allFilled(finalists) || !allFilled(semifinalists) || !allFilled(quarterfinalists)) return null

  return { champion, finalists, semifinalists, quarterfinalists }
}

export interface PredictionRow {
  champion: string
  finalists: string[]
  semifinalists: string[]
  quarterfinalists: string[]
}

export interface TierCount {
  teamId: string
  count: number
  pct: number
}

export interface Stats {
  total: number
  champion: TierCount[]
  finalists: TierCount[]
  semifinalists: TierCount[]
  quarterfinalists: TierCount[]
}

function tally(values: string[], total: number): TierCount[] {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()]
    .map(([teamId, count]) => ({ teamId, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count || a.teamId.localeCompare(b.teamId))
}

export function aggregateStats(rows: PredictionRow[]): Stats {
  const total = rows.length
  return {
    total,
    champion: tally(rows.map((r) => r.champion), total),
    finalists: tally(rows.flatMap((r) => r.finalists), total),
    semifinalists: tally(rows.flatMap((r) => r.semifinalists), total),
    quarterfinalists: tally(rows.flatMap((r) => r.quarterfinalists), total),
  }
}
