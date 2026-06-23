# Phase 2 — 예측 통계(배당률) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 완성한 토너먼트 예측을 익명 제출하고, 모두의 예측을 집계한 배당률(픽률) 대시보드(`/stats`)를 보여준다.

**Architecture:** 모든 DB 접근은 Next 서버에서만 — 제출은 Server Action, 통계는 Server Component(SSR). Neon(서버리스 Postgres)을 DB로만 사용 — 서버 전용 `DATABASE_URL`로 접근. 라우팅은 하이브리드: 시뮬은 기존 `[locale]/page.tsx` 탭 유지, 통계는 `[locale]/stats` 별도 라우트. 공유 chrome(Header)은 `[locale]/layout.tsx`로 올려 시뮬·통계가 공유.

**Tech Stack:** Next 16(App Router, Server Actions) · @neondatabase/serverless · Zustand · Vitest

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `scripts/phase2-predictions.sql` | `predictions` 테이블 DDL |
| `scripts/create-table.mjs` | env pull 후 테이블 생성 1회 실행 |
| `src/lib/db.ts` | Neon 서버리스 Postgres 클라이언트 (`getSql`) |
| `src/lib/predict.ts` | `extractPrediction`, `aggregateStats` (순수, 테스트) |
| `src/lib/browser-id.ts` | `getBrowserId()` (클라) |
| `src/store/selectors.ts` (수정) | `selectResolvedBracket` 추가 |
| `src/app/actions/submit-prediction.ts` | Server Action `submitPrediction` |
| `src/components/SubmitPrediction.tsx` | 제출 CTA(완성 시 노출) |
| `src/app/[locale]/layout.tsx` (수정) | Header + 공유 main 컨테이너 |
| `src/components/Header.tsx` (수정) | nav(시뮬/통계) + 리셋은 시뮬 라우트에서만 |
| `src/app/[locale]/page.tsx` (수정) | `<Simulator/>`만 |
| `src/app/[locale]/stats/page.tsx` | 통계 SSR 페이지 |
| `src/components/stats/TierTable.tsx` | 배당 테이블 |
| `src/i18n/dictionaries/{ko,en}.json` (수정) | 신규 키 |

> **선행 의존성:** Vercel 대시보드에서 **Neon 연결**(Storage → Create Database → Neon) → `vercel env pull .env.local`(`DATABASE_URL` 주입) → `create-table.mjs`로 테이블 생성. Task 1·5·9는 이 env/테이블이 있어야 라이브 검증 가능. Task 2~4·6~8 중 순수 로직/UI는 env 없이 진행 가능.

---

## Task 1: Neon(Postgres) 클라이언트 + 테이블

**Files:** Create `scripts/phase2-predictions.sql`, `scripts/create-table.mjs`, `src/lib/db.ts`

- [ ] **Step 1: 의존성 설치**

Run: `npm i @neondatabase/serverless`
Expected: 설치 성공.

- [ ] **Step 2: 테이블 DDL 기록** — `scripts/phase2-predictions.sql` (재현용 기록)
```sql
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  champion text not null,
  finalists text[] not null,
  semifinalists text[] not null,
  quarterfinalists text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
> Neon은 연결 문자열(`DATABASE_URL`) 자체가 서버 시크릿이라 별도 RLS 불필요 — 접근은 서버에서만.

- [ ] **Step 3: 서버 클라이언트** — `src/lib/db.ts`
```ts
import { neon } from '@neondatabase/serverless'

// Vercel Neon 통합이 주입하는 DATABASE_URL(풀드) 사용. 서버 전용 시크릿.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

export function getSql() {
  if (!url) throw new Error('DATABASE_URL is not set (connect Neon on Vercel + vercel env pull)')
  return neon(url)
}
```

- [ ] **Step 4: 테이블 생성 스크립트** — `scripts/create-table.mjs` (env pull 후 1회 실행)
```js
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL missing — run `vercel env pull .env.local` first')
const sql = neon(url)

await sql`create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  champion text not null,
  finalists text[] not null,
  semifinalists text[] not null,
  quarterfinalists text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`
