import data from '../../data/worldcup-2026.json'
import type { ScoreMap, WorldCupData, GroupMatch, GroupId } from '@/types'
import { computeGroupStandings, computeQualificationRanking, type GroupInput, type QualEntry } from './standings'
import { teamName } from './teams'
import type { Locale } from '@/i18n/config'

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
// 대한민국은 A조 3위로 확정. 진출은 다른 조 3위와의 순위 비교(승점→득실→득점)로 갈린다.
// 각 조 3위가 KOR보다 위 = 불리(unfav), 아래 = 유리(fav), 동률(승점·득실·득점 동일=페어플레이) = 미정(pending).
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

// ── 결과 조건 요약(마진 임계) + 텍스트 포맷 ─────────────────────────────────
export interface FavorableClause {
  side: 'home' | 'away' | 'draw'
  minMargin?: number
  maxMargin?: number
}
export interface FavorableCondition {
  clauses: FavorableClause[]
}
const sideOf = (h: number, a: number): FavorableClause['side'] => (h > a ? 'home' : h < a ? 'away' : 'draw')

// 스코어라인 집합 → 결과타입별 마진 임계 요약.
function summarize(scorelines: Array<[number, number]>): FavorableCondition {
  const clauses: FavorableClause[] = []
  for (const side of ['home', 'draw', 'away'] as const) {
    const margins = scorelines.filter(([h, a]) => sideOf(h, a) === side).map(([h, a]) => Math.abs(h - a))
    if (!margins.length) continue
    if (side === 'draw') {
      clauses.push({ side })
      continue
    }
    const clause: FavorableClause = { side }
    const min = Math.min(...margins)
    const max = Math.max(...margins)
    if (min > 1) clause.minMargin = min
    if (max < SCORELINE_MAX) clause.maxMargin = max
    clauses.push(clause)
  }
  return { clauses }
}

// 결과 조건 → "가나 승리" / "파나마 2점차 이상 승리" / "무승부" 같은 결과 문구(접미사 없음).
export function formatCondition(cond: FavorableCondition, homeId: string, awayId: string, locale: Locale): string {
  const en = locale === 'en'
  const parts = cond.clauses.map((c) => {
    if (c.side === 'draw') return en ? 'a draw' : '무승부'
    const team = teamName(c.side === 'home' ? homeId : awayId, locale)
    if (c.minMargin) return en ? `${team} win by ${c.minMargin}+` : `${team} ${c.minMargin}점차 이상 승리`
    if (c.maxMargin) return en ? `${team} win by ≤${c.maxMargin}` : `${team} ${c.maxMargin}점차 이하 승리`
    return en ? `${team} win` : `${team} 승리`
  })
  return parts.join(en ? ' or ' : ' 또는 ')
}

const md3OfGroup = (g: GroupId) => ginput(g).matches.slice(-2)
// 조의 색. MD3가 다 차 있으면 확정색. 미입력이 있으면 남은 결과를 완전탐색 —
// 어떤 결과든 같은 색이면 그 색으로 '확정', 갈리면 pending(예측이 가른다).
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
const groupMd3Kickoff = (g: GroupId) => md3OfGroup(g)[0]?.utcDate ?? ''
const KOR_MD3_KICKOFF = groupMd3Kickoff(KOR_GROUP)
const BINGO_GROUPS = OTHER_GROUPS.filter((g) => groupMd3Kickoff(g) >= KOR_MD3_KICKOFF)

// 미입력 MD3를 0:0으로 채운 완료 가정 — 형제 경기를 null로 두면 부분 순위가 왜곡됨.
function completion(scores: ScoreMap): ScoreMap {
  const out: ScoreMap = { ...scores }
  for (const m of matchday3Matches()) if (out[m.id] == null) out[m.id] = { home: 0, away: 0 }
  return out
}

// 3위 결정전 여부: 형제 경기는 완료 가정에 고정하고 이 경기만 0~MAX로 쓸 때 조 색이 바뀌면 = 결정전.
function isDecider(base: ScoreMap, m: GroupMatch, kor: Stat): boolean {
  const colors = new Set<BingoColor>()
  for (let h = 0; h <= SCORELINE_MAX && colors.size < 2; h++)
    for (let a = 0; a <= SCORELINE_MAX && colors.size < 2; a++)
      colors.add(colorVsKor(groupThird({ ...base, [m.id]: { home: h, away: a } }, m.groupId), kor))
  return colors.size > 1
}

