# 킹우의수 계산기 (32강 시나리오 탭) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 조별 3차전(MD3) 결과를 예측하면 대한민국의 32강 순위·진출을 실시간으로 보여주고, 한국에 유리한 결과(골차 마진 포함)·영향 없는 경기(꽝)를 표시하는 공유 가능한 `?tab=scenario` 탭.

**Architecture:** 순수 민감도 로직(`king.ts`, 스코어라인 완전탐색) + 시간순 한 줄 리스트 UI(`ScenarioBoard`/`ScenarioMatchRow`) + 기존 진출패널 재사용(`korFocus`) + Simulator 탭/`?tab` 동기화. 점수는 기존 store 공유.

**Tech Stack:** Next 16 · TS · Zustand · Vitest · motion · football-data API(킥오프 enrich)

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `src/types.ts` (수정) | `GroupMatch.utcDate?: string` |
| `scripts/enrich-kickoffs.ts` | API `utcDate`를 데이터에 1회 주입 |
| `src/lib/king.ts` | `SCENARIO_TEAM`·`matchday3Matches`·`projectKorRank`·`korFavorableCondition`·`summarizeFavorable`·`formatFavorable`·`isFavorableNow`·`analyzeScenario` |
| `src/lib/king.test.ts` | 순수 요약/포맷 + 통합 sanity 테스트 |
| `src/components/ThirdPlacePanel.tsx` (수정) | `korFocus` 프로프(KOR 행 하이라이트 + N등 헤더 + 충족카운트) |
| `src/components/scenario/ScenarioMatchRow.tsx` | 한 줄 경기 행(조별식 인터랙션 + 유리조건/꽝 + ✓ + 시각) |
| `src/components/scenario/ScenarioBoard.tsx` | 탭 본문(시간순 리스트 + 날짜헤더 + 자동스크롤 + 패널) |
| `src/components/Simulator.tsx` (수정) | scenario 탭 + `?tab` 동기화 + 토너먼트 핸드오프 |
| `src/app/[locale]/page.tsx` (수정) | `<Simulator/>` Suspense 래핑(useSearchParams용) |
| `src/components/Header.tsx` (수정) | "킹우의수" nav |
| `src/i18n/dictionaries/{ko,en}.json` (수정) | 신규 키 |

---

## Task 1: 킥오프 시각 데이터

**Files:** Modify `src/types.ts`; Create `scripts/enrich-kickoffs.ts`

- [ ] **Step 1: 타입에 utcDate 추가** — `src/types.ts`의 `GroupMatch`에 옵셔널 필드.
```ts
export interface GroupMatch {
  id: string; groupId: GroupId; homeId: string; awayId: string
  played: boolean; defaultHome: number | null; defaultAway: number | null
  utcDate?: string
}
```
> 실제 줄바꿈/필드 순서는 기존 파일에 맞춰 `utcDate?: string`만 추가.

- [ ] **Step 2: enrich 스크립트** — `scripts/enrich-kickoffs.ts`
```ts
// 1회 실행: node --env-file=.env.local --import tsx scripts/enrich-kickoffs.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WorldCupData } from '../src/types'

interface ApiMatch {
  stage: string
  homeTeam: { tla: string | null }
  awayTeam: { tla: string | null }
  utcDate: string
}

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) { console.error('FOOTBALL_DATA_TOKEN missing'); process.exit(1) }
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': token },
  })
  if (!res.ok) { console.error('API error', res.status); process.exit(1) }
  const body = (await res.json()) as { matches?: ApiMatch[] }
  if (!body.matches) { console.error('no matches'); process.exit(1) }

  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const dateByPair = new Map<string, string>()
  for (const m of body.matches) {
    if (m.stage !== 'GROUP_STAGE' || !m.homeTeam.tla || !m.awayTeam.tla) continue
    dateByPair.set(pairKey(m.homeTeam.tla, m.awayTeam.tla), m.utcDate)
  }

  const dataPath = resolve('data/worldcup-2026.json')
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as WorldCupData
  let n = 0
  for (const gm of data.groupMatches) {
    const d = dateByPair.get(pairKey(gm.homeId, gm.awayId))
    if (d && gm.utcDate !== d) { gm.utcDate = d; n++ }
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`utcDate set on ${n} match(es)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: 실행 + 커밋**
```bash
node --env-file=.env.local --import tsx scripts/enrich-kickoffs.ts
git add src/types.ts scripts/enrich-kickoffs.ts data/worldcup-2026.json
git commit -m "feat: 조별경기 킥오프 시각(utcDate) enrich"
```
예상: `utcDate set on 72 match(es)`, data diff는 utcDate 추가만.

