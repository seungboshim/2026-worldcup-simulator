'use client'
import type { TeamStanding } from '@/lib/standings'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

export function StandingsTable({ rows }: { rows: TeamStanding[] }) {
  const { t, locale } = useT()
  return (
    // table-fixed: 숫자 칸은 고정폭, 팀명 칸만 가변(넘치면 …). 행 간격 넉넉히.
    <table className="w-full table-fixed text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="w-7"></th>
          <th className="text-left font-medium">{t('thTeam')}</th>
          <th className="w-9 font-medium">{t('thPlayed')}</th>
          <th className="w-11 font-medium">{t('thGd')}</th>
          <th className="w-11 font-medium">{t('thPts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.teamId}
            className={`border-t border-border ${i < 2 ? 'bg-primary/5' : i > 2 ? 'opacity-60' : ''}`}
          >
            <td className="py-2">
              <span
                className={`font-mona mx-auto flex h-[18px] w-[18px] items-center justify-center rounded text-[11px] leading-none tabular-nums ${i < 2 ? 'bg-primary text-primary-foreground' : i === 2 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              >
                {r.rank}
              </span>
            </td>
            <td className="py-2 pr-2">
              <span className="flex items-center gap-1.5">
                <span className="shrink-0">{teamFlag(r.teamId)}</span>
                <span className="min-w-0 truncate">{teamName(r.teamId, locale)}</span>
              </span>
            </td>
            <td className="py-2 text-center tabular-nums">{r.played}</td>
            <td className="py-2 text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
            <td className="py-2 text-center font-bold tabular-nums">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
