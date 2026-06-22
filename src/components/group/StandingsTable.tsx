'use client'
import type { TeamStanding } from '@/lib/standings'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function StandingsTable({ rows }: { rows: TeamStanding[] }) {
  const { t, locale } = useT()
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="w-[26px]"></th>
          <th className="text-left font-medium">{t('thTeam')}</th>
          <th className="font-medium">{t('thPlayed')}</th>
          <th className="font-medium">{t('thGd')}</th>
          <th className="font-medium">{t('thPts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.teamId}
            className={`border-t border-border ${i < 2 ? 'bg-primary/5' : i > 2 ? 'opacity-60' : ''}`}
          >
            <td className="py-1.5">
              <span
                className={`font-mona mx-auto flex h-[18px] w-[18px] items-center justify-center rounded text-[11px] leading-none tabular-nums ${i < 2 ? 'bg-primary text-primary-foreground' : i === 2 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              >
                {r.rank}
              </span>
            </td>
            <td className="flex items-center gap-1.5 py-1.5">
              <span>{teamFlag(r.teamId)}</span>
              <span className="truncate">{teamName(r.teamId, locale)}</span>
            </td>
            <td className="text-center tabular-nums">{r.played}</td>
            <td className="text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
            <td className="text-center font-bold tabular-nums">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
