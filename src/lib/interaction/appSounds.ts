/**
 * Procedural, subtle UI sounds (Web Audio). Gated by device prefs + reduced interaction.
 * Replace with short OGG/WebM assets later by swapping implementations per cue.
 */

import { loadDevicePrefs } from '@/lib/device/devicePrefs'
import { prefersReducedInteraction } from '@/lib/interaction/prefersReducedInteraction'

export type AppSoundCue =
  | 'tap'
  | 'primary_action'
  | 'scenario_submit'
  | 'partner_turn'
  | 'answer_strong'
  | 'answer_ok'
  | 'answer_weak'
  | 'completion_success'
  | 'xp_tick'
  | 'streak_extend'
  | 'unlock_soft'
  | 'nav_tab'
  | 'recording_start'
  | 'recording_stop'
  | 'library_save'
  | 'ai_message_arrival'

const lastPlayedAt = new Map<AppSoundCue, number>()
const MIN_GAP_MS: Partial<Record<AppSoundCue, number>> = {
  tap: 70,
  primary_action: 90,
  scenario_submit: 200,
  partner_turn: 350,
  nav_tab: 120,
  xp_tick: 50,
  recording_start: 400,
  recording_stop: 400,
  library_save: 200,
  ai_message_arrival: 280,
}

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC()
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {})
  }
  return sharedCtx
}

function canPlay(cue: AppSoundCue): boolean {
  if (typeof window === 'undefined') return false
  if (prefersReducedInteraction()) return false
  if (!loadDevicePrefs().subtleSoundsEnabled) return false
  const minGap = MIN_GAP_MS[cue] ?? 160
  const now = performance.now()
  const last = lastPlayedAt.get(cue) ?? 0
  if (now - last < minGap) return false
  lastPlayedAt.set(cue, now)
  return true
}

function beep(
  ctx: AudioContext,
  t0: number,
  freq: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/**
 * Play a short UI cue. No-op when sounds off, reduced motion, or debounced.
 */
export function playAppSound(cue: AppSoundCue): void {
  if (!canPlay(cue)) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t0 = ctx.currentTime

    switch (cue) {
      case 'tap':
      case 'nav_tab':
        beep(ctx, t0, cue === 'nav_tab' ? 720 : 880, 0.038, 0.055)
        break
      case 'primary_action':
        beep(ctx, t0, 620, 0.045, 0.065)
        break
      case 'scenario_submit':
        beep(ctx, t0, 520, 0.05, 0.07)
        beep(ctx, t0 + 0.06, 780, 0.04, 0.045)
        break
      case 'partner_turn':
        beep(ctx, t0, 440, 0.08, 0.05, 'triangle')
        beep(ctx, t0 + 0.1, 550, 0.07, 0.04, 'triangle')
        break
      case 'answer_strong':
        beep(ctx, t0, 660, 0.07, 0.06)
        beep(ctx, t0 + 0.085, 880, 0.08, 0.055)
        break
      case 'answer_ok':
        beep(ctx, t0, 580, 0.09, 0.055)
        break
      case 'answer_weak':
        beep(ctx, t0, 320, 0.12, 0.045, 'triangle')
        break
      case 'completion_success':
        beep(ctx, t0, 523, 0.09, 0.055)
        beep(ctx, t0 + 0.1, 659, 0.1, 0.05)
        beep(ctx, t0 + 0.22, 784, 0.14, 0.045)
        break
      case 'xp_tick':
        beep(ctx, t0, 990, 0.028, 0.04)
        break
      case 'streak_extend':
        beep(ctx, t0, 740, 0.06, 0.055)
        beep(ctx, t0 + 0.08, 990, 0.07, 0.04)
        break
      case 'unlock_soft':
        beep(ctx, t0, 600, 0.1, 0.05)
        beep(ctx, t0 + 0.12, 900, 0.12, 0.04)
        break
      case 'recording_start':
        beep(ctx, t0, 380, 0.06, 0.06, 'triangle')
        beep(ctx, t0 + 0.07, 520, 0.05, 0.045, 'triangle')
        break
      case 'recording_stop':
        beep(ctx, t0, 520, 0.05, 0.05)
        beep(ctx, t0 + 0.06, 320, 0.07, 0.04, 'triangle')
        break
      case 'library_save':
        beep(ctx, t0, 720, 0.05, 0.055)
        beep(ctx, t0 + 0.07, 960, 0.06, 0.042)
        break
      case 'ai_message_arrival':
        beep(ctx, t0, 480, 0.07, 0.048, 'triangle')
        beep(ctx, t0 + 0.09, 620, 0.08, 0.04, 'triangle')
        break
      default:
        beep(ctx, t0, 800, 0.04, 0.05)
    }
  } catch {
    /* autoplay / AudioContext */
  }
}
