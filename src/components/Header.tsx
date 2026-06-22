'use client'
import { useSimulator } from '@/store/useSimulator'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'

export function Header() {
  const resetToDefault = useSimulator((s) => s.resetToDefault)
  const clearAll = useSimulator((s) => s.clearAll)
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-mona text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-primary">2026</span> 월드컵 시뮬레이터
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">조별리그부터 결승까지, 직접 채우는 대진표</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => resetToDefault()}>↺ 실제 결과로 초기화</Button>
        <Button variant="ghost" size="sm" onClick={() => clearAll()}>전체 비우기</Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