console.log('predictions table ready')
```
실행: `node --env-file=.env.local scripts/create-table.mjs` → `predictions table ready`.

- [ ] **Step 5: 빌드 확인** — Run: `npm run build` → 성공(이 모듈은 아직 import되지 않아 env 없이도 컴파일).

- [ ] **Step 6: Commit**
```bash
git add scripts/phase2-predictions.sql scripts/create-table.mjs src/lib/db.ts package.json package-lock.json
git commit -m "feat: Neon serverless client + predictions table"
```

---

## Task 2: 순수 로직 `extractPrediction` + `aggregateStats`

**Files:** Create `src/lib/predict.ts`, `src/lib/predict.test.ts`

- [ ] **Step 1: 실패 테스트** — `src/lib/predict.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { extractPrediction, aggregateStats } from './predict'
import type { ResolvedMatch } from './knockout'
import type { KnockoutRound } from '@/types'

function rm(id: string, round: KnockoutRound, home: string | null, away: string | null): ResolvedMatch {
  return {
    id, round, order: 1,
    homeSource: { type: 'winnerOf', matchId: 'x' },
    awaySource: { type: 'winnerOf', matchId: 'y' },
    homeTeamId: home, awayTeamId: away,
  }
}

const complete: ResolvedMatch[] = [
  rm('QF1', 'QF', 'q1', 'q2'), rm('QF2', 'QF', 'q3', 'q4'),
  rm('QF3', 'QF', 'q5', 'q6'), rm('QF4', 'QF', 'q7', 'q8'),
  rm('SF1', 'SF', 's1', 's2'), rm('SF2', 'SF', 's3', 's4'),
  rm('F1', 'F', 's1', 's3'),
]

it('extracts tier picks from a completed bracket', () => {
  const picks = extractPrediction(complete, { F1: 's1' })
  expect(picks).not.toBeNull()
  expect(picks!.champion).toBe('s1')
  expect(picks!.finalists.sort()).toEqual(['s1', 's3'])
  expect(picks!.semifinalists.sort()).toEqual(['s1', 's2', 's3', 's4'])
  expect(picks!.quarterfinalists.sort()).toEqual(['q1','q2','q3','q4','q5','q6','q7','q8'])
})

it('returns null when champion is not decided', () => {
  expect(extractPrediction(complete, {})).toBeNull()
})

it('returns null when a slot is empty', () => {
  const incomplete = complete.map((m) => (m.id === 'SF2' ? rm('SF2', 'SF', 's3', null) : m))
  expect(extractPrediction(incomplete, { F1: 's1' })).toBeNull()
})

it('aggregates per-tier counts and pct', () => {
  const rows = [
    { champion: 'A', finalists: ['A', 'B'], semifinalists: ['A','B','C','D'], quarterfinalists: [] },
    { champion: 'A', finalists: ['A', 'C'], semifinalists: ['A','C','E','F'], quarterfinalists: [] },
    { champion: 'B', finalists: ['A', 'B'], semifinalists: ['A','B','G','H'], quarterfinalists: [] },
  ]
  const stats = aggregateStats(rows)
  expect(stats.total).toBe(3)
  expect(stats.champion[0]).toMatchObject({ teamId: 'A', count: 2 })
  expect(Math.round(stats.champion[0].pct)).toBe(67)
  expect(stats.finalists[0]).toMatchObject({ teamId: 'A', count: 3, pct: 100 })
})
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- predict` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `src/lib/predict.ts`
```ts
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
```

- [ ] **Step 4: 통과 확인** — Run: `npm test -- predict` → 4 PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/predict.ts src/lib/predict.test.ts
git commit -m "feat: extractPrediction + aggregateStats (pure)"
```

---

## Task 3: `selectResolvedBracket` 셀렉터 (DRY)

**Files:** Modify `src/store/selectors.ts`, `src/components/knockout/Bracket.tsx`

- [ ] **Step 1: 셀렉터 추가** — `src/store/selectors.ts` 하단에 추가(기존 import에 맞춰 병합):
```ts
import thirdAssign from '../../data/third-place-assignment.json'
import { seedKnockout, advanceBracket, type ResolvedMatch } from '@/lib/knockout'
import type { ThirdPlaceAssignmentTable } from '@/types'

const assignment = thirdAssign as unknown as ThirdPlaceAssignmentTable

export function selectResolvedBracket(
  scores: ScoreMap,
  winners: Record<string, string | null>,
): ResolvedMatch[] {
  const standings = selectGroupStandings(scores)
  const thirds = selectThirdPlaceRanking(scores)
  const r32 = seedKnockout(wc.knockoutMatches, standings, thirds, assignment)
  return advanceBracket(wc.knockoutMatches, r32, winners)
}
```
(주의: `wc`는 selectors.ts가 이미 import한 `data/worldcup-2026.json`. 중복 import 금지.)

