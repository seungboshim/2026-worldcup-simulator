'use client'
import type { GroupMatch, Score } from '@/types'
import type { MatchAnalysis } from '@/lib/king'
import { formatFavorable } from '@/lib/king'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function ScenarioMatchRow({
  match,
  analysis,
  score,
  onScore,
}: {
  match: GroupMatch
  analysis: MatchAnalysis
  score: Score | null | undefined
  onScore: (matchId: string, score: Score) => void
}) {
  const { t, locale } = useT()
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) => onScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  const pivotal = analysis.condition != null
  const conditionText = analysis.condition ? formatFavorable(analysis.condition, match.homeId, match.awayId, locale) : null

  return (
    <div
      data-unfilled={!filled || undefined}
      className={`rounded-xl p-3 transition-colors ${
        pivotal ? 'border-2 border-primary bg-primary/[0.06]' : 'border'
      } ${filled ? '' : 'opacity-70'}`}
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

      {pivotal ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-bold ${
              analysis.favorableNow ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
            }`}
          >
            {analysis.favorableNow ? '✓ ' : '🇰🇷 '}
            {t('decisiveTag')}
          </span>
          <span className="min-w-0 truncate text-muted-foreground">{conditionText}</span>
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] text-muted-foreground/60">{t('notPivotal')}</div>
      )}
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