---

## Task 2: 민감도 로직 `king.ts`

**Files:** Create `src/lib/king.ts`, `src/lib/king.test.ts`

- [ ] **Step 1: 실패 테스트** — `src/lib/king.test.ts` (순수 요약/포맷 + 통합 sanity)
```ts
import { it, expect } from 'vitest'
import {
  matchday3Matches, projectKorRank, summarizeFavorable, formatFavorable, SCENARIO_TEAM,
} from './king'
import { useSimulator } from '@/store/useSimulator'

it('matchday3Matches = 각 조 마지막 2경기 = 24', () => {
  const md3 = matchday3Matches()
  expect(md3.length).toBe(24)
  // 모든 항목이 조별 5·6번(id 끝 5/6)
  expect(md3.every((m) => /-(5|6)$/.test(m.id))).toBe(true)
})

it('summarizeFavorable: 원정 2점차 이상만 유리', () => {
  // away win margin >=2 favorable: (0,2),(0,3),(1,3),...
  const fav: Array<[number, number]> = [[0, 2], [0, 3], [1, 3], [0, 4]]
  const cond = summarizeFavorable(fav)
  expect(cond.clauses).toEqual([{ side: 'away', minMargin: 2 }])
})

it('summarizeFavorable: 홈승만(무승부 안됨), 마진 무관', () => {
  const fav: Array<[number, number]> = [[1, 0], [2, 0], [3, 1], [4, 0], [5, 0], [6, 0], [2, 1], [3, 0], [3, 2], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3], [5, 4], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5]]
  const cond = summarizeFavorable(fav)
  expect(cond.clauses).toEqual([{ side: 'home' }])
})

it('formatFavorable: 마진/무승부안됨 텍스트', () => {
  expect(formatFavorable({ clauses: [{ side: 'home' }] }, 'KOR', 'JPN', 'ko')).toBe('대한민국 승리 (무승부 안됨)')
  expect(formatFavorable({ clauses: [{ side: 'away', minMargin: 2 }] }, 'KOR', 'JPN', 'ko')).toBe('일본 2점차 이상 승리')
  expect(formatFavorable({ clauses: [{ side: 'home', maxMargin: 4 }] }, 'KOR', 'JPN', 'ko')).toBe('대한민국 4점차 이하로만 승리')
})

it('projectKorRank: 실제 데이터에서 KOR 종합순위 1..48', () => {
  const scores = useSimulator.getState().scores
  const r = projectKorRank(scores)
  expect(r).not.toBeNull()
  expect(r!.overall).toBeGreaterThanOrEqual(1)
  expect(r!.overall).toBeLessThanOrEqual(48)
  expect(SCENARIO_TEAM).toBe('KOR')
})
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/king.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `src/lib/king.ts`
```ts
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
    if (side === 'draw') { clauses.push({ side }); continue }
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
  const hasDraw = cond.clauses.some((c) => c.side === 'draw')
  const hasWin = cond.clauses.some((c) => c.side !== 'draw')
  if (!hasDraw && hasWin && cond.clauses.length === 1) text += en ? ' (no draw)' : ' (무승부 안됨)'
  return text
}

export interface MatchAnalysis { condition: FavorableCondition | null; favorableNow: boolean }
export interface ScenarioAnalysis {
  kor: { overall: number; qualified: boolean } | null
  matches: Record<string, MatchAnalysis>
  met: number
  pivotal: number
}

// UI가 점수 변경 시 1회 호출(메모이즈).
export function analyzeScenario(scores: ScoreMap): ScenarioAnalysis {
  const kor = projectKorRank(scores)
  const matches: Record<string, MatchAnalysis> = {}
  let met = 0
  let pivotal = 0
  for (const m of matchday3Matches()) {
    const condition = korFavorableCondition(scores, m.id)
    if (condition) {
      pivotal++
      const s = scores[m.id]
      const favorableNow = !!s && korQualifiedWith(scores, m.id, s.home, s.away)
      if (favorableNow) met++
      matches[m.id] = { condition, favorableNow }
    } else {
      matches[m.id] = { condition: null, favorableNow: false }
    }
  }
  return { kor: kor && { overall: kor.overall, qualified: kor.qualified }, matches, met, pivotal }
}
```

- [ ] **Step 4: 통과** — `npx vitest run src/lib/king.test.ts` → 5 pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/king.ts src/lib/king.test.ts
git commit -m "feat: king.ts — KOR 32강 민감도(유리조건 마진 요약·투영·시나리오 분석)"
```

