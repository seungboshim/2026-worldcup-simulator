/**
 * Seed generator for the 2026 FIFA World Cup simulator.
 *
 * Data source: English Wikipedia, fetched 2026-06-22 (group stage in progress).
 *   - Groups & teams + group-stage results:
 *       https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A ... _Group_L
 *   - Knockout bracket structure (R32 match numbers 73-88, R16/QF/SF/F feeds):
 *       https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
 *   - Third-place assignment table (Annex C, 495 combinations) is built separately
 *       (scripts produced data/third-place-assignment.json from
 *        Template:2026_FIFA_World_Cup_third-place_table) and is NOT regenerated here.
 *
 * Results filled: matchdays 1 & 2 for groups whose first two matchdays had been
 * played by 2026-06-22; later matches are played:false / defaults null. Korean team
 * names + lowercase ISO2 flag codes are standard mappings.
 *
 * Run:  npx tsx scripts/seed-worldcup.ts
 * Writes: data/worldcup-2026.json  (third-place-assignment.json is preserved as-is)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type {
  GroupId,
  Team,
  GroupMatch,
  KnockoutMatch,
  KnockoutRound,
  SlotSource,
  WorldCupData,
} from '../src/types'

// ---------------------------------------------------------------------------
// 1) Teams: id (3-letter), Korean name, lowercase ISO2 flag code, groupId.
//    Order within each group = official group-table seeding (position 1..4).
// ---------------------------------------------------------------------------
const teams: Team[] = [
  // Group A
  { id: 'MEX', name: '멕시코', flagCode: 'mx', groupId: 'A' },
  { id: 'KOR', name: '대한민국', flagCode: 'kr', groupId: 'A' },
  { id: 'CZE', name: '체코', flagCode: 'cz', groupId: 'A' },
  { id: 'RSA', name: '남아프리카 공화국', flagCode: 'za', groupId: 'A' },
  // Group B
  { id: 'CAN', name: '캐나다', flagCode: 'ca', groupId: 'B' },
  { id: 'SUI', name: '스위스', flagCode: 'ch', groupId: 'B' },
  { id: 'BIH', name: '보스니아 헤르체고비나', flagCode: 'ba', groupId: 'B' },
  { id: 'QAT', name: '카타르', flagCode: 'qa', groupId: 'B' },
  // Group C
  { id: 'BRA', name: '브라질', flagCode: 'br', groupId: 'C' },
  { id: 'MAR', name: '모로코', flagCode: 'ma', groupId: 'C' },
  { id: 'SCO', name: '스코틀랜드', flagCode: 'gb', groupId: 'C' },
  { id: 'HAI', name: '아이티', flagCode: 'ht', groupId: 'C' },
  // Group D
  { id: 'USA', name: '미국', flagCode: 'us', groupId: 'D' },
  { id: 'AUS', name: '오스트레일리아', flagCode: 'au', groupId: 'D' },
  { id: 'PAR', name: '파라과이', flagCode: 'py', groupId: 'D' },
  { id: 'TUR', name: '튀르키예', flagCode: 'tr', groupId: 'D' },
  // Group E
  { id: 'GER', name: '독일', flagCode: 'de', groupId: 'E' },
  { id: 'CIV', name: '코트디부아르', flagCode: 'ci', groupId: 'E' },
  { id: 'ECU', name: '에콰도르', flagCode: 'ec', groupId: 'E' },
  { id: 'CUW', name: '쿠라소', flagCode: 'cw', groupId: 'E' },
  // Group F
  { id: 'NED', name: '네덜란드', flagCode: 'nl', groupId: 'F' },
  { id: 'JPN', name: '일본', flagCode: 'jp', groupId: 'F' },
  { id: 'SWE', name: '스웨덴', flagCode: 'se', groupId: 'F' },
  { id: 'TUN', name: '튀니지', flagCode: 'tn', groupId: 'F' },
  // Group G
  { id: 'EGY', name: '이집트', flagCode: 'eg', groupId: 'G' },
  { id: 'IRN', name: '이란', flagCode: 'ir', groupId: 'G' },
  { id: 'BEL', name: '벨기에', flagCode: 'be', groupId: 'G' },
  { id: 'NZL', name: '뉴질랜드', flagCode: 'nz', groupId: 'G' },
  // Group H
  { id: 'ESP', name: '스페인', flagCode: 'es', groupId: 'H' },
  { id: 'URU', name: '우루과이', flagCode: 'uy', groupId: 'H' },
  { id: 'CPV', name: '카보베르데', flagCode: 'cv', groupId: 'H' },
  { id: 'KSA', name: '사우디아라비아', flagCode: 'sa', groupId: 'H' },
  // Group I
  { id: 'NOR', name: '노르웨이', flagCode: 'no', groupId: 'I' },
  { id: 'FRA', name: '프랑스', flagCode: 'fr', groupId: 'I' },
  { id: 'SEN', name: '세네갈', flagCode: 'sn', groupId: 'I' },
  { id: 'IRQ', name: '이라크', flagCode: 'iq', groupId: 'I' },
  // Group J
  { id: 'ARG', name: '아르헨티나', flagCode: 'ar', groupId: 'J' },
  { id: 'AUT', name: '오스트리아', flagCode: 'at', groupId: 'J' },
  { id: 'JOR', name: '요르단', flagCode: 'jo', groupId: 'J' },
  { id: 'ALG', name: '알제리', flagCode: 'dz', groupId: 'J' },
  // Group K
  { id: 'COL', name: '콜롬비아', flagCode: 'co', groupId: 'K' },
  { id: 'COD', name: '콩고민주공화국', flagCode: 'cd', groupId: 'K' },
  { id: 'POR', name: '포르투갈', flagCode: 'pt', groupId: 'K' },
  { id: 'UZB', name: '우즈베키스탄', flagCode: 'uz', groupId: 'K' },
  // Group L
  { id: 'ENG', name: '잉글랜드', flagCode: 'gb', groupId: 'L' },
  { id: 'GHA', name: '가나', flagCode: 'gh', groupId: 'L' },
  { id: 'PAN', name: '파나마', flagCode: 'pa', groupId: 'L' },
  { id: 'CRO', name: '크로아티아', flagCode: 'hr', groupId: 'L' },
]

// ---------------------------------------------------------------------------
// 2) Group matches. Per group, the 6 fixtures in Wikipedia match-list order.
//    [homeId, awayId, defaultHome|null, defaultAway|null]. null score => not played.
// ---------------------------------------------------------------------------
type RawMatch = [string, string, number | null, number | null]
const groupFixtures: Record<GroupId, RawMatch[]> = {
  A: [
    ['MEX', 'RSA', 2, 0],
    ['KOR', 'CZE', 2, 1],
    ['CZE', 'RSA', 1, 1],
    ['MEX', 'KOR', 1, 0],
    ['CZE', 'MEX', null, null],
    ['RSA', 'KOR', null, null],
  ],
  B: [
    ['CAN', 'BIH', 1, 1],
    ['QAT', 'SUI', 1, 1],
    ['SUI', 'BIH', 4, 1],
    ['CAN', 'QAT', 6, 0],
    ['SUI', 'CAN', null, null],
    ['BIH', 'QAT', null, null],
  ],
  C: [
    ['BRA', 'MAR', 1, 1],
    ['HAI', 'SCO', 0, 1],
    ['SCO', 'MAR', 0, 1],
    ['BRA', 'HAI', 3, 0],
    ['SCO', 'BRA', null, null],
    ['MAR', 'HAI', null, null],
  ],
  D: [
    ['USA', 'PAR', 4, 1],
    ['AUS', 'TUR', 2, 0],
    ['USA', 'AUS', 2, 0],
    ['TUR', 'PAR', 0, 1],
    ['TUR', 'USA', null, null],
    ['PAR', 'AUS', null, null],
  ],
  E: [
    ['GER', 'CUW', 7, 1],
    ['CIV', 'ECU', 1, 0],
    ['GER', 'CIV', 2, 1],
    ['ECU', 'CUW', 0, 0],
    ['CUW', 'CIV', null, null],
    ['ECU', 'GER', null, null],
  ],
  F: [
    ['NED', 'JPN', 2, 2],
    ['SWE', 'TUN', 5, 1],
    ['NED', 'SWE', 5, 1],
    ['TUN', 'JPN', 0, 4],
    ['JPN', 'SWE', null, null],
    ['TUN', 'NED', null, null],
  ],
  G: [
    ['BEL', 'EGY', 1, 1],
    ['IRN', 'NZL', 2, 2],
    ['BEL', 'IRN', 0, 0],
    ['NZL', 'EGY', 1, 3],
    ['EGY', 'IRN', null, null],
    ['NZL', 'BEL', null, null],
  ],
  H: [
    ['ESP', 'CPV', 0, 0],
    ['KSA', 'URU', 1, 1],
    ['ESP', 'KSA', 4, 0],
    ['URU', 'CPV', 2, 2],
    ['CPV', 'KSA', null, null],
    ['URU', 'ESP', null, null],
  ],
  I: [
    ['FRA', 'SEN', 3, 1],
    ['IRQ', 'NOR', 1, 4],
    ['FRA', 'IRQ', null, null],
    ['NOR', 'SEN', null, null],
    ['NOR', 'FRA', null, null],
    ['SEN', 'IRQ', null, null],
  ],
  J: [
    ['ARG', 'ALG', 3, 0],
    ['AUT', 'JOR', 3, 1],
    ['ARG', 'AUT', null, null],
    ['JOR', 'ALG', null, null],
    ['ALG', 'AUT', null, null],
    ['JOR', 'ARG', null, null],
  ],
  K: [
    ['POR', 'COD', 1, 1],
    ['UZB', 'COL', 1, 3],
    ['POR', 'UZB', null, null],
    ['COL', 'COD', null, null],
    ['COL', 'POR', null, null],
    ['COD', 'UZB', null, null],
  ],
  L: [
    ['ENG', 'CRO', 4, 2],
    ['GHA', 'PAN', 1, 0],
    ['ENG', 'GHA', null, null],
    ['PAN', 'CRO', null, null],
    ['PAN', 'ENG', null, null],
    ['CRO', 'GHA', null, null],
  ],
}

const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const groupMatches: GroupMatch[] = []
for (const g of GROUP_IDS) {
  groupFixtures[g].forEach(([homeId, awayId, dh, da], i) => {
    groupMatches.push({
      id: `G${g}-${i + 1}`,
      groupId: g,
      homeId,
      awayId,
      played: dh !== null && da !== null,
      defaultHome: dh,
      defaultAway: da,
    })
  })
}

// ---------------------------------------------------------------------------
// 3) Knockout matches. Match ids use official FIFA numbers (M73 .. M104).
//    R32 (73-88): sources are groupWinner / groupRunnerUp / thirdPlace.
//    For thirdPlace slots, slotId = the R32 match id hosting it (the
//    data/third-place-assignment.json maps combination -> { matchId: groupId }).
// ---------------------------------------------------------------------------
const W = (group: GroupId): SlotSource => ({ type: 'groupWinner', group })
const R = (group: GroupId): SlotSource => ({ type: 'groupRunnerUp', group })
const T = (slotId: string): SlotSource => ({ type: 'thirdPlace', slotId })
const M = (matchId: string): SlotSource => ({ type: 'winnerOf', matchId })

// order = numerical match order (73 -> order 1, etc.) within the full bracket.
const r32: Array<[string, SlotSource, SlotSource]> = [
  ['M73', R('A'), R('B')],
  ['M74', W('E'), T('M74')],
  ['M75', W('F'), R('C')],
  ['M76', W('C'), R('F')],
  ['M77', W('I'), T('M77')],
  ['M78', R('E'), R('I')],
  ['M79', W('A'), T('M79')],
  ['M80', W('L'), T('M80')],
  ['M81', W('D'), T('M81')],
  ['M82', W('G'), T('M82')],
  ['M83', R('K'), R('L')],
  ['M84', W('H'), R('J')],
  ['M85', W('B'), T('M85')],
  ['M86', W('J'), R('H')],
  ['M87', W('K'), T('M87')],
  ['M88', R('D'), R('G')],
]

const r16: Array<[string, string, string]> = [
  ['M89', 'M74', 'M77'],
  ['M90', 'M73', 'M75'],
  ['M91', 'M76', 'M78'],
  ['M92', 'M79', 'M80'],
  ['M93', 'M83', 'M84'],
  ['M94', 'M81', 'M82'],
  ['M95', 'M86', 'M88'],
  ['M96', 'M85', 'M87'],
]

const qf: Array<[string, string, string]> = [
  ['M97', 'M89', 'M90'],
  ['M98', 'M93', 'M94'],
  ['M99', 'M91', 'M92'],
  ['M100', 'M95', 'M96'],
]

const sf: Array<[string, string, string]> = [
  ['M101', 'M97', 'M98'],
  ['M102', 'M99', 'M100'],
]

const final: Array<[string, string, string]> = [['M104', 'M101', 'M102']]

const knockoutMatches: KnockoutMatch[] = []
let order = 1
const pushRound = (
  round: KnockoutRound,
  rows: Array<[string, SlotSource, SlotSource]>,
) => {
  for (const [id, homeSource, awaySource] of rows) {
    knockoutMatches.push({ id, round, order: order++, homeSource, awaySource })
  }
}
const winnerRows = (rows: Array<[string, string, string]>) =>
  rows.map(([id, a, b]) => [id, M(a), M(b)] as [string, SlotSource, SlotSource])

pushRound('R32', r32)
pushRound('R16', winnerRows(r16))
pushRound('QF', winnerRows(qf))
pushRound('SF', winnerRows(sf))
pushRound('F', winnerRows(final))

// ---------------------------------------------------------------------------
// 4) Assemble + write.
// ---------------------------------------------------------------------------
const data: WorldCupData = {
  competition: '2026 FIFA World Cup',
  teams,
  groupMatches,
  knockoutMatches,
}

const outPath = resolve(__dirname, '../data/worldcup-2026.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8')

console.log(
  `Wrote ${outPath}\n` +
    `  teams: ${teams.length}\n` +
    `  groupMatches: ${groupMatches.length} (played: ${groupMatches.filter((m) => m.played).length})\n` +
    `  knockoutMatches: ${knockoutMatches.length}`,
)
