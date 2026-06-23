# Phase 3 — 골든볼/골든슈 투표 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 토너먼트를 완성한 사용자가 골든볼(4강 팀 선수)·골든슈(8강 팀 공격수·미드필더)를 익명 투표하고, 결과를 `/stats`에 픽률로 본다.

**Architecture:** Phase 2와 동일 — DB 접근은 서버에서만(Server Action 투표 + Server Component 통계), Neon 순수 DB(같은 인스턴스에 `awards_votes` 추가), 익명 브라우저 id(`wc-bid`). 후보는 `extractPrediction`의 4강/8강 팀 id로 동적 산정. 선수 명단은 웹검색 큐레이션 정적 JSON.

**Tech Stack:** Next 16(App Router, Server Actions) · @neondatabase/serverless · Zustand · Vitest

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `data/players-2026.json` | 큐레이션 선수 명단(웹검색) |
| `src/lib/players.ts` | `getPlayer`/`playerName`/`playersOfTeams`/`goldenBallCandidates`/`goldenBootCandidates` |
| `src/lib/awards.ts` | `aggregateAwards` (순수, 테스트) |
| `scripts/awards-votes.sql` + `scripts/create-awards-table.mjs` | `awards_votes` DDL/생성 |
| `src/app/actions/submit-awards.ts` | Server Action |
| `src/components/AwardsVote.tsx` | 투표 UI(클라) |
| `src/components/stats/AwardTable.tsx` | 선수 픽률 테이블 |
| `src/app/[locale]/stats/page.tsx` (수정) | 골든볼·골든슈 섹션 추가 |
| `src/components/knockout/Bracket.tsx` (수정) | awards 카드 → AwardsVote |
| `src/i18n/dictionaries/{ko,en}.json` (수정) | 신규 키 |

> **선행:** Neon 연결됨(Phase 2). `awards_votes` 테이블은 Task 3에서 생성. DB 라이브 검증(Task 4·7)은 그 후.

---

## Task 1: 선수 명단 데이터 + 조회/후보 로직

**Files:** Create `data/players-2026.json`, `src/lib/players.ts`, `src/lib/players.test.ts`

- [ ] **Step 1: 선수 명단 수집(웹검색 큐레이션)** — `data/players-2026.json`
  - **WebSearch/WebFetch로 2026.6 현재 각 국가대표 주요 선수 수집.** 강팀(우승권) 4~5명, 중위권 2~3명, 약팀 1~2명. 48팀 전부 ≥1명. 가능하면 공격수·미드필더 위주(골든슈 후보 커버).
  - 형식: `Player[]` — `{ "id": "FRA-mbappe", "nameKo": "음바페", "nameEn": "Mbappé", "teamId": "FRA", "position": "FW" }`.
  - `id`는 `{teamId}-{lastname-slug}` 고유. `position`은 `'GK'|'DF'|'MF'|'FW'`. `teamId`는 `data/worldcup-2026.json`의 팀 id와 일치.

- [ ] **Step 2: 검증 테스트** — `src/lib/players.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import players from '../../data/players-2026.json'
import wc from '../../data/worldcup-2026.json'
import { playersOfTeams, goldenBallCandidates, goldenBootCandidates, type Player } from './players'
import type { WorldCupData } from '@/types'

const list = players as unknown as Player[]
const teamIds = new Set((wc as unknown as WorldCupData).teams.map((t) => t.id))

it('every player has valid fields + real teamId + valid position', () => {
  const ids = new Set<string>()
  for (const p of list) {
    expect(p.id).toBeTruthy()
    expect(ids.has(p.id)).toBe(false)
    ids.add(p.id)
    expect(p.nameKo && p.nameEn).toBeTruthy()
    expect(teamIds.has(p.teamId)).toBe(true)
    expect(['GK', 'DF', 'MF', 'FW']).toContain(p.position)
  }
})

it('covers all 48 teams (>=1 player each)', () => {
  const covered = new Set(list.map((p) => p.teamId))
  expect(covered.size).toBe(48)
})

it('goldenBall = all players of given teams; goldenBoot = FW/MF only', () => {
  const sample: Player[] = [
    { id: 'A-1', nameKo: '가', nameEn: 'A1', teamId: 'A', position: 'FW' },
    { id: 'A-2', nameKo: '나', nameEn: 'A2', teamId: 'A', position: 'DF' },
    { id: 'B-1', nameKo: '다', nameEn: 'B1', teamId: 'B', position: 'MF' },
    { id: 'C-1', nameKo: '라', nameEn: 'C1', teamId: 'C', position: 'GK' },
  ]
  expect(playersOfTeams(sample, ['A']).map((p) => p.id).sort()).toEqual(['A-1', 'A-2'])
  expect(goldenBallCandidates(sample, ['A']).length).toBe(2)
  expect(goldenBootCandidates(sample, ['A', 'B', 'C']).map((p) => p.id).sort()).toEqual(['A-1', 'B-1'])
})
```

