'use client'
import type { ResolvedMatch } from '@/lib/knockout'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamAbbr } from '@/lib/teams'
import { useT } from '@/i18n/useT'
import type { Locale } from '@/i18n/config'

function Slot({
  matchId,
  teamId,
  winner,
  setWinner,
  locale,
  waitingLabel,
}: {
  matchId: string
  teamId: string | null
  winner: string | null | undefined
  setWinner: (matchId: string, teamId: string) => void
  locale: Locale
  waitingLabel: string
}) {
  if (!teamId) return <div className="px-2.5 py-2 text-sm italic text-muted-foreground">{waitingLabel}</div>
  const isWinner = winner === teamId
  return (
    <button
      type="button"
      onClick={() => setWinner(matchId, teamId)}
      className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors ${isWinner ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent'}`}
    >
      <span>{teamFlag(teamId)}</span>
      <span className="truncate">{teamAbbr(teamId, locale)}</span>
    </button>
  )
}

export function BracketMatch({ match }: { match: ResolvedMatch }) {
  const { t, locale } = useT()
  const winner = useSimulator((s) => s.winners[match.id])
  const setWinner = useSimulator((s) => s.setWinner)
  const waitingLabel = t('waitingWinner')
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border">
      <Slot matchId={match.id} teamId={match.homeTeamId} winner={winner} setWinner={setWinner} locale={locale} waitingLabel={waitingLabel} />
      <Slot matchId={match.id} teamId={match.awayTeamId} winner={winner} setWinner={setWinner} locale={locale} waitingLabel={waitingLabel} />
    </div>
  )
}