- [ ] **Step 2: Bracket 리팩토링** — `src/components/knockout/Bracket.tsx`에서 `seedKnockout`/`advanceBracket`/`thirdAssign`/`assignment` 직접 사용 부분을 `selectResolvedBracket(scores, winners)` 호출로 교체. 즉 다음 줄들을
```tsx
const standings = selectGroupStandings(scores)
const thirds = selectThirdPlaceRanking(scores)
const r32 = seedKnockout(wc.knockoutMatches, standings, thirds, assignment)
const all = advanceBracket(wc.knockoutMatches, r32, winners)
```
다음으로 교체:
```tsx
const all = selectResolvedBracket(scores, winners)
```
그리고 이제 안 쓰는 import(`seedKnockout, advanceBracket`, `thirdAssign`, `selectGroupStandings`, `selectThirdPlaceRanking`, `assignment`, `wc`의 knockout 용도)를 정리. `import { selectResolvedBracket } from '@/store/selectors'` 추가. `championId`는 `winners[finalMatch.id]`로 그대로(또는 all에서 F 경기 찾기). 기존 동작 동일 유지.

- [ ] **Step 3: 검증** — `npm run build` 성공, `npm test` 통과(23). 토너먼트 화면 동작 동일.

- [ ] **Step 4: Commit**
```bash
git add src/store/selectors.ts src/components/knockout/Bracket.tsx
git commit -m "refactor: selectResolvedBracket selector (shared by Bracket + submit)"
```

---

## Task 4: `getBrowserId` (클라 익명 식별)

**Files:** Create `src/lib/browser-id.ts`

- [ ] **Step 1: 구현** — `src/lib/browser-id.ts`
```ts
const KEY = 'wc-bid'

// 브라우저별 익명 UUID. 없으면 생성·저장.
export function getBrowserId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
```

- [ ] **Step 2: 검증** — `npm run build` 성공.

- [ ] **Step 3: Commit**
```bash
git add src/lib/browser-id.ts
git commit -m "feat: anonymous browser id helper"
```

---

## Task 5: Server Action `submitPrediction`

**Files:** Create `src/app/actions/submit-prediction.ts`

- [ ] **Step 1: 구현** — `src/app/actions/submit-prediction.ts`
```ts
'use server'
import { getSql } from '@/lib/db'
import type { PredictionPicks } from '@/lib/predict'

export async function submitPrediction(browserId: string, picks: PredictionPicks): Promise<{ ok: boolean }> {
  if (!browserId) throw new Error('missing browser id')
  const sql = getSql()
  // neon 태그드 템플릿은 JS 배열을 Postgres text[]로 바인딩. 파라미터화로 인젝션 안전.
  await sql`
    insert into predictions (browser_id, champion, finalists, semifinalists, quarterfinalists, updated_at)
    values (${browserId}, ${picks.champion}, ${picks.finalists}, ${picks.semifinalists}, ${picks.quarterfinalists}, now())
    on conflict (browser_id) do update set
      champion = excluded.champion,
      finalists = excluded.finalists,
      semifinalists = excluded.semifinalists,
      quarterfinalists = excluded.quarterfinalists,
      updated_at = now()
  `
  return { ok: true }
}
```

- [ ] **Step 2: 검증** — `npm run build` 성공(타입 OK). 라이브 DB 검증은 env·테이블 준비 후 Task 9에서.

- [ ] **Step 3: Commit**
```bash
git add src/app/actions/submit-prediction.ts
git commit -m "feat: submitPrediction server action (upsert by browser id)"
```

---

## Task 6: i18n 사전 키 추가

**Files:** Modify `src/i18n/dictionaries/ko.json`, `src/i18n/dictionaries/en.json`

