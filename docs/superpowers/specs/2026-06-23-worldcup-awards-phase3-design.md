# Phase 3 — 골든볼/골든슈 투표 설계 문서

- **작성일**: 2026-06-23
- **상태**: 설계 승인됨
- **전제**: Phase 1(시뮬레이터)·Phase 2(예측 통계) 배포 완료. DB는 Neon(서버 전용 접근). 이 문서는 Phase 3만 대상.

---

## 0. 목표 & 원칙

토너먼트를 완성한 사용자가 **골든볼(최우수 선수)·골든슈(득점왕)** 를 익명 투표하고, 모두의 투표를 `/stats`에 픽률로 보여준다.

- Phase 2와 동일 패턴: **DB 접근은 서버에서만**(Server Action 투표, Server Component 통계), Neon은 순수 DB, 익명 브라우저 id.
- 후보 선수는 **사용자 브래킷의 4강 팀 기반**으로 동적 산정.

---

## 1. 선수 데이터 — `data/players-2026.json` (큐레이션)

- **소싱**: 풋볼 API가 아니라 **웹검색으로 직접 큐레이션**(2026.6 현재 정보 기준 → 컷오프 문제 회피, 정확).
- **가변 깊이**: 강팀(우승권) 4~5명, 중위권 2~3명, 약팀 1명. 총 **100명+**, 48팀 전부 ≥1명 커버.
- 레코드: `{ id, nameKo, nameEn, teamId, position? }`.
  - `id` 규칙: `{teamId}-{lastname-slug}` (예: `FRA-mbappe`). 고유.
  - `teamId`는 기존 팀(국기·팀명) 연결.
- 쉽게 수정 가능한 JSON — 부정확/스쿼드 변동분은 교체. (일일 결과 갱신과 무관한 별도 파일.)

---

## 2. 순수 로직 (유닛테스트 대상)

### 2.1 `candidatesForTeams(teamIds, players): Player[]`
주어진 팀 id 집합에 속한 선수만 반환(정렬: 팀 → 이름). 투표 후보 풀 산정에 사용.

### 2.2 `aggregateAwards(rows): AwardStats`
투표 행들을 받아 골든볼/골든슈 각각 playerId별 카운트·픽률 집계(내림차순). 총 투표 수 포함. (Phase 2 `aggregateStats`와 동일 패턴.)

---

## 3. 후보 산정 (브래킷 기반)

- **투표 가능 시점**: 브래킷 완성(우승 결정). 이때 사용자의 **4강 4팀**이 정해짐.
- 후보 풀 = 그 4강 팀들의 선수 = `candidatesForTeams(semifinalistTeamIds, players)`.
  - 4강 팀은 `extractPrediction`(Phase 2)의 `semifinalists`에서 팀 id 도출(선수→팀 매핑 역방향이 아니라, 4강 경기 참가 팀 id 직접).
  - 실제로는 4강 **경기 참가 팀**이 필요하므로, `selectResolvedBracket`의 SF 라운드 참가 팀 id를 사용(선수 데이터의 teamId와 매칭).
- 골든볼·골든슈 각각 이 풀에서 1명 선택.
- 풀이 적을 수 있음(약팀만 올린 경우) — 허용(본인 선택의 결과).

---

## 4. 투표 저장 — Neon `awards_votes`

```sql
create table if not exists awards_votes (
  id uuid primary key default gen_random_uuid(),
  browser_id text not null unique,
  golden_ball text not null,   -- playerId
  golden_boot text not null,   -- playerId
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
- **upsert(browser_id 기준)** — 브라우저당 1표, 재투표=덮어쓰기.
- Server Action `submitAwards(browserId, { goldenBall, goldenBoot })`.
- 익명 id `wc-bid` 재사용(Phase 2).
- 같은 Neon DB에 테이블 추가(create-table 스크립트로 생성, prod=dev 공유 DB).

---

## 5. 투표 UI

- 토너먼트 뷰의 기존 "다음 단계(골든볼·골든슈)" awards 카드를 **실제 투표 UI로 활성화**.
- 우승 미정: 안내 문구("토너먼트를 완성하면 투표할 수 있어요").
- 완성 후: 골든볼 후보 선택 + 골든슈 후보 선택(국기+이름) → 제출(Server Action) → 완료 표시/통계 이동.
- `src/components/AwardsVote.tsx`(클라). 후보는 `candidatesForTeams` + 현재 4강 팀.

---

## 6. 통계 (`/stats`에 섹션 추가)

- `aggregateAwards`로 골든볼 top / 골든슈 top(선수별 픽률) 집계.
- `/stats` 페이지에 **골든볼·골든슈 섹션** 추가 — 기존 `TierTable` 패턴 재사용하되 **선수(국기+이름)** 표시. (팀 대신 선수용 표시 헬퍼.)
- 총 투표 수 표시. 0건이면 빈 상태.

---

## 7. 아키텍처/파일 (Phase 2 패턴 그대로)

| 파일 | 역할 |
|------|------|
| `data/players-2026.json` | 큐레이션 선수 명단 |
| `src/lib/players.ts` | `getPlayer`, `playerName`, `candidatesForTeams` |
| `src/lib/awards.ts` | `aggregateAwards` (순수, 테스트) |
| `scripts/awards-votes.sql` + create-table | `awards_votes` DDL |
| `src/app/actions/submit-awards.ts` | Server Action |
| `src/components/AwardsVote.tsx` | 투표 UI(클라) |
| `src/app/[locale]/stats/page.tsx` (수정) | 골든볼·골든슈 섹션 추가 |
| `src/components/stats/*` | 선수 픽률 테이블(재사용/확장) |
| i18n ko/en | 신규 키 |

순수함수(`candidatesForTeams`·`aggregateAwards`) 유닛테스트. DB는 서버 경계 안.

---

## 8. 범위 밖
- 일일 결과 자동갱신(GitHub Actions) — Phase 3 후 별도.
- 영플레이어/골든글러브 등 추가 어워드.
- 선수 데이터 자동 fetch(지금은 웹검색 큐레이션).

---

## 9. 선행/데이터 작업
- `data/players-2026.json` 큐레이션은 **웹검색으로 수집**(구현 시 데이터 태스크). 48팀 ≥1명, 강팀 4~5명.
- `awards_votes` 테이블 생성(기존 Neon, create-table 스크립트).