---

## Task 3: 진출패널 `korFocus` (KOR 하이라이트 + N등 헤더)

**Files:** Modify `src/components/ThirdPlacePanel.tsx`

- [ ] **Step 1: Row에 KOR 하이라이트** — `Row`가 `korFocus`를 받아 KOR 행 강조.
```tsx
function Row({ e, korFocus }: { e: QualEntry; korFocus?: boolean }) {
  const { t, locale } = useT()
  const isKor = korFocus && e.teamId === 'KOR'
  const tone = e.overall <= 32 ? '' : 'opacity-40'
  const gd = e.gd > 0 ? `+${e.gd}` : `${e.gd}`
  return (
    <div className={`grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${tone} ${isKor ? 'bg-primary/10 font-bold !opacity-100 ring-1 ring-primary/40' : ''}`}>
      <span className="font-mona text-center text-xs leading-none tabular-nums text-muted-foreground">{e.overall}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{teamFlag(e.teamId)}</span>
        <span className="truncate">{teamAbbr(e.teamId, locale)}</span>
        <span className="font-mona text-[11px] text-muted-foreground">{e.groupId} {t(tierKey(e.tier))}</span>
      </span>
      <span className="font-mona text-xs tabular-nums text-muted-foreground">{e.points}pt {gd}</span>
    </div>
  )
}
```

- [ ] **Step 2: QualPanelBody가 korFocus 전달 + KOR 헤더** — 시그니처에 `korFocus`, 상단에 KOR 등수 헤더.
```tsx
export function QualPanelBody({ korFocus }: { korFocus?: boolean } = {}) {
  const { t } = useT()
  const scores = useSimulator((s) => s.scores)
  const [expandedTop, setExpandedTop] = useState(false)
  const [expandedBottom, setExpandedBottom] = useState(false)
  const all = selectQualificationRanking(scores)
  const auto = all.slice(0, 24)
  const bubble = all.slice(24, 32)
  const elim = all.slice(32, 36)
  const fourths = all.slice(36)

  return (
    <div>
      {korFocus ? <KorHeadline /> : <h2 className="mb-3 text-lg font-bold tracking-tight">{t('qualStatus')}</h2>}
      <Toggle open={expandedTop} onClick={() => setExpandedTop((v) => !v)} more="showRanksMore" less="showRanksLess" suffix="confirmedSuffix" dir="up" />
      {expandedTop && (<>{auto.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}<div className="my-2.5 h-px bg-border" /></>)}
      {bubble.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}
      <div className="my-3 flex items-center gap-2.5">
        <span className="h-0.5 flex-1 rounded bg-gradient-to-r from-transparent to-primary" />
        <span className="whitespace-nowrap text-xs font-extrabold text-primary" style={{ textShadow: '0 0 14px var(--accent-glow)' }}>{t('cutLabel')}</span>
        <span className="h-0.5 flex-1 rounded bg-gradient-to-l from-transparent to-primary" />
      </div>
      {elim.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}
      <Toggle open={expandedBottom} onClick={() => setExpandedBottom((v) => !v)} more="showFourthMore" less="showFourthLess" suffix="eliminatedSuffix" dir="down" />
      {expandedBottom && fourths.map((e) => <Row key={e.teamId} e={e} korFocus={korFocus} />)}
    </div>
  )
}
```

- [ ] **Step 3: KorHeadline 컴포넌트** (같은 파일 내) — KOR 등수/진출/충족카운트, 모션.
```tsx
import { motion } from 'motion/react'
import { analyzeScenario } from '@/lib/king'
import { teamFlag, teamName } from '@/lib/teams'

function KorHeadline() {
  const { t, locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const a = useMemo(() => analyzeScenario(scores), [scores])
  if (!a.kor) return null
  const ok = a.kor.qualified
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-base">{teamFlag('KOR')}</span>
        <span className="text-lg font-bold tracking-tight">{teamName('KOR', locale)}</span>
        <motion.span key={a.kor.overall} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-mona text-lg font-extrabold tabular-nums">
          {t('korRankCurrent', { n: a.kor.overall })}
        </motion.span>
      </div>
      <div className={`mt-0.5 text-sm font-bold ${ok ? 'text-primary' : 'text-destructive'}`}>
        {ok ? t('korQualified') : t('korEliminated')}
        <span className="ml-1.5 font-normal text-muted-foreground">· {t('favorableMet', { met: a.met, total: a.pivotal })}</span>
      </div>
    </div>
  )
}
```
> `useMemo`/`useState` import 추가. `text-destructive`가 테마에 없으면 `text-red-500` 사용.

