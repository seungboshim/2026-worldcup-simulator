import Script from 'next/script'
import { ADSENSE_CLIENT } from '@/lib/adsense'

// adsbygoogle 로더. client가 있으면 항상 로드(심사용). 슬롯 없이도 광고는 안 뜸.
export function AdScript() {
  if (!ADSENSE_CLIENT) return null
  return (
    <Script
      id="adsbygoogle-loader"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  )
}
