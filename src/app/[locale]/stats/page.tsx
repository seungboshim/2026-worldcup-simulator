import { notFound } from 'next/navigation'
import { getSql } from '@/lib/db'
import { aggregateStats, type PredictionRow } from '@/lib/predict'
import { aggregateAwards, type AwardsVoteRow } from '@/lib/awards'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale, type Locale } from '@/i18n/config'
import { TierTable } from '@/components/stats/TierTable'
import { AwardTable } from '@/components/stats/AwardTable'

export const dynamic = 'force-dynamic' // 항상 최신 집계

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const loc = locale as Locale
  const t = getDictionary(loc)

  let rows: PredictionRow[] = []
  try {
    const sql = getSql()
    rows = (await sql`select champion, finalists, semifinalists, quarterfinalists from predictions`) as PredictionRow[]
  } catch {
    rows = [] // DB 미설정/테이블 없음 → 빈 상태로 graceful 처리
  }
  let awardRows: AwardsVoteRow[] = []
  try {
    const sql = getSql()
    awardRows = (await sql`select golden_ball, golden_boot from awards_votes`) as AwardsVoteRow[]
  } catch {
    awardRows = []
  }
  const stats = aggregateStats(rows)
  const awards = aggregateAwards(awardRows)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">{t.statsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.statsSubtitle} · {t.statsTotal} <span className="font-mona tabular-nums">{stats.total}</span>
        </p>
      </div>
      {stats.total === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t.statsEmpty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TierTable title={t.tierChampion} rows={stats.champion} locale={loc} />
          <TierTable title={t.tierFinalists} rows={stats.finalists} locale={loc} />
          <TierTable title={t.tierSemifinalists} rows={stats.semifinalists} locale={loc} />
          <TierTable title={t.tierQuarterfinalists} rows={stats.quarterfinalists} locale={loc} />
        </div>
      )}

      {awards.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <AwardTable title={`🏅 ${t.goldenBall}`} rows={awards.goldenBall} locale={loc} />
          <AwardTable title={`🥇 ${t.goldenBoot}`} rows={awards.goldenBoot} locale={loc} />
        </div>
      )}
    </div>
  )
}
