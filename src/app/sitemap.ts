import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const locales = ['ko', 'en'] as const
  const paths = ['', '/sim', '/stats'] as const
  const entries: MetadataRoute.Sitemap = []
  for (const path of paths) {
    const languages = Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`]))
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified,
        changeFrequency: path === '/sim' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : path === '/sim' ? 0.9 : 0.7,
        alternates: { languages },
      })
    }
  }
  return entries
}
