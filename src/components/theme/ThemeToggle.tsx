'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'

export function ThemeToggle() {
  const { t } = useT()
  const [isDark, setIsDark] = useState<boolean | null>(null)

  // 마운트 시 현재(스크립트가 적용한) 테마를 읽어 아이콘을 맞춘다. SSR 불일치 방지용.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  if (isDark === null) return <Button variant="ghost" size="icon" aria-label={t('themeLabel')} />

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
    setIsDark(next)
  }

  return (
    <Button variant="ghost" size="icon" aria-label={t('themeToggle')} onClick={toggle}>
      {isDark ? '🌙' : '☀️'}
    </Button>
  )
}
