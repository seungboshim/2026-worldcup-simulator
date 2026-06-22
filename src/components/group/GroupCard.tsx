'use client'
import data from '../../../data/worldcup-2026.json'
import type { GroupId, WorldCupData } from '@/types'
import { useSimulator } from '@/store/useSimulator'
import { computeGroupStandings } from '@/lib/standings'
import { MatchCard } from './MatchCard'
import { StandingsTable } from './StandingsTable'
import { Card } from '@/components/ui/card'
import { useT } from '@/i18n/useT'

const wc = data as unknown as WorldCupData

export function GroupCard({ groupId }: { groupId: GroupId }) {
  const { t } = useT()
  const scores = useSimulator((s) => s.scores)
  const teamIds = wc.teams.filter((t) => t.groupId === groupId).map((t) => t.id)
  const matches = wc.groupMatches.filter((m) => m.groupId === groupId)
  const standings = computeGroupStandings(teamIds, matches, scores)
  return (
    <Card className="gap-0 px-3.5 [--card-spacing:14px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-base font-bold">
          Group <span className="text-primary">{groupId}</span>
        </h3>
        <span className="text-xs text-muted-foreground">{t('groupMatchesCount', { n: matches.length })}</span>
      </div>
      <div className="mb-3 flex flex-col gap-1.5">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
      <StandingsTable rows={standings} />
    </Card>
  )
}
