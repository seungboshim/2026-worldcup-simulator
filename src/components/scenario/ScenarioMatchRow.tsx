'use client'
import type { GroupMatch } from '@/types'
import type { MatchAnalysis } from '@/lib/king'
import { formatFavorable } from '@/lib/king'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function ScenarioMatchRow({ match, analysis }: { match: GroupMatch; analysis: MatchAnalysis }) {
  const { t, locale } = useT()
  const score = useSimulator((s) => s.scores[match.id])
  const setScore = useSimulator((s) => s.setScore)
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) => setScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  const pivotal = analysis.condition != null
  const conditionText = analysis.condition ? formatFavorable(analysis.condition, match.homeId, match.awayId, locale) : null

  return (
    <div
      data-unfilled={!filled || undefined}
      className={`rounded-xl border p-3 transition-colors ${pivotal ? 'border-primary/40' : ''} ${filled ? '' : 'opacity-60'}`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => update(h + 1, a)}
          aria-label={`${teamName(match.homeId, locale)} +1`}
          className="flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="truncate">{teamName(match.homeId, locale)}</span>
          <span className="text-base leading-none">{teamFlag(match.homeId)}</span>
        </button>
        <span className="flex items-center gap-1">
          <Step onUp={() => update(h + 1, a)} onDown={() => update(h - 1, a)} up={t('scoreUp')} down={t('scoreDown')} />
          <button
            type="button"
            onClick={() => update(0, 0)}
            aria-label={t('guideReset')}
            className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105"
          >
            {h}
            <span className="opacity-50"> : </span>
            {a}
          </button>
          <Step onUp={() => update(h, a + 1)} onDown={() => update(h, a - 1)} up={t('scoreUp')} down={t('scoreDown')} />
        </span>
        <button
          type="button"
          onClick={() => update(h, a + 1)}
          aria-label={`${teamName(match.awayId, locale)} +1`}
          className="flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="text-base leading-none">{teamFlag(match.awayId)}</span>
          <span className="truncate">{teamName(match.awayId, locale)}</span>
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {pivotal ? (
          <>
            <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${analysis.favorableNow ? 'bg-primary text-primary-foreground' : 'border border-primary/40 text-primary'}`}>
              {analysis.favorableNow ? '✓' : '🇰🇷'} {t('favorableNeeds')}
            </span>
            <span className="min-w-0 truncate text-muted-foreground">{conditionText}</span>
          </>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">{t('notPivotal')}</span>
        )}
      </div>
    </div>
  )
}

function Step({ onUp, onDown, up, down }: { onUp: () => void; onDown: () => void; up: string; down: string }) {
  const cls = 'flex h-3.5 items-center justify-center px-0.5 text-[9px] leading-none text-muted-foreground transition-colors hover:text-primary'
  return (
    <span className="flex flex-col">
      <button type="button" onClick={onUp} aria-label={up} className={cls}>▲</button>
      <button type="button" onClick={onDown} aria-label={down} className={cls}>▼</button>
    </span>
  )
}
