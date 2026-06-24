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
