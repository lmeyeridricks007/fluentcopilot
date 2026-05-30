'use client'

import { useEffect, useReducer } from 'react'
import type { SpeakLiveCallError, SpeakLiveCallPhase, SpeakLiveExchange, SpeakLiveMicMode } from './speakLiveCallTypes'

export type CallMachineState = {
  phase: SpeakLiveCallPhase
  micMode: SpeakLiveMicMode
  error: SpeakLiveCallError | null
  muted: boolean
  transcriptOpen: boolean
  settingsOpen: boolean
  exchanges: SpeakLiveExchange[]
  listenMs: number
  listeningStartedAt: number | null
  networkSlow: boolean
}

const initialState: CallMachineState = {
  phase: 'idle',
  micMode: 'toggle',
  error: null,
  muted: false,
  transcriptOpen: false,
  settingsOpen: false,
  exchanges: [],
  listenMs: 0,
  listeningStartedAt: null,
  networkSlow: false,
}

type Action =
  | { type: 'RESET_ERROR' }
  | { type: 'SET_ERROR'; error: SpeakLiveCallError }
  | { type: 'START_LISTENING'; at: number }
  | { type: 'TICK_LISTEN'; now: number }
  | { type: 'ENTER_PROCESSING' }
  | { type: 'ENTER_AI_SPEAKING' }
  | { type: 'ENTER_IDLE' }
  | { type: 'INTERRUPT_AI_TO_LISTENING'; at: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'TOGGLE_TRANSCRIPT' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_MIC_MODE'; mode: SpeakLiveMicMode }
  | { type: 'APPEND_EXCHANGE'; exchange: SpeakLiveExchange }
  | { type: 'SET_NETWORK_SLOW'; value: boolean }

function reducer(s: CallMachineState, a: Action): CallMachineState {
  switch (a.type) {
    case 'RESET_ERROR':
      return { ...s, error: null }
    case 'SET_ERROR':
      return {
        ...s,
        error: a.error,
        phase: 'idle',
        listeningStartedAt: null,
        listenMs: 0,
        networkSlow: false,
      }
    case 'START_LISTENING':
      if (s.phase === 'paused') return s
      return {
        ...s,
        phase: 'listening',
        error: null,
        listenMs: 0,
        listeningStartedAt: a.at,
        networkSlow: false,
      }
    case 'TICK_LISTEN':
      if (s.phase !== 'listening' || s.listeningStartedAt == null) return s
      return { ...s, listenMs: Math.max(0, a.now - s.listeningStartedAt) }
    case 'ENTER_PROCESSING':
      if (s.phase !== 'listening') return s
      return {
        ...s,
        phase: 'processing',
        listeningStartedAt: null,
        /** keep `listenMs` as captured utterance length for UX / delay heuristics */
        networkSlow: false,
      }
    case 'ENTER_AI_SPEAKING':
      return { ...s, phase: 'ai_speaking', networkSlow: false }
    case 'ENTER_IDLE':
      return {
        ...s,
        phase: 'idle',
        listeningStartedAt: null,
        listenMs: 0,
        networkSlow: false,
      }
    case 'INTERRUPT_AI_TO_LISTENING':
      return {
        ...s,
        phase: 'listening',
        listenMs: 0,
        listeningStartedAt: a.at,
        error: null,
        networkSlow: false,
      }
    case 'TOGGLE_PAUSE':
      if (s.phase === 'paused') return { ...s, phase: 'idle', listeningStartedAt: null, listenMs: 0 }
      return { ...s, phase: 'paused', listeningStartedAt: null, listenMs: 0, networkSlow: false }
    case 'TOGGLE_TRANSCRIPT':
      return { ...s, transcriptOpen: !s.transcriptOpen }
    case 'TOGGLE_MUTE':
      return { ...s, muted: !s.muted }
    case 'TOGGLE_SETTINGS':
      return { ...s, settingsOpen: !s.settingsOpen }
    case 'SET_MIC_MODE':
      return { ...s, micMode: a.mode }
    case 'APPEND_EXCHANGE':
      return { ...s, exchanges: [...s.exchanges, a.exchange].slice(-10) }
    case 'SET_NETWORK_SLOW':
      return { ...s, networkSlow: a.value }
    default:
      return s
  }
}

export function useSpeakLiveCallMachine() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (state.phase !== 'listening' || state.listeningStartedAt == null) return undefined
    const id = setInterval(() => {
      dispatch({ type: 'TICK_LISTEN', now: Date.now() })
    }, 100)
    return () => clearInterval(id)
  }, [state.phase, state.listeningStartedAt])

  return { state, dispatch }
}
