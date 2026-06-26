import data from '../../data/worldcup-2026.json'
import type { ScoreMap, WorldCupData, GroupMatch, GroupId } from '@/types'
import { computeQualificationRanking, type GroupInput, type QualEntry } from './standings'
import { teamName } from './teams'
import type { Locale } from '@/i18n/config'

export const SCENARIO_TEAM = 'KOR'
const SCORELINE_MAX = 6

const wc = data as unknown as WorldCupData
const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function groupInputs(): GroupInput[] {
  return GROUP_IDS.map((g) => ({
    groupId: g,
    teamIds: wc.teams.filter((t) => t.groupId === g).map((t) => t.id),
    matches: wc.groupMatches.filter((m) => m.groupId === g),
  }))
}

// MD3 = 각 조 마지막 2경기, utcDate(없으면 id) 오름차순.
export function matchday3Matches(): GroupMatch[] {
  const byGroup = new Map<GroupId, GroupMatch[]>()
  for (const m of wc.groupMatches) {
    const arr = byGroup.get(m.groupId) ?? []
    arr.push(m)
    byGroup.set(m.groupId, arr)
  }
  const out: GroupMatch[] = []
  for (const arr of byGroup.values()) out.push(...arr.slice(-2))
  return out.sort((a, b) => (a.utcDate ?? '').localeCompare(b.utcDate ?? '') || a.id.localeCompare(b.id))
}

function korEntry(scores: ScoreMap): QualEntry | null {
  return computeQualificationRanking(groupInputs(), scores).find((e) => e.teamId === SCENARIO_TEAM) ?? null
}

export function projectKorRank(scores: ScoreMap): { overall: number; qualified: boolean; entry: QualEntry } | null {
  const e = korEntry(scores)
  return e ? { overall: e.overall, qualified: e.qualified, entry: e } : null
}

function korQualifiedWith(scores: ScoreMap, matchId: string, home: number, away: number): boolean {
  const trial: ScoreMap = { ...scores, [matchId]: { home, away } }
  return korEntry(trial)?.qualified ?? false
}

export interface FavorableClause { side: 'home' | 'away' | 'draw'; minMargin?: number; maxMargin?: number }
export interface FavorableCondition { clauses: FavorableClause[] }

const sideOf = (h: number, a: number): FavorableClause['side'] => (h > a ? 'home' : h < a ? 'away' : 'draw')

