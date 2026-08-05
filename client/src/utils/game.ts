import {
  GestureClass,
  PlayableMove,
  PLAYABLE_MOVES,
  GameResult,
  type Score,
  type RoundOutcome,
  type Prediction,
} from '../types'

const PLAYABLE_MOVE_SET = new Set<GestureClass>(PLAYABLE_MOVES)

const BEATS: Record<PlayableMove, PlayableMove> = {
  [PlayableMove.Rock]: PlayableMove.Scissors,
  [PlayableMove.Paper]: PlayableMove.Rock,
  [PlayableMove.Scissors]: PlayableMove.Paper,
}

export function isPlayableMove(label: GestureClass): label is PlayableMove {
  return PLAYABLE_MOVE_SET.has(label)
}

export function getPlayableMove(
  prediction: Prediction | null,
  minConfidence = 0.55,
): PlayableMove | null {
  if (!prediction) return null
  if (!isPlayableMove(prediction.label)) return null
  if (prediction.confidence < minConfidence) return null
  return prediction.label
}

export function randomComputerMove(): PlayableMove {
  return PLAYABLE_MOVES[Math.floor(Math.random() * PLAYABLE_MOVES.length)]!
}

export function determineWinner(
  player: PlayableMove,
  computer: PlayableMove,
): GameResult {
  if (player === computer) return GameResult.Draw
  return BEATS[player] === computer ? GameResult.Win : GameResult.Lose
}

export function playRound(playerMove: PlayableMove): RoundOutcome {
  const computerMove = randomComputerMove()
  return {
    playerMove,
    computerMove,
    result: determineWinner(playerMove, computerMove),
  }
}

export function updateScore(score: Score, result: GameResult): Score {
  switch (result) {
    case GameResult.Win:
      return { ...score, player: score.player + 1 }
    case GameResult.Lose:
      return { ...score, computer: score.computer + 1 }
    case GameResult.Draw:
      return { ...score, draws: score.draws + 1 }
  }
}
