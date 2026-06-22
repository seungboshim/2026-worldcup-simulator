'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectQualificationRanking } from '@/store/selectors'
import type { QualEntry } from '@/lib/standings'
import { teamFlag, teamName } from '@/lib/teams'
import { Button } from '@/components/ui/button'

const tierLabel = (t: number) => (t === 1 ? '1위' : t === 2 ? '2위' : '3위')

function Row({ e }: { e: QualEntry }) {
  // 1~24 확정(차분) / 25~32 막차(녹색 음영) / 33~36 미진출(흐림). 아이콘 없이 음영만.
  const tone = e.overall <= 24 ? '' : e.overall <= 32 ? 'bg-primary/10' : 'opacity-40'
  const gd = e.gd > 0 ? `+${e.gd}` : `${e.gd}`
  return (
    <div className={`grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${tone}`}>
      <span className="font-mona text-center text-xs tabular-nums text-muted-foreground">{e.overall}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{teamFlag(e.teamId)}</span>
        <span className="truncate">{teamName(e.teamId)}</span>
        <span className="font-mona text-[11px] text-muted-foreground">{e.groupId} {tierLabel(e.tier)}</span>
      </span>
      <span className="font-mona text-xs tabular-nums text-muted-foreground">{e.points}pt {gd}</span>
    </div>
  )
}

function PanelBody() {
  const scores = useSimulator((s) => s.scores)
  const [expanded, setExpanded] = useState(false)
  const all = selectQualificationRanking(scores)
  const auto = all.slice(0, 24)
  const bubble = all.slice(24, 32)
  const out = all.slice(32)
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold tracking-tight">진출 현황</h2>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-1.5 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:border-primary"
      >
        <span className="text-muted-foreground">{expanded ? '▾' : '▸'}</span>
        진출 확정 <span className="ml-auto font-normal text-muted-foreground">24팀</span>
      </button>
      {expanded && (
        <>
          {auto.map((e) => <Row key={e.teamId} e={e} />)}
          <div className="my-2.5 h-px bg-border" />
        </>
      )}
      {bubble.map((e) => <Row key={e.teamId} e={e} />)}
      <div className="my-3 flex items-center gap-2.5">
        <span className="h-0.5 flex-1 rounded bg-gradient-to-r from-transparent to-primary" />
        <span className="whitespace-nowrap text-xs font-extrabold text-primary" style={{ textShadow: '0 0 14px var(--accent-glow)' }}>32강 진출 컷</span>
        <span className="h-0.5 flex-1 rounded bg-gradient-to-l from-transparent to-primary" />
      </div>
      {out.map((e) => <Row key={e.teamId} e={e} />)}
    </div>
  )
}

export function ThirdPlacePanel() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <aside className="sticky top-4 hidden h-fit w-[312px] shrink-0 rounded-2xl border p-4 lg:block">
        <PanelBody />
      </aside>
      <div className="lg:hidden">
        <Button className="fixed bottom-4 right-4 z-30 rounded-full shadow-lg" onClick={() => setOpen((v) => !v)}>🥉 진출 현황</Button>
        {open && (
          <div className="fixed inset-x-3 bottom-3 z-30 max-h-[74vh] overflow-y-auto rounded-2xl border bg-background p-4 shadow-2xl">
            <PanelBody />
            <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>닫기</Button>
          </div>
        )}
      </div>
    </>
  )
}
