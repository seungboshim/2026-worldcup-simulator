# Phase 4 + 5 — 일일 결과 자동갱신 & 애드센스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** (A) 매일 실제 조별경기 결과를 football-data.org에서 받아 `worldcup-2026.json`을 자동 갱신·커밋한다. (B) 애드센스를 스캐폴딩해 사이트 심사를 시작하고, 승인 후 슬롯 ID만 채우면 하단 배너가 뜨게 한다.

**Architecture:** A는 순수 병합(`applyGroupResults`) + 얇은 fetch/commit 셸(`update-results.ts`) + GitHub Actions cron. B는 공개 ID 상수 + env 가드 컴포넌트(로더·배너) + ads.txt 라우트. 둘은 독립 — 한 플랜에서 병렬 진행.

**Tech Stack:** Next 16 · TypeScript · tsx(^4.22.4) · Vitest · football-data.org v4 · Google AdSense

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `src/lib/results-merge.ts` | `applyGroupResults`(순수) + tla 매핑 |
| `src/lib/results-merge.test.ts` | 병합 유닛테스트 |
| `scripts/update-results.ts` | fetch → 병합 → 변경 시 JSON 저장(셸, tsx 실행) |
| `.github/workflows/update-results.yml` | cron + 수동, 변경 시 commit·push |
| `src/lib/adsense.ts` | 공개 ID 상수 + `isAdsConfigured`/`adsEnabled`/`adsTxtContent` |
| `src/lib/adsense.test.ts` | adsense 헬퍼 유닛테스트 |
| `src/components/ads/AdScript.tsx` | adsbygoogle 로더(next/script) |
| `src/components/ads/AdBanner.tsx` | 하단 배너(클라, 슬롯 가드) |
| `src/app/ads.txt/route.ts` | ads.txt(상수 기반) |
| `src/app/[locale]/layout.tsx` (수정) | AdScript + 하단 AdBanner 삽입 |

> **이미 완료:** 애드센스 사이트 인증 메타태그(`google-adsense-account` = `ca-pub-3511914726275246`)는 layout `verification.other`에 추가·배포됨(prod 확인). 미들웨어 matcher `(?!_next|fonts|favicon.ico|.*\.)`가 점(`.`) 포함 경로를 제외하므로 `/ads.txt`는 로케일 리다이렉트 없이 서빙됨(미들웨어 수정 불필요).

---

# Part A — Phase 4: 일일 결과 자동갱신

## Task A1: 순수 병합 `applyGroupResults`

**Files:** Create `src/lib/results-merge.ts`, `src/lib/results-merge.test.ts`

- [ ] **Step 1: 실패 테스트** — `src/lib/results-merge.test.ts`
```ts
import { it, expect } from 'vitest'
import { applyGroupResults, type ApiMatch } from './results-merge'
import type { WorldCupData } from '@/types'

const base = {
  competition: 'test',
  teams: [],
  knockoutMatches: [],
  groupMatches: [
    { id: 'GA-1', groupId: 'A', homeId: 'MEX', awayId: 'RSA', played: false, defaultHome: null, defaultAway: null },
    { id: 'GA-2', groupId: 'A', homeId: 'KOR', awayId: 'CZE', played: true, defaultHome: 2, defaultAway: 1 },
  ],
} as unknown as WorldCupData

const fin = (home: string, away: string, h: number | null, a: number | null, over: Partial<ApiMatch> = {}): ApiMatch => ({
  stage: 'GROUP_STAGE',
  status: 'FINISHED',
  homeTeam: { tla: home },
  awayTeam: { tla: away },
  score: { fullTime: { home: h, away: a } },
  ...over,
})

it('applies a new finished group result', () => {
  const { data, changed } = applyGroupResults(base, [fin('MEX', 'RSA', 2, 0)])
  expect(data.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ played: true, defaultHome: 2, defaultAway: 0 })
  expect(changed).toEqual([{ matchId: 'GA-1', before: null, after: { home: 2, away: 0 } }])
})

it('orients scores when API home/away is swapped vs our data', () => {
  // our GA-1: home MEX / away RSA. API: RSA(home) 0 - MEX(away) 2
  const { data } = applyGroupResults(base, [fin('RSA', 'MEX', 0, 2)])
  expect(data.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ defaultHome: 2, defaultAway: 0 })
})

it('reports no change when the stored result already matches', () => {
  const { changed } = applyGroupResults(base, [fin('KOR', 'CZE', 2, 1)])
  expect(changed).toEqual([])
})

it('ignores non-group / unfinished / null-score / unknown-pair matches', () => {
  const { changed } = applyGroupResults(base, [
    fin('MEX', 'RSA', 1, 0, { stage: 'LAST_16' }),
    fin('MEX', 'RSA', null, null, { status: 'TIMED' }),
    fin('BRA', 'ARG', 1, 0),
  ])
  expect(changed).toEqual([])
})

it('does not mutate the input', () => {
  applyGroupResults(base, [fin('MEX', 'RSA', 3, 1)])
  expect(base.groupMatches.find((m) => m.id === 'GA-1')).toMatchObject({ played: false, defaultHome: null })
})
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/results-merge.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `src/lib/results-merge.ts`
```ts
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
```

- [ ] **Step 4: 통과** — `npx vitest run src/lib/results-merge.test.ts` → 5 pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/results-merge.ts src/lib/results-merge.test.ts
git commit -m "feat: applyGroupResults — football-data 결과를 조별 기본값에 병합(순수)"
```

