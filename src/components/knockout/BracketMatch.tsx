'use client'
import type { ResolvedMatch } from '@/lib/knockout'
import { useSimulator } from '@/store/useSimulator'
import { teamFlag, teamName } from '@/lib/teams'

export function BracketMatch({ match }: { match: ResolvedMatch }) {
  const winner = useSimulator((s) => s.winners[match.id])
  const setWinner = useSimulator((s) => s.setWinner)
  const Slot = ({ teamId }: { teamId: string | null }) => {
    if (!teamId) return <div className="px-2.5 py-2 text-sm italic text-muted-foreground">승자 대기</div>
    const isWinner = winner === teamId
    return (
      <button
        type="button"
        onClick={() => setWinner(match.id, teamId)}
        className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors ${isWinner ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent'}`}
      >
        <span>{teamFlag(teamId)}</span>
        <span className="truncate">{teamName(teamId)}</span>
      </button>
    )
  }
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border">
      <Slot teamId={match.homeTeamId} />
      <Slot teamId={match.awayTeamId} />
    </div>
  )
}
