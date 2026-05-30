/**
 * Removes common markdown / formatting tokens from Speak Live `assistantReply` text
 * so neural TTS does not read "asterisk" aloud and on-screen copy matches audio.
 */
export function stripAssistantMarkdownForTts(text: string): string {
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