---

## Task A2: 갱신 스크립트 `update-results.ts`

**Files:** Create `scripts/update-results.ts`

- [ ] **Step 1: 구현**
```ts
// 일일 조별 결과 갱신.
// 로컬: node --env-file=.env.local --import tsx scripts/update-results.ts
// CI:   npx tsx scripts/update-results.ts   (FOOTBALL_DATA_TOKEN은 워크플로우 env로 주입)
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyGroupResults, type ApiMatch } from '../src/lib/results-merge'
import type { WorldCupData } from '../src/types'

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) {
    console.error('FOOTBALL_DATA_TOKEN missing')
    process.exit(1)
  }

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': token },
  })
  if (!res.ok) {
    console.error('API error:', res.status, await res.text())
    process.exit(1)
  }
  const body = (await res.json()) as { matches?: ApiMatch[]; message?: string }
  if (!body.matches) {
    console.error('Unexpected API response:', body.message ?? '(no matches field)')
    process.exit(1)
  }

  const dataPath = resolve('data/worldcup-2026.json')
  const current = JSON.parse(readFileSync(dataPath, 'utf8')) as WorldCupData
  const { data, changed } = applyGroupResults(current, body.matches)

  if (changed.length === 0) {
    console.log('no change')
    return
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`updated ${changed.length} match(es):`)
  for (const c of changed) {
    const b = c.before ? `${c.before.home}-${c.before.away}` : '–'
    console.log(`  ${c.matchId}: ${b} → ${c.after.home}-${c.after.away}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```
> `import type`(WorldCupData)와 results-merge 내부의 `@/types` 타입 임포트는 tsx(esbuild)가 런타임에서 제거 → @ 별칭 런타임 해석 불필요. 값 임포트는 상대경로뿐.

- [ ] **Step 2: 로컬 검증** — 결과 변동이 있으면 갱신, 없으면 "no change":
```bash
node --env-file=.env.local --import tsx scripts/update-results.ts
```
예상: `updated N match(es): …` 또는 `no change`. (실행 후 `git diff --stat data/worldcup-2026.json`로 변경 확인. 검증용 변경은 커밋해도 됨 — 실제 결과이므로.)

- [ ] **Step 3: Commit** (스크립트 + 검증으로 생긴 데이터 변경분)
```bash
git add scripts/update-results.ts data/worldcup-2026.json
git commit -m "feat: update-results 스크립트 + 최신 조별 결과 반영"
```

---

## Task A3: GitHub Actions 워크플로우

**Files:** Create `.github/workflows/update-results.yml`

- [ ] **Step 1: 작성**
```yaml
name: Update group results

