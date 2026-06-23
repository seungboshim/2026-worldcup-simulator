import data from '../../data/worldcup-2026.json'
import {
  computeGroupStandings,
  computeThirdPlaceRanking,
  computeQualificationRanking,
  type GroupInput,
  type TeamStanding,
  type ThirdPlaceEntry,
  type QualEntry,
} from '@/lib/standings'
import thirdAssign from '../../data/third-place-assignment.json'
import { seedKnockout, advanceBracket, type ResolvedMatch } from '@/lib/knockout'
import type { GroupId, ScoreMap, WorldCupData, ThirdPlaceAssignmentTable } from '@/types'

const wc = data as unknown as WorldCupData
const assignment = thirdAssign as unknown as ThirdPlaceAssignmentTable
const GROUP_IDS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

function groupInputs(): GroupInput[] {
  return GROUP_IDS.map((g) => ({
    groupId: g,
    teamIds: wc.teams.filter((t) => t.groupId === g).map((t) => t.id),
    matches: wc.groupMatches.filter((m) => m.groupId === g),
  })).filter((gi) => gi.teamIds.length > 0)
}

export function selectGroupStandings(scores: ScoreMap): Record<string, TeamStanding[]> {
  const out: Record<string, TeamStanding[]> = {}
  for (const gi of groupInputs()) {
    out[gi.groupId] = computeGroupStandings(gi.teamIds, gi.matches, scores)
  }
  return out
}

export function selectThirdPlaceRanking(scores: ScoreMap): ThirdPlaceEntry[] {
  const inputs = groupInputs()
  if (inputs.length === 0) return []
  return computeThirdPlaceRanking(inputs, scores)
}

export function selectQualificationRanking(scores: ScoreMap): QualEntry[] {
  const inputs = groupInputs()
  if (inputs.length === 0) return []
  return computeQualificationRanking(inputs, scores)
}

// 완성된(또는 진행 중) 토너먼트 브래킷을 해소 — Bracket UI와 제출 CTA가 공유.
export function selectResolvedBracket(
  scores: ScoreMap,
  winners: Record<string, string | null>,
): ResolvedMatch[] {
  const standings = selectGroupStandings(scores)
  const thirds = selectThirdPlaceRanking(scores)
  const r32 = seedKnockout(wc.knockoutMatches, standings, thirds, assignment)
  return advanceBracket(wc.knockoutMatches, r32, winners)
}
