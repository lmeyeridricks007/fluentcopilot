import type { QuickCaptureApiType } from '@/lib/api/quickCaptureClient'

export const QUICK_CAPTURE_ACTIONS = [
  { id: 'word' as const, label: 'Word', desc: 'Something you heard or read today' },
  { id: 'phrase' as const, label: 'Phrase', desc: 'A line you want to say again' },
  { id: 'photo' as const, label: 'Photo', desc: 'A sign, menu, or note worth keeping' },
  { id: 'place' as const, label: 'Place', desc: 'Somewhere you actually go' },
  { id: 'paste' as const, label: 'Paste', desc: 'From a message, email, or letter' },
  { id: 'problem' as const, label: 'Rough moment', desc: 'What felt hard — totally fine' },
  { id: 'voice' as const, label: 'Voice', desc: 'Say it out loud — we clean it up' },
] as const

export type QuickCaptureActionId = (typeof QUICK_CAPTURE_ACTIONS)[number]['id']

export function mapQuickCaptureActionToApiType(id: QuickCaptureActionId): QuickCaptureApiType {
  switch (id) {
    case 'word':
      return 'save_word'
    case 'phrase':
      return 'save_phrase'
    case 'photo':
      return 'photo_text'
    case 'place':
      return 'add_place'
    case 'paste':
      return 'paste_text'
    case 'problem':
      return 'log_struggle'
    case 'voice':
      return 'voice_note'
  }
}
