// 일일 조별 결과 갱신.
// 로컬: node --env-file=.env.local --import tsx scripts/update-results.ts
// CI:   npx tsx scripts/update-results.ts   (FOOTBALL_DATA_TOKEN은 워크플로우 env로 주입)
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyGroupResults, type ApiMatch } from '../src/lib/results-merge'
import type { WorldCupData } from '../src/types'

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) {
    console.error('FOOTBALL_DATA_TOKEN missing')
    process.exit(1)
  }

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': token },
  })
  if (!res.ok) {
    console.error('API error:', res.status, await res.text())
    process.exit(1)
  }
  const body = (await res.json()) as { matches?: ApiMatch[]; message?: string }
  if (!body.matches) {
    console.error('Unexpected API response:', body.message ?? '(no matches field)')
    process.exit(1)
  }

  const dataPath = resolve('data/worldcup-2026.json')
  const current = JSON.parse(readFileSync(dataPath, 'utf8')) as WorldCupData
  const { data, changed } = applyGroupResults(current, body.matches)

  if (changed.length === 0) {
    console.log('no change')
    return
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`updated ${changed.length} match(es):`)
  for (const c of changed) {
    const b = c.before ? `${c.before.home}-${c.before.away}` : '–'
    console.log(`  ${c.matchId}: ${b} → ${c.after.home}-${c.after.away}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