on:
  schedule:
    - cron: '0 12 * * *' # 매일 12:00 UTC (≈ 21:00 KST). 필요시 조정.
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Fetch & merge results
        run: npx tsx scripts/update-results.ts
        env:
          FOOTBALL_DATA_TOKEN: ${{ secrets.FOOTBALL_DATA_TOKEN }}
      - name: Commit if changed
        run: |
          if git diff --quiet data/worldcup-2026.json; then
            echo "no change"
          else
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add data/worldcup-2026.json
            git commit -m "chore: 조별 결과 자동 갱신 ($(date -u +%Y-%m-%d))"
            git push
          fi
```

- [ ] **Step 2: 선행(사용자)** — GitHub repo → Settings → Secrets and variables → Actions → New repository secret: 이름 `FOOTBALL_DATA_TOKEN`, 값 = football-data 키.

- [ ] **Step 3: Commit**
```bash
git add .github/workflows/update-results.yml
git commit -m "ci: 조별 결과 일일 자동 갱신 워크플로우(cron + 수동)"
```

- [ ] **Step 4: 검증** — main 푸시 후 GitHub Actions 탭에서 워크플로우 `Run workflow`(workflow_dispatch) 수동 실행 → 정상 종료 확인. (secret 미등록 시 실패하므로 Step 2 선행.)

---

# Part B — Phase 5: 애드센스

## Task B1: adsense 설정·헬퍼

**Files:** Create `src/lib/adsense.ts`, `src/lib/adsense.test.ts`

- [ ] **Step 1: 실패 테스트** — `src/lib/adsense.test.ts`
```ts
import { it, expect } from 'vitest'
import { isAdsConfigured, adsTxtContent, ADSENSE_CLIENT } from './adsense'

it('isAdsConfigured requires both client and slot', () => {
  expect(isAdsConfigured('ca-pub-1', '123')).toBe(true)
  expect(isAdsConfigured('ca-pub-1', '')).toBe(false)
  expect(isAdsConfigured('', '123')).toBe(false)
})

