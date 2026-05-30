/**
 * Short UI sounds for correct / incorrect answers (Web Audio API — no asset files).
 * Success: bright ascending “celebration” arpeggio (Duolingo-style cheer).
 * Skipped when prefers-reduced-motion: reduce.
 */

function wantsLessSensoryFeedback(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC()
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume()
  }
  return sharedCtx
}

type ToneStep = { freq: number; delay: number; peak: number; type: OscillatorType }

/**
 * Duolingo-like success: quick ascending major arpeggio + high “sparkle”, louder and brighter than a plain ding.
 */
export function playAnswerSuccessSound(): void {
  if (wantsLessSensoryFeedback()) return
  const ctx = getAudioContext()
  if (!ctx) return
  const t0 = ctx.currentTime

  const steps: ToneStep[] = [
    { freq: 523.25, delay: 0, peak: 0.26, type: 'triangle' }, // C5 — warm body
    { freq: 659.25, delay: 0.058, peak: 0.3, type: 'triangle' }, // E5
    { freq: 783.99, delay: 0.116, peak: 0.32, type: 'triangle' }, // G5
    { freq: 1046.5, delay: 0.174, peak: 0.34, type: 'sine' }, // C6 — clear ping
    { freq: 1318.51, delay: 0.228, peak: 0.28, type: 'sine' }, // E6 — happy finish
  ]

  for (const { freq, delay, peak, type } of steps) {
    const start = t0 + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    // Snappy attack, short decay = playful / app-like
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.13)
  }

  // Extra “shimmer”: very short high harmonic on the last hit (barely audible layer)
  const shimStart = t0 + 0.228
  const shim = ctx.createOscillator()
  const shimGain = ctx.createGain()
  shim.type = 'sine'
  shim.frequency.value = 2637 // E7
  shimGain.gain.setValueAtTime(0.0001, shimStart + 0.02)
  shimGain.gain.exponentialRampToValueAtTime(0.08, shimStart + 0.028)
  shimGain.gain.exponentialRampToValueAtTime(0.0001, shimStart + 0.09)
  shim.connect(shimGain)
  shimGain.connect(ctx.destination)
  shim.start(shimStart + 0.02)
  shim.stop(shimStart + 0.1)
}

/** Wrong: clearer bump, still short — slightly louder than before. */
export function playAnswerWrongSound(): void {
  if (wantsLessSensoryFeedback()) return
  const ctx = getAudioContext()
  if (!ctx) return
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(240, t0)
  osc.frequency.exponentialRampToValueAtTime(130, t0 + 0.14)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + 0.28)
}