- [ ] **Step 4: Aside/MorphBar가 korFocus 전달** — `ThirdPlaceAside`와 `QualMorphBar`에 옵셔널 `korFocus` 추가해 `QualPanelBody`/모바일 알약에 반영.
```tsx
export function ThirdPlaceAside({ korFocus }: { korFocus?: boolean } = {}) {
  return (
    <aside className="sticky top-4 hidden h-fit w-[312px] shrink-0 rounded-2xl border p-4 lg:block">
      <QualPanelBody korFocus={korFocus} />
    </aside>
  )
}
```
`QualMorphBar`: 시그니처에 `korFocus?: boolean` 추가, 펼친 시트 안 `<QualPanelBody korFocus={korFocus} />`, 접힌 알약 라벨을 korFocus면 KOR 등수로:
```tsx
// 접힌 알약(첫 button) — korFocus 분기
<button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
  {korFocus ? <KorPill /> : <>🥉 {t('qualStatusButton')}</>}
</button>
```
```tsx
function KorPill() {
  const { t, locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const a = useMemo(() => analyzeScenario(scores), [scores])
  if (!a.kor) return <>🇰🇷 {teamName('KOR', locale)}</>
  return (
    <span className={a.kor.qualified ? 'text-primary' : 'text-red-500'}>
      🇰🇷 {teamName('KOR', locale)} {t('korRankCurrent', { n: a.kor.overall })}
    </span>
  )
}
```

- [ ] **Step 5: 검증** — `npm run build` 성공.

- [ ] **Step 6: Commit**
```bash
git add src/components/ThirdPlacePanel.tsx
git commit -m "feat: 진출패널 korFocus — KOR 행 하이라이트 + 등수/진출/충족 헤더"
```

---

## Task 4: 경기 행 `ScenarioMatchRow`

**Files:** Create `src/components/scenario/ScenarioMatchRow.tsx`

- [ ] **Step 1: 구현** — 한 줄 경기(조별식 점수 인터랙션 + 유리조건/꽝 + ✓ + 시각).
```tsx
'use client'
import type { GroupMatch } from '@/types'
import type { MatchAnalysis } from '@/lib/king'
import { formatFavorable } from '@/lib/king'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function ScenarioMatchRow({ match, analysis }: { match: GroupMatch; analysis: MatchAnalysis }) {
  const { t, locale } = useT()
  const score = useSimulator((s) => s.scores[match.id])
  const setScore = useSimulator((s) => s.setScore)
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) => setScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  const pivotal = analysis.condition != null
  const conditionText = analysis.condition ? formatFavorable(analysis.condition, match.homeId, match.awayId, locale) : null

  return (
    <div
      data-unfilled={!filled || undefined}
      className={`rounded-xl border p-3 transition-colors ${pivotal ? 'border-primary/40' : ''} ${filled ? '' : 'opacity-60'}`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <button type="button" onClick={() => update(h + 1, a)} aria-label={`${teamName(match.homeId, locale)} +1`} className="flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary">
          <span className="truncate">{teamName(match.homeId, locale)}</span>
          <span className="text-base leading-none">{teamFlag(match.homeId)}</span>
        </button>
        <span className="flex items-center gap-1">
          <Step onUp={() => update(h + 1, a)} onDown={() => update(h - 1, a)} up={t('scoreUp')} down={t('scoreDown')} />
          <button type="button" onClick={() => update(0, 0)} aria-label={t('guideReset')} className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105">
            {h}<span className="opacity-50"> : </span>{a}
          </button>
          <Step onUp={() => update(h, a + 1)} onDown={() => update(h, a - 1)} up={t('scoreUp')} down={t('scoreDown')} />
        </span>
        <button type="button" onClick={() => update(h, a + 1)} aria-label={`${teamName(match.awayId, locale)} +1`} className="flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary">
          <span className="text-base leading-none">{teamFlag(match.awayId)}</span>
          <span className="truncate">{teamName(match.awayId, locale)}</span>
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {pivotal ? (
          <>
            <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${analysis.favorableNow ? 'bg-primary text-primary-foreground' : 'border border-primary/40 text-primary'}`}>
              {analysis.favorableNow ? '✓' : '🇰🇷'} {t('favorableNeeds')}
            </span>
            <span className="min-w-0 truncate text-muted-foreground">{conditionText}</span>
          </>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">{t('notPivotal')}</span>
        )}
      </div>
    </div>
  )
}