it('adsTxtContent emits the pub line derived from the client id', () => {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '')
  expect(adsTxtContent()).toBe(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`)
})
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/adsense.test.ts` → FAIL.

- [ ] **Step 3: 구현** — `src/lib/adsense.ts`
```ts
// 공개 ID(시크릿 아님) — 검색콘솔 토큰과 동일하게 하드코딩.
export const ADSENSE_CLIENT = 'ca-pub-3511914726275246'
export const ADSENSE_SLOT_BANNER = '' // 승인 후 디스플레이(가로형) 광고단위 슬롯 ID 입력

export function isAdsConfigured(client: string, slot: string): boolean {
  return client !== '' && slot !== ''
}

// 광고(배너)를 실제로 렌더할 수 있는지 — 슬롯이 채워져야 true.
export function adsEnabled(): boolean {
  return isAdsConfigured(ADSENSE_CLIENT, ADSENSE_SLOT_BANNER)
}

// /ads.txt 본문. client 없으면 빈 문자열.
export function adsTxtContent(): string {
  if (!ADSENSE_CLIENT) return ''
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '') // ca-pub-… → pub-…
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
}
```

- [ ] **Step 4: 통과** — `npx vitest run src/lib/adsense.test.ts` → 2 pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/adsense.ts src/lib/adsense.test.ts
git commit -m "feat: adsense 설정 상수 + ads.txt/가드 헬퍼"
```

---

## Task B2: 로더 컴포넌트 `AdScript`

**Files:** Create `src/components/ads/AdScript.tsx`

- [ ] **Step 1: 구현**
```tsx
import Script from 'next/script'
import { ADSENSE_CLIENT } from '@/lib/adsense'

// adsbygoogle 로더. client가 있으면 항상 로드(심사용). 슬롯 없이도 광고는 안 뜸.
export function AdScript() {
  if (!ADSENSE_CLIENT) return null
  return (
    <Script
      id="adsbygoogle-loader"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ads/AdScript.tsx
git commit -m "feat: AdScript adsbygoogle 로더"
```

---

## Task B3: 배너 컴포넌트 `AdBanner`

**Files:** Create `src/components/ads/AdBanner.tsx`

- [ ] **Step 1: 구현**
```tsx
'use client'
import { useEffect } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOT_BANNER, adsEnabled } from '@/lib/adsense'

// 하단 반응형 배너. 슬롯 미설정(승인 전)이면 아무것도 렌더하지 않음.
export function AdBanner() {
  useEffect(() => {
    if (!adsEnabled()) return
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
    } catch {
      // 로더 미준비/차단 시 무시
    }
  }, [])

  if (!adsEnabled()) return null
  return (
    <div className="mt-6 border-t pt-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT_BANNER}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ads/AdBanner.tsx
git commit -m "feat: AdBanner 하단 반응형 배너(슬롯 가드)"
```

---

## Task B4: `ads.txt` 라우트

**Files:** Create `src/app/ads.txt/route.ts`

- [ ] **Step 1: 구현**
```ts
import { adsTxtContent } from '@/lib/adsense'

export const dynamic = 'force-static'

export function GET() {
  return new Response(adsTxtContent(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/ads.txt/route.ts
git commit -m "feat: /ads.txt 라우트(상수 기반)"
```

---

## Task B5: 레이아웃 연결

**Files:** Modify `src/app/[locale]/layout.tsx`

- [ ] **Step 1: import 추가** (기존 import 블록에)
```tsx
import { AdScript } from '@/components/ads/AdScript'
import { AdBanner } from '@/components/ads/AdBanner'
```

- [ ] **Step 2: body/main에 삽입** — 현재
```tsx
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
를 다음으로:
```tsx
      <body className="min-h-full">
        <ThemeScript />
        <AdScript />
        <I18nProvider locale={locale} dict={dict}>
          <main className="mx-auto min-w-0 max-w-7xl space-y-5 p-4 sm:p-6">
            <Header />
            {children}
            <AdBanner />
          </main>
        </I18nProvider>
      </body>
```

- [ ] **Step 3: 검증** — `npm run build` 성공. `npm test` 통과. `npm run dev` → `/ko`에서 슬롯이 비어 있어 **광고 마크업 없음**(AdBanner null) 확인. `/ads.txt` 접속 시 `google.com, pub-3511914726275246, DIRECT, f08c47fec0942fa0` 반환 확인(로케일 리다이렉트 없이).

- [ ] **Step 4: Commit**
```bash
git add "src/app/[locale]/layout.tsx"
git commit -m "feat: 레이아웃에 AdScript + 하단 AdBanner 연결"
```

---

## 최종: 빌드·배포

- [ ] `npm test` 전체 통과 + `npm run build` 성공.
- [ ] `git checkout main && git merge --ff-only <branch> && git push` → Vercel 재배포.
- [ ] 배포 후 prod `/ads.txt` 확인. 애드센스 콘솔에서 사이트 심사 제출.

**승인 후(사용자):** 디스플레이 광고(가로형) 단위 생성 → 슬롯 ID 확보 → `src/lib/adsense.ts`의 `ADSENSE_SLOT_BANNER`에 입력 → 커밋·배포 → 하단 배너 라이브.

---

## Self-Review 결과

**Spec coverage**
- Phase 4: 데이터출처(§1)→A2 fetch / 순수병합(§2)→A1 / 스크립트(§3)→A2 / 워크플로우(§4)→A3 / 시크릿(§5)→A3 Step2 / 범위=조별만→A1 필터. ✅
- Phase 5: 설정상수(§1)→B1 / 인증 메타태그→완료(헤더) / 로더(§2)→B2 / 배너(§3)→B3 / ads.txt(§4)→B4 / 레이아웃(layout)→B5 / 승인절차(§5)→최종 노트. ✅

**Placeholder scan**: 없음(모든 코드 완전). 슬롯 ID `''`는 의도된 승인-전 상태(가드로 안전), placeholder 아님.

**Type consistency**: `ApiMatch`/`MergeResult`/`ResultChange`(A1) ↔ A2 사용 일치. `GroupMatch` 필드(id/groupId/homeId/awayId/played/defaultHome/defaultAway) 실제 타입과 일치. `ADSENSE_CLIENT`/`ADSENSE_SLOT_BANNER`/`isAdsConfigured`/`adsEnabled`/`adsTxtContent`(B1) ↔ B2/B3/B4 사용 일치. seed와 동일한 `JSON.stringify(data,null,2)+'\n'` 직렬화로 diff 최소화.
