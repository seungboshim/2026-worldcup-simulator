import data from '../../data/worldcup-2026.json'
import type { ScoreMap, WorldCupData, GroupMatch, GroupId } from '@/types'
import { computeGroupStandings, computeQualificationRanking, type GroupInput, type QualEntry } from './standings'

export const SCENARIO_TEAM = 'KOR'
const SCORELINE_MAX = 6

const wc = data as unknown as WorldCupData
const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const KOR_GROUP: GroupId = wc.teams.find((t) => t.id === SCENARIO_TEAM)?.groupId ?? 'A'

const GINPUTS: GroupInput[] = GROUP_IDS.map((g) => ({
  groupId: g,
  teamIds: wc.teams.filter((t) => t.groupId === g).map((t) => t.id),
  matches: wc.groupMatches.filter((m) => m.groupId === g),
}))
const ginput = (g: GroupId) => GINPUTS.find((x) => x.groupId === g)!
function groupInputs(): GroupInput[] {
  return GINPUTS
}

// MD3 = 각 조 마지막 2경기, utcDate(없으면 id) 오름차순.
export function matchday3Matches(): GroupMatch[] {
  const out: GroupMatch[] = []
  for (const g of GINPUTS) out.push(...g.matches.slice(-2))
  return out.sort((a, b) => (a.utcDate ?? '').localeCompare(b.utcDate ?? '') || a.id.localeCompare(b.id))
}

function korEntry(scores: ScoreMap): QualEntry | null {
  return computeQualificationRanking(groupInputs(), scores).find((e) => e.teamId === SCENARIO_TEAM) ?? null
}

export function projectKorRank(scores: ScoreMap): { overall: number; qualified: boolean; entry: QualEntry } | null {
  const e = korEntry(scores)
  return e ? { overall: e.overall, qualified: e.qualified, entry: e } : null
}

// ── 32강 빙고: 조 3위끼리의 경합 ──────────────────────────────────────────
// 대한민국은 A조 3위로 확정. 진출은 다른 11개조 3위와의 순위 비교(승점→득실→득점)로 갈린다.
// 각 조 3위가 KOR보다 위 = 불리(unfav), 아래 = 유리(fav), 동률(승점·득실·득점 동일=페어플레이) = 미정(pending).
// 유리 4개 이상이면 진출, 불리 8개 이상이면 탈락(나무위키 경우의 수와 같은 모델).
export type BingoColor = 'fav' | 'unfav' | 'pending'
interface Stat {
  points: number
  gd: number
  gf: number
}
// >0: a가 KOR(b)보다 상위.
const cmpStat = (a: Stat, b: Stat) => a.points - b.points || a.gd - b.gd || a.gf - b.gf
const colorVsKor = (third: Stat, kor: Stat): BingoColor => {
  const c = cmpStat(third, kor)
  return c > 0 ? 'unfav' : c < 0 ? 'fav' : 'pending'
}

const stat = (s: { points: number; gd: number; gf: number }): Stat => ({ points: s.points, gd: s.gd, gf: s.gf })
function groupThird(scores: ScoreMap, g: GroupId): Stat {
  return stat(computeGroupStandings(ginput(g).teamIds, ginput(g).matches, scores)[2])
}
function korLine(scores: ScoreMap): Stat {
  const t = computeGroupStandings(ginput(KOR_GROUP).teamIds, ginput(KOR_GROUP).matches, scores)
  return stat(t.find((r) => r.teamId === SCENARIO_TEAM) ?? t[2])
}

