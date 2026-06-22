import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '../globals.css'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { I18nProvider } from '@/i18n/I18nProvider'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale, locales } from '@/i18n/config'
import { siteUrl } from '@/lib/site'

const META = {
  ko: {
    title: '2026 월드컵 시뮬레이터',
    description:
      'FIFA 월드컵 2026 조별리그·토너먼트 시뮬레이터. 점수를 조정해 32강 진출과 우승 시나리오를 직접 그려보세요.',
    keywords: ['2026 월드컵', '월드컵 시뮬레이터', 'FIFA 월드컵', '조별리그', '토너먼트 대진표', '북중미 월드컵', '32강 진출'],
    ogLocale: 'ko_KR',
    altLocale: 'en_US',
  },
  en: {
    title: '2026 World Cup Simulator',
    description:
      'FIFA World Cup 2026 group stage & knockout simulator. Adjust scores and map out your own Round of 32 and championship scenarios.',
    keywords: ['2026 World Cup', 'World Cup simulator', 'FIFA World Cup 2026', 'group stage', 'knockout bracket', 'bracket predictor'],
    ogLocale: 'en_US',
    altLocale: 'ko_KR',
  },
} as const

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const key = isLocale(locale) ? locale : 'ko'
  const m = META[key]
  const path = `/${key}`
  return {
    metadataBase: new URL(siteUrl),
    title: m.title,
    description: m.description,
    keywords: [...m.keywords],
    applicationName: m.title,
    alternates: {
      canonical: path,
      languages: { ko: '/ko', en: '/en', 'x-default': '/ko' },
    },
    openGraph: {
      type: 'website',
      siteName: m.title,
      title: m.title,
      description: m.description,
      url: path,
      locale: m.ogLocale,
      alternateLocale: m.altLocale,
    },
    twitter: { card: 'summary_large_image', title: m.title, description: m.description },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
