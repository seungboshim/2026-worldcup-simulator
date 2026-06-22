import { ImageResponse } from 'next/og'

export const alt = '2026 World Cup Simulator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return [{ locale: 'ko' }, { locale: 'en' }]
}

// Latin/숫자만 사용 → 기본 폰트로 렌더(외부 폰트·이모지 fetch 불필요).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 90px',
          background: 'linear-gradient(135deg,#0B5D2E 0%,#06351c 100%)',
          color: '#EAF3EC',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 32, letterSpacing: 6, opacity: 0.85 }}>FIFA WORLD CUP</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <span style={{ fontSize: 210, fontWeight: 800, lineHeight: 0.9 }}>2026</span>
          <span style={{ fontSize: 76, fontWeight: 700 }}>Simulator</span>
        </div>
        <div style={{ fontSize: 30, opacity: 0.8, marginTop: 28 }}>
          Group stage → Knockout · fill in the bracket yourself
        </div>
      </div>
    ),
    { ...size },
  )
}
