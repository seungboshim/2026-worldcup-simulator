'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSimulator } from '@/store/useSimulator'
import { selectQualificationRanking } from '@/store/selectors'
import type { QualEntry } from '@/lib/standings'
import { teamFlag, teamAbbr } from '@/lib/teams'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { DictKey } from '@/i18n/dictionaries'

const tierKey = (tier: number): DictKey =>
  tier === 1 ? 'pos1' : tier === 2 ? 'pos2' : tier === 5 ? 'pos4' : 'pos3'

function Row({ e }: { e: QualEntry }) {
  const { t, locale } = useT()
  // 진출(1~32)은 동일하게, 미진출(33~48)만 흐림. 컷 라인이 경계를 표시.
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

function Toggle({ open, onClick, more, less, suffix, dir }: {
  open: boolean
  onClick: () => void
  more: DictKey
  less: DictKey
  suffix: DictKey
  dir: 'up' | 'down'
}) {
  const { t } = useT()
  const chevron = dir === 'up' ? (open ? '▾' : '▴') : open ? '▴' : '▾'
  return (
    <button
      type="button"
      onClick={onClick}
      className="my-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="leading-none">{chevron}</span>
      {open ? t(less) : t(more)}
      <span className="opacity-70">· {t(suffix)}</span>
    </button>
  )
}

export function QualPanelBody() {
  const { t } = useT()
  const scores = useSimulator((s) => s.scores)
  const [expandedTop, setExpandedTop] = useState(false)
  const [expandedBottom, setExpandedBottom] = useState(false)
  const all = selectQualificationRanking(scores)
  const auto = all.slice(0, 24) // 1~24 진출 확정
  const bubble = all.slice(24, 32) // 25~32 조 3위 막차
  const elim = all.slice(32, 36) // 33~36 미진출 조 3위
  const fourths = all.slice(36) // 37~48 조 4위

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold tracking-tight">{t('qualStatus')}</h2>

      {/* 위쪽: 1~24위(진출 확정) 더보기 */}
      <Toggle open={expandedTop} onClick={() => setExpandedTop((v) => !v)} more="showRanksMore" less="showRanksLess" suffix="confirmedSuffix" dir="up" />
      {expandedTop && (
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

      {elim.map((e) => <Row key={e.teamId} e={e} />)}

      {/* 아래쪽: 37~48위(조 4위, 탈락) 더보기 */}
      <Toggle open={expandedBottom} onClick={() => setExpandedBottom((v) => !v)} more="showFourthMore" less="showFourthLess" suffix="eliminatedSuffix" dir="down" />
      {expandedBottom && fourths.map((e) => <Row key={e.teamId} e={e} />)}
    </div>
  )
}

// 데스크탑: 우측 sticky 패널
export function ThirdPlaceAside() {
  return (
    <aside className="sticky top-4 hidden h-fit w-[312px] shrink-0 rounded-2xl border p-4 lg:block">
      <QualPanelBody />
    </aside>
  )
}

// 모바일: 하단 알약 → 탭하면 시트로 "자라나는" 모프(motion layout). 예측 진행도 + 다음으로 CTA 내장.
export function QualMorphBar({
  complete,
  filled,
  total,
  onNext,
}: {
  complete: boolean
  filled: number
  total: number
  onNext: () => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const recomputeFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setFade({
      top: el.scrollTop > 4,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    recomputeFade()
    const ro = new ResizeObserver(recomputeFade)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [open, recomputeFade])

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
        <motion.div
          layout
          role={open ? 'dialog' : undefined}
          aria-modal={open || undefined}
          transition={{ layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
          className={`overflow-hidden border shadow-2xl ${
            open
              ? 'flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-background'
              : `rounded-full bg-background/95 backdrop-blur ${complete ? 'ring-2 ring-primary' : ''}`
          }`}
        >
          {open ? (
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.12, duration: 0.28 }}
              className="flex min-h-0 flex-col"
            >
              <div className="flex shrink-0 justify-center pt-3 pb-1">
                <div className="h-1.5 w-10 rounded-full bg-border" />
              </div>

              {/* 스크롤 영역 + 양끝 fade gradient (스크롤 가능할 때만) */}
              <div className="relative min-h-0 flex-1">
                {fade.top && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
                )}
                <div ref={scrollRef} onScroll={recomputeFade} className="h-full overflow-y-auto px-4">
                  <QualPanelBody />
                </div>
                {fade.bottom && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 p-3">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  {t('qualClose')}
                </Button>
                {complete ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setOpen(false)
                      onNext()
                    }}
                  >
                    {t('next')} →
                  </Button>
                ) : (
                  <span className="flex-1 text-center text-sm text-muted-foreground">
                    {t('predictedMatches')} <span className="font-mona tabular-nums">{filled}/{total}</span>
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-semibold"
            >
              🥉 {t('qualStatusButton')}
              <span className="text-muted-foreground">·</span>
              <span className="font-mona tabular-nums text-muted-foreground">
                {filled}/{total}
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
