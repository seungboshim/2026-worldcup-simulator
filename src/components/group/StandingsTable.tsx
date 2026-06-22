'use client'
import type { TeamStanding } from '@/lib/standings'
import { teamFlag, teamName } from '@/lib/teams'

export function StandingsTable({ rows }: { rows: TeamStanding[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="w-[26px]"></th>
          <th className="text-left font-medium">팀</th>
          <th className="font-medium">경기</th>
          <th className="font-medium">득실</th>
          <th className="font-medium">승점</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.teamId}
            className={`border-t border-border ${i < 2 ? 'bg-primary/5' : i > 2 ? 'opacity-60' : ''}`}
          >
            <td className="py-1.5 text-center">
              <span
                className={`font-mona inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[11px] tabular-nums ${i < 2 ? 'bg-primary text-primary-foreground' : i === 2 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              >
                {r.rank}
              </span>
            </td>
            <td className="flex items-center gap-1.5 py-1.5">
              <span>{teamFlag(r.teamId)}</span>
              <span className="truncate">{teamName(r.teamId)}</span>
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
