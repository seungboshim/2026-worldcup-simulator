# Phase 2 — 예측 통계(배당률) 설계 문서

- **작성일**: 2026-06-23
- **상태**: 설계 승인됨
- **전제**: Phase 1(코어 시뮬레이터) 배포 완료. 이 문서는 Phase 2만 대상.
- **수정(2026-06-23)**: DB 제공자를 **Supabase → Neon(서버리스 Postgres)** 으로 변경. 접근 방식(서버 전용)·스키마·통계 로직은 동일. 클라이언트는 `@neondatabase/serverless` + 순수 SQL, env는 `DATABASE_URL`(Neon은 연결 문자열이 서버 시크릿이라 RLS 불필요). 구현 세부는 계획 문서 기준. (DB-only 용도라 Supabase 번들을 안 써 Neon이 더 적합)

---

## 0. 목표 & 원칙

사용자가 완성한 토너먼트 예측을 익명으로 제출하고, 모두의 예측을 집계한 **배당률(픽률) 대시보드**를 보여준다.

**핵심 원칙**
- **모든 로직은 Next.js 서버에서** — DB 접근은 Server Action(제출) + Server Component(통계)에서만. 클라이언트는 Supabase를 직접 만지지 않는다.
- **Supabase는 순수 DB(Postgres 저장소)로만** 사용 — Auth/Edge Function 미사용.
- 익명 — 브라우저별 UUID(localStorage). 1 브라우저 = 현재 예측 1개(upsert).

**범위**
- 이번: 예측 제출 + `/stats` 배당률 대시보드 + 라우트 분리(하이브리드).
- 범위 밖: 골든볼/골든슈 투표(Phase 3), 선수 데이터.

---

## 1. 데이터 모델 — `predictions` 테이블

```sql
create table predictions (
  id            uuid primary key default gen_random_uuid(),
  browser_id    text not null unique,   -- 익명 식별(localStorage UUID)
  champion      text not null,          -- teamId
  finalists     text[] not null,        -- 2팀
  semifinalists text[] not null,        -- 4팀
  quarterfinalists text[] not null,     -- 8팀
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```
- 제출 시 완성된 브래킷에서 라운드별 진출팀 id를 추출해 저장.
- **재제출 = upsert(`browser_id` 기준 덮어쓰기)** → 브라우저당 현재 예측 1개. 통계 왜곡 최소화(느슨한 익명 정책).
- RLS: 활성화하되 클라이언트 접근 정책 없음(전부 서버 service-role로 접근).

---

## 2. 순수 로직 (유닛테스트 대상)

### 2.1 `extractPrediction(resolvedMatches): PredictionPicks`
완성된 브래킷(`advanceBracket` 결과 `ResolvedMatch[]`)에서 추출:
- `champion`: 결승(F) 경기의 승자
- `finalists`: 결승 경기 두 팀(2)
- `semifinalists`: SF 라운드 모든 경기의 참가 팀(4)
- `quarterfinalists`: QF 라운드 모든 경기의 참가 팀(8)
- 완성되지 않았으면(우승 미정 등) `null` 반환 → 제출 불가.

### 2.2 `aggregateStats(rows): TierStats`
제출 행들을 받아 각 티어(champion/finalists/semifinalists/quarterfinalists)별로 teamId 카운트 집계 → 내림차순 + 픽률(%) 계산. 총 제출 수 포함.
- 첫 컷: Server Component에서 행 fetch 후 JS 집계(단순). 규모 커지면 Postgres RPC/뷰로 이전(주석으로 명시).

---

## 3. 제출 흐름

- **트리거**: 브래킷 완성(결승 승자=우승 결정) 시 토너먼트 뷰에 `🗳️ 내 예측 제출` CTA 노출. 미완성이면 비활성 + 안내.
- 클릭 → **Server Action** `submitPrediction(picks)` 호출:
  - 브라우저 UUID(localStorage, 없으면 생성)와 picks를 받아 service-role 클라이언트로 `predictions` upsert(`onConflict: browser_id`).
  - 성공 → `/{locale}/stats`로 이동.
