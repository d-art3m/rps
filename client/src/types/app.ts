export const AppStatus = {
  Loading: 'loading',
  Ready: 'ready',
  Playing: 'playing',
  Error: 'error',
} as const

export type AppStatus = (typeof AppStatus)[keyof typeof AppStatus]
