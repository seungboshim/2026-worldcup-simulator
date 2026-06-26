'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { matchday3Matches, analyzeScenario } from '@/lib/king'
import { ScenarioMatchRow } from './ScenarioMatchRow'
import { ThirdPlaceAside, QualMorphBar } from '@/components/ThirdPlacePanel'
import { useT } from '@/i18n/useT'
import type { Locale } from '@/i18n/config'

function dateHeader(iso: string | undefined, locale: Locale): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul',
  }).format(new Date(iso))
}
function timeLabel(iso: string | undefined, locale: Locale): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  }).format(new Date(iso))
}

export function ScenarioBoard({
  complete,
  onNext,
  filled,
  total,
}: {
  complete: boolean
  onNext: () => void
  filled: number
  total: number
}) {
  const { locale } = useT()
  const scores = useSimulator((s) => s.scores)
  const md3 = useMemo(() => matchday3Matches(), [])
  const analysis = useMemo(() => analyzeScenario(scores), [scores])
  const listRef = useRef<HTMLDivElement>(null)

  // 마운트 시 첫 미입력 경기로 스크롤.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-unfilled]') as HTMLElement | null
    el?.scrollIntoView({ block: 'center' })
  }, [])

  let lastDay = ''
  return (
    <div className="flex gap-5 pb-28 lg:pb-5">
      <div ref={listRef} className="min-w-0 flex-1 space-y-2">
        {md3.map((m) => {
          const day = dateHeader(m.utcDate, locale)
          const showHeader = !!day && day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showHeader && <h3 className="mt-4 mb-1.5 text-sm font-bold text-muted-foreground first:mt-0">{day}</h3>}
              {m.utcDate && <div className="mb-1 font-mona text-[11px] tabular-nums text-muted-foreground">{timeLabel(m.utcDate, locale)}</div>}
              <ScenarioMatchRow match={m} analysis={analysis.matches[m.id]} />
            </div>
          )
        })}
      </div>
      <ThirdPlaceAside korFocus />
      <QualMorphBar korFocus complete={complete} filled={filled} total={total} onNext={onNext} />
    </div>
  )
}