- [ ] **Step 1: ko.json에 추가** (기존 객체 안에, 마지막 항목 뒤 콤마 주의)
```json
"navSim": "시뮬레이터",
"navStats": "통계",
"submitPrediction": "내 예측 제출",
"submitDone": "제출 완료! 통계로 이동합니다",
"submitNeedsComplete": "토너먼트 우승팀까지 정하면 제출할 수 있어요",
"statsTitle": "예측 통계",
"statsSubtitle": "모두의 예측을 모은 배당률",
"statsTotal": "총 예측",
"statsEmpty": "아직 제출된 예측이 없어요. 첫 예측을 남겨보세요!",
"tierChampion": "우승",
"tierFinalists": "결승 진출",
"tierSemifinalists": "4강",
"tierQuarterfinalists": "8강",
"statsPickRate": "픽률",
"statsVotes": "표",
"backToSim": "시뮬레이터로"
```

- [ ] **Step 2: en.json에 추가** (동일 키)
```json
"navSim": "Simulator",
"navStats": "Stats",
"submitPrediction": "Submit my prediction",
"submitDone": "Submitted! Opening stats…",
"submitNeedsComplete": "Pick the champion to submit your prediction",
"statsTitle": "Prediction Stats",
"statsSubtitle": "Everyone's predictions, as odds",
"statsTotal": "Total predictions",
"statsEmpty": "No predictions yet. Be the first to submit!",
"tierChampion": "Champion",
"tierFinalists": "Finalists",
"tierSemifinalists": "Semifinalists",
"tierQuarterfinalists": "Quarterfinalists",
"statsPickRate": "Pick rate",
"statsVotes": "votes",
"backToSim": "Back to simulator"
```

- [ ] **Step 3: 검증** — `npm run build` 성공(ko/en 키 동일해야 `DictKey` 타입 OK).

- [ ] **Step 4: Commit**
```bash
git add src/i18n/dictionaries/ko.json src/i18n/dictionaries/en.json
git commit -m "feat(i18n): stats + submit + nav dictionary keys"
```

---

## Task 7: Header → 공유 chrome + 라우팅 레이아웃

**Files:** Modify `src/components/Header.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`

