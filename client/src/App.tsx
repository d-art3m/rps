import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Smile, CircleHelp, Dices } from 'lucide-react'
import type { InferenceSession } from 'onnxruntime-web'
import {
  AppStatus,
  GamePhase,
  GESTURE_INFO,
  RESULT_TEXT,
  type ModelMetadata,
  type Prediction,
  type RoundOutcome,
  type Score,
} from './types'
import { loadMetadata, loadModel, predict } from './utils/model'
import { preprocessFrame } from './utils/preprocess'
import { getPlayableMove, playRound, updateScore } from './utils/game'
import './App.css'

const INFERENCE_INTERVAL_MS = 150
const COUNTDOWN_SECONDS = 3
const REVEAL_DELAY_MS = 700

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef<InferenceSession | null>(null)
  const metadataRef = useRef<ModelMetadata | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastInferenceRef = useRef(0)
  const predictionRef = useRef<Prediction | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const revealTimerRef = useRef<number | null>(null)

  const [status, setStatus] = useState<AppStatus>(AppStatus.Loading)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Idle)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [livePrediction, setLivePrediction] = useState<Prediction | null>(null)
  const [round, setRound] = useState<RoundOutcome | null>(null)
  const [score, setScore] = useState<Score>({ player: 0, computer: 0, draws: 0 })

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const [metadata, session] = await Promise.all([loadMetadata(), loadModel()])
        if (cancelled) return

        metadataRef.current = metadata
        sessionRef.current = session
        setStatus(AppStatus.Ready)
      } catch (initError) {
        if (cancelled) return
        setStatus(AppStatus.Error)
        setError(initError instanceof Error ? initError.message : 'Error loading model')
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    clearTimers()

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }

    setCameraActive(false)
    setStatus(sessionRef.current ? AppStatus.Ready : AppStatus.Loading)
    setPhase(GamePhase.Idle)
    setCountdown(null)
    setLivePrediction(null)
    setRound(null)
    predictionRef.current = null
  }, [clearTimers])

  const runInferenceLoop = useCallback(() => {
    const video = videoRef.current
    const session = sessionRef.current
    const metadata = metadataRef.current

    if (!video || !session || !metadata || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(runInferenceLoop)
      return
    }

    const now = performance.now()
    if (now - lastInferenceRef.current >= INFERENCE_INTERVAL_MS) {
      lastInferenceRef.current = now

      void (async () => {
        try {
          const input = preprocessFrame(
            video,
            video.videoWidth,
            video.videoHeight,
            metadata,
            true,
          )
          const nextPrediction = await predict(session, metadata, input)
          predictionRef.current = nextPrediction
          setLivePrediction(nextPrediction)
        } catch (inferenceError) {
          setStatus(AppStatus.Error)
          setError(
            inferenceError instanceof Error
              ? inferenceError.message
              : 'Error recognizing gesture',
          )
          stopCamera()
        }
      })()
    }

    rafRef.current = requestAnimationFrame(runInferenceLoop)
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      const video = videoRef.current
      if (!video) {
        throw new Error('Video element is unavailable')
      }

      streamRef.current = stream
      video.srcObject = stream
      await video.play()

      setCameraActive(true)
      setStatus(AppStatus.Playing)
      setPhase(GamePhase.Idle)
      rafRef.current = requestAnimationFrame(runInferenceLoop)
    } catch (cameraError) {
      setStatus(AppStatus.Error)
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : 'Could not access the camera',
      )
    }
  }, [runInferenceLoop])

  const finishRound = useCallback((playerMove: ReturnType<typeof getPlayableMove>) => {
    if (!playerMove) {
      setPhase(GamePhase.Idle)
      setCountdown(null)
      setError('Gesture not recognized. Try again.')
      return
    }

    const outcome = playRound(playerMove)
    setRound(outcome)
    setPhase(GamePhase.Reveal)
    setCountdown(null)
    setError(null)

    revealTimerRef.current = window.setTimeout(() => {
      setPhase(GamePhase.Result)
      setScore((current) => updateScore(current, outcome.result))
    }, REVEAL_DELAY_MS)
  }, [])

  const startRound = useCallback(() => {
    if (!cameraActive || phase === GamePhase.Countdown) return

    clearTimers()
    setRound(null)
    setError(null)
    setPhase(GamePhase.Countdown)

    const runCountdown = (value: number) => {
      setCountdown(value)

      if (value > 0) {
        countdownTimerRef.current = window.setTimeout(() => runCountdown(value - 1), 1000)
        return
      }

      revealTimerRef.current = window.setTimeout(() => {
        finishRound(getPlayableMove(predictionRef.current))
      }, 350)
    }

    runCountdown(COUNTDOWN_SECONDS)
  }, [cameraActive, clearTimers, finishRound, phase])

  const resetScore = useCallback(() => {
    setScore({ player: 0, computer: 0, draws: 0 })
    setRound(null)
    setPhase(GamePhase.Idle)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const liveMove = getPlayableMove(livePrediction)
  const liveGesture = liveMove ? GESTURE_INFO[liveMove] : null
  const playerGesture = round ? GESTURE_INFO[round.playerMove] : liveGesture
  const computerGesture =
    round && phase !== GamePhase.Countdown
      ? GESTURE_INFO[round.computerMove]
      : { icon: CircleHelp, title: '???', color: '#64748b' }

  const overlayMessage = (() => {
    if (phase === GamePhase.Countdown && countdown !== null && countdown > 0) {
      return String(countdown)
    }
    if (phase === GamePhase.Countdown && countdown === 0) {
      return 'Snap!'
    }
    if (phase === GamePhase.Reveal) {
      return <Dices size={48} />
    }
    if (phase === GamePhase.Result && round) {
      return RESULT_TEXT[round.result]
    }
    if (cameraActive && phase === GamePhase.Idle) {
      return 'Click Play'
    }
    return null
  })()

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>Rock-Paper-Scissors</h1>
          <p className="subtitle">
            Show your gesture to the camera. After the countdown, your move is captured.
          </p>
        </div>
        <div className="status-pill" data-status={status}>
          {status === AppStatus.Loading && 'Loading model...'}
          {status === AppStatus.Ready && 'Ready to play'}
          {status === AppStatus.Playing && 'Playing'}
          {status === AppStatus.Error && 'Error'}
        </div>
      </header>

      <section className="scoreboard">
        <div className="score-card">
          <span className="score-label">You</span>
          <strong>{score.player}</strong>
        </div>
        <div className="score-card draw">
          <span className="score-label">Draws</span>
          <strong>{score.draws}</strong>
        </div>
        <div className="score-card computer">
          <span className="score-label">Computer</span>
          <strong>{score.computer}</strong>
        </div>
      </section>

      <main className="layout game-layout">
        <section className="camera-panel">
          <div className="video-frame">
            <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
            {!cameraActive && (
              <div className="video-overlay">
                <p>Start the camera to begin the game.</p>
              </div>
            )}
            {overlayMessage && (
              <div className="countdown-overlay" data-phase={phase}>
                <span>{overlayMessage}</span>
              </div>
            )}
          </div>

          <div className="controls">
            {!cameraActive ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void startCamera()}
                disabled={status === AppStatus.Loading || status === AppStatus.Error}
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={startRound}
                  disabled={phase === GamePhase.Countdown || phase === GamePhase.Reveal}
                >
                  {phase === GamePhase.Result ? 'Another Round' : 'Play'}
                </button>
                <button type="button" className="secondary-button" onClick={resetScore}>
                  Reset Score
                </button>
                <button type="button" className="secondary-button" onClick={stopCamera}>
                  Stop
                </button>
              </>
            )}
          </div>

          {error && <p className="error-banner">{error}</p>}
        </section>

        <section className="result-panel game-panel">
          <div className="battle-arena">
            <div
              className="gesture-card player-card"
              style={{ '--accent': playerGesture?.color ?? '#64748b' } as CSSProperties}
            >
              <span className="card-tag">You</span>
              <span className="gesture-icon">
                {playerGesture ? <playerGesture.icon size={64} /> : <Smile size={64} />}
              </span>
              <h2>{playerGesture?.title ?? 'Gesture...'}</h2>
              {livePrediction && (phase === GamePhase.Idle || phase === GamePhase.Countdown) && (
                <p className="confidence">
                  {(livePrediction.confidence * 100).toFixed(0)}% confidence
                </p>
              )}
            </div>

            <div className="versus-badge">VS</div>

            <div
              className="gesture-card computer-card"
              style={{ '--accent': computerGesture.color } as CSSProperties}
            >
              <span className="card-tag">Computer</span>
              <span className="gesture-icon">
                <computerGesture.icon size={64} />
              </span>
              <h2>{computerGesture.title}</h2>
            </div>
          </div>

          <div
            className="round-result"
            data-result={round?.result ?? 'pending'}
          >
            {phase === GamePhase.Result && round ? (
              <>
                <h3>{RESULT_TEXT[round.result]}</h3>
                <p>
                  {GESTURE_INFO[round.playerMove].title} vs{' '}
                  {GESTURE_INFO[round.computerMove].title}
                </p>
              </>
            ) : phase === GamePhase.Countdown ? (
              <p>Get ready to show your gesture...</p>
            ) : (
              <p>Click "Play" when you are ready.</p>
            )}
          </div>

          <div className="hint-box">
            <p>Hint: Keep your hand in the center of the frame.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
