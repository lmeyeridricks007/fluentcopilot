import type { PracticeInputModality, RecoveryKind } from '@/lib/practice-orchestration/types'

export interface RecoveryResult {
  kind: RecoveryKind
  /** If set, prefer this assistant line (still post-processed for A2). */
  scriptedAssistantNl?: string
  coachEn?: string
}

const ENGLISH_HINT =
  /^(i |i'm|i am|can you|what does|how do|hello|hi|yes|no|ok|okay|please|thank you|thanks)\b/i
const DONT_KNOW = /\b(ik weet (het )?niet|geen idee|i don't know|no idea)\b/i
const HELP_REQ = /\b(help|hint|wat betekent|what does that mean|langzamer|simpler|easier)\b/i

/**
 * Graceful recovery — keeps confidence up, narrows task, avoids grammar essays.
 */
export function detectRecovery(input: {
  userMessage: string
  inputModality?: PracticeInputModality
  sttConfidence?: number
}): RecoveryResult {
  const u = input.userMessage.trim()
  const lowStt =
    input.inputModality === 'speech_transcript_low_confidence' ||
    (input.sttConfidence !== undefined && input.sttConfidence < 0.45)

  if (lowStt) {
    return {
      kind: 'low_confidence_speech',
      scriptedAssistantNl:
        'Ik verstond het niet helemaal. Kunt u het in één korte zin herhalen? U mag ook typen.',
      coachEn: 'Low microphone confidence — try again slowly or switch to typing.',
    }
  }

  if (u.length < 2) {
    return {
      kind: 'too_short',
      scriptedAssistantNl: 'Kunt u dat in één korte zin proberen in het Nederlands?',
      coachEn: 'Say one short sentence about what you want.',
    }
  }

  if (DONT_KNOW.test(u)) {
    return {
      kind: 'dont_know',
      scriptedAssistantNl:
        'Geen probleem. U kunt zeggen: “Mag ik … alstublieft?” of “Ik wil graag …” — wat past hier?',
      coachEn: 'Pick one short model phrase and send it.',
    }
  }

  if (ENGLISH_HINT.test(u) && !/[a-z]{4,}/i.test(u.replace(ENGLISH_HINT, ''))) {
    return {
      kind: 'english_input',
      scriptedAssistantNl:
        'Laten we in het Nederlands blijven. Probeer één korte zin. Bijvoorbeeld: “Ik wil graag …”',
      coachEn: 'Switch back to Dutch with one simple sentence.',
    }
  }

  if (HELP_REQ.test(u)) {
    return {
      kind: 'help_request',
      scriptedAssistantNl:
        'Prima. Gebruik een korte zin met “alstublieft” of “mag ik …”. Wat wilt u vragen?',
      coachEn: 'Use a polite short request in Dutch.',
    }
  }

  return { kind: 'none' }
}