// 실제 진행결과만 반영한 기준선(예측 제외) — 고정 9 결정전 산출용.
function playedScores(): ScoreMap {
  const m: ScoreMap = {}
  for (const g of wc.groupMatches) m[g.id] = g.played && g.defaultHome != null && g.defaultAway != null ? { home: g.defaultHome, away: g.defaultAway } : null
  return m
}
// 빙고 칩이 붙는 고정 9경기 — 예측이 바뀌어도 불변(형제 경기로 번지지 않음).
const FIXED_DECIDERS: ReadonlySet<string> = (() => {
  const base = completion(playedScores())
  const kor = korLine(base)
  const set = new Set<string>()
  for (const g of BINGO_GROUPS) for (const m of md3OfGroup(g)) if (isDecider(base, m, kor)) set.add(m.id)
  return set
})()

// 결정전 유리 조건: 그 경기 결과로 조가 fav가 되는 스코어 집합.
function deciderFavorable(scores: ScoreMap, m: GroupMatch, kor: Stat): FavorableCondition | null {
  const base = completion(scores)
  const fav: Array<[number, number]> = []
  let total = 0
  for (let h = 0; h <= SCORELINE_MAX; h++)
    for (let a = 0; a <= SCORELINE_MAX; a++) {
      total++
      if (colorVsKor(groupThird({ ...base, [m.id]: { home: h, away: a } }, m.groupId), kor) === 'fav') fav.push([h, a])
    }
  if (!fav.length || fav.length === total) return null
  return summarize(fav)
}

// 비결정전 힌트: 이 경기 결과가 한국 종합순위를 현재 대비 올리는(up)/내리는(down) 스코어.
function rankHint(scores: ScoreMap, matchId: string): { up: FavorableCondition | null; down: FavorableCondition | null } {
  const base = completion(scores)
  const cur = scores[matchId] ?? { home: 0, away: 0 }
  const curRank = projectKorRank({ ...base, [matchId]: cur })?.overall ?? 99
  const up: Array<[number, number]> = []
  const down: Array<[number, number]> = []
  for (let h = 0; h <= SCORELINE_MAX; h++)
    for (let a = 0; a <= SCORELINE_MAX; a++) {
      const r = projectKorRank({ ...base, [matchId]: { home: h, away: a } })?.overall ?? 99
      if (r < curRank) up.push([h, a])
      else if (r > curRank) down.push([h, a])
    }
  return { up: up.length ? summarize(up) : null, down: down.length ? summarize(down) : null }
}

export type MatchKind = 'decider' | 'kor' | 'hint' | 'none'
export interface MatchInfo {
  kind: MatchKind
  color: BingoColor // decider 칩 색
  favorable: FavorableCondition | null // decider: 유리 조건 / hint: 순위 상승 조건
  unfavorable: FavorableCondition | null // hint: 순위 하락 조건
}
export interface ScenarioAnalysis {
  kor: { overall: number; qualified: boolean } | null
  bingo: BingoResult
  matchInfo: Record<string, MatchInfo>
}

const NONE: MatchInfo = { kind: 'none', color: 'pending', favorable: null, unfavorable: null }

// 같은 scores 참조면 재사용.
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
  const colorByGroup = new Map(OTHER_GROUPS.map((g) => [g, groupColor(scores, g, korStat)]))
  const cells = BINGO_GROUPS.map((g) => ({ groupId: g, color: colorByGroup.get(g)! }))
  const bingo: BingoResult = {
    cells,
    fav: cells.filter((c) => c.color === 'fav').length,
    unfav: cells.filter((c) => c.color === 'unfav').length,
  }
  const matchInfo: Record<string, MatchInfo> = {}
  for (const m of matchday3Matches()) {
    if (m.groupId === KOR_GROUP) {
      matchInfo[m.id] = { kind: 'kor', color: 'pending', favorable: null, unfavorable: null }
    } else if (FIXED_DECIDERS.has(m.id)) {
      matchInfo[m.id] = { kind: 'decider', color: colorByGroup.get(m.groupId)!, favorable: deciderFavorable(scores, m, korStat), unfavorable: null }
    } else if (!m.played) {
      // 진행 전 비결정전 경기 중 한국 순위에 영향 주는 것만 텍스트 힌트(칩 X).
      const { up, down } = rankHint(scores, m.id)
      matchInfo[m.id] = up || down ? { kind: 'hint', color: 'pending', favorable: up, unfavorable: down } : NONE
    } else {
      matchInfo[m.id] = NONE
    }
  }
  return { kor: kor && { overall: kor.overall, qualified: kor.qualified }, bingo, matchInfo }
}
