import type { PlayableMove } from './gesture'

export const GameResult = {
  Win: 'win',
  Lose: 'lose',
  Draw: 'draw',
} as const

export type GameResult = (typeof GameResult)[keyof typeof GameResult]

export const GamePhase = {
  Idle: 'idle',
  Countdown: 'countdown',
  Reveal: 'reveal',
  Result: 'result',
} as const

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

export interface Score {
  player: number
  computer: number
  draws: number
}

export interface RoundOutcome {
  playerMove: PlayableMove
  computerMove: PlayableMove
  result: GameResult
}

export const RESULT_TEXT: Record<GameResult, string> = {
  [GameResult.Win]: 'You won!',
  [GameResult.Lose]: 'Computer won',
  [GameResult.Draw]: 'Draw',
}
