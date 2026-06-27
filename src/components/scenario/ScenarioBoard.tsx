'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Score, ScoreMap } from '@/types'
import { matchday3Matches, analyzeScenario, projectKorRank } from '@/lib/king'
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
  scores,
  onScore,
  complete,
  onNext,
  filled,
  total,
}: {
  scores: ScoreMap
  onScore: (matchId: string, score: Score) => void
  complete: boolean
  onNext: () => void
  filled: number
  total: number
}) {
  const { locale } = useT()
  const md3 = useMemo(() => matchday3Matches(), [])
  const analysis = useMemo(() => analyzeScenario(scores), [scores])
  const listRef = useRef<HTMLDivElement>(null)

  // 점수 변경으로 KOR 순위가 바뀌면 그 경기를 잠깐 강조(상승=초록/하락=빨강).
  const [flash, setFlash] = useState<{ matchId: string; dir: 'up' | 'down' } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleScore = useCallback(
    (matchId: string, score: Score) => {
      const before = projectKorRank(scores)?.overall
      const after = projectKorRank({ ...scores, [matchId]: score })?.overall
      onScore(matchId, score)
      if (before != null && after != null && after !== before) {
        setFlash({ matchId, dir: after < before ? 'up' : 'down' }) // overall↓ = 순위 상승
        clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlash(null), 1000)
      }
    },
    [scores, onScore],
  )
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  // 진입 시 첫 미예측 경기로 부드럽게 중앙 스크롤.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector('[data-unfilled]') as HTMLElement | null
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const flashDir = flash?.dir ?? null
  // 30·31·32등 = 진출 막차권 → 패널/네비바 노랑 깜빡 경고
  const bubble = !!analysis.kor && analysis.kor.overall >= 30 && analysis.kor.overall <= 32
  let lastDay = ''
  return (
    <>
      {/* morphbar는 flex 밖(모바일에서 gap-5가 우측 빈칸 만드는 것 방지) */}
      <div className="flex gap-5 pb-28 lg:pb-5">
        <div ref={listRef} className="min-w-0 flex-1 space-y-2.5">
          {md3.map((m) => {
            const day = dateHeader(m.utcDate, locale)
            const showHeader = !!day && day !== lastDay
            lastDay = day
            return (
              <div key={m.id}>
                {showHeader && <h3 className="mt-5 mb-2 text-base font-bold text-muted-foreground first:mt-0">{day}</h3>}
                {m.utcDate && <div className="mb-1 font-mona text-xs tabular-nums text-muted-foreground">{timeLabel(m.utcDate, locale)}</div>}
                <ScenarioMatchRow
                  match={m}
                  score={scores[m.id]}
                  onScore={handleScore}
                  flash={flash && flash.matchId === m.id ? flash.dir : null}
                />
              </div>
            )
          })}
        </div>
        <ThirdPlaceAside korFocus scores={scores} flash={flashDir} bubble={bubble} />
      </div>
      <QualMorphBar korFocus scores={scores} complete={complete} filled={filled} total={total} onNext={onNext} flash={flashDir} bubble={bubble} />
    </>
  )
}
