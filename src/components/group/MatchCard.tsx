'use client'
import type { GroupMatch } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamCode } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function MatchCard({ match, guide = false }: { match: GroupMatch; guide?: boolean }) {
  const { t } = useT()
  const score = useSimulator((s) => s.scores[match.id])
  const setScore = useSimulator((s) => s.setScore)
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) =>
    setScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  // 가이드(A조 첫 경기)에서만 탭 영역을 점선으로 표시(outline은 레이아웃에 영향 없음).
  const ring = guide ? ' outline-dotted outline-2 outline-offset-2 outline-primary/60' : ''

  return (
    <div className="flex flex-col">
      {guide && (
        <div
          aria-hidden
          className="mb-1 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-[11px] font-semibold leading-tight text-primary"
        >
          <span className="flex items-center justify-end gap-0.5">
            {t('guideScore')}
            <span className="text-sm leading-none">↓</span>
          </span>
          <span className="flex flex-col items-center">
            {t('guideReset')}
            <span className="text-sm leading-none">↓</span>
          </span>
          <span />
        </div>
      )}
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm transition-opacity ${filled ? '' : 'opacity-45'}`}>
        <button
          type="button"
          onClick={() => update(h + 1, a)}
          aria-label={`${teamCode(match.homeId)} ${t('guideScore')}`}
          className={`flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary${ring}`}
        >
          <span className="truncate">{teamCode(match.homeId)}</span>
          <span className="text-base leading-none">{teamFlag(match.homeId)}</span>
        </button>
        <span className="flex items-center gap-1">
          <Stepper onUp={() => update(h + 1, a)} onDown={() => update(h - 1, a)} upLabel={t('scoreUp')} downLabel={t('scoreDown')} />
          <button
            type="button"
            onClick={() => update(0, 0)}
            aria-label={t('guideReset')}
            className={`font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105${ring}`}
          >
            {h}
            <span className="opacity-50"> : </span>
            {a}
          </button>
          <Stepper onUp={() => update(h, a + 1)} onDown={() => update(h, a - 1)} upLabel={t('scoreUp')} downLabel={t('scoreDown')} />
        </span>
        <button
          type="button"
          onClick={() => update(h, a + 1)}
          aria-label={`${teamCode(match.awayId)} ${t('guideScore')}`}
          className={`flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary${ring}`}
        >
          <span className="text-base leading-none">{teamFlag(match.awayId)}</span>
          <span className="truncate">{teamCode(match.awayId)}</span>
        </button>
      </div>
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