function Step({ onUp, onDown, up, down }: { onUp: () => void; onDown: () => void; up: string; down: string }) {
  const cls = 'flex h-3.5 items-center justify-center px-0.5 text-[9px] leading-none text-muted-foreground transition-colors hover:text-primary'
  return (
    <span className="flex flex-col">
      <button type="button" onClick={onUp} aria-label={up} className={cls}>▲</button>
      <button type="button" onClick={onDown} aria-label={down} className={cls}>▼</button>
    </span>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/scenario/ScenarioMatchRow.tsx
git commit -m "feat: ScenarioMatchRow — 한 줄 경기 + 유리조건/꽝/✓"
```

---

## Task 5: 탭 본문 `ScenarioBoard`

**Files:** Create `src/components/scenario/ScenarioBoard.tsx`

- [ ] **Step 1: 구현** — 시간순 리스트 + 날짜헤더 + 자동스크롤 + 패널(PC side / 모바일 fixed).
```tsx
'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { matchday3Matches, analyzeScenario } from '@/lib/king'
import { ScenarioMatchRow } from './ScenarioMatchRow'
import { ThirdPlaceAside, QualMorphBar } from '@/components/ThirdPlacePanel'
import { useT } from '@/i18n/useT'
import type { Locale } from '@/i18n/config'

function dateHeader(iso: string | undefined, locale: Locale): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul',
  }).format(d)
}
function timeLabel(iso: string | undefined, locale: Locale): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  }).format(new Date(iso))
}

export function ScenarioBoard({ complete, onNext, filled, total }: { complete: boolean; onNext: () => void; filled: number; total: number }) {
  const { locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const md3 = useMemo(() => matchday3Matches(), [])
  const analysis = useMemo(() => analyzeScenario(scores), [scores])
  const listRef = useRef<HTMLDivElement>(null)

  // 마운트 시 첫 미입력 경기로 스크롤
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-unfilled]') as HTMLElement | null
    el?.scrollIntoView({ block: 'center' })
  }, [])

  // 날짜 그룹핑(시간순 정렬은 matchday3Matches가 보장)
  let lastDay = ''
  return (
    <div className="flex gap-5 pb-28 lg:pb-5">
      <div ref={listRef} className="min-w-0 flex-1 space-y-2">
        {md3.map((m) => {
          const day = dateHeader(m.utcDate, locale)
          const showHeader = day && day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showHeader && <h3 className="mt-4 mb-1.5 text-sm font-bold text-muted-foreground first:mt-0">{day}</h3>}
              {m.utcDate && <div className="mb-1 font-mona text-[11px] tabular-nums text-muted-foreground">{timeLabel(m.utcDate, locale)}</div>}
              <ScenarioMatchRow match={m} analysis={analysis.matches[m.id]} />
            </div>
          )
        })}
      </div>
      <ThirdPlaceAside korFocus />
      <QualMorphBar korFocus complete={complete} filled={filled} total={total} onNext={onNext} />
    </div>
  )
}
```
> `QualMorphBar`의 `onNext`는 토너먼트 이동(Task 6에서 연결). 모바일 fixed 바는 컴포넌트 자체가 `lg:hidden`/`fixed`라 여기선 그대로 렌더.

- [ ] **Step 2: Commit**
```bash
git add src/components/scenario/ScenarioBoard.tsx
git commit -m "feat: ScenarioBoard — 시간순 MD3 리스트 + 날짜헤더 + 자동스크롤 + KOR 패널"
```

---

## Task 6: Simulator 탭 + `?tab` 동기화 + 핸드오프

**Files:** Modify `src/components/Simulator.tsx`, `src/app/[locale]/page.tsx`

- [ ] **Step 1: page.tsx Suspense 래핑** (useSearchParams 디옵트 방지)
```tsx
import { Suspense } from 'react'
import { Simulator } from '@/components/Simulator'

