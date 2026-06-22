import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '../globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale, locales } from '@/i18n/config'

const META: Record<string, Metadata> = {
  ko: {
    title: '2026 월드컵 시뮬레이터',
    description:
      'FIFA 월드컵 2026 조별리그 · 토너먼트 시뮬레이터. 점수를 조정하고 진출·우승 시나리오를 직접 그려보세요.',
  },
  en: {
    title: '2026 World Cup Simulator',
    description:
      'FIFA World Cup 2026 group stage and knockout simulator. Adjust scores and map out your own qualification and championship scenarios.',
  },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return META[isLocale(locale) ? locale : 'ko']
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
        <ThemeProvider>
          <I18nProvider locale={locale} dict={dict}>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
