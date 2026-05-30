/**
 * Browser Web Speech API — Dutch practice / exam prep (nl-NL).
 * Chrome generally supports; Safari varies.
 */
export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}
