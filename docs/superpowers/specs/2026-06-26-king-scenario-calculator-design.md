# 킹우의수 계산기 (32강 시나리오 탭) 설계 문서

- **작성일**: 2026-06-26
- **상태**: 설계 승인됨
- **전제**: Phase 1~5 배포. 일일갱신(Phase 4) 작동 중 — MD3 약 절반이 실제 결과로 채워짐. 토너먼트가 곧 시작.

---

## 0. 목표 & 원칙

대한민국의 32강(조 통과) 진출이 위태로운 상황을 **익사이팅하게** 보여주는 시나리오 계산기. 조별 3차전(MD3) 결과를 예측하면 **대한민국이 몇 등인지·진출인지**를 실시간으로 보여주고, 32강에 관여하는 경기를 강조한다. 공유 가능한 탭.

- 대상 팀 = **대한민국 고정**(`SCENARIO_TEAM = 'KOR'`, 추후 확장 용이).
- 메인 시뮬레이터와 **같은 점수 store(localStorage) 공유** → 여기 예측이 토너먼트·통계로 흐름.
- 기존 진출현황 UI 구조(floating bar / side panel)를 재사용하되 **대한민국 N등을 하이라이트**.

---

## 1. 라우트 — 탭 + 쿼리파람

- 별도 페이지 없음. `Simulator`에 **3번째 탭** 추가: 조별리그 → **킹우의수** → 토너먼트.
- 탭 상태를 **`?tab=` 쿼리파람과 동기화**: `group` | `scenario` | `knockout`. 공유 URL = `/ko?tab=scenario`.
  - 마운트 시 `?tab` 읽어 초기 탭 결정. `scenario`는 항상 허용. `knockout`은 조별 완료 시에만(아니면 `group`로 폴백).
  - 탭 변경 시 `router.replace(\`${pathname}?tab=${v}\`, { scroll: false })` + 스크롤 최상단.
- nav 라벨: ko "킹우의수", en "Road to R32".

---

## 2. 경기 리스트 — MD3 24경기 (네이버식 레이아웃)

- **MD3 = 각 조의 마지막 2경기**(조별 6경기 중 5·6번). 12조 × 2 = 24경기. 헬퍼 `matchday3Matches()` = 조별 마지막 2개.
- **킥오프 시각**: `GroupMatch`에 `utcDate?: string` 추가. football-data API(`utcDate`)에서 1회 받아 데이터에 심음(`scripts/enrich-kickoffs.ts`). 일일갱신은 기존 필드를 보존(spread)하므로 안전.
- **정렬·그룹핑**: `utcDate` 오름차순(시간순). 날짜별 헤더("6.27 토" — ko는 KST, en은 로컬). 네이버 레이아웃 참고, **디자인·타이포는 현재 것**.
- 이미 끝난 경기는 채워져 풀 불투명, 미입력은 흐림. **마운트 시 첫 미입력 경기로 자동 스크롤**.
- 행 = **한 경기 한 줄**: [홈 국기·이름·점수] [전광판] [원정 점수·이름·국기].
  - 인터랙션은 **기존 조별(`MatchCard`)과 동일**: 국가 탭 → 해당 팀 +1, 전광판 탭 → 0:0 초기화, ▲▼ 세부 핸들. (승무패 토글 아님.)
- **한국 경우의 수 주석**(이미지 참고): 각 행에 그 경기의 **한국에 유리한 결과**를 실시간 표시 — 승/무/패 + 골차 마진까지(예 "알제리 2점차 이상 승리", "이라크 4점차 이하로만 승리", "이집트 승리(무승부 안됨)"). 한국 진출에 영향 없는 경기는 **꽝**. 현재 입력 결과가 유리 조건을 충족하면 ✓ 강조, 불충족이면 흐리게. 디자인은 우리 톤(골드/스탬프 키치 X).

---

## 3. 정밀 민감도 (대한민국 32강) — 순수 로직

`src/lib/king.ts` (유닛테스트 대상):

- `projectKorRank(scores): { overall: number; qualified: boolean; entry: QualEntry } | null` — 현재 예측 기준 KOR 종합 순위·진출여부(`computeQualificationRanking` 재사용). 부분입력도 처리(미입력 경기는 미반영).
- `korFavorableCondition(scores, matchId): FavorableCondition | null` — 해당 경기의 **스코어라인 완전탐색**(홈/원정 0..6, 다른 경기는 현재값 고정)으로 KOR `qualified`가 참이 되는 결과 집합을 구해 사람이 읽는 조건으로 요약. 결과별(홈승/무/원정승) + 마진 임계(예 "2점차 이상", "N점차 이하로만"). 진출이 이 경기와 무관(항상 진출 or 절대 불가)하면 `null`(=꽝).
  - 타입: `FavorableCondition = { clauses: Array<{ side: 'home' | 'away' | 'draw'; minMargin?: number; maxMargin?: number }> }`. UI는 `formatFavorable(cond, homeId, awayId, locale)`로 텍스트화.
  - KOR 조 경기 + KOR이 3위 버블이면 타조 3위경쟁 경기까지 자동 포착.
