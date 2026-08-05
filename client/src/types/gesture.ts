import { HandFist, Hand, Scissors, CircleHelp, type LucideIcon } from 'lucide-react'

export const GestureClass = {
  Nothing: 'nothing',
  Paper: 'paper',
  Rock: 'rock',
  Scissors: 'scissors',
} as const

export type GestureClass = (typeof GestureClass)[keyof typeof GestureClass]

export const PlayableMove = {
  Rock: GestureClass.Rock,
  Paper: GestureClass.Paper,
  Scissors: GestureClass.Scissors,
} as const

export type PlayableMove = (typeof PlayableMove)[keyof typeof PlayableMove]

export const PLAYABLE_MOVES: readonly PlayableMove[] = [
  PlayableMove.Rock,
  PlayableMove.Paper,
  PlayableMove.Scissors,
]

export const GESTURE_INFO: Record<
  GestureClass,
  { icon: LucideIcon; title: string; color: string }
> = {
  [GestureClass.Rock]: { icon: HandFist, title: 'Rock', color: '#f97316' },
  [GestureClass.Paper]: { icon: Hand, title: 'Paper', color: '#38bdf8' },
  [GestureClass.Scissors]: { icon: Scissors, title: 'Scissors', color: '#a78bfa' },
  [GestureClass.Nothing]: { icon: CircleHelp, title: 'No gesture', color: '#94a3b8' },
}
