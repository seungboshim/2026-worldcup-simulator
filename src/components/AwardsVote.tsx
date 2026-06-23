'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { extractPrediction } from '@/lib/predict'
import { getPlayers, goldenBallCandidates, goldenBootCandidates, playerName, type Player } from '@/lib/players'
import { teamFlag } from '@/lib/teams'
import { getBrowserId } from '@/lib/browser-id'
import { submitAwards } from '@/app/actions/submit-awards'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'
import type { Locale } from '@/i18n/config'

function PlayerPicker({
  candidates,
  value,
  onChange,
  locale,
}: {
  candidates: Player[]
  value: string
  onChange: (id: string) => void
  locale: Locale
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {candidates.map((p) => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(active ? '' : p.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            <span>{teamFlag(p.teamId)}</span>
            <span>{playerName(p.id, locale)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AwardsVote() {
  const { t, locale } = useT()
  const router = useRouter()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const picks = extractPrediction(selectResolvedBracket(scores, winners), winners)
  const [ball, setBall] = useState('')
  const [boot, setBoot] = useState('')
  const [busy, setBusy] = useState(false)

  if (!picks) {
    return (
      <section className="mt-5 rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        🏅 {t('awardsNeedsComplete')}
      </section>
    )
  }

  const pool = getPlayers()
  const ballCands = goldenBallCandidates(pool, picks.semifinalists)
  const bootCands = goldenBootCandidates(pool, picks.quarterfinalists)

  const onSubmit = async () => {
    if (!ball || !boot) return
    setBusy(true)
    try {
      await submitAwards(getBrowserId(), { goldenBall: ball, goldenBoot: boot })
      router.push(`/${locale}/stats`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <section id="awards-vote" className="mt-5 scroll-mt-4 rounded-2xl border p-5">
      <h2 className="text-lg font-bold">🏅 {t('awardsVoteTitle')}</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-semibold">
            {t('goldenBall')} <span className="ml-1 font-normal text-muted-foreground">{t('awardMvp')}</span>
          </div>
          <PlayerPicker candidates={ballCands} value={ball} onChange={setBall} locale={locale} />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold">
            {t('goldenBoot')} <span className="ml-1 font-normal text-muted-foreground">{t('awardTopScorer')}</span>
          </div>
          <PlayerPicker candidates={bootCands} value={boot} onChange={setBoot} locale={locale} />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{t('awardsVotePrompt')}</p>
      <Button onClick={onSubmit} disabled={busy || !ball || !boot} className="mt-3 w-full sm:w-auto">
        🏅 {t('awardsSubmit')}
      </Button>
    </section>
  )
}
