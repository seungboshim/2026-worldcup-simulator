export type GroupId = 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'

export interface Team { id: string; name: string; flagCode: string; groupId: GroupId } // name=한글, flagCode=소문자 ISO2

export interface GroupMatch {
  id: string; groupId: GroupId; homeId: string; awayId: string
  played: boolean; defaultHome: number | null; defaultAway: number | null
}
export interface Score { home: number; away: number }
export type ScoreMap = Record<string, Score | null>

export type KnockoutRound = 'R32'|'R16'|'QF'|'SF'|'F'
export type SlotSource =
  | { type: 'groupWinner'; group: GroupId }
  | { type: 'groupRunnerUp'; group: GroupId }
  | { type: 'thirdPlace'; slotId: string }
  | { type: 'winnerOf'; matchId: string }
export interface KnockoutMatch { id: string; round: KnockoutRound; order: number; homeSource: SlotSource; awaySource: SlotSource }
export interface WorldCupData { competition: string; teams: Team[]; groupMatches: GroupMatch[]; knockoutMatches: KnockoutMatch[] }
export type ThirdPlaceAssignmentTable = Record<string, Record<string, GroupId>>
