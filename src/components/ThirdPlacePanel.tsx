'use client'
import { useState } from 'react'
import { useSimulator } from '@/store/useSimulator'
import { selectQualificationRanking } from '@/store/selectors'
import type { QualEntry } from '@/lib/standings'
import { teamFlag, teamAbbr } from '@/lib/teams'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const tierKey = (tier: number): DictKey => (tier === 1 ? 'pos1' : tier === 2 ? 'pos2' : 'pos3')

function Row({ e }: { e: QualEntry }) {
  const { t, locale } = useT()
  // 진출(1~32)은 동일하게, 미진출(33~36)만 흐림. 컷 라인이 경계를 표시.
  const tone = e.overall <= 32 ? '' : 'opacity-40'
  const gd = e.gd > 0 ? `+${e.gd}` : `${e.gd}`
  return (
    <div className={`grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${tone}`}>
      <span className="font-mona text-center text-xs leading-none tabular-nums text-muted-foreground">{e.overall}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{teamFlag(e.teamId)}</span>
        <span className="truncate">{teamAbbr(e.teamId, locale)}</span>
        <span className="font-mona text-[11px] text-muted-foreground">{e.groupId} {t(tierKey(e.tier))}</span>
      </span>
      <span className="font-mona text-xs tabular-nums text-muted-foreground">{e.points}pt {gd}</span>
    </div>
  )
}

function PanelBody() {
  const { t } = useT()
  const scores = useSimulator((s) => s.scores)
  const [expanded, setExpanded] = useState(false)
  const all = selectQualificationRanking(scores)
  const auto = all.slice(0, 24)
  const bubble = all.slice(24, 32)
  const out = all.slice(32)
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold tracking-tight">{t('qualStatus')}</h2>
      {/* "위 순위 더보기" 느낌 — 1~24위(진출 확정)는 위쪽에 접혀 있음 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="leading-none">{expanded ? '▾' : '▴'}</span>
        {expanded ? t('showRanksLess') : t('showRanksMore')}
        <span className="opacity-70">· {t('confirmedSuffix')}</span>
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
        <span
          className="whitespace-nowrap text-xs font-extrabold text-primary"
          style={{ textShadow: '0 0 14px var(--accent-glow)' }}
        >
          {t('cutLabel')}
        </span>
        <span className="h-0.5 flex-1 rounded bg-gradient-to-l from-transparent to-primary" />
      </div>
      {out.map((e) => <Row key={e.teamId} e={e} />)}
    </div>
  )
}

export function ThirdPlacePanel() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <aside className="sticky top-4 hidden h-fit w-[312px] shrink-0 rounded-2xl border p-4 lg:block">
        <PanelBody />
      </aside>
      <div className="lg:hidden">
        <Button className="fixed bottom-20 right-4 z-30 rounded-full shadow-lg" onClick={() => setOpen((v) => !v)}>
          🥉 {t('qualStatusButton')}
        </Button>
        {open && (
          <div className="fixed inset-x-3 bottom-3 z-40 max-h-[74vh] overflow-y-auto rounded-2xl border bg-background p-4 shadow-2xl">
            <PanelBody />
            <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>
              {t('qualClose')}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
