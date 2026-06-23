import type { TierCount } from '@/lib/predict'
import { teamFlag, teamName } from '@/lib/teams'
import type { Locale } from '@/i18n/config'

export function TierTable({
  title,
  rows,
  locale,
  limit = 8,
}: {
  title: string
  rows: TierCount[]
  locale: Locale
  limit?: number
}) {
  return (
    <section className="rounded-2xl border p-4">
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <ol className="space-y-1.5">
        {rows.slice(0, limit).map((r, i) => (
          <li key={r.teamId} className="flex items-center gap-3 text-sm">
            <span className="font-mona w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span>{teamFlag(r.teamId)}</span>
              <span className="truncate">{teamName(r.teamId, locale)}</span>
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-24">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </span>
            <span className="font-mona w-10 shrink-0 text-right text-xs font-bold tabular-nums">{r.pct.toFixed(0)}%</span>
            <span className="font-mona w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">({r.count})</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
