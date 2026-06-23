'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulator } from '@/store/useSimulator'
import { selectResolvedBracket } from '@/store/selectors'
import { extractPrediction } from '@/lib/predict'
import { getBrowserId } from '@/lib/browser-id'
import { submitPrediction } from '@/app/actions/submit-prediction'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/useT'

export function SubmitPrediction() {
  const { t, locale } = useT()
  const router = useRouter()
  const scores = useSimulator((s) => s.scores)
  const winners = useSimulator((s) => s.winners)
  const [busy, setBusy] = useState(false)
  const picks = extractPrediction(selectResolvedBracket(scores, winners), winners)

  if (!picks) {
    return <p className="text-center text-xs text-muted-foreground">{t('submitNeedsComplete')}</p>
  }

  const onSubmit = async () => {
    setBusy(true)
    try {
      await submitPrediction(getBrowserId(), picks)
      router.push(`/${locale}/stats`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Button onClick={onSubmit} disabled={busy} className="w-full">
      🗳️ {t('submitPrediction')}
    </Button>
  )
}
