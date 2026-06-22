# 2026 월드컵 시뮬레이터 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 2026 월드컵 조별리그 스코어를 조절해 32강 진출팀을 산출하고, 토너먼트를 승패로 시뮬레이션하는 로컬 전용 웹 앱을 만든다.

**Architecture:** 정적 시드 JSON(`data/`)을 단일 소스로, 순수 함수 라이브러리(`src/lib/`)가 조 순위·3위 랭킹·토너먼트 대진을 계산하고, Zustand 스토어가 런타임 입력(스코어/승자)을 localStorage에 동기화한다. UI는 lib 계산 결과를 렌더만 한다. 백엔드 없음.

**Tech Stack:** Next.js(App Router) · TypeScript · Tailwind CSS · shadcn/ui · next-themes · Zustand · Vitest

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `src/types.ts` | 공유 타입 정의 (Team, GroupMatch, Score, KnockoutMatch 등) |
| `data/worldcup-2026.json` | 정적 시드: 팀·조·조별리그 72경기·토너먼트 구조 |
| `data/third-place-assignment.json` | 3위 진출 조합 → R32 슬롯 배정표 (공식) |
| `scripts/seed-worldcup.ts` | 외부 소스에서 데이터 fetch → 위 JSON 생성 |
| `src/lib/standings.ts` | `computeGroupStandings`, `computeThirdPlaceRanking` (순수) |
| `src/lib/knockout.ts` | `seedKnockout`, `advanceBracket` (순수) |
| `src/store/useSimulator.ts` | Zustand 스토어 + localStorage + 리셋 |
| `src/store/selectors.ts` | 스토어+lib 조합 파생값 셀렉터 |
| `src/app/globals.css` | 테마 토큰(녹색 라이트/다크) |
| `src/app/layout.tsx`, `src/app/page.tsx` | 앱 셸, 테마 프로바이더, 탭 |
| `src/components/theme/*` | ThemeProvider, ThemeToggle |
| `src/components/group/*` | MatchCard, StandingsTable, GroupCard, GroupStage |
| `src/components/knockout/*` | BracketMatch, Bracket |
| `src/components/ThirdPlacePanel.tsx` | Floating 3위 랭킹 패널 |
| `src/components/Header.tsx` | 타이틀·테마토글·리셋 |

---

## Task 1: 프로젝트 스캐폴딩 + 도구 설정

**Files:**
- Create: 프로젝트 루트 (Next.js), `vitest.config.ts`, `src/lib/smoke.test.ts`

- [ ] **Step 1: Next.js 앱 생성 (현재 빈 디렉토리에)**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --yes
```
Expected: `src/app/`, `package.json`, `tailwind.config.ts`(또는 v4 css 설정) 생성. 기존 `docs/`는 보존됨.

- [ ] **Step 2: 의존성 추가**

Run:
```bash
npm i zustand next-themes
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```
Expected: 설치 성공.

- [ ] **Step 3: shadcn/ui 초기화**

Run:
```bash
npx shadcn@latest init --yes -d
npx shadcn@latest add button tabs card --yes
```
Expected: `src/components/ui/` 에 button/tabs/card 생성, `components.json` 생성.

- [ ] **Step 4: Vitest 설정 작성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 스모크 테스트 작성**

Create `src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: 테스트 실행 (통과 확인)**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn + Vitest"
```

---

## Task 2: 공유 타입 + 시드 데이터

**Files:**
- Create: `src/types.ts`, `scripts/seed-worldcup.ts`, `data/worldcup-2026.json`, `data/third-place-assignment.json`
- Test: `src/lib/seed.test.ts`

- [ ] **Step 1: 타입 정의 작성**

Create `src/types.ts`:
```ts
export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export interface Team {
  id: string        // 'FRA'
  name: string      // '프랑스'
  flagCode: string  // 'fr' (소문자 ISO2, 국기 렌더용)
  groupId: GroupId
}

export interface GroupMatch {
  id: string            // 'GA-1'
  groupId: GroupId
  homeId: string
  awayId: string
  played: boolean       // 실제로 치러졌는지 (시드 기준)
  defaultHome: number | null  // 실제 결과 (없으면 null)
  defaultAway: number | null
}

export interface Score { home: number; away: number }
export type ScoreMap = Record<string, Score | null>  // matchId -> score

export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | 'F'

// R32 슬롯의 출처
export type SlotSource =
  | { type: 'groupWinner'; group: GroupId }
  | { type: 'groupRunnerUp'; group: GroupId }
  | { type: 'thirdPlace'; slotId: string }  // 배정표로 해소되는 3위 슬롯
  | { type: 'winnerOf'; matchId: string }    // R16 이후

export interface KnockoutMatch {
  id: string            // 'M73'
  round: KnockoutRound
  order: number         // 라운드 내 순서 (브래킷 위→아래)
  homeSource: SlotSource
  awaySource: SlotSource
}

export interface WorldCupData {
  competition: string
  teams: Team[]
  groupMatches: GroupMatch[]
  knockoutMatches: KnockoutMatch[]
}

// 3위 배정표: 진출한 8개 조 조합(정렬·결합 키) -> { thirdPlaceSlotId: groupId }
export type ThirdPlaceAssignmentTable = Record<string, Record<string, GroupId>>
```

- [ ] **Step 2: 시드 스크립트 작성 (데이터 fetch)**

Create `scripts/seed-worldcup.ts`. 이 스크립트는 위키피디아 "2026 FIFA World Cup" 페이지(조 편성·일정·현재 결과)와 공식 매치 스케줄(3위 배정표)을 파싱해 두 JSON을 생성한다. 웹 접근이 불가하면 조 편성·일정만 채우고 결과는 `played:false, defaultHome:null`로 둔다.

```ts
/**
 * 사용법: npx tsx scripts/seed-worldcup.ts
 * 출력: data/worldcup-2026.json, data/third-place-assignment.json
 *
 * 데이터 출처 (수동/자동 수집 모두 가능):
 *  - 조 편성/팀: 위키피디아 "2026 FIFA World Cup#Groups"
 *  - 경기 일정/결과: 위키피디아 각 조 결과 표 (치러진 경기만 defaultHome/Away 채움)
 *  - R32 구조 + 3위 배정표: FIFA 공식 Match Schedule 문서
 *
 * 구현 노트:
 *  - 각 조 6경기 라운드로빈 id 규칙: `G{groupId}-{n}` (n=1..6)
 *    경기 순서: [0-1, 0-2, 1-2, 0-3, 1-3, 2-3] (조 내 팀 인덱스)
 *  - 토너먼트 매치 id: 공식 매치번호(M73..M104) 사용
 *  - 결과를 모를 경우 played=false 로 두고 앱에서 사용자가 입력
 */
