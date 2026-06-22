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
import type { GroupId, ScoreMap, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData
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