- `isPivotalForKor(scores, matchId): boolean` = `korFavorableCondition(...) !== null`.
- `isFavorableNow(scores, matchId): boolean` — 현재 입력된 스코어가 유리 조건을 충족하는지(행 ✓/흐림 + 헤드라인 카운트용).
- `korMetCount(scores): { met: number; pivotal: number }` — 충족한 중요경기 수 / 전체 중요경기 수.
- 비용: 경기당 ~49회 랭킹 계산(랭킹은 μs급). 점수 변경 시 `useMemo`로 1회 계산, 중요경기만 조건 산출.

---

## 4. 대한민국 N등 패널 — 기존 구조 재사용 + 하이라이트

- 기존 `QualPanelBody`/`ThirdPlaceAside`/`QualMorphBar`에 **`korFocus` 프로프** 추가:
  - 패널 내 **KOR 행 하이라이트**(bg-primary/10, 볼드, 🇰🇷).
  - 모바일 하단 fixed 알약·헤더가 **"🇰🇷 대한민국 현재 N등 · 32강 진출!/탈락권"** 을 크게 표시(진출=초록, 탈락권=빨강) + **"유리한 결과 K/M개 충족"**(라이브).
  - PC는 우측 sticky 패널 동일 하이라이트.
- 스코어 변경 시 **실시간 갱신** — 순위 숫자에 모션(예: 변할 때 살짝 펄스)으로 익사이팅하게.
- 시나리오 탭에서는 이 패널이 **MD3 리스트 옆(PC)/아래 fixed(모바일)** 로 동작(조별 탭과 동일 레이아웃 패턴).

---

## 5. 완료 → 토너먼트 이동

- MD3 24경기(=조별 전부) 채워지면 CTA "토너먼트로" → `?tab=knockout`(Simulator가 같은 메커니즘으로 녹아웃 탭 활성).

---

## 6. 아키텍처 / 파일

| 파일 | 역할 |
|------|------|
| `src/lib/king.ts` | `SCENARIO_TEAM`, `matchday3Matches`, `projectKorRank`, `korFavorableCondition`, `formatFavorable`, `isPivotalForKor`, `isFavorableNow`, `korMetCount`(순수, 테스트) |
| `src/lib/king.test.ts` | 민감도·유리조건(마진)·MD3·투영 테스트 |
| `scripts/enrich-kickoffs.ts` | API `utcDate`를 데이터에 1회 주입 |
| `src/types.ts` (수정) | `GroupMatch.utcDate?: string` |
| `src/components/scenario/ScenarioBoard.tsx` | 탭 본문(MD3 리스트 + 자동스크롤 + 날짜헤더) |
| `src/components/scenario/ScenarioMatchRow.tsx` | 한 줄 경기 행(조별식 인터랙션 + 유리조건/꽝 주석 + ✓ + 시각) |
| `src/components/ThirdPlacePanel.tsx` (수정) | `korFocus` 프로프(하이라이트 + KOR N등 헤더) |
| `src/components/Simulator.tsx` (수정) | scenario 탭 추가 + `?tab` 동기화 + 토너먼트 핸드오프 |
| `src/components/Header.tsx` (수정) | "킹우의수" nav(`?tab=scenario`) |
| i18n ko/en | 신규 키 |

---

## 7. 범위 밖

- 시나리오 점수의 URL 인코딩(받는 사람이 동일 점수). 공유는 **탭 URL 링크**만(점수는 각자 localStorage).
- 대상 팀 변경(?team=) — KOR 고정.
- **정적 "N개 맞으면 무조건 진출" 보장 계산**(조합 보장 문제) — 라이브 "현재 N등 + 유리결과 K/M개 충족"으로 대체.
- **조별 카드 그리드 레이아웃**(이미지) — 시간순 한 줄 리스트 채택(이미지의 유리조건 콘텐츠만 행 주석으로 흡수).
- 킥오프 실시간 갱신(정적 1회 enrich로 충분).

---

## 8. 선행/데이터

- `scripts/enrich-kickoffs.ts` 1회 실행 → `data/worldcup-2026.json`에 `utcDate` 주입·커밋.
- football-data 키는 `.env.local`에 있음(완료).