- [ ] **Step 3: `src/lib/players.ts`**
```ts
import data from '../../data/players-2026.json'
import type { Locale } from '@/i18n/config'

export interface Player {
  id: string
  nameKo: string
  nameEn: string
  teamId: string
  position: 'GK' | 'DF' | 'MF' | 'FW'
}

const players = data as unknown as Player[]
const byId = new Map(players.map((p) => [p.id, p]))

export function getPlayers(): Player[] {
  return players
}
export function getPlayer(id?: string | null): Player | undefined {
  return id ? byId.get(id) : undefined
}
export function playerName(id: string | null | undefined, locale: Locale): string {
  const p = getPlayer(id)
  if (!p) return locale === 'en' ? 'TBD' : '미정'
  return locale === 'en' ? p.nameEn : p.nameKo
}

export function playersOfTeams(pool: Player[], teamIds: string[]): Player[] {
  const set = new Set(teamIds)
  return pool
    .filter((p) => set.has(p.teamId))
    .sort((a, b) => a.teamId.localeCompare(b.teamId) || a.nameEn.localeCompare(b.nameEn))
}
export function goldenBallCandidates(pool: Player[], sfTeamIds: string[]): Player[] {
  return playersOfTeams(pool, sfTeamIds)
}
export function goldenBootCandidates(pool: Player[], qfTeamIds: string[]): Player[] {
  return playersOfTeams(pool, qfTeamIds).filter((p) => p.position === 'FW' || p.position === 'MF')
}
```

- [ ] **Step 4: 테스트** — `npm test -- players` → 3 pass (Step 1 데이터가 채워져야 통과). `npm run build` 성공.

- [ ] **Step 5: Commit**
```bash
git add data/players-2026.json src/lib/players.ts src/lib/players.test.ts
git commit -m "feat: curated 2026 player roster + candidate helpers (golden ball/boot)"
```

---

## Task 2: 집계 로직 `aggregateAwards`

**Files:** Create `src/lib/awards.ts`, `src/lib/awards.test.ts`

- [ ] **Step 1: 실패 테스트** — `src/lib/awards.test.ts`
```ts
import { it, expect } from 'vitest'
import { aggregateAwards } from './awards'

it('aggregates golden ball / golden boot picks with pct', () => {
  const rows = [
    { golden_ball: 'FRA-mbappe', golden_boot: 'FRA-mbappe' },
    { golden_ball: 'FRA-mbappe', golden_boot: 'ENG-kane' },
    { golden_ball: 'ARG-messi', golden_boot: 'ENG-kane' },
  ]
  const s = aggregateAwards(rows)
  expect(s.total).toBe(3)
  expect(s.goldenBall[0]).toMatchObject({ playerId: 'FRA-mbappe', count: 2 })
  expect(Math.round(s.goldenBall[0].pct)).toBe(67)
  expect(s.goldenBoot[0]).toMatchObject({ playerId: 'ENG-kane', count: 2 })
})
```

- [ ] **Step 2: 실패 확인** — `npm test -- awards` → FAIL.

- [ ] **Step 3: `src/lib/awards.ts`**
```ts
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
```

