import type { WorldCupData, GroupMatch } from '@/types'

export interface ApiMatch {
  stage: string
  status: string
  homeTeam: { tla: string | null }
  awayTeam: { tla: string | null }
  score: { fullTime: { home: number | null; away: number | null } }
}

export interface ResultChange {
  matchId: string
  before: { home: number; away: number } | null
  after: { home: number; away: number }
}

export interface MergeResult {
  data: WorldCupData
  changed: ResultChange[]
}

const pairKey = (a: string, b: string): string => [a, b].sort().join('|')

// 조별·종료·점수확정·알려진 팀쌍인 API 매치만 우리 groupMatch 기본값에 반영(불변, 변경분만 반환).
export function applyGroupResults(data: WorldCupData, apiMatches: ApiMatch[]): MergeResult {
  const groupMatches: GroupMatch[] = data.groupMatches.map((m) => ({ ...m }))
  const byPair = new Map<string, GroupMatch>()
  for (const gm of groupMatches) byPair.set(pairKey(gm.homeId, gm.awayId), gm)

  const changed: ResultChange[] = []
  for (const am of apiMatches) {
    if (am.stage !== 'GROUP_STAGE' || am.status !== 'FINISHED') continue
    const { home, away } = am.score.fullTime
    if (home == null || away == null) continue
    const ht = am.homeTeam.tla
    const at = am.awayTeam.tla
    if (!ht || !at) continue
    const gm = byPair.get(pairKey(ht, at))
    if (!gm) continue

    const sameOrder = gm.homeId === ht
    const newHome = sameOrder ? home : away
    const newAway = sameOrder ? away : home
    if (gm.played && gm.defaultHome === newHome && gm.defaultAway === newAway) continue

    const before =
      gm.played && gm.defaultHome != null && gm.defaultAway != null
        ? { home: gm.defaultHome, away: gm.defaultAway }
        : null
    gm.played = true
    gm.defaultHome = newHome
    gm.defaultAway = newAway
    changed.push({ matchId: gm.id, before, after: { home: newHome, away: newAway } })
  }

  return { data: { ...data, groupMatches }, changed }
}
