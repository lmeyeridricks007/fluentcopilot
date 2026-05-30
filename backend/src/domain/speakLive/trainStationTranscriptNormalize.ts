/**
 * Dutch Train Station — transcript normalization for robust rule matching (STT / typos).
 * Preserves word boundaries and meaning-bearing tokens (trein, perron, vertrek, tijd, …).
 */

/** Token- or phrase-level fixes applied after casefold + diacritics strip (order matters). */
const DUTCH_ASR_SUBSTITUTIONS: readonly { pattern: RegExp; replacement: string }[] = [
  /* perron family */
  { pattern: /\bperon\b|\bparen\b|\bparon\b|\bperronn\b/gi, replacement: 'perron' },
  /* trein family */
  { pattern: /\btrayn\b|\btrain\b|\btraiin\b|\btreintje\b/gi, replacement: 'trein' },
  { pattern: /\bde\s+trejn\b|\bde\s+tren\b/gi, replacement: 'de trein' },
  /* tijd / op tijd */
  { pattern: /\btyd\b|\btijdt\b/gi, replacement: 'tijd' },
  { pattern: /\boptijd\b|\bop\s+tijdt\b/gi, replacement: 'op tijd' },
  /* spoor */
  { pattern: /\bsporr\b|\bspor\b|\bspoort\b(?!\w)/gi, replacement: 'spoor' },
  /* vertrek */
  { pattern: /\bvertrec\b|\bvertrekk\b|\bvertrektu\b/gi, replacement: 'vertrekt' },
  /* wanneer / hoe laat */
  { pattern: /\bwanne\b|\bwanneer\b/gi, replacement: 'wanneer' },
  { pattern: /\bhoelat\b|\bhoelaat\b/gi, replacement: 'hoe laat' },
  /* vertraging */
  { pattern: /\bvertragingg\b|\bvertaging\b|\bvertraginge\b/gi, replacement: 'vertraging' },
  /* strip oral fillers */
  { pattern: /\b(uh|eh|ehm|nou|ja)\b/gi, replacement: ' ' },
  /**
   * English STT often says "tram to Amsterdam …" — destination rules key off Dutch `naar` / `tot` / `richting`.
   * Map modality + "to" → "naar" so the same matchers fire without widening false positives on other English.
   */
  { pattern: /\b(tram|bus|metro|trein)\s+to\s+/gi, replacement: '$1 naar ' },
]

/**
 * Full normalization pipeline for matcher input:
 * lowercase, trim, NFD + strip combining marks, strip quotes, punctuation → space,
 * collapse whitespace, common Dutch ASR / typo substitutions.
 */
export function normalizeTrainStationUtterance(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.normalize('NFD').replace(/\p{M}/gu, '')
  s = s.replace(/[''`´""«»]+/g, '')
  s = s.replace(/[?!.,;:…\-–—_/\\]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  for (const { pattern, replacement } of DUTCH_ASR_SUBSTITUTIONS) {
    s = s.replace(pattern, replacement)
  }
  return s.replace(/\s+/g, ' ').trim()
}
