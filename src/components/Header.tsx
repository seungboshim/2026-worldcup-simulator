'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import { locales, type Locale } from '@/i18n/config'

function LanguageSwitcher() {
  const { locale } = useT()
  const pathname = usePathname()
  const router = useRouter()

  const switchTo = (next: Locale) => {
    if (next === locale) return
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }

  return (
    <div className="flex items-center overflow-hidden rounded-md border text-xs font-semibold">
      {locales.map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={`px-2 py-1 uppercase transition-colors ${i > 0 ? 'border-l' : ''} ${
            l === locale ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function Header() {
  const { t, locale } = useT()
  const pathname = usePathname()
  const resetToDefault = useSimulator((s) => s.resetToDefault)
  const clearAll = useSimulator((s) => s.clearAll)
  const isSim = pathname === `/${locale}`
  const linkCls = (active: boolean) =>
    `text-sm font-semibold transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-mona text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-primary">2026</span> {t('appTitle')}
        </h1>
        <nav className="mt-1.5 flex items-center gap-3">
          <Link href={`/${locale}`} className={linkCls(isSim)}>{t('navSim')}</Link>
          <span className="text-border">·</span>
          <Link href={`/${locale}?tab=scenario`} className={linkCls(false)}>{t('navScenario')}</Link>
          <span className="text-border">·</span>
          <Link href={`/${locale}/stats`} className={linkCls(pathname.endsWith('/stats'))}>{t('navStats')}</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {isSim && (
          <>
            <Button variant="outline" size="sm" onClick={() => resetToDefault()}>↺ {t('resetToReal')}</Button>
            <Button variant="ghost" size="sm" onClick={() => clearAll()}>{t('clearAll')}</Button>
          </>
        )}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