- [ ] **Step 4: 통과** — `npm test -- awards` → 1 pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/awards.ts src/lib/awards.test.ts
git commit -m "feat: aggregateAwards (pure)"
```

---

## Task 3: `awards_votes` 테이블

**Files:** Create `scripts/awards-votes.sql`, `scripts/create-awards-table.mjs`

- [ ] **Step 1: DDL 기록** — `scripts/awards-votes.sql`
```sql
create table if not exists awards_votes (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  golden_ball text not null,
  golden_boot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: 생성 스크립트** — `scripts/create-awards-table.mjs`
```js
import { neon } from '@neondatabase/serverless'
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL missing — run `vercel env pull .env.local` first')
const sql = neon(url)
await sql`create table if not exists awards_votes (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  golden_ball text not null,
  golden_boot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`
const [{ count }] = await sql`select count(*)::int as count from awards_votes`
console.log('awards_votes ready, rows:', count)
```
실행: `node --env-file=.env.local scripts/create-awards-table.mjs` → `awards_votes ready, rows: 0`.

- [ ] **Step 3: Commit**
```bash
git add scripts/awards-votes.sql scripts/create-awards-table.mjs
git commit -m "feat: awards_votes table"
```

---

## Task 4: Server Action `submitAwards`

**Files:** Create `src/app/actions/submit-awards.ts`

- [ ] **Step 1: 구현**
```ts
'use server'
import { getSql } from '@/lib/db'

export async function submitAwards(
  browserId: string,
  picks: { goldenBall: string; goldenBoot: string },
): Promise<{ ok: boolean }> {
  if (!browserId) throw new Error('missing browser id')
  if (!picks.goldenBall || !picks.goldenBoot) throw new Error('both awards required')
  const sql = getSql()
  await sql`
    insert into awards_votes (browser_id, golden_ball, golden_boot, updated_at)
    values (${browserId}, ${picks.goldenBall}, ${picks.goldenBoot}, now())
    on conflict (browser_id) do update set
      golden_ball = excluded.golden_ball,
      golden_boot = excluded.golden_boot,
      updated_at = now()
  `
  return { ok: true }
}
```

- [ ] **Step 2: 검증** — `npm run build` 성공. 라이브는 Task 7에서.

- [ ] **Step 3: Commit**
```bash
git add src/app/actions/submit-awards.ts
git commit -m "feat: submitAwards server action (upsert)"
```

---

## Task 5: i18n 키

**Files:** Modify `src/i18n/dictionaries/{ko,en}.json`

- [ ] **Step 1: ko.json에 추가** (마지막 항목 뒤 콤마 주의)
```json
"awardsVoteTitle": "어워드 투표",
"awardsNeedsComplete": "토너먼트 우승까지 정하면 투표할 수 있어요",
"goldenBall": "골든볼",
"goldenBoot": "골든슈",
"goldenBallHint": "4강 팀 선수 중에서",
"goldenBootHint": "8강 팀 공격수·미드필더 중에서",
"awardsSubmit": "투표 제출",
"awardsDone": "투표 완료",
"awardsPick": "선택"
```

- [ ] **Step 2: en.json에 추가** (동일 키)
```json
"awardsVoteTitle": "Awards vote",
"awardsNeedsComplete": "Pick the champion to vote for awards",
"goldenBall": "Golden Ball",
"goldenBoot": "Golden Boot",
"goldenBallHint": "from your semifinal teams",
"goldenBootHint": "from your quarterfinal attackers & mids",
"awardsSubmit": "Submit vote",
"awardsDone": "Voted",
"awardsPick": "Pick"
```

- [ ] **Step 3: 검증** — `npm run build` 성공(ko/en 키 동일).

- [ ] **Step 4: Commit**
```bash
git add src/i18n/dictionaries/ko.json src/i18n/dictionaries/en.json
git commit -m "feat(i18n): awards voting keys"
```

---

## Task 6: 투표 UI `AwardsVote` + 브래킷 연결

**Files:** Create `src/components/AwardsVote.tsx`; Modify `src/components/knockout/Bracket.tsx`

- [ ] **Step 1: 컴포넌트** — `src/components/AwardsVote.tsx`
```tsx
'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { extractPrediction } from '@/lib/predict'
import { getPlayers, goldenBallCandidates, goldenBootCandidates, playerName, type Player } from '@/lib/players'
import { teamFlag } from '@/lib/teams'
import { getBrowserId } from '@/lib/browser-id'
import { submitAwards } from '@/app/actions/submit-awards'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'

function PlayerPicker({
  candidates, value, onChange, locale,
}: {
  candidates: Player[]
  value: string
  onChange: (id: string) => void
  locale: 'ko' | 'en'
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {candidates.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === p.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
        >
          <span>{teamFlag(p.teamId)}</span>
          <span>{playerName(p.id, locale)}</span>
        </button>
      ))}
    </div>
  )
}

export function AwardsVote() {
  const { t, locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const picks = extractPrediction(selectResolvedBracket(scores, winners), winners)
  const [ball, setBall] = useState('')
  const [boot, setBoot] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!picks) {
    return <p className="text-center text-xs text-muted-foreground">{t('awardsNeedsComplete')}</p>
  }

  const pool = getPlayers()
  const ballCands = goldenBallCandidates(pool, picks.semifinalists)
  const bootCands = goldenBootCandidates(pool, picks.quarterfinalists)

  const onSubmit = async () => {
    if (!ball || !boot) return
    setBusy(true)
    try {
      await submitAwards(getBrowserId(), { goldenBall: ball, goldenBoot: boot })
      setDone(true)
    } catch {
      setBusy(false)
    }
  }

  if (done) {
    return <p className="text-center text-sm font-semibold text-primary">✅ {t('awardsDone')}</p>
  }

  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-bold">🏅 {t('awardsVoteTitle')}</h3>
      <div className="space-y-1.5">
        <div className="text-xs font-semibold">{t('goldenBall')} <span className="font-normal text-muted-foreground">· {t('goldenBallHint')}</span></div>
        <PlayerPicker candidates={ballCands} value={ball} onChange={setBall} locale={locale} />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-semibold">{t('goldenBoot')} <span className="font-normal text-muted-foreground">· {t('goldenBootHint')}</span></div>
        <PlayerPicker candidates={bootCands} value={boot} onChange={setBoot} locale={locale} />
      </div>
      <Button onClick={onSubmit} disabled={busy || !ball || !boot} className="w-full">
        🏅 {t('awardsSubmit')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 브래킷 연결** — `src/components/knockout/Bracket.tsx`의 awards 카드(현재 "다음 단계/골든볼·골든슈" dashed 카드)를 `<AwardsVote />`로 교체. import `import { AwardsVote } from '@/components/AwardsVote'`. 즉 finalcol의
```tsx
        <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <span className="rounded border border-primary px-1.5 py-0.5 text-[11px] font-bold text-primary">{t('nextPhaseTag')}</span>
          <p className="mt-2">{t('awardsNote')}</p>
        </div>
```
를 다음으로 교체:
```tsx
        <div className="rounded-xl border p-3">
          <AwardsVote />
        </div>
```
(`nextPhaseTag`/`awardsNote` 키는 더 이상 안 쓰이면 그대로 둬도 무방.)

- [ ] **Step 3: 검증** — `npm run build` 성공. `npm run dev`로 우승까지 정한 뒤 awards 카드에 골든볼(4강 팀 선수)·골든슈(8강 공격/미드) 후보 노출·선택 확인(제출 라이브는 Task 7과 함께).

- [ ] **Step 4: Commit**
```bash
git add src/components/AwardsVote.tsx src/components/knockout/Bracket.tsx
git commit -m "feat: awards voting UI (golden ball/boot from bracket teams)"
```

---

## Task 7: `/stats` 골든볼·골든슈 섹션 + 라이브 검증

**Files:** Create `src/components/stats/AwardTable.tsx`; Modify `src/app/[locale]/stats/page.tsx`

- [ ] **Step 1: 선수 픽률 테이블** — `src/components/stats/AwardTable.tsx`
```tsx
import type { PlayerCount } from '@/lib/awards'
import { getPlayer, playerName } from '@/lib/players'
import { teamFlag } from '@/lib/teams'
import type { Locale } from '@/i18n/config'

export function AwardTable({
  title, rows, locale, limit = 8,
}: {
  title: string
  rows: PlayerCount[]
  locale: Locale
  limit?: number
}) {
  return (
    <section className="rounded-2xl border p-4">
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <ol className="space-y-1.5">
        {rows.slice(0, limit).map((r, i) => (
          <li key={r.playerId} className="flex items-center gap-3 text-sm">
            <span className="font-mona w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span>{teamFlag(getPlayer(r.playerId)?.teamId)}</span>
              <span className="truncate">{playerName(r.playerId, locale)}</span>
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-24">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </span>
            <span className="font-mona w-10 shrink-0 text-right text-xs font-bold tabular-nums">{r.pct.toFixed(0)}%</span>
            <span className="font-mona w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">({r.count})</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: 통계 페이지에 섹션 추가** — `src/app/[locale]/stats/page.tsx`
  - import 추가: `import { aggregateAwards, type AwardsVoteRow } from '@/lib/awards'` 와 `import { AwardTable } from '@/components/stats/AwardTable'`.
  - 예측 rows fetch 아래에 awards rows fetch 추가(graceful):
```tsx
  let awardRows: AwardsVoteRow[] = []
  try {
    const sql = getSql()
    awardRows = (await sql`select golden_ball, golden_boot from awards_votes`) as AwardsVoteRow[]
  } catch {
    awardRows = []
  }
  const awards = aggregateAwards(awardRows)
```
  - 예측 티어 그리드 아래에 어워드 섹션 추가(awards.total>0일 때):
```tsx
      {awards.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <AwardTable title={t.goldenBall} rows={awards.goldenBall} locale={loc} />
          <AwardTable title={t.goldenBoot} rows={awards.goldenBoot} locale={loc} />
        </div>
      )}
```
  (`t.goldenBall`/`t.goldenBoot`는 Task 5에서 추가됨.)

- [ ] **Step 3: 빌드 + 라이브 검증**
  - `npm run build` 성공. `npm test` 통과.
  - env·`awards_votes` 테이블 준비 후 `npm run dev`: 우승까지 채우고 골든볼·골든슈 선택 → 제출 → `/stats`에 골든볼/골든슈 픽률 반영. ko/en 모두. 0건일 때 섹션 미표시(예측 통계는 정상).

- [ ] **Step 4: Commit**
```bash
git add "src/app/[locale]/stats/page.tsx" src/components/stats/AwardTable.tsx
git commit -m "feat: golden ball/boot stats sections on /stats"
```

---

## Self-Review 결과

**Spec coverage**
- 선수 데이터(웹검색 큐레이션, position, 팀 커버) → Task 1 ✅
- 후보 산정(골든볼=4강 전체, 골든슈=8강 FW/MF) → `goldenBallCandidates`/`goldenBootCandidates`(Task 1) + AwardsVote(Task 6) ✅
- 익명 투표 upsert(Server Action) → Task 4, `awards_votes` Task 3 ✅
- 투표 UI(완성 시 awards 카드) → Task 6 ✅
- `/stats` 골든볼·골든슈 픽률 섹션 → Task 7 ✅
- 순수함수 테스트 → Task 1·2 ✅
- (일일 갱신·추가 어워드는 범위 밖)

**Placeholder scan**: 없음. Task 1의 선수 데이터는 웹검색 수집 결과물(데이터 작업)이며 스키마·검증 테스트로 고정.

**Type consistency**: `Player`(players.ts) / `AwardsVoteRow`·`PlayerCount`·`AwardStats`(awards.ts)가 Action(4)·UI(6)·Stats(7)에서 일치. `extractPrediction.semifinalists`/`quarterfinalists`(Phase 2, 팀 id 배열) → 후보 산정에 사용. `getBrowserId`/`selectResolvedBracket`/`getSql` 재사용.

**의존성**: Task 3·4·7 라이브 검증은 `awards_votes` 생성(같은 Neon) 후. Task 1·2 순수/데이터는 선행 없이 검증.