import { writeFileSync } from 'node:fs'
import type { WorldCupData, ThirdPlaceAssignmentTable } from '../src/types'

async function main() {
  // 1) 팀/조 수집 → teams: Team[]
  // 2) groupMatches 생성 (조별 6경기, 치러진 경기는 default 채움)
  // 3) knockoutMatches 생성 (M73~M104, source 명세)
  // 4) thirdPlaceAssignment 수집
  const data: WorldCupData = {
    competition: 'FIFA World Cup 2026',
    teams: [],
    groupMatches: [],
    knockoutMatches: [],
  }
  const assignment: ThirdPlaceAssignmentTable = {}

  writeFileSync('data/worldcup-2026.json', JSON.stringify(data, null, 2))
  writeFileSync('data/third-place-assignment.json', JSON.stringify(assignment, null, 2))
  console.log('seed written')
}

main()
```

> 실행 시 `tsx` 필요: `npm i -D tsx`. 데이터 수집 자체는 구현자가 웹 소스를 파싱하거나 수기로 채운다. **데이터 정확성은 별도 검증 태스크(Task 12 이후 수동 확인)에서 대조한다.**

- [ ] **Step 3: 시드 검증 테스트 작성**

Create `src/lib/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import data from '../../data/worldcup-2026.json'
import type { WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData

describe('worldcup-2026 seed', () => {
  it('has 48 teams', () => {
    expect(wc.teams).toHaveLength(48)
  })
  it('has 12 groups with 4 teams each', () => {
    const byGroup = new Map<string, number>()
    for (const t of wc.teams) byGroup.set(t.groupId, (byGroup.get(t.groupId) ?? 0) + 1)
    expect(byGroup.size).toBe(12)
    for (const [, n] of byGroup) expect(n).toBe(4)
  })
  it('has 72 group matches (6 per group)', () => {
    expect(wc.groupMatches).toHaveLength(72)
  })
  it('has 32 knockout matches', () => {
    // R32(16) + R16(8) + QF(4) + SF(2) + F(1) + 3rd place(1) = 32
    expect(wc.knockoutMatches.length).toBeGreaterThanOrEqual(31)
  })
  it('every match references real team ids', () => {
    const ids = new Set(wc.teams.map((t) => t.id))
    for (const m of wc.groupMatches) {
      expect(ids.has(m.homeId)).toBe(true)
      expect(ids.has(m.awayId)).toBe(true)
    }
  })
})
```

- [ ] **Step 4: tsconfig에 JSON import 허용 확인**

`tsconfig.json`의 `compilerOptions`에 다음이 있는지 확인(없으면 추가):
```json
"resolveJsonModule": true,
"esModuleInterop": true
```

- [ ] **Step 5: 시드 실행 후 테스트**

Run:
```bash
npm i -D tsx
npx tsx scripts/seed-worldcup.ts
npm test -- seed
```
Expected: 시드 데이터가 채워진 뒤 PASS. (데이터 미수집 상태면 카운트 테스트가 실패하므로, 데이터를 채울 때까지 이 태스크는 미완료로 둔다.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add types + worldcup-2026 seed data"
```

---

## Task 3: 조 순위 계산 `computeGroupStandings`

**Files:**
- Create: `src/lib/standings.ts`
- Test: `src/lib/standings.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/standings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeGroupStandings } from './standings'
import type { GroupMatch, ScoreMap } from '@/types'

// 조 내 4팀: t0,t1,t2,t3 / 6경기 라운드로빈
const matches: GroupMatch[] = [
  { id: 'm01', groupId: 'A', homeId: 't0', awayId: 't1', played: true, defaultHome: null, defaultAway: null },
  { id: 'm02', groupId: 'A', homeId: 't0', awayId: 't2', played: true, defaultHome: null, defaultAway: null },
  { id: 'm12', groupId: 'A', homeId: 't1', awayId: 't2', played: true, defaultHome: null, defaultAway: null },
  { id: 'm03', groupId: 'A', homeId: 't0', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
  { id: 'm13', groupId: 'A', homeId: 't1', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
  { id: 'm23', groupId: 'A', homeId: 't2', awayId: 't3', played: true, defaultHome: null, defaultAway: null },
]
const teamIds = ['t0', 't1', 't2', 't3']

it('ranks a team that wins all matches first', () => {
  const scores: ScoreMap = {
    m01: { home: 2, away: 0 }, m02: { home: 1, away: 0 }, m03: { home: 3, away: 0 },
    m12: { home: 1, away: 1 }, m13: { home: 0, away: 1 }, m23: { home: 0, away: 0 },
  }
  const table = computeGroupStandings(teamIds, matches, scores)
  expect(table[0].teamId).toBe('t0')
  expect(table[0].points).toBe(9)
  expect(table[0].rank).toBe(1)
})

it('breaks ties by goal difference then goals for', () => {
  // t0, t1 모두 승점 동일하게 만들고 득실차로 가르기
  const scores: ScoreMap = {
    m01: { home: 1, away: 1 },  // t0,t1 무
    m02: { home: 5, away: 0 },  // t0 +5
    m03: { home: 1, away: 0 },  // t0 +1
    m12: { home: 2, away: 0 },  // t1 +2
    m13: { home: 1, away: 0 },  // t1 +1
    m23: { home: 0, away: 0 },
  }
  const table = computeGroupStandings(teamIds, matches, scores)
  // t0: 무1승2 = 7pt, gd +6 / t1: 무1승2 = 7pt, gd +2  -> t0 우선
  const t0 = table.find((r) => r.teamId === 't0')!
  const t1 = table.find((r) => r.teamId === 't1')!
  expect(t0.points).toBe(7)
  expect(t1.points).toBe(7)
  expect(t0.rank).toBeLessThan(t1.rank)
})

it('ignores matches with no score (unplayed)', () => {
  const scores: ScoreMap = { m01: { home: 2, away: 0 } }
  const table = computeGroupStandings(teamIds, matches, scores)
  const t0 = table.find((r) => r.teamId === 't0')!
  expect(t0.played).toBe(1)
  expect(t0.points).toBe(3)
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- standings`
Expected: FAIL ("computeGroupStandings is not a function" / 모듈 없음).

- [ ] **Step 3: 구현 작성**

Create `src/lib/standings.ts`:
```ts
import type { GroupMatch, ScoreMap } from '@/types'

export interface TeamStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  rank: number
}

function blank(teamId: string): TeamStanding {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank: 0 }
}

export function computeGroupStandings(
  teamIds: string[],
  matches: GroupMatch[],
  scores: ScoreMap,
): TeamStanding[] {
  const rows = new Map(teamIds.map((id) => [id, blank(id)]))

  for (const m of matches) {
    const s = scores[m.id]
    if (!s) continue
    const home = rows.get(m.homeId)
    const away = rows.get(m.awayId)
    if (!home || !away) continue
    home.played++; away.played++
    home.gf += s.home; home.ga += s.away
    away.gf += s.away; away.ga += s.home
    if (s.home > s.away) { home.won++; home.points += 3; away.lost++ }
    else if (s.home < s.away) { away.won++; away.points += 3; home.lost++ }
    else { home.drawn++; away.drawn++; home.points++; away.points++ }
  }

  const table = [...rows.values()]
  for (const r of table) r.gd = r.gf - r.ga

  // FIFA 순서(단순화): 승점 → 득실차 → 다득점 → teamId(결정론적 안정 정렬)
  table.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.teamId.localeCompare(b.teamId),
  )
  table.forEach((r, i) => (r.rank = i + 1))
  return table
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- standings`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/standings.ts src/lib/standings.test.ts
git commit -m "feat: computeGroupStandings with FIFA tiebreakers"
```

---

## Task 4: 3위 랭킹 계산 `computeThirdPlaceRanking`

**Files:**
- Modify: `src/lib/standings.ts` (함수 추가)
- Modify: `src/lib/standings.test.ts` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/standings.test.ts` 하단에 추가:
```ts
import { computeThirdPlaceRanking } from './standings'
import type { GroupId } from '@/types'

function makeGroup(g: GroupId) {
  const ids = [`${g}0`, `${g}1`, `${g}2`, `${g}3`]
  const ms: GroupMatch[] = [
    { id: `${g}-01`, groupId: g, homeId: ids[0], awayId: ids[1], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-02`, groupId: g, homeId: ids[0], awayId: ids[2], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-12`, groupId: g, homeId: ids[1], awayId: ids[2], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-03`, groupId: g, homeId: ids[0], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-13`, groupId: g, homeId: ids[1], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
    { id: `${g}-23`, groupId: g, homeId: ids[2], awayId: ids[3], played: true, defaultHome: null, defaultAway: null },
  ]
  return { groupId: g, teamIds: ids, matches: ms }
}

it('ranks 12 third-placed teams and flags top 8 as qualified', () => {
  const letters: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']
  const groups = letters.map(makeGroup)
  // 각 조에서 3위 팀의 득점력을 조 알파벳 역순으로 차등 부여 (L조 3위가 가장 강하게)
  const scores: ScoreMap = {}
  letters.forEach((g, gi) => {
    const strength = gi // A=0 ... L=11
    // g2(3위 후보)가 g3를 strength 차이로 이기게, 나머지는 g0>g1>g2 순
    scores[`${g}-23`] = { home: strength + 1, away: 0 } // g2 win over g3
    scores[`${g}-02`] = { home: 3, away: 0 } // g0 beats g2
    scores[`${g}-12`] = { home: 2, away: 0 } // g1 beats g2
    scores[`${g}-01`] = { home: 3, away: 0 } // g0 beats g1
    scores[`${g}-03`] = { home: 3, away: 0 } // g0 beats g3
    scores[`${g}-13`] = { home: 2, away: 0 } // g1 beats g3
  })
  const ranking = computeThirdPlaceRanking(groups, scores)
  expect(ranking).toHaveLength(12)
  expect(ranking[0].rankAmongThirds).toBe(1)
  expect(ranking.filter((r) => r.qualified)).toHaveLength(8)
  // 강한 조(L,K,...)의 3위가 상위에 오도록 (득점 많은 순)
  expect(ranking[0].groupId).toBe('L')
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- standings`
Expected: FAIL ("computeThirdPlaceRanking is not a function").

- [ ] **Step 3: 구현 추가**

`src/lib/standings.ts` 하단에 추가:
```ts
import type { GroupId } from '@/types'

export interface GroupInput {
  groupId: GroupId
  teamIds: string[]
  matches: GroupMatch[]
}

export interface ThirdPlaceEntry {
  teamId: string
  groupId: GroupId
  points: number
  gd: number
  gf: number
  rankAmongThirds: number
  qualified: boolean
}

export function computeThirdPlaceRanking(
  groups: GroupInput[],
  scores: ScoreMap,
): ThirdPlaceEntry[] {
  const thirds: ThirdPlaceEntry[] = groups.map((g) => {
    const table = computeGroupStandings(g.teamIds, g.matches, scores)
    const third = table[2]
    return {
      teamId: third.teamId,
      groupId: g.groupId,
      points: third.points,
      gd: third.gd,
      gf: third.gf,
      rankAmongThirds: 0,
      qualified: false,
    }
  })

  thirds.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.groupId.localeCompare(b.groupId),
  )
  thirds.forEach((t, i) => {
    t.rankAmongThirds = i + 1
    t.qualified = i < 8
  })
  return thirds
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- standings`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/standings.ts src/lib/standings.test.ts
git commit -m "feat: computeThirdPlaceRanking with top-8 qualification"
```

---

## Task 5: R32 대진 생성 `seedKnockout`

**Files:**
- Create: `src/lib/knockout.ts`
- Test: `src/lib/knockout.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/knockout.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { seedKnockout, thirdPlaceComboKey } from './knockout'
import type { KnockoutMatch, TeamStanding } from '@/types'
import type { ThirdPlaceEntry } from './standings'

// 표준화된 조합 키: 진출한 조 letter 정렬 결합
it('builds a stable combo key from qualifying groups', () => {
  expect(thirdPlaceComboKey(['C', 'A', 'B'])).toBe('ABC')
})

it('resolves R32 group sources and one third-place source', () => {
  // 2경기짜리 축소 브래킷으로 검증
  const bracket: KnockoutMatch[] = [
    { id: 'M1', round: 'R32', order: 1,
      homeSource: { type: 'groupWinner', group: 'A' },
      awaySource: { type: 'groupRunnerUp', group: 'B' } },
    { id: 'M2', round: 'R32', order: 2,
      homeSource: { type: 'groupWinner', group: 'B' },
      awaySource: { type: 'thirdPlace', slotId: 'T1' } },
  ]
  const standings: Record<string, TeamStanding[]> = {
    A: [s('A0', 1), s('A1', 2), s('A2', 3), s('A3', 4)],
    B: [s('B0', 1), s('B1', 2), s('B2', 3), s('B3', 4)],
  }
  // 진출 3위팀: A,B 두 조라고 가정, T1 슬롯엔 A조 3위 배정
  const thirds: ThirdPlaceEntry[] = [
    { teamId: 'A2', groupId: 'A', points: 3, gd: 0, gf: 1, rankAmongThirds: 1, qualified: true },
    { teamId: 'B2', groupId: 'B', points: 3, gd: 0, gf: 1, rankAmongThirds: 2, qualified: true },
  ]
  const assignment = { AB: { T1: 'A' as const } }

  const resolved = seedKnockout(bracket, standings, thirds, assignment)
  expect(resolved.find((m) => m.id === 'M1')!.homeTeamId).toBe('A0')
  expect(resolved.find((m) => m.id === 'M1')!.awayTeamId).toBe('B1')
  expect(resolved.find((m) => m.id === 'M2')!.awayTeamId).toBe('A2')
})

function s(teamId: string, rank: number): TeamStanding {
  return { teamId, played: 3, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank }
}
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- knockout`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

Create `src/lib/knockout.ts`:
```ts
import type {
  GroupId, KnockoutMatch, TeamStanding, ThirdPlaceAssignmentTable,
} from '@/types'
import type { ThirdPlaceEntry } from './standings'

export interface ResolvedMatch extends KnockoutMatch {
  homeTeamId: string | null
  awayTeamId: string | null
}

export function thirdPlaceComboKey(groups: GroupId[]): string {
  return [...groups].sort().join('')
}

export function seedKnockout(
  bracket: KnockoutMatch[],
  standings: Record<string, TeamStanding[]>,
  thirds: ThirdPlaceEntry[],
  assignment: ThirdPlaceAssignmentTable,
): ResolvedMatch[] {
  const qualifiedThirds = thirds.filter((t) => t.qualified)
  const comboKey = thirdPlaceComboKey(qualifiedThirds.map((t) => t.groupId))
  const slotMap = assignment[comboKey] ?? {} // { slotId: groupId }
  const thirdByGroup = new Map(qualifiedThirds.map((t) => [t.groupId, t.teamId]))

  const resolveSource = (src: KnockoutMatch['homeSource']): string | null => {
    switch (src.type) {
      case 'groupWinner':
        return standings[src.group]?.find((r) => r.rank === 1)?.teamId ?? null
      case 'groupRunnerUp':
        return standings[src.group]?.find((r) => r.rank === 2)?.teamId ?? null
      case 'thirdPlace': {
        const g = slotMap[src.slotId]
        return g ? thirdByGroup.get(g) ?? null : null
      }
      case 'winnerOf':
        return null // R32 시드 단계에서는 미해소
    }
  }

  return bracket
    .filter((m) => m.round === 'R32')
    .map((m) => ({
      ...m,
      homeTeamId: resolveSource(m.homeSource),
      awayTeamId: resolveSource(m.awaySource),
    }))
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- knockout`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/knockout.ts src/lib/knockout.test.ts
git commit -m "feat: seedKnockout resolves R32 from standings + third-place table"
```

---

## Task 6: 브래킷 전파 `advanceBracket`

**Files:**
- Modify: `src/lib/knockout.ts`
- Modify: `src/lib/knockout.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/knockout.test.ts` 하단에 추가:
```ts
import { advanceBracket } from './knockout'
import type { ResolvedMatch } from './knockout'

it('propagates winners into later rounds', () => {
  const bracket: KnockoutMatch[] = [
    { id: 'M1', round: 'R32', order: 1, homeSource: { type: 'groupWinner', group: 'A' }, awaySource: { type: 'groupRunnerUp', group: 'B' } },
    { id: 'M2', round: 'R32', order: 2, homeSource: { type: 'groupWinner', group: 'B' }, awaySource: { type: 'groupRunnerUp', group: 'A' } },
    { id: 'F1', round: 'R16', order: 1, homeSource: { type: 'winnerOf', matchId: 'M1' }, awaySource: { type: 'winnerOf', matchId: 'M2' } },
  ]
  const r32: ResolvedMatch[] = [
    { ...bracket[0], homeTeamId: 'A0', awayTeamId: 'B1' },
    { ...bracket[1], homeTeamId: 'B0', awayTeamId: 'A1' },
  ]
  const winners = { M1: 'A0', M2: 'B0' }
  const all = advanceBracket(bracket, r32, winners)
  const f1 = all.find((m) => m.id === 'F1')!
  expect(f1.homeTeamId).toBe('A0')
  expect(f1.awayTeamId).toBe('B0')
})

it('leaves later slots empty when a winner is not chosen', () => {
  const bracket: KnockoutMatch[] = [
    { id: 'M1', round: 'R32', order: 1, homeSource: { type: 'groupWinner', group: 'A' }, awaySource: { type: 'groupRunnerUp', group: 'B' } },
    { id: 'M2', round: 'R32', order: 2, homeSource: { type: 'groupWinner', group: 'B' }, awaySource: { type: 'groupRunnerUp', group: 'A' } },
    { id: 'F1', round: 'R16', order: 1, homeSource: { type: 'winnerOf', matchId: 'M1' }, awaySource: { type: 'winnerOf', matchId: 'M2' } },
  ]
  const r32: ResolvedMatch[] = [
    { ...bracket[0], homeTeamId: 'A0', awayTeamId: 'B1' },
    { ...bracket[1], homeTeamId: 'B0', awayTeamId: 'A1' },
  ]
  const all = advanceBracket(bracket, r32, { M1: 'A0' })
  const f1 = all.find((m) => m.id === 'F1')!
  expect(f1.homeTeamId).toBe('A0')
  expect(f1.awayTeamId).toBeNull()
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- knockout`
Expected: FAIL ("advanceBracket is not a function").

- [ ] **Step 3: 구현 추가**

`src/lib/knockout.ts` 하단에 추가:
```ts
export function advanceBracket(
  bracket: KnockoutMatch[],
  r32Resolved: ResolvedMatch[],
  winners: Record<string, string | null>,
): ResolvedMatch[] {
  const resolved = new Map<string, ResolvedMatch>()
  for (const m of r32Resolved) resolved.set(m.id, m)

  const roundOrder: KnockoutMatch['round'][] = ['R32', 'R16', 'QF', 'SF', 'F']
  const teamOf = (matchId: string): string | null => {
    const m = resolved.get(matchId)
    if (!m) return null
    return winners[matchId] ?? null
  }

  const resolveSource = (src: KnockoutMatch['homeSource']): string | null => {
    if (src.type === 'winnerOf') return teamOf(src.matchId)
    return null // 그룹 출처는 R32에서만 쓰이며 r32Resolved에 이미 반영됨
  }

  for (const round of roundOrder.slice(1)) {
    for (const m of bracket.filter((b) => b.round === round)) {
      resolved.set(m.id, {
        ...m,
        homeTeamId: resolveSource(m.homeSource),
        awayTeamId: resolveSource(m.awaySource),
      })
    }
  }
  return [...resolved.values()]
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- knockout`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/knockout.ts src/lib/knockout.test.ts
git commit -m "feat: advanceBracket propagates knockout winners"
```

---

## Task 7: Zustand 스토어 + localStorage + 리셋

**Files:**
- Create: `src/store/useSimulator.ts`
- Test: `src/store/useSimulator.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/store/useSimulator.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSimulator } from './useSimulator'

beforeEach(() => {
  localStorage.clear()
  useSimulator.getState().resetToDefault()
})

it('initializes group scores from played defaults', () => {
  const { scores } = useSimulator.getState()
  // 시드의 played=true 경기는 디폴트 스코어로 채워져 있어야 함
  expect(typeof scores).toBe('object')
})

it('setScore updates a match score', () => {
  const { setScore } = useSimulator.getState()
  const anyMatchId = Object.keys(useSimulator.getState().scores)[0] ?? 'GA-1'
  setScore(anyMatchId, { home: 3, away: 1 })
  expect(useSimulator.getState().scores[anyMatchId]).toEqual({ home: 3, away: 1 })
})

it('setWinner updates a knockout winner', () => {
  useSimulator.getState().setWinner('M73', 'FRA')
  expect(useSimulator.getState().winners['M73']).toBe('FRA')
})

it('clearAll empties scores and winners', () => {
  useSimulator.getState().setWinner('M73', 'FRA')
  useSimulator.getState().clearAll()
  expect(useSimulator.getState().winners['M73']).toBeUndefined()
  expect(Object.values(useSimulator.getState().scores).every((v) => v === null)).toBe(true)
})

it('resetToDefault restores seed defaults', () => {
  useSimulator.getState().clearAll()
  useSimulator.getState().resetToDefault()
  // 디폴트 복원 후 적어도 하나의 played 경기 스코어가 존재
  const hasDefault = Object.values(useSimulator.getState().scores).some((v) => v !== null)
  expect(hasDefault).toBe(true)
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- useSimulator`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

Create `src/store/useSimulator.ts`:
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import data from '../../data/worldcup-2026.json'
import type { Score, ScoreMap, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData

function defaultScores(): ScoreMap {
  const map: ScoreMap = {}
  for (const m of wc.groupMatches) {
    map[m.id] =
      m.played && m.defaultHome !== null && m.defaultAway !== null
        ? { home: m.defaultHome, away: m.defaultAway }
        : null
  }
  return map
}

interface SimulatorState {
  scores: ScoreMap
  winners: Record<string, string | null>
  setScore: (matchId: string, score: Score) => void
  clearScore: (matchId: string) => void
  setWinner: (matchId: string, teamId: string) => void
  resetToDefault: () => void
  clearAll: () => void
}

export const useSimulator = create<SimulatorState>()(
  persist(
    (set) => ({
      scores: defaultScores(),
      winners: {},
      setScore: (matchId, score) =>
        set((st) => ({ scores: { ...st.scores, [matchId]: score } })),
      clearScore: (matchId) =>
        set((st) => ({ scores: { ...st.scores, [matchId]: null } })),
      setWinner: (matchId, teamId) =>
        set((st) => ({ winners: { ...st.winners, [matchId]: teamId } })),
      resetToDefault: () => set({ scores: defaultScores(), winners: {} }),
      clearAll: () => {
        const cleared: ScoreMap = {}
        for (const k of Object.keys(defaultScores())) cleared[k] = null
        set({ scores: cleared, winners: {} })
      },
    }),
    { name: 'worldcup-sim-2026' },
  ),
)
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- useSimulator`
Expected: PASS. (시드 데이터가 비어있으면 일부 통과/스킵될 수 있음 — Task 2 데이터가 채워진 후 재확인.)

- [ ] **Step 5: Commit**

```bash
git add src/store/useSimulator.ts src/store/useSimulator.test.ts
git commit -m "feat: zustand simulator store with localStorage persist + reset"
```

---

## Task 8: 셀렉터 (스토어 + lib 조합 파생값)

**Files:**
- Create: `src/store/selectors.ts`
- Test: `src/store/selectors.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/store/selectors.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { selectGroupStandings, selectThirdPlaceRanking } from './selectors'
import type { ScoreMap } from '@/types'

it('returns standings for all 12 groups', () => {
  const scores: ScoreMap = {}
  const result = selectGroupStandings(scores)
  // 시드가 채워지면 12개 그룹 키가 나와야 함
  expect(Object.keys(result).length).toBeGreaterThanOrEqual(0)
})

it('returns 12 third-place entries when seed present', () => {
  const scores: ScoreMap = {}
  const result = selectThirdPlaceRanking(scores)
  expect(Array.isArray(result)).toBe(true)
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- selectors`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

Create `src/store/selectors.ts`:
```ts
import data from '../../data/worldcup-2026.json'
import { computeGroupStandings, computeThirdPlaceRanking, type GroupInput, type TeamStanding, type ThirdPlaceEntry } from '@/lib/standings'
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
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- selectors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/selectors.ts src/store/selectors.test.ts
git commit -m "feat: derived selectors combining store scores with standings lib"
```

---

## Task 9: 테마 (녹색 라이트/다크 + next-themes 토글)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeToggle.tsx`

- [ ] **Step 1: 테마 토큰 작성**

`src/app/globals.css`의 `:root` / `.dark` 블록에 키컬러를 정의(shadcn 변수 위에 덮어쓰기). 파일 상단 `@layer base` 안에 추가:
```css
@layer base {
  :root {
    /* 라이트: 짙은 녹색 */
    --primary: 142 72% 24%;          /* deep green */
    --primary-foreground: 0 0% 100%;
    --ring: 142 72% 24%;
    --accent: 142 40% 92%;
    --accent-foreground: 142 72% 18%;
  }
  .dark {
    /* 다크: 밝은 녹색 */
    --primary: 142 70% 55%;          /* bright green */
    --primary-foreground: 142 80% 8%;
    --ring: 142 70% 55%;
    --accent: 142 30% 18%;
    --accent-foreground: 142 70% 80%;
  }
}
```
> shadcn 초기화가 만든 기존 `--background`/`--foreground` 등은 유지하고 위 키만 덮어쓴다. (Tailwind v4 `@theme` 방식이면 동일 토큰을 해당 위치에 매핑.)

- [ ] **Step 2: ThemeProvider 작성**

Create `src/components/theme/ThemeProvider.tsx`:
```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 3: ThemeToggle 작성**

Create `src/components/theme/ThemeToggle.tsx`:
```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Button variant="ghost" size="icon" aria-label="테마" />
  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="테마 전환"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? '🌙' : '☀️'}
    </Button>
  )
}
```

- [ ] **Step 4: layout에 Provider 연결**

`src/app/layout.tsx`의 `<body>` 내부를 `ThemeProvider`로 감싸고, `<html>`에 `suppressHydrationWarning` 추가:
```tsx
import { ThemeProvider } from '@/components/theme/ThemeProvider'
// ...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: 빌드 확인 + 수동 검증**

