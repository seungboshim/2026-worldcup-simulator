import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const languages = { ko: `${siteUrl}/ko`, en: `${siteUrl}/en` }
  return (['ko', 'en'] as const).map((locale) => ({
    url: `${siteUrl}/${locale}`,
    lastModified,
    changeFrequency: 'daily',
    priority: locale === 'ko' ? 1 : 0.9,
    alternates: { languages },
  }))
}