- 브라우저 UUID 헬퍼: `getBrowserId()` (localStorage `wc-bid`, 없으면 `crypto.randomUUID()` 저장).

---

## 4. `/stats` 페이지 (Server Component, SSR)

- 경로: `app/[locale]/stats/page.tsx`.
- 서버에서 service-role로 `predictions` 집계 → `aggregateStats` → 렌더.
- 내용: 총 제출 수 + 라운드별 **배당/픽률 테이블** — 우승 top, 결승 진출 top, 4강 top, 8강 top. 각 행: 국기 + 팀명 + 픽률(%) + 표수. (픽률 기반, 배당 느낌)
- 팀 표시: 기존 `teamName`/`teamFlag` 재사용. 녹색 테마·모바일 대응. 데이터 0건이면 빈 상태 안내.
- 헤더에 `통계`/`Stats` 링크 추가(i18n) → 누구나 접근.
- i18n: 새 사전 키(통계 제목, 라운드 라벨 재사용, 픽률/표수 등).

---

## 5. 라우팅 구조 (하이브리드 — 자연 도입)

```
app/[locale]/
  layout.tsx              ← 루트(html·테마 스크립트·i18n) 유지
  (sim)/
    layout.tsx            ← 공유 chrome(헤더) — 시뮬 화면
    page.tsx              ← 조별/토너먼트 (Tabs 유지, 기존 Simulator)
  stats/
    page.tsx              ← 독립 SSR 통계
```
- 조별↔토너먼트는 탭 유지(즉시 전환). 통계는 별도 라우트(SSR/SEO/딥링크).
- 헤더(언어·테마·리셋)는 시뮬과 통계가 공유 → `[locale]/layout.tsx` 또는 공통 Header 컴포넌트 재사용. (현 Header는 리셋/clear가 시뮬 전용이므로, 통계 페이지에선 리셋 없는 경량 헤더 또는 조건부 렌더.)

---

## 6. Supabase / 환경 설정

- **Vercel Marketplace에서 Supabase 통합 추가**(사용자 수행, 대시보드) → `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 등 env 자동 주입.
- 로컬: `vercel env pull .env.local`로 동기화.
- 테이블 생성: 위 SQL을 Supabase SQL editor에서 실행(또는 `scripts/`에 마이그레이션 SQL 보관).
- 서버 Supabase 클라이언트: `@supabase/supabase-js`, service-role 키, 서버 전용 모듈(`src/lib/supabase-server.ts`).

---

## 7. 보안

- DB 접근은 전부 서버(Server Action/Component) + service-role 키(서버 전용 env, 클라이언트 노출 금지).
- RLS 활성 + 클라이언트 정책 없음 → 직접 접근 차단.
- 제출 남용은 느슨하게 허용(브라우저 upsert). 필요 시 추후 rate-limit.

---

## 8. 컴포넌트/파일 경계

| 파일 | 역할 |
|------|------|
| `src/lib/predict.ts` | `extractPrediction`, `aggregateStats` (순수, 테스트) |
| `src/lib/browser-id.ts` | `getBrowserId()` (클라) |
| `src/lib/supabase-server.ts` | service-role 서버 클라이언트 |
| `src/app/actions/submit-prediction.ts` | Server Action `submitPrediction` |
| `src/components/SubmitPrediction.tsx` | 제출 CTA(클라, 완성 시 노출) |
| `src/app/[locale]/stats/page.tsx` | 통계 SSR 페이지 |
| `src/components/stats/*` | 배당 테이블 UI |
| `(sim)/layout.tsx`, 라우트 이동 | 라우팅 재구성 |

각 순수함수는 UI 없이 테스트 가능. DB는 서버 경계 안에 격리.

---

## 9. 셋업 의존성 (구현 전 선행)

1. 사용자가 Vercel 대시보드에서 **Supabase 통합 추가** → env 주입.
2. `vercel env pull`로 로컬 동기화.
3. `predictions` 테이블 SQL 실행.
이후 코드 구현 + 검증.