// 유리 스코어라인 집합 → 결과타입별 마진 임계 요약.
export function summarizeFavorable(favorable: Array<[number, number]>): FavorableCondition {
  const clauses: FavorableClause[] = []
  for (const side of ['home', 'draw', 'away'] as const) {
    const margins = favorable.filter(([h, a]) => sideOf(h, a) === side).map(([h, a]) => Math.abs(h - a))
    if (margins.length === 0) continue
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

// 해당 경기 유리 조건. 진출이 이 경기와 무관(항상 진출/절대 불가)하면 null(=꽝).
export function korFavorableCondition(scores: ScoreMap, matchId: string): FavorableCondition | null {
  const favorable: Array<[number, number]> = []
  let total = 0
  for (let h = 0; h <= SCORELINE_MAX; h++) {
    for (let a = 0; a <= SCORELINE_MAX; a++) {
      total++
      if (korQualifiedWith(scores, matchId, h, a)) favorable.push([h, a])
    }
  }
  if (favorable.length === 0 || favorable.length === total) return null
  return summarizeFavorable(favorable)
}

export function isPivotalForKor(scores: ScoreMap, matchId: string): boolean {
  return korFavorableCondition(scores, matchId) !== null
}

// 현재 입력 스코어가 그 경기의 유리집합에 속하는지(중요경기 한정).
export function isFavorableNow(scores: ScoreMap, matchId: string): boolean {
  const s = scores[matchId]
  if (!s) return false
  if (!isPivotalForKor(scores, matchId)) return false
  return korQualifiedWith(scores, matchId, s.home, s.away)
}

export function formatFavorable(cond: FavorableCondition, homeId: string, awayId: string, locale: Locale): string {
  const en = locale === 'en'
  const parts = cond.clauses.map((c) => {
    if (c.side === 'draw') return en ? 'Draw' : '무승부'
    const team = teamName(c.side === 'home' ? homeId : awayId, locale)
    if (c.minMargin && c.minMargin > 1) return en ? `${team} win by ${c.minMargin}+` : `${team} ${c.minMargin}점차 이상 승리`
    if (c.maxMargin) return en ? `${team} win by ≤${c.maxMargin}` : `${team} ${c.maxMargin}점차 이하로만 승리`
    return en ? `${team} win` : `${team} 승리`
  })
  let text = parts.join(en ? ' or ' : ' 또는 ')
  // 마진 제약 없는 '단순 승리' 한 절일 때만 무승부 불가 명시(마진 절은 이미 함의).
  const only = cond.clauses.length === 1 ? cond.clauses[0] : null
  const plainWin = !!only && only.side !== 'draw' && only.minMargin === undefined && only.maxMargin === undefined
  if (plainWin) text += en ? ' (no draw)' : ' (무승부 안됨)'
  return text
}

export interface MatchAnalysis { related: boolean; condition: FavorableCondition | null; favorableNow: boolean }
export interface ScenarioAnalysis {
  kor: { overall: number; qualified: boolean } | null
  matches: Record<string, MatchAnalysis>
  met: number
  pivotal: number
}

function originalScores(): ScoreMap {
  const map: ScoreMap = {}
  for (const m of wc.groupMatches) {
    map[m.id] = m.played && m.defaultHome != null && m.defaultAway != null ? { home: m.defaultHome, away: m.defaultAway } : null
  }
  return map
}

// 미입력 MD3를 무승부(0-0)로 채운 '대회 완료 가정' — KOR을 현실적 버블에 놓아 관여경기를 판정.
function completionBaseline(scores: ScoreMap): ScoreMap {
  const out: ScoreMap = { ...scores }
  for (const m of matchday3Matches()) if (out[m.id] == null) out[m.id] = { home: 0, away: 0 }
  return out
}

function satisfiesCondition(cond: FavorableCondition, h: number, a: number): boolean {
  const side = sideOf(h, a)
  const margin = Math.abs(h - a)
  return cond.clauses.some(
    (c) => c.side === side && (c.minMargin == null || margin >= c.minMargin) && (c.maxMargin == null || margin <= c.maxMargin),
  )
}

// 관여(하이라이트) 경기 + 고정 유리조건 — 원본 데이터의 완료가정에서 1회 계산(처음부터 고정 표시).
let _related: Map<string, FavorableCondition> | null = null
export function relatedConditions(): Map<string, FavorableCondition> {
  if (_related) return _related
  const base = completionBaseline(originalScores())
  const map = new Map<string, FavorableCondition>()
  for (const m of matchday3Matches()) {
    const cond = korFavorableCondition(base, m.id)
    if (cond) map.set(m.id, cond)
  }
  _related = map
  return map
}

// 같은 scores 참조면 재사용(보드·패널이 동일 객체로 각각 호출해도 1회만 계산).
let _cache: { scores: ScoreMap; result: ScenarioAnalysis } | null = null

// UI가 점수 변경 시 1회 호출(메모이즈).
export function analyzeScenario(scores: ScoreMap): ScenarioAnalysis {
  if (_cache && _cache.scores === scores) return _cache.result
  const result = computeScenario(scores)
  _cache = { scores, result }
  return result
}

function computeScenario(scores: ScoreMap): ScenarioAnalysis {
  const kor = projectKorRank(scores) // 헤드라인은 현재 실제 순위(미입력 무시)
  const related = relatedConditions() // 하이라이트·조건은 고정(완료가정)
  const matches: Record<string, MatchAnalysis> = {}
  let met = 0
  for (const m of matchday3Matches()) {
    const condition = related.get(m.id) ?? null
    const s = scores[m.id]
    const favorableNow = !!condition && !!s && satisfiesCondition(condition, s.home, s.away)
    if (favorableNow) met++
    matches[m.id] = { related: condition != null, condition, favorableNow }
  }
  return { kor: kor && { overall: kor.overall, qualified: kor.qualified }, matches, met, pivotal: related.size }
}
