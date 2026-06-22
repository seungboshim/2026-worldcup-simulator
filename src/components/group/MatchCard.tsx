'use client'
import type { GroupMatch } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function MatchCard({ match }: { match: GroupMatch }) {
  const { t, locale } = useT()
  const score = useSimulator((s) => s.scores[match.id])
  const setScore = useSimulator((s) => s.setScore)
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) =>
    setScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })
  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm transition-opacity ${filled ? '' : 'opacity-45'}`}
    >
      <span className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="truncate">{teamName(match.homeId, locale)}</span>
        <span className="text-base leading-none">{teamFlag(match.homeId)}</span>
      </span>
      <span className="flex items-center gap-1">
        <Stepper onUp={() => update(h + 1, a)} onDown={() => update(h - 1, a)} upLabel={t('scoreUp')} downLabel={t('scoreDown')} />
        <span className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          {h}
          <span className="opacity-50"> : </span>
          {a}
        </span>
        <Stepper onUp={() => update(h, a + 1)} onDown={() => update(h, a - 1)} upLabel={t('scoreUp')} downLabel={t('scoreDown')} />
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-base leading-none">{teamFlag(match.awayId)}</span>
        <span className="truncate">{teamName(match.awayId, locale)}</span>
      </span>
    </div>
  )
}

function Stepper({
  onUp,
  onDown,
  upLabel,
  downLabel,
}: {
  onUp: () => void
  onDown: () => void
  upLabel: string
  downLabel: string
}) {
  const cls =
    'flex h-3.5 items-center justify-center px-0.5 text-[9px] leading-none text-muted-foreground transition-colors hover:text-primary'
  return (
    <span className="flex flex-col">
      <button type="button" onClick={onUp} aria-label={upLabel} className={cls}>
        ▲
      </button>
      <button type="button" onClick={onDown} aria-label={downLabel} className={cls}>
        ▼
      </button>
    </span>
  )
}
