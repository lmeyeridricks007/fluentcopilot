/**
 * Incrementally decode a JSON string value for the assistant line from a growing
 * `response_format: json_object` stream buffer (OpenAI / Azure chat completions).
 * Supports ultra-lean Speak Live (`assistantText`) and legacy reply-only (`assistantReply`).
 */

import { stripAssistantMarkdownForTts } from '../../../domain/speakLive/stripAssistantMarkdownForTts'

function scanJsonStringField(buffer: string, fieldName: string): { decoded: string; complete: boolean } | null {
  const needle = `"${fieldName}"`
  const i = buffer.indexOf(needle)
  if (i === -1) return null
  let pos = i + needle.length
  while (pos < buffer.length && /\s/.test(buffer[pos]!)) pos++
  if (pos >= buffer.length || buffer[pos] !== ':') return null
  pos++
  while (pos < buffer.length && /\s/.test(buffer[pos]!)) pos++
  if (pos >= buffer.length || buffer[pos] !== '"') return null
  pos++

  let decoded = ''
  let escaped = false
  while (pos < buffer.length) {
    const ch = buffer[pos]!
    if (escaped) {
      if (ch === 'n') decoded += '\n'
      else if (ch === 'r') decoded += '\r'
      else if (ch === 't') decoded += '\t'
      else if (ch === 'b') decoded += '\b'
      else if (ch === 'f') decoded += '\f'
      else if (ch === 'u') {
        if (buffer.length - (pos + 1) < 4) return { decoded, complete: false }
        const hex = buffer.slice(pos + 1, pos + 5)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          decoded += ch
          escaped = false
          pos++
          continue
        }
        decoded += String.fromCharCode(parseInt(hex, 16))
        escaped = false
        pos += 5
        continue
      } else decoded += ch
      escaped = false
      pos++
      continue
    }
    if (ch === '\\') {
      escaped = true
      pos++
      continue
    }
    if (ch === '"') {
      return { decoded, complete: true }
    }
    decoded += ch
    pos++
  }
  return { decoded, complete: false }
}

export function scanAssistantReplyJsonString(buffer: string): { decoded: string; complete: boolean } | null {
  const t = scanJsonStringField(buffer, 'assistantText')
  if (t) return t
  return scanJsonStringField(buffer, 'assistantReply')
}

export function nextAssistantReplyTextDelta(
  buffer: string,
  prevEmittedStrippedLen: number
): { delta: string; newEmittedStrippedLen: number } {
  const peek = scanAssistantReplyJsonString(buffer)
  if (!peek) return { delta: '', newEmittedStrippedLen: prevEmittedStrippedLen }
  const stripped = stripAssistantMarkdownForTts(peek.decoded)
  if (stripped.length <= prevEmittedStrippedLen) {
    return { delta: '', newEmittedStrippedLen: prevEmittedStrippedLen }
  }
  return {
    delta: stripped.slice(prevEmittedStrippedLen),
    newEmittedStrippedLen: stripped.length,
  }
}
