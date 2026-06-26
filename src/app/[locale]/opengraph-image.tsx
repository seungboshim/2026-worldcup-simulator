import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = '2026 World Cup Simulator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return [{ locale: 'ko' }, { locale: 'en' }]
}

// 검은 배경 + 타이틀 로고(landing-title.png)를 data URI로 임베드.
export default async function OgImage() {
  const logo = await readFile(join(process.cwd(), 'public/images/landing-title.png'))
  const src = `data:image/png;base64,${logo.toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={980} height={540} style={{ objectFit: 'contain' }} alt={alt} />
      </div>
    ),
    { ...size },
  )
}
