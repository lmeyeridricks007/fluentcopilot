/**
 * Browser TTS for Dutch preview/dialogue when audio files are absent.
 * `speechGen` invalidates in-flight dialogue when the user starts new speech or stops.
 */
let speechGen = 0

export function stopSpeak(): void {
  speechGen++
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

const DEFAULT_NL_RATE = 0.92

export function speakNl(text: string, rate: number = DEFAULT_NL_RATE): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  stopSpeak()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'
  u.rate = rate
  window.speechSynthesis.speak(u)
}

export type SpeakNlAsyncOptions = { rate?: number }

/** Same voice as `speakNl`, resolves when playback finishes or errors (e.g. review listening gate). */
export function speakNlAsync(text: string, options?: SpeakNlAsyncOptions): Promise<void> {
  const rate = options?.rate ?? DEFAULT_NL_RATE
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve()
  }
  stopSpeak()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'nl-NL'
    u.rate = rate
    const done = () => resolve()
    u.onend = done
    u.onerror = done
    window.speechSynthesis.speak(u)
  })
}

/** Speak multiple Dutch lines sequentially; resolves when the last line finishes or errors. */
export function speakNlLinesAsync(
  lines: string[],
  options?: { rate?: number; pauseMsBetween?: number }
): Promise<void> {
  const rate = options?.rate ?? DEFAULT_NL_RATE
  const pauseMs = options?.pauseMsBetween ?? 480
  if (typeof window === 'undefined' || !window.speechSynthesis || lines.length === 0) {
    return Promise.resolve()
  }
  stopSpeak()
  const runId = speechGen
  return new Promise((resolve) => {
    let i = 0
    const finish = () => resolve()
    const speakNext = (): void => {
      if (runId !== speechGen) return finish()
      if (i >= lines.length) return finish()
      const u = new SpeechSynthesisUtterance(lines[i])
      i += 1
      u.lang = 'nl-NL'
      u.rate = rate
      u.onend = () => {
        if (runId !== speechGen) return finish()
        if (i < lines.length) {
          window.setTimeout(speakNext, pauseMs)
        } else {
          finish()
        }
      }
      u.onerror = u.onend
      window.speechSynthesis.speak(u)
    }
    speakNext()
  })
}

/**
 * Speak lines one after another with a short pause between speakers (natural dialogue feel).
 */
export function speakDialogueLines(
  lines: string[],
  options?: { pauseMsBetween?: number; rate?: number }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || lines.length === 0) return
  stopSpeak()
  const runId = speechGen
  const pauseMs = options?.pauseMsBetween ?? 520
  const rate = options?.rate ?? 0.92
  let i = 0

  const speakNext = (): void => {
    if (runId !== speechGen) return
    if (i >= lines.length) return
    const u = new SpeechSynthesisUtterance(lines[i])
    i += 1
    u.lang = 'nl-NL'
    u.rate = rate
    const scheduleNext = () => {
      if (runId !== speechGen) return
      if (i < lines.length) {
        window.setTimeout(speakNext, pauseMs)
      }
    }
    u.onend = scheduleNext
    u.onerror = scheduleNext
    window.speechSynthesis.speak(u)
  }

  speakNext()
}
