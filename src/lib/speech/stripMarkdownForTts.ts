/**
 * Strip markdown-style markers before TTS (Speak Live / Language Coach).
 * Keeps Dutch letters; removes tokens that Azure/OpenAI TTS may read as "asterisk".
 */
export function stripMarkdownForTts(text: string): string {
  if (!text) return text
  let s = text
  s = s.replace(/\*\*([^*]*)\*\*/g, '$1')
  s = s.replace(/\*([^*]*)\*/g, '$1')
  s = s.replace(/__([^_]*)__/g, '$1')
  s = s.replace(/_([^_ ]*)_/g, '$1')
  s = s.replace(/\*+/g, '')
  s = s.replace(/_{2,}/g, '')
  s = s.replace(/#{1,6}\s*/g, '')
  s = s.replace(/[ \t]+\n/g, '\n')
  return s.replace(/[ \t]{2,}/g, ' ').trim()
}
