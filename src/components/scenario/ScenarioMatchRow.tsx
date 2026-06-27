'use client'
import { motion, AnimatePresence } from 'motion/react'
import type { GroupMatch, Score } from '@/types'
import type { MatchColor } from '@/lib/king'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

const SHADOW_UP = '0 8px 24px rgba(34, 197, 94, 0.45)'
const SHADOW_DOWN = '0 8px 24px rgba(239, 68, 68, 0.45)'
const SHADOW_NONE = '0 0 0 0 rgba(0,0,0,0)'

export function ScenarioMatchRow({
  match,
  color,
  score,
  onScore,
  flash,
}: {
  match: GroupMatch
  color: MatchColor
  score: Score | null | undefined
  onScore: (matchId: string, score: Score) => void
  flash?: 'up' | 'down' | null
}) {
  const { t, locale } = useT()
  const filled = score != null
  const h = score?.home ?? 0
  const a = score?.away ?? 0
  const update = (home: number, away: number) => onScore(match.id, { home: Math.max(0, home), away: Math.max(0, away) })

  const locked = match.played // 이미 진행된 경기 → 조작불가 + dim
  // fav/unfav/pending = 9개 빙고조의 3위 결정전만. live = 예측이 가르는 변수(pending & 미진행).
  const live = color === 'pending' && !locked
  const plain = filled ? 'border border-foreground/30' : 'border'
  const border =
    color === 'fav'
      ? 'border-2 border-primary bg-primary/[0.06]'
      : color === 'unfav'
        ? 'border-2 border-red-500/60 bg-red-500/[0.05]'
        : color === 'pending'
          ? live
            ? 'border-2 border-amber-400/70 bg-amber-400/[0.06]'
            : 'border-2 border-amber-400/40'
          : plain // 'none' · 'kor' → 빙고 무관, 플레인(순위변동 glow만)

  return (
    <motion.div
      data-unfilled={!filled || undefined}
      animate={{ boxShadow: flash === 'up' ? SHADOW_UP : flash === 'down' ? SHADOW_DOWN : SHADOW_NONE }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative rounded-xl p-3 transition-colors ${border} ${locked ? 'opacity-60' : ''}`}
    >
      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-none absolute right-3 top-2 text-sm font-bold ${flash === 'up' ? 'text-primary' : 'text-red-500'}`}
          >
            {flash === 'up' ? t('rankUp') : t('rankDown')}
          </motion.span>
        )}
      </AnimatePresence>
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-base ${locked ? 'pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={() => update(h + 1, a)}
          aria-label={`${teamName(match.homeId, locale)} +1`}
          className="flex min-w-0 items-center justify-end gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="truncate">{teamName(match.homeId, locale)}</span>
          <span className="text-base leading-none">{teamFlag(match.homeId)}</span>
        </button>
        <span className="flex items-center gap-1">
          <Step onUp={() => update(h + 1, a)} onDown={() => update(h - 1, a)} up={t('scoreUp')} down={t('scoreDown')} />
          <button
            type="button"
            onClick={() => update(0, 0)}
            aria-label={t('guideReset')}
            className="font-mona rounded-md bg-board px-2.5 py-1 font-bold text-board-ink tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform hover:scale-105"
          >
            {h}
            <span className="opacity-50"> : </span>
            {a}
          </button>
          <Step onUp={() => update(h, a + 1)} onDown={() => update(h, a - 1)} up={t('scoreUp')} down={t('scoreDown')} />
        </span>
        <button
          type="button"
          onClick={() => update(h, a + 1)}
          aria-label={`${teamName(match.awayId, locale)} +1`}
          className="flex min-w-0 items-center justify-start gap-1.5 rounded-md py-1 transition-colors hover:bg-accent hover:text-primary"
        >
          <span className="text-base leading-none">{teamFlag(match.awayId)}</span>
          <span className="truncate">{teamName(match.awayId, locale)}</span>
        </button>
      </div>

      <ColorTag color={color} live={live} />
    </motion.div>
  )
}

function ColorTag({ color, live }: { color: MatchColor; live: boolean }) {
  const { t } = useT()
  if (color === 'none') return null // 빙고 무관 경기 → 라벨 없음(순위변동 glow만)
  if (color === 'kor') return <div className="mt-1.5 text-xs text-muted-foreground/70">🇰🇷 {t('bingoKorMatch')}</div>
  // 칩은 항상 "32강 빙고", 색만 상태에 따라 바뀜(유리=초록/불리=빨강/미정=노랑). 옆에 설명.
  const cls =
    color === 'fav' ? 'bg-primary text-primary-foreground' : color === 'unfav' ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950'
  const desc = color === 'fav' ? t('bingoFav') : color === 'unfav' ? t('bingoUnfav') : live ? t('bingoLive') : t('bingoPending')
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span className={`shrink-0 rounded px-1.5 py-0.5 font-bold ${cls}`}>{t('bingoChip')}</span>
      <span className="min-w-0 truncate text-muted-foreground">{desc}</span>
    </div>
  )
}

function Step({ onUp, onDown, up, down }: { onUp: () => void; onDown: () => void; up: string; down: string }) {
  const cls = 'flex h-3.5 items-center justify-center px-0.5 text-[9px] leading-none text-muted-foreground transition-colors hover:text-primary'
  return (
    <span className="flex flex-col">
      <button type="button" onClick={onUp} aria-label={up} className={cls}>▲</button>
      <button type="button" onClick={onDown} aria-label={down} className={cls}>▼</button>
    </span>
  )
}
