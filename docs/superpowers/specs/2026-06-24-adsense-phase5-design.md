# Phase 5 — 구글 애드센스 설계 문서

- **작성일**: 2026-06-24
- **상태**: 설계 승인됨
- **전제**: Phase 1~4. AdSense 계정 없음 → 가입·승인 선행 필요. 이 문서는 Phase 5만 대상.

---

## 0. 목표 & 원칙

감도를 해치지 않는 선에서 구글 애드센스를 붙인다. **하단 가로 배너 1개**만. 계정이 없으므로 **지금은 스캐폴딩**(env만 채우면 켜지는 구조)으로 만들고, 승인 후 Vercel에 env를 넣으면 라이브.

- env 미설정이면 광고 코드/스크립트 자체가 **렌더되지 않음**(개발·미승인 상태에서 빈 영역/오류 없음).
- 퍼블리셔 ID·슬롯 ID는 공개 가능한 값이라 `NEXT_PUBLIC_*`로 노출(시크릿 아님).

---

## 1. 설정값 (공개 ID — 하드코딩)

퍼블리셔/슬롯 ID는 시크릿이 아니라 사이트 고정 공개값이므로 `src/lib/adsense.ts`에 상수로 둔다(검색콘솔 토큰과 동일 방식, Vercel env 설정 불필요).

| 상수 | 값 | 용도 |
|------|----|----|
| `ADSENSE_CLIENT` | `ca-pub-3511914726275246` (확보됨) | 인증 메타태그·로더·ads.txt |
| `ADSENSE_SLOT_BANNER` | `''` (승인 후 광고단위 생성 시 확정) | 하단 배너 슬롯 ID |

- **사이트 인증**: `<meta name="google-adsense-account" content="ca-pub-3511914726275246">` 를 layout 메타데이터(`verification.other`)에 추가 — **2026-06-24 적용·배포 완료**(심사 시작용).
- 배너는 `ADSENSE_SLOT_BANNER`가 비어 있으면 렌더 안 함(승인 전엔 광고 없음, 안전). 승인 후 상수만 채우고 재배포하면 라이브.

---

## 2. 로더 스크립트

- `layout.tsx`에서 `next/script`로 AdSense 로더 주입:
  - `src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…"`
  - `strategy="afterInteractive"`, `async`, `crossOrigin="anonymous"`
- `NEXT_PUBLIC_ADSENSE_CLIENT` 없으면 `<Script>` 렌더 안 함.

---

## 3. 배너 컴포넌트

`src/components/ads/AdBanner.tsx` (클라이언트)

- env(client+slot) 없으면 `null` 반환.
- `<ins class="adsbygoogle" style="display:block" data-ad-client data-ad-slot data-ad-format="auto" data-full-width-responsive="true" />`
- `useEffect`에서 `(window.adsbygoogle = window.adsbygoogle || []).push({})` 1회.
- 레이아웃 시프트 완화: 컨테이너에 `min-height`와 상단 옅은 구분선(`border-t`) 정도. 라벨/장식 최소.
- 배치: `layout.tsx`의 `<main>` 안 `{children}` **하단 1개**(모든 페이지 공통, 콘텐츠 아래).

---

## 4. ads.txt

`src/app/ads.txt/route.ts` (라우트 핸들러, `GET`)

- `NEXT_PUBLIC_ADSENSE_CLIENT` 있으면 `google.com, pub-XXXX, DIRECT, f08c47fec0942fa0` 텍스트 반환(`pub-` 부분은 `ca-pub-`에서 추출).
- 없으면 빈 본문 반환. `Content-Type: text/plain`.

---

## 5. 승인 절차 (사용자 안내)

1. adsense.google.com 가입 → 사이트(`2026worldcup-simulator.vercel.app`) 추가.
2. AdSense가 주는 확인 스니펫(또는 ads.txt)으로 소유권 확인 — 우리 스캐폴딩이 처리.
3. 심사 통과 후 "광고 단위 → 디스플레이 광고(가로형)" 생성 → 슬롯 ID 확보.
4. Vercel에 `NEXT_PUBLIC_ADSENSE_CLIENT`·`NEXT_PUBLIC_ADSENSE_SLOT_BANNER` 등록 → 재배포 → 라이브.

---

## 6. 테스트 / 검증

- 유닛: env 없을 때 `AdBanner`가 `null`을 반환하는지(렌더 가드).
- 빌드 통과 + env 미설정 시 광고 마크업/스크립트 없음 확인(현재 상태).
- 실제 노출은 승인 후 env 주입 시 수동 확인.

---

## 7. 범위 밖

- EEA/UK 동의관리(CMP) — 추후 필요 시.
- Auto Ads, 추가 슬롯(인-콘텐츠 등) — 추후.
- 광고 차단/프리미엄 등 수익화 외 기능.

---

## 8. 아키텍처/파일

| 파일 | 역할 |
|------|------|
| `src/lib/adsense.ts` | env 읽기 헬퍼(`getAdsenseClient()`, `getBannerSlot()`) |
| `src/components/ads/AdBanner.tsx` | 배너(클라, env 가드) |
| `src/components/ads/AdScript.tsx` | 로더(`next/script`, env 가드) — layout에서 사용 |
| `src/app/ads.txt/route.ts` | ads.txt(env 기반) |
| `src/app/[locale]/layout.tsx` (수정) | AdScript + 하단 AdBanner 삽입 |