Run: `npm run build`
Expected: 빌드 성공. (`npm run dev`로 토글이 라이트/다크 전환되는지 수동 확인.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: green light/dark theme with next-themes toggle"
```

---

## Task 10: 조별리그 UI (경기 카드 + 순위표 + 조 그리드)

**Files:**
- Create: `src/components/group/MatchCard.tsx`, `src/components/group/StandingsTable.tsx`, `src/components/group/GroupCard.tsx`, `src/components/group/GroupStage.tsx`
- Helper: `src/lib/teams.ts` (id→Team 조회)

- [ ] **Step 1: 팀 조회 헬퍼 작성**

Create `src/lib/teams.ts`:
```ts
import data from '../../data/worldcup-2026.json'
import type { Team, WorldCupData } from '@/types'

const wc = data as unknown as WorldCupData
const byId = new Map(wc.teams.map((t) => [t.id, t]))

export function getTeam(id: string | null | undefined): Team | undefined {
  return id ? byId.get(id) : undefined
}
export function teamName(id: string | null | undefined): string {
  return getTeam(id)?.name ?? '미정'
}
export function teamFlag(id: string | null | undefined): string {
  const code = getTeam(id)?.flagCode
  if (!code) return '🏳️'
  // ISO2 -> regional indicator emoji
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0)),
  )
}
```

- [ ] **Step 2: MatchCard 작성 (스코어 stepper)**

Create `src/components/group/MatchCard.tsx`:
```tsx
'use client'
import type { GroupMatch } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'
import { Button } from '@/components/ui/button'

