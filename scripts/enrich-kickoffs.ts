// 1회 실행: node --env-file=.env.local --import tsx scripts/enrich-kickoffs.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WorldCupData } from '../src/types'

interface ApiMatch {
  stage: string
  homeTeam: { tla: string | null }
  awayTeam: { tla: string | null }
  utcDate: string
}

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
    console.error('API error', res.status)
    process.exit(1)
  }
  const body = (await res.json()) as { matches?: ApiMatch[] }
  if (!body.matches) {
    console.error('no matches')
    process.exit(1)
  }

  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const dateByPair = new Map<string, string>()
  for (const m of body.matches) {
    if (m.stage !== 'GROUP_STAGE' || !m.homeTeam.tla || !m.awayTeam.tla) continue
    dateByPair.set(pairKey(m.homeTeam.tla, m.awayTeam.tla), m.utcDate)
  }

  const dataPath = resolve('data/worldcup-2026.json')
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as WorldCupData
  let n = 0
  for (const gm of data.groupMatches) {
    const d = dateByPair.get(pairKey(gm.homeId, gm.awayId))
    if (d && gm.utcDate !== d) {
      gm.utcDate = d
      n++
    }
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`utcDate set on ${n} match(es)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
