# Phase 4 — 일일 결과 자동갱신 설계 문서

- **작성일**: 2026-06-24
- **상태**: 설계 승인됨
- **전제**: Phase 1~3 배포 완료. 토너먼트 진행 중(조별 1·2차전 종료, API 기준 46/104 FINISHED). 이 문서는 Phase 4만 대상.

---

## 0. 목표 & 원칙

매일 1회 실제 경기 결과를 받아 `data/worldcup-2026.json`의 **조별경기 기본값**(`played`·`defaultHome`·`defaultAway`)을 갱신하고 커밋한다. 사용자는 항상 "현재까지의 실제 결과"를 기본값으로 보고, 거기서 직접 분기한다.

- 현재 "기본값 = 정적 JSON" 모델을 유지(런타임 DB 도입 안 함). 갱신 = JSON 커밋 → Vercel 자동 재배포.
- 순수 병합 로직과 부수효과(fetch/commit)를 분리. 병합 로직만 유닛테스트.
- **범위: 조별 점수만.** 녹아웃 실제 결과는 데이터 모델 확장이 필요 → 별도 단계.

---

## 1. 데이터 출처 — football-data.org (검증됨)

- API: `https://api.football-data.org/v4/competitions/WC/matches`, 헤더 `X-Auth-Token: <FOOTBALL_DATA_TOKEN>`
- 무료 **TIER_ONE**에 FIFA World Cup(`WC`) 포함 확인. 호출은 1일 1회(무료 한도 10req/min 여유).
- 매치 구조(검증):
  - `stage`: `GROUP_STAGE` | `LAST_32` | `LAST_16` | `QUARTER_FINALS` | `SEMI_FINALS` | `THIRD_PLACE` | `FINAL`
  - `status`: `FINISHED` | `LIVE` | `TIMED`
  - `homeTeam.tla` / `awayTeam.tla` = 3글자 약어(MEX, RSA …) = **우리 팀 `id`와 동일**
  - `group`: `"GROUP_A"` …
  - `score.fullTime`: `{ home: number|null, away: number|null }`
- **매핑 키 = `tla`** (이름 매칭보다 견고). 알 수 없는 tla는 스킵 + 경고 로그.

---

## 2. 순수 병합 로직 (유닛테스트 대상)

`applyGroupResults(data, apiMatches): { data, changed }`

- 입력: 현재 `WorldCupData`, API 매치 배열.
- API 매치 중 `stage === 'GROUP_STAGE'` && `status === 'FINISHED'` && `score.fullTime.home/away != null`만 사용.
- 각 API 매치를 `tla` 쌍으로 우리 `groupMatch`에 매칭(순서 무관). 우리 `homeId/awayId` 기준으로 점수 정렬(API home이 우리 away면 스왑).
- 매칭된 경기에 `played = true`, `defaultHome/defaultAway = 정렬된 점수` 설정.
- 값이 실제로 바뀐 경기만 `changed[]`에 기록(matchId, before, after). 변경 없으면 빈 배열.
- 입력 불변(새 객체 반환). 알 수 없는 tla / 미매칭 경기는 무시(로그용으로 별도 반환 가능).

> 테스트 케이스: 신규 결과 반영 / API home·away 스왑 보정 / 이미 동일값(무변경) / 녹아웃·미종료 무시 / 알 수 없는 tla 무시.

---

## 3. 갱신 스크립트 (부수효과 셸)

`scripts/update-results.mjs` (`node --env-file=.env.local scripts/update-results.mjs`로 로컬 실행 가능)

1. `FOOTBALL_DATA_TOKEN` 없으면 즉시 에러 종료.
2. WC matches fetch. 비정상 응답(`message` 또는 non-200)이면 에러 종료(커밋 안 함).
3. `data/worldcup-2026.json` 읽어 `applyGroupResults` 적용.
4. `changed.length === 0`이면 "no change" 출력 후 정상 종료(커밋 없음).
5. 변경분 있으면 JSON 저장(기존 들여쓰기/포맷 유지) + 변경 요약 출력.

---

## 4. GitHub Actions 워크플로우

`.github/workflows/update-results.yml`

- 트리거: `schedule`(매일 1회 cron) + `workflow_dispatch`(수동 실행).
  - cron 기본값: `0 12 * * *`(UTC 12시 ≈ KST 21시) — 전날~당일 경기 대부분 종료 후. 조정 가능.
- 잡:
  1. `actions/checkout`
  2. `actions/setup-node`
  3. `node scripts/update-results.mjs` (env: `FOOTBALL_DATA_TOKEN: ${{ secrets.FOOTBALL_DATA_TOKEN }}`)
  4. 변경 감지: `git diff --quiet data/worldcup-2026.json || (commit & push)`
     - 커밋 메시지 예: `chore: 조별 결과 자동 갱신 (YYYY-MM-DD)`
     - push 대상 `main` → Vercel git 연동 자동 재배포.
- 권한: `permissions: contents: write` (GITHUB_TOKEN으로 push).
- 무변경이면 커밋/푸시 스킵(빈 커밋·불필요 재배포 방지).

---

## 5. 시크릿 관리

- `FOOTBALL_DATA_TOKEN`: GitHub repo Settings → Secrets → Actions에 등록(자동화용). 로컬은 `.env.local`(gitignore).
- **키를 코드/리포에 절대 하드코딩하지 않음.**

---

## 6. 트레이드오프 / 범위 밖

- 정적 JSON 커밋 방식 → 갱신 시 **매일 재배포** 발생(현 모델과 일치, 단순). 런타임 DB 전환은 범위 밖.
- 봇 커밋이 `main` 히스토리에 쌓임(허용).
- **녹아웃 실제 결과**(승자 기본값) 미포함 — 데이터 모델·스토어 확장 필요, 별도 단계.
- 선수 명단(Phase 3)·third-place 배정표는 이 갱신과 무관(건드리지 않음).

---

## 7. 아키텍처/파일

| 파일 | 역할 |
|------|------|
| `src/lib/results-merge.ts` | `applyGroupResults`(순수, 테스트) + tla 매핑 |
| `src/lib/results-merge.test.ts` | 유닛테스트 |
| `scripts/update-results.mjs` | fetch → 병합 → 변경 시 JSON 저장(셸) |
| `.github/workflows/update-results.yml` | cron + 수동 트리거, 변경 시 commit·push |
| `data/worldcup-2026.json` (갱신 대상) | groupMatches played/default 갱신 |

---

## 8. 선행 작업

- GitHub Actions secret `FOOTBALL_DATA_TOKEN` 등록(사용자).
- 로컬 `.env.local`에 키 추가(완료).