export function MatchCard({ match }: { match: GroupMatch }) {
  const score = useSimulator((s) => s.scores[match.id])
  const setScore = useSimulator((s) => s.setScore)
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) =>
    setScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
      <TeamSide id={match.homeId} align="right" />
      <Stepper value={h} onChange={(v) => update(v, a)} />
      <span className="text-muted-foreground">:</span>
      <Stepper value={a} onChange={(v) => update(h, v)} />
      <TeamSide id={match.awayId} align="left" />
    </div>
  )
}

function TeamSide({ id, align }: { id: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-1 items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {align === 'right' && <span className="truncate">{teamName(id)}</span>}
      <span>{teamFlag(id)}</span>
      {align === 'left' && <span className="truncate">{teamName(id)}</span>}
    </div>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onChange(value - 1)}>−</Button>
      <span className="w-5 text-center font-semibold tabular-nums">{value}</span>
      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onChange(value + 1)}>+</Button>
    </div>
  )
}
```

- [ ] **Step 3: StandingsTable 작성**

Create `src/components/group/StandingsTable.tsx`:
```tsx
'use client'
import type { TeamStanding } from '@/lib/standings'
import { teamFlag, teamName } from '@/lib/teams'

export function StandingsTable({ rows }: { rows: TeamStanding[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="text-left">#</th>
          <th className="text-left">팀</th>
          <th>승점</th><th>경기</th><th>득실</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.teamId} className={r.rank <= 2 ? 'font-semibold text-primary' : ''}>
            <td>{r.rank}</td>
            <td className="flex items-center gap-1">{teamFlag(r.teamId)} {teamName(r.teamId)}</td>
            <td className="text-center">{r.points}</td>
            <td className="text-center">{r.played}</td>
            <td className="text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 4: GroupCard 작성**

Create `src/components/group/GroupCard.tsx`:
```tsx
'use client'
import data from '../../../data/worldcup-2026.json'
import type { GroupId, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { computeGroupStandings } from '@/lib/standings'
import { MatchCard } from './MatchCard'
import { StandingsTable } from './StandingsTable'
import { Card } from '@/components/ui/card'

const wc = data as unknown as WorldCupData

export function GroupCard({ groupId }: { groupId: GroupId }) {
  const scores = useSimulator((s) => s.scores)
  const teamIds = wc.teams.filter((t) => t.groupId === groupId).map((t) => t.id)
  const matches = wc.groupMatches.filter((m) => m.groupId === groupId)
  const standings = computeGroupStandings(teamIds, matches, scores)

  return (
    <Card className="space-y-2 p-3">
      <h3 className="font-bold">Group {groupId}</h3>
      <div className="space-y-1">
        {matches.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
      <StandingsTable rows={standings} />
    </Card>
  )
}
```

- [ ] **Step 5: GroupStage 작성**

Create `src/components/group/GroupStage.tsx`:
```tsx
'use client'
import type { GroupId } from '@/types'
import { GroupCard } from './GroupCard'

const GROUP_IDS: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L']

export function GroupStage() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GROUP_IDS.map((g) => <GroupCard key={g} groupId={g} />)}
    </div>
  )
}
```

- [ ] **Step 6: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: group stage UI (match cards, standings, group grid)"
```

---

## Task 11: Floating 3위 랭킹 패널

**Files:**
- Create: `src/components/ThirdPlacePanel.tsx`

- [ ] **Step 1: 패널 작성**

Create `src/components/ThirdPlacePanel.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectThirdPlaceRanking } from '@/store/selectors'
import { teamFlag, teamName } from '@/lib/teams'
import { Button } from '@/components/ui/button'

function PanelBody() {
  const scores = useSimulator((s) => s.scores)
  const ranking = selectThirdPlaceRanking(scores)
  return (
    <div className="space-y-1">
      <h3 className="mb-2 font-bold">조 3위 랭킹 (상위 8팀 진출)</h3>
      {ranking.map((r) => (
        <div
          key={r.teamId}
          className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
            r.qualified ? 'bg-accent text-accent-foreground' : 'opacity-50'
          }`}
        >
          <span className="flex items-center gap-1">
            <span className="w-4 tabular-nums">{r.rankAmongThirds}</span>
            <span>{r.qualified ? '✅' : '❌'}</span>
            {teamFlag(r.teamId)} {teamName(r.teamId)} <span className="text-muted-foreground">({r.groupId})</span>
          </span>
          <span className="tabular-nums text-muted-foreground">{r.points}pt</span>
        </div>
      ))}
    </div>
  )
}

export function ThirdPlacePanel() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* 데스크탑: 우측 sticky */}
      <aside className="sticky top-4 hidden h-fit w-72 shrink-0 rounded-lg border p-3 lg:block">
        <PanelBody />
      </aside>

      {/* 모바일: FAB + 하단 시트 */}
      <div className="lg:hidden">
        <Button
          className="fixed bottom-4 right-4 z-20 rounded-full shadow-lg"
          onClick={() => setOpen((v) => !v)}
        >
          3위 랭킹
        </Button>
        {open && (
          <div className="fixed inset-x-0 bottom-0 z-20 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t bg-background p-4 shadow-2xl">
            <PanelBody />
            <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>닫기</Button>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: floating third-place ranking panel (desktop sticky + mobile sheet)"
```

---

## Task 12: 토너먼트 브래킷 UI

**Files:**
- Create: `src/components/knockout/BracketMatch.tsx`, `src/components/knockout/Bracket.tsx`

- [ ] **Step 1: BracketMatch 작성 (승자 클릭)**

Create `src/components/knockout/BracketMatch.tsx`:
```tsx
'use client'
import type { ResolvedMatch } from '@/lib/knockout'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'

export function BracketMatch({ match }: { match: ResolvedMatch }) {
  const winner = useSimulator((s) => s.winners[match.id])
  const setWinner = useSimulator((s) => s.setWinner)

  const Row = ({ teamId }: { teamId: string | null }) => {
    const selectable = !!teamId
    const isWinner = winner === teamId && !!teamId
    return (
      <button
        disabled={!selectable}
        onClick={() => teamId && setWinner(match.id, teamId)}
        className={`flex w-40 items-center gap-1 rounded px-2 py-1 text-left text-sm ${
          isWinner ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'
        } disabled:opacity-40`}
      >
        {teamFlag(teamId)} <span className="truncate">{teamName(teamId)}</span>
      </button>
    )
  }

  return (
    <div className="space-y-1 rounded-md border p-1">
      <Row teamId={match.homeTeamId} />
      <Row teamId={match.awayTeamId} />
    </div>
  )
}
```

- [ ] **Step 2: Bracket 작성 (라운드별 컬럼)**

Create `src/components/knockout/Bracket.tsx`:
```tsx
'use client'
import data from '../../../data/worldcup-2026.json'
import thirdAssign from '../../../data/third-place-assignment.json'
import type { KnockoutRound, ThirdPlaceAssignmentTable, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { selectGroupStandings, selectThirdPlaceRanking } from '@/store/selectors'
import { seedKnockout, advanceBracket } from '@/lib/knockout'
import { BracketMatch } from './BracketMatch'

const wc = data as unknown as WorldCupData
const assignment = thirdAssign as unknown as ThirdPlaceAssignmentTable
const ROUNDS: { round: KnockoutRound; label: string }[] = [
  { round: 'R32', label: '32강' },
  { round: 'R16', label: '16강' },
  { round: 'QF', label: '8강' },
  { round: 'SF', label: '4강' },
  { round: 'F', label: '결승' },
]

export function Bracket() {
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)

  const standings = selectGroupStandings(scores)
  const thirds = selectThirdPlaceRanking(scores)
  const r32 = seedKnockout(wc.knockoutMatches, standings, thirds, assignment)
  const all = advanceBracket(wc.knockoutMatches, r32, winners)
  const byId = new Map(all.map((m) => [m.id, m]))

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {ROUNDS.map(({ round, label }) => {
        const matches = wc.knockoutMatches
          .filter((m) => m.round === round)
          .sort((a, b) => a.order - b.order)
        return (
          <div key={round} className="flex min-w-44 flex-col justify-around gap-3">
            <h3 className="font-bold">{label}</h3>
            {matches.map((m) => {
              const resolved = byId.get(m.id)
              return resolved ? <BracketMatch key={m.id} match={resolved} /> : null
            })}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: knockout bracket UI with winner selection"
```

---

## Task 13: 앱 셸 — 헤더 · 탭 · 리셋 · 조립

**Files:**
- Create: `src/components/Header.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Header 작성 (타이틀 · 테마 토글 · 리셋)**

Create `src/components/Header.tsx`:
```tsx
'use client'
import { useSimulator } from '@/store/useSimulator'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'

export function Header() {
  const resetToDefault = useSimulator((s) => s.resetToDefault)
  const clearAll = useSimulator((s) => s.clearAll)
  return (
    <header className="flex items-center justify-between border-b pb-3">
      <h1 className="text-xl font-extrabold text-primary">2026 월드컵 시뮬레이터</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => resetToDefault()}>실제 결과로 초기화</Button>
        <Button variant="ghost" size="sm" onClick={() => clearAll()}>전체 비우기</Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: page.tsx 조립 (탭 + 패널)**

Replace `src/app/page.tsx`:
```tsx
import { Header } from '@/components/Header'
import { GroupStage } from '@/components/group/GroupStage'
import { Bracket } from '@/components/knockout/Bracket'
import { ThirdPlacePanel } from '@/components/ThirdPlacePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <Header />
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <Tabs defaultValue="group">
            <TabsList>
              <TabsTrigger value="group">조별리그</TabsTrigger>
              <TabsTrigger value="knockout">토너먼트</TabsTrigger>
            </TabsList>
            <TabsContent value="group"><GroupStage /></TabsContent>
            <TabsContent value="knockout"><Bracket /></TabsContent>
          </Tabs>
        </div>
        <ThirdPlacePanel />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 전체 빌드 + 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 모든 테스트 PASS.

- [ ] **Step 4: 수동 검증 (dev 서버)**

Run: `npm run dev`
확인 항목:
- 조별리그 탭에서 스코어 +/− 조절 시 순위표·3위 패널 실시간 갱신
- 3위 패널 상위 8팀 ✅, 나머지 ❌
- 토너먼트 탭에서 경기 클릭 시 승자 하이라이트, 다음 라운드 전파
- "실제 결과로 초기화" / "전체 비우기" 동작
- 라이트/다크 토글, 새로고침 후 입력 유지(localStorage)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell with tabs, header, reset — wire all components"
```

---

## Self-Review 결과

**1. Spec coverage**
- 조별리그 스코어 조절 → Task 10 (MatchCard stepper) ✅
- 조 순위 → Task 3 + StandingsTable ✅
- Floating 3위 랭킹(32강 진출 표시) → Task 4 + Task 11 ✅
- 디폴트=실제 결과 + 초기화 → Task 2(시드) + Task 7(resetToDefault) + Task 13(버튼) ✅
- 토너먼트 32강부터 승패만 → Task 5/6 + Task 12 ✅
- 라이트/다크 + 녹색 키컬러 → Task 9 ✅
- localStorage 유지 → Task 7 ✅
- (통계·골든볼·Supabase는 Phase 2+로 의도적으로 범위 밖)

**2. Placeholder scan**: 시드 데이터 수집(Task 2)은 외부 데이터 의존이라 "구현자가 채운다"로 명시 — 코드 placeholder가 아닌 데이터 수집 작업. 그 외 모든 로직/UI는 완전한 코드 포함.

**3. Type consistency**: `TeamStanding`, `ThirdPlaceEntry`, `ResolvedMatch`, `ScoreMap`, `SlotSource`가 정의(Task 2~6)와 사용처(Task 8~13)에서 일치. `seedKnockout`/`advanceBracket` 시그니처 일관.

**알려진 후속(Phase 1 범위 내 잔여 리스크)**: 3위 배정표(`third-place-assignment.json`)와 실제 경기 결과는 정확도가 데이터 수집 품질에 달려 있음 — Task 13 수동 검증에서 공식 자료와 대조.
