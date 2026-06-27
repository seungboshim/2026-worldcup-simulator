'use client'
import { motion } from 'motion/react'
import { teamFlag, teamName } from '@/lib/teams'
import { useT } from '@/i18n/useT'

const COLORS = ['#fbbf24', '#22c55e', '#ef4444', '#3b82f6', '#ec4899', '#a855f7', '#f97316', '#ffffff']
const N = 90

// 색종이(컨페티) 한 조각. 인덱스 기반 분산(랜덤 없이 결정적) — 중앙에서 사방으로 터진 뒤 떨어지며 사라짐.
function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2 + (i % 7) * 0.5
        const dist = 160 + (i % 6) * 70
        const x = Math.cos(angle) * dist
        const y = Math.sin(angle) * dist
        const size = 7 + (i % 4) * 4
        const c = COLORS[i % COLORS.length]
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{ x, y: y + 520, opacity: [1, 1, 0], rotate: 540 + i * 11, scale: [1, 1, 0.6] }}
            transition={{ duration: 1.5 + (i % 5) * 0.25, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '42%',
              width: size,
              height: size * (i % 3 === 0 ? 1.6 : 1),
              background: c,
              borderRadius: i % 2 ? '50%' : 2,
            }}
          />
        )
      })}
    </div>
  )
}

export function ChampionCelebration({ championId, locale }: { championId: string; locale: 'ko' | 'en' }) {
  const { t } = useT()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center"
    >
      {/* 중앙 방사형 플래시 */}
      <motion.div
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="absolute h-64 w-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.55), rgba(251,191,36,0) 70%)' }}
      />
      <Confetti />
      {/* 우승 배너 팝 */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 10 }}
        animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center gap-1 rounded-3xl border border-amber-300/60 bg-background/80 px-8 py-6 backdrop-blur-sm"
        style={{ boxShadow: '0 0 60px rgba(251,191,36,0.6)' }}
      >
        <motion.div
          animate={{ rotate: [0, -12, 12, -8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="text-6xl"
        >
          🏆
        </motion.div>
        <div className="font-mona text-2xl font-extrabold tracking-tight">
          {teamFlag(championId)} {teamName(championId, locale)}
        </div>
        <div className="text-lg font-extrabold text-amber-500">{t('champion')}! 🎉</div>
      </motion.div>
    </motion.div>
  )
}
