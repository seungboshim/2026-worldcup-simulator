'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // Client-mount guard: setState in effect is intentional to avoid an SSR
  // hydration mismatch (resolvedTheme is unknown until the client mounts).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return <Button variant="ghost" size="icon" aria-label="테마" />

  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="테마 전환"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? '🌙' : '☀️'}
    </Button>
  )
}
