import { adsTxtContent } from '@/lib/adsense'

export const dynamic = 'force-static'

export function GET() {
  return new Response(adsTxtContent(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