- [ ] **Step 1: Header 수정** — nav(시뮬/통계) 추가, 리셋/clear는 시뮬 라우트에서만. `src/components/Header.tsx`를 다음으로 교체(LanguageSwitcher는 유지):
```tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import { locales, type Locale } from '@/i18n/config'

function LanguageSwitcher() {
  const { locale } = useT()
  const pathname = usePathname()
  const router = useRouter()
  const switchTo = (next: Locale) => {
    if (next === locale) return
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }
  return (
    <div className="flex items-center overflow-hidden rounded-md border text-xs font-semibold">
      {locales.map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={`px-2 py-1 uppercase transition-colors ${i > 0 ? 'border-l' : ''} ${
            l === locale ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function Header() {
  const { t, locale } = useT()
  const pathname = usePathname()
  const resetToDefault = useSimulator((s) => s.resetToDefault)
  const clearAll = useSimulator((s) => s.clearAll)
  const isSim = pathname === `/${locale}`
  const linkCls = (active: boolean) =>
    `text-sm font-semibold transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-mona text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-primary">2026</span> {t('appTitle')}
        </h1>
        <nav className="mt-1.5 flex items-center gap-3">
          <Link href={`/${locale}`} className={linkCls(isSim)}>{t('navSim')}</Link>
          <span className="text-border">·</span>
          <Link href={`/${locale}/stats`} className={linkCls(pathname.endsWith('/stats'))}>{t('navStats')}</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {isSim && (
          <>
            <Button variant="outline" size="sm" onClick={() => resetToDefault()}>↺ {t('resetToReal')}</Button>
            <Button variant="ghost" size="sm" onClick={() => clearAll()}>{t('clearAll')}</Button>
          </>
        )}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: layout에 Header + 공유 main** — `src/app/[locale]/layout.tsx`의 body 내부를 다음으로 교체(`ThemeScript`/`I18nProvider`는 유지, Header import 추가):
```tsx
import { Header } from '@/components/Header'
// ...
      <body className="min-h-full">
        <ThemeScript />
        <I18nProvider locale={locale} dict={dict}>
          <main className="mx-auto min-w-0 max-w-7xl space-y-5 p-4 sm:p-6">
            <Header />
            {children}
          </main>
        </I18nProvider>
      </body>
```

- [ ] **Step 3: page.tsx 간소화** — `src/app/[locale]/page.tsx`:
```tsx
import { Simulator } from '@/components/Simulator'

export default function Home() {
  return <Simulator />
}
```

- [ ] **Step 4: 검증** — `npm run build` 성공. `npm run dev`로 시뮬 화면: Header에 시뮬/통계 nav, 리셋/clear는 시뮬에서만. 레이아웃 깨짐 없음.

- [ ] **Step 5: Commit**
```bash
git add src/components/Header.tsx "src/app/[locale]/layout.tsx" "src/app/[locale]/page.tsx"
git commit -m "feat: shared header (nav sim/stats) in layout; reset/clear sim-only"
```

---

## Task 8: SubmitPrediction CTA

**Files:** Create `src/components/SubmitPrediction.tsx`; Modify `src/components/knockout/Bracket.tsx`

- [ ] **Step 1: 컴포넌트** — `src/components/SubmitPrediction.tsx`
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { extractPrediction } from '@/lib/predict'
import { getBrowserId } from '@/lib/browser-id'
import { submitPrediction } from '@/app/actions/submit-prediction'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'

export function SubmitPrediction() {
  const { t, locale } = useT()
  const router = useRouter()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const [busy, setBusy] = useState(false)
  const picks = extractPrediction(selectResolvedBracket(scores, winners), winners)

  if (!picks) {
    return <p className="text-center text-xs text-muted-foreground">{t('submitNeedsComplete')}</p>
  }

  const onSubmit = async () => {
    setBusy(true)
    try {
      await submitPrediction(getBrowserId(), picks)
      router.push(`/${locale}/stats`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Button onClick={onSubmit} disabled={busy} className="w-full sm:w-auto">
      🗳️ {t('submitPrediction')}
    </Button>
  )
}
```

- [ ] **Step 2: Bracket에 배치** — `src/components/knockout/Bracket.tsx`에서 우승 카드(`finalcol`) 안, 우승 표시 아래에 `<SubmitPrediction />`를 추가. import 추가: `import { SubmitPrediction } from '@/components/SubmitPrediction'`. 예: 우승 카드 div 다음에
```tsx
<div className="flex justify-center"><SubmitPrediction /></div>
```

- [ ] **Step 3: 검증** — `npm run build` 성공. 우승팀 정하기 전엔 안내 문구, 정하면 제출 버튼 노출(클릭 시 DB는 env 준비 후 Task 9에서 라이브 검증).

- [ ] **Step 4: Commit**
```bash
git add src/components/SubmitPrediction.tsx src/components/knockout/Bracket.tsx
git commit -m "feat: submit-prediction CTA (shown when bracket complete)"
```

---

## Task 9: `/stats` 페이지 (SSR) + 배당 테이블 + 라이브 검증

**Files:** Create `src/app/[locale]/stats/page.tsx`, `src/components/stats/TierTable.tsx`

> **선행:** Supabase env(`vercel env pull .env.local`) + `predictions` 테이블 생성 완료. 없으면 이 태스크 라이브 검증 불가.

- [ ] **Step 1: 배당 테이블** — `src/components/stats/TierTable.tsx`
```tsx
import type { TierCount } from '@/lib/predict'
import { teamFlag, teamName } from '@/lib/teams'
import type { Locale } from '@/i18n/config'

export function TierTable({
  title, rows, locale, pickRateLabel, votesLabel, limit = 8,
}: {
  title: string
  rows: TierCount[]
  locale: Locale
  pickRateLabel: string
  votesLabel: string
  limit?: number
}) {
  return (
    <section className="rounded-2xl border p-4">
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <ol className="space-y-1.5">
        {rows.slice(0, limit).map((r, i) => (
          <li key={r.teamId} className="flex items-center gap-3 text-sm">
            <span className="font-mona w-5 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span>{teamFlag(r.teamId)}</span>
              <span className="truncate">{teamName(r.teamId, locale)}</span>
            </span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </span>
            <span className="font-mona w-12 text-right text-xs font-bold tabular-nums">{r.pct.toFixed(0)}%</span>
            <span className="font-mona w-12 text-right text-xs text-muted-foreground tabular-nums">{r.count}{votesLabel}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: 통계 페이지** — `src/app/[locale]/stats/page.tsx`
```tsx
import { notFound } from 'next/navigation'
import { getSql } from '@/lib/db'
import { aggregateStats, type PredictionRow } from '@/lib/predict'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale } from '@/i18n/config'
import { TierTable } from '@/components/stats/TierTable'

export const dynamic = 'force-dynamic' // 항상 최신 집계

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale)

  let rows: PredictionRow[] = []
  try {
    const sql = getSql()
    rows = (await sql`select champion, finalists, semifinalists, quarterfinalists from predictions`) as PredictionRow[]
  } catch {
    rows = [] // DB 미설정/테이블 없음 → 빈 상태로 graceful 처리
  }
  const stats = aggregateStats(rows)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">{t.statsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.statsSubtitle} · {t.statsTotal} <span className="font-mona tabular-nums">{stats.total}</span>
        </p>
      </div>
      {stats.total === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t.statsEmpty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TierTable title={t.tierChampion} rows={stats.champion} locale={locale} pickRateLabel={t.statsPickRate} votesLabel={t.statsVotes} />
          <TierTable title={t.tierFinalists} rows={stats.finalists} locale={locale} pickRateLabel={t.statsPickRate} votesLabel={t.statsVotes} />
          <TierTable title={t.tierSemifinalists} rows={stats.semifinalists} locale={locale} pickRateLabel={t.statsPickRate} votesLabel={t.statsVotes} />
          <TierTable title={t.tierQuarterfinalists} rows={stats.quarterfinalists} locale={locale} pickRateLabel={t.statsPickRate} votesLabel={t.statsVotes} />
        </div>
      )}
    </div>
  )
}
```
> `getDictionary` 반환 타입에 신규 키들이 포함됨(Task 6). 서버에서 사전 객체 직접 사용.

- [ ] **Step 3: 빌드 + 라이브 검증**
- `npm run build` → `/[locale]/stats` 라우트 생성.
- env·테이블 준비됐으면 `npm run dev`로: 시뮬에서 전 경기+우승까지 채우고 `🗳️ 제출` → `/stats` 이동 → 내 픽이 집계에 반영. 헤더 `통계` 링크 동작. ko/en 모두.
- 0건일 때 빈 상태 문구 표시.

- [ ] **Step 4: Commit**
```bash
git add "src/app/[locale]/stats/page.tsx" src/components/stats/TierTable.tsx
git commit -m "feat: /stats odds dashboard (SSR aggregate)"
```

---

## Self-Review 결과

**Spec coverage**
- 서버 전용 DB(Server Action 제출 + SSR 통계) → Task 5·9 ✅
- Neon(순수 Postgres) + Vercel 통합 env(DATABASE_URL) → Task 1 + 선행 의존성 ✅
- 라운드별 진출팀 세트 스키마 → Task 1 DDL + `extractPrediction`(Task 2) ✅
- 익명 브라우저 upsert → Task 4·5 ✅
- 제출 트리거(우승 결정 시) → `extractPrediction` null 가드 + Task 8 CTA ✅
- `/stats` 배당 대시보드(우승/결승/4강/8강) → Task 9 ✅
- 하이브리드 라우팅(시뮬 탭 유지 + /stats 별도 + 공유 헤더) → Task 7·9 ✅
- 순수함수 테스트 → Task 2 ✅
- (골든볼/R16은 의도적 범위 밖)

**Placeholder scan**: 없음. Neon 통합이 주입하는 `DATABASE_URL` 사용 — 이름이 다르면 `vercel env ls`로 확인(Task 1 명시).

**Type consistency**: `PredictionPicks`/`PredictionRow`/`TierCount`/`Stats`(Task 2)가 Action(5)·Submit(8)·Stats(9)·TierTable(9)에서 일치. `selectResolvedBracket`(Task 3) → Submit(8)에서 사용. `ResolvedMatch`(knockout.ts) 재사용 일관.

**알려진 의존성**: Task 1·5·9의 라이브 DB 검증은 Vercel Neon 통합 + `vercel env pull` + `create-table.mjs` 실행 후 가능. 순수 로직(2)·UI(7·8 빌드)은 선행 없이 검증됨.
