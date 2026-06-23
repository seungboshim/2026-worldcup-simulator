import type { KnockoutMatch, SlotSource } from '@/types'

// 브래킷을 트리 구조대로 세로 정렬하기 위한 순위(작을수록 위).
//
// 데이터의 경기번호 순서(M73,M74,…)로 나열하면, 실제로 같은 다음 라운드로
// 올라가는 두 경기가 화면상 떨어져 보인다(공식 2026 대진은 교차 구조이기 때문).
// 결승에서 리프(R32)까지 트리를 펼쳐, 같은 부모로 올라가는 두 경기가 인접하도록
// 자리를 배정한다. 같은 부모의 두 자식은 하위 경기번호(min order)가 작은 쪽을 위로 둔다
// → 네이버 등 공식 대진표 레이아웃과 동일.
export function bracketLayoutRank(matches: KnockoutMatch[]): Map<string, number> {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const feeder = (src: SlotSource): KnockoutMatch | null =>
    src.type === 'winnerOf' ? byId.get(src.matchId) ?? null : null
  const children = (m: KnockoutMatch): KnockoutMatch[] =>
    [feeder(m.homeSource), feeder(m.awaySource)].filter((x): x is KnockoutMatch => x !== null)

  const minOrder = new Map<string, number>()
  const computeMin = (m: KnockoutMatch): number => {
    const cached = minOrder.get(m.id)
    if (cached !== undefined) return cached
    const kids = children(m)
    const v = kids.length ? Math.min(m.order, ...kids.map(computeMin)) : m.order
    minOrder.set(m.id, v)
    return v
  }

  const rank = new Map<string, number>()
  let leaf = 0
  const visit = (m: KnockoutMatch): number => {
    const kids = children(m)
    let r: number
    if (kids.length === 0) {
      r = leaf++ // R32 리프: 펼친 순서대로 자리 배정
    } else {
      kids.sort((a, b) => computeMin(a) - computeMin(b))
      const rs = kids.map(visit)
      r = rs.reduce((s, x) => s + x, 0) / rs.length // 상위 경기: 두 자식의 가운데
    }
    rank.set(m.id, r)
    return r
  }

  const final = matches.find((m) => m.round === 'F')
  if (final) visit(final)
  // 트리에 안 걸린 경기(데이터 이상 대비)는 뒤로
  for (const m of matches) if (!rank.has(m.id)) rank.set(m.id, 1000 + m.order)
  return rank
}
