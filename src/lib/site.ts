// 사이트 기본 URL. 커스텀 도메인 연결 시 NEXT_PUBLIC_SITE_URL로 덮어쓰면 됨.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://worldcup-simulator-nine.vercel.app')
