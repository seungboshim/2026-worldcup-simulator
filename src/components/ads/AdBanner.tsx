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
