export interface AwardsVoteRow {
  golden_ball: string
  golden_boot: string
}

export interface PlayerCount {
  playerId: string
  count: number
  pct: number
}

export interface AwardStats {
  total: number
  goldenBall: PlayerCount[]
  goldenBoot: PlayerCount[]
}

function tally(ids: string[], total: number): PlayerCount[] {
  const counts = new Map<string, number>()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts.entries()]
    .map(([playerId, count]) => ({ playerId, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count || a.playerId.localeCompare(b.playerId))
}

export function aggregateAwards(rows: AwardsVoteRow[]): AwardStats {
  const total = rows.length
  return {
    total,
    goldenBall: tally(rows.map((r) => r.golden_ball), total),
    goldenBoot: tally(rows.map((r) => r.golden_boot), total),
  }
}