const md3OfGroup = (g: GroupId) => ginput(g).matches.slice(-2)
// 조의 색. MD3가 다 차 있으면 확정색. 미입력이 있으면 남은 결과를 완전탐색 —
// 어떤 결과든 같은 색이면 그 색으로 '확정'(이미 KOR보다 위/아래가 보장된 조), 갈리면 pending(예측이 가른다).
function groupColor(scores: ScoreMap, g: GroupId, kor: Stat): BingoColor {
  const unfilled = md3OfGroup(g).filter((m) => scores[m.id] == null)
  if (unfilled.length === 0) return colorVsKor(groupThird(scores, g), kor)
  const seen = new Set<BingoColor>()
  let mixed = false
  const rec = (i: number, s: ScoreMap) => {
    if (mixed) return
    if (i === unfilled.length) {
      seen.add(colorVsKor(groupThird(s, g), kor))
      if (seen.size > 1) mixed = true
      return
    }
    for (let h = 0; h <= SCORELINE_MAX && !mixed; h++)
      for (let a = 0; a <= SCORELINE_MAX && !mixed; a++) rec(i + 1, { ...s, [unfilled[i].id]: { home: h, away: a } })
  }
  rec(0, scores)
  return seen.size === 1 ? [...seen][0] : 'pending'
}

export interface BingoCell {
  groupId: GroupId
  color: BingoColor
}
export interface BingoResult {
  cells: BingoCell[]
  fav: number
  unfav: number
}
const OTHER_GROUPS = GROUP_IDS.filter((g) => g !== KOR_GROUP)
// 빙고 = 9개조(D~L). 우리 조(A)와, KOR이 3위를 확정한 시점(A조 3차전 킥오프)보다 먼저 끝난 B·C는 제외.
// B·C 3차전은 KOR 경기보다 일찍 시작·종료돼 확정 시점에 이미 결정(유리 1·불리 1 누적)됐다 →
// 공식 '경우의 수' 인포그래픽도 9개만 센다. ISO UTC 문자열은 사전순=시간순이라 그대로 비교.
const groupMd3Kickoff = (g: GroupId) => md3OfGroup(g)[0]?.utcDate ?? ''
const KOR_MD3_KICKOFF = groupMd3Kickoff(KOR_GROUP)
const BINGO_GROUPS = OTHER_GROUPS.filter((g) => groupMd3Kickoff(g) >= KOR_MD3_KICKOFF)

export type MatchColor = BingoColor | 'kor'
export interface ScenarioAnalysis {
  kor: { overall: number; qualified: boolean } | null
  bingo: BingoResult
  matchColor: Record<string, MatchColor> // MD3 경기 id → 그 조의 색(kor = 우리 조 경기)
}

// 같은 scores 참조면 재사용(보드·패널이 동일 객체로 각각 호출해도 1회만 계산).
let _cache: { scores: ScoreMap; result: ScenarioAnalysis } | null = null
export function analyzeScenario(scores: ScoreMap): ScenarioAnalysis {
  if (_cache && _cache.scores === scores) return _cache.result
  const result = computeScenario(scores)
  _cache = { scores, result }
  return result
}

function computeScenario(scores: ScoreMap): ScenarioAnalysis {
  const kor = projectKorRank(scores)
  const korStat = korLine(scores)
  // 우리 조 외 모든 조 색을 1회 계산 — 빙고 램프는 9개조(BINGO_GROUPS)만, 카드 라벨은 B·C 포함 전부에 붙인다.
  const colorByGroup = new Map(OTHER_GROUPS.map((g) => [g, groupColor(scores, g, korStat)]))
  const cells = BINGO_GROUPS.map((g) => ({ groupId: g, color: colorByGroup.get(g)! }))
  const bingo: BingoResult = {
    cells,
    fav: cells.filter((c) => c.color === 'fav').length,
    unfav: cells.filter((c) => c.color === 'unfav').length,
  }
  const matchColor: Record<string, MatchColor> = {}
  for (const m of matchday3Matches()) matchColor[m.id] = m.groupId === KOR_GROUP ? 'kor' : colorByGroup.get(m.groupId) ?? 'pending'
  return { kor: kor && { overall: kor.overall, qualified: kor.qualified }, bingo, matchColor }
}