export default function Home() {
  return (
    <Suspense>
      <Simulator />
    </Suspense>
  )
}
```

- [ ] **Step 2: Simulator에 scenario 탭 + URL 동기화** — 전체 교체.
```tsx
'use client'
import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { GroupStage } from '@/components/group/GroupStage'
import { ScenarioBoard } from '@/components/scenario/ScenarioBoard'
import { Bracket } from '@/components/knockout/Bracket'
import { AwardsVote } from '@/components/AwardsVote'
import { ThirdPlaceAside, QualMorphBar } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n/useT'

type Tab = 'group' | 'scenario' | 'knockout'

export function Simulator() {
  const { t } = useT()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const scores = useSimulator((s) => s.scores)
  const total = Object.keys(scores).length
  const filled = Object.values(scores).filter((v) => v != null).length
  const complete = total > 0 && filled >= total

  const urlTab = params.get('tab')
  const wanted: Tab = urlTab === 'scenario' || urlTab === 'knockout' || urlTab === 'group' ? urlTab : 'group'
  const initial: Tab = wanted === 'knockout' && !complete ? 'group' : wanted
  const [tab, setTab] = useState<Tab>(initial)

  const changeTab = (v: string) => {
    setTab(v as Tab)
    router.replace(`${pathname}?tab=${v}`, { scroll: false })
    window.scrollTo({ top: 0 })
  }

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList>
        <TabsTrigger value="group">{t('tabGroup')}</TabsTrigger>
        <TabsTrigger value="scenario">{t('tabScenario')}</TabsTrigger>
        <TabsTrigger value="knockout" disabled={!complete}>{t('tabKnockout')}</TabsTrigger>
      </TabsList>

      <TabsContent value="group" className="min-w-0">
        <div className="flex gap-5 pb-24">
          <div className="min-w-0 flex-1"><GroupStage /></div>
          <ThirdPlaceAside />
        </div>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden justify-center pb-4 lg:flex">
          {complete ? (
            <button type="button" onClick={() => changeTab('scenario')} className="pointer-events-auto rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105">{t('next')} →</button>
          ) : (
            <div className="pointer-events-auto rounded-full bg-foreground/85 px-6 py-3 text-sm font-semibold text-background shadow-lg backdrop-blur">{t('predictedMatches')} <span className="font-mona tabular-nums">{filled}/{total}</span></div>
          )}
        </div>
        <QualMorphBar complete={complete} filled={filled} total={total} onNext={() => changeTab('scenario')} />
      </TabsContent>

      <TabsContent value="scenario" className="min-w-0">
        <ScenarioBoard complete={complete} filled={filled} total={total} onNext={() => changeTab('knockout')} />
      </TabsContent>

      <TabsContent value="knockout" className="min-w-0">
        <Bracket />
        <AwardsVote />
      </TabsContent>
    </Tabs>
  )
}
```
> 변경점: scenario 탭 추가, `?tab` 읽기/쓰기, 그룹탭의 "다음으로"가 scenario로(기존 knockout 대신) — 흐름 그룹→킹우의수→토너먼트. scenario의 onNext=knockout.

- [ ] **Step 3: 검증** — `npm run build` 성공. `?tab=scenario`/`?tab=knockout` 딥링크 동작, 그룹 미완료 시 `?tab=knockout`→group 폴백.

- [ ] **Step 4: Commit**
```bash
git add src/components/Simulator.tsx "src/app/[locale]/page.tsx"
git commit -m "feat: Simulator scenario 탭 + ?tab 동기화 + 그룹→킹우의수→토너먼트 흐름"
```

---

## Task 7: Header nav + i18n

**Files:** Modify `src/components/Header.tsx`, `src/i18n/dictionaries/{ko,en}.json`

- [ ] **Step 1: i18n 키 추가** — ko.json
```json
"tabScenario": "킹우의수",
"navScenario": "킹우의수",
"korRankCurrent": "현재 {n}등",
"korQualified": "32강 진출권!",
"korEliminated": "32강 탈락권",
"favorableMet": "유리한 결과 {met}/{total}개 충족",
"favorableNeeds": "한국에 유리",
"notPivotal": "꽝",
"scenarioToKnockout": "토너먼트로"
```
en.json (동일 키)
```json
"tabScenario": "Road to R32",
"navScenario": "Road to R32",
"korRankCurrent": "now #{n}",
"korQualified": "Into Round of 32!",
"korEliminated": "Out of R32",
"favorableMet": "{met}/{total} favorable",
"favorableNeeds": "Korea needs",
"notPivotal": "no effect",
"scenarioToKnockout": "To bracket"
```

- [ ] **Step 2: Header에 nav 추가** — 기존 시뮬레이터/통계 nav 옆에 킹우의수(`?tab=scenario`). `Header.tsx`의 nav 링크 목록에 추가:
```tsx
// 시뮬레이터 nav가 `/${locale}` 라면, 킹우의수는 `/${locale}?tab=scenario`
<Link href={`/${locale}?tab=scenario`} className="...기존 nav 클래스...">{t('navScenario')}</Link>
```
> Header의 실제 nav 마크업/활성표시 패턴에 맞춰 한 줄 추가. (시뮬레이터·통계와 동일 스타일.)

- [ ] **Step 3: QualMorphBar 완료 CTA 라벨** — korFocus일 때 완료 버튼 라벨을 `scenarioToKnockout`로(기본은 `next`). `QualMorphBar` 완료 버튼:
```tsx
{complete ? <Button className="flex-1" onClick={() => { setOpen(false); onNext() }}>{t(korFocus ? 'scenarioToKnockout' : 'next')} →</Button> : ...}
```
접힌 알약의 완료 버튼도 동일 분기.

- [ ] **Step 4: 검증 + Commit**
```bash
npm run build
git add src/components/Header.tsx src/i18n/dictionaries/ko.json src/i18n/dictionaries/en.json src/components/ThirdPlacePanel.tsx
git commit -m "feat: 킹우의수 nav + i18n + 시나리오 완료 CTA"
```

---

## Task 8: 통합 검증 + 배포

- [ ] **Step 1:** `npx vitest run` 전체 통과 + `npm run build` 성공.
- [ ] **Step 2: 라이브 검증(dev)** — `/ko?tab=scenario`:
  - MD3 24경기 시간순 + 날짜헤더, 끝난 경기 채워짐, 첫 미입력으로 자동 스크롤.
  - 국가/전광판 탭 점수조절 + ▲▼ 동작.
  - 중요경기에 유리조건(마진 텍스트)·꽝 표시, 충족 시 ✓.
  - 하단/사이드 패널에 "🇰🇷 대한민국 현재 N등 · 진출/탈락 · 유리결과 K/M" 라이브 갱신.
  - 점수 변경 시 KOR 등수·조건 실시간 반영.
  - 24경기 다 채우면 CTA → `?tab=knockout` 이동(브래킷에 반영).
  - ko/en 모두.
- [ ] **Step 3: 배포** — main 머지 + push.

---

## Self-Review 결과

**Spec coverage**: 탭+`?tab`(Task 6) / MD3 시간순·킥오프(Task 1·5) / 조별식 인터랙션(Task 4) / 자동스크롤(Task 5) / 정밀 민감도+마진(Task 2) / 유리조건·꽝·✓(Task 4) / KOR N등 패널 재사용+하이라이트(Task 3) / 충족카운트(Task 2·3) / 토너먼트 핸드오프(Task 6) / nav·i18n(Task 7). ✅

**Placeholder scan**: 없음. Header nav는 기존 마크업에 맞춰 한 줄 추가(패턴 명시) — 실제 클래스는 파일 확인 후 동일 적용.

**Type consistency**: `ScoreMap`/`Score`(store) ↔ king.ts. `FavorableCondition`/`MatchAnalysis`/`ScenarioAnalysis`(king) ↔ ScenarioMatchRow/Board/KorHeadline. `korFocus` 프로프 일관(Row/QualPanelBody/Aside/QualMorphBar). `analyzeScenario`가 UI의 단일 진입(메모이즈). `GroupMatch.utcDate?`(Task1) ↔ matchday3 정렬·날짜헤더(Task5). 그룹탭 "다음으로"가 scenario로 변경됨(흐름 일관).

**성능 노트**: `analyzeScenario`는 24경기 × ~49 스코어라인 랭킹계산 — 점수 변경 시 `useMemo` 1회(~수십 ms). 체감 지연 시 SCORELINE_MAX 축소/중요경기 후보 사전필터로 최적화 가능(범위 밖).
