import type { ExamTaskInstance } from './types'

/** Common Dutch first names — A-side dialogue ≈ male, B-side ≈ female for clear contrast. */
const LISTENING_NAME_A_POOL = [
  'Daan',
  'Bram',
  'Finn',
  'Luuk',
  'Noah',
  'Sem',
  'Milan',
  'Thijs',
  'Lars',
  'Tim',
  'Tom',
  'Mark',
  'Erik',
  'Bas',
  'Rick',
  'Hugo',
  'Koen',
  'Jesse',
  'Olivier',
  'Stefan',
] as const

const LISTENING_NAME_B_POOL = [
  'Emma',
  'Sophie',
  'Anna',
  'Lisa',
  'Eva',
  'Julia',
  'Fleur',
  'Lotte',
  'Iris',
  'Nora',
  'Mila',
  'Sara',
  'Noor',
  'Liv',
  'Isa',
  'Roos',
  'Eline',
  'Marie',
  'Laura',
  'Nina',
] as const

function hash32(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Stable pair of Dutch names for one listening item (same item in a session → same names).
 */
export function pickListeningSpeakerNames(seedKey: string): { nameA: string; nameB: string } {
  const h = hash32(seedKey)
  const nameA = LISTENING_NAME_A_POOL[h % LISTENING_NAME_A_POOL.length]!
  let nameB = LISTENING_NAME_B_POOL[(h >>> 5) % LISTENING_NAME_B_POOL.length]!
  /**
   * Defensive: today the two pools are disjoint (men vs women), so {@link TS2367} flags this as always false.
   * Compare via `String` so the guard still works if the pools are ever extended to share names.
   */
  if (String(nameA) === String(nameB)) {
    nameB = LISTENING_NAME_B_POOL[(h + 7) % LISTENING_NAME_B_POOL.length]!
  }
  return { nameA, nameB }
}

/**
 * Standalone speaker A/B: not followed by a letter or hyphen (avoids “Bij”, “B-weg”, “naar”).
 * Still allows “stuurt A …”, “B excuseert …”, “Dat zegt A niet.”
 */
function replaceSpeakerLetterStrict(text: string, letter: 'A' | 'B', name: string): string {
  const re = new RegExp(`(?<!\\p{L})${letter}(?![\\p{L}-])`, 'gu')
  return text.replace(re, name)
}

function applyNlPhraseRules(nl: string, nameA: string, nameB: string): string {
  let out = nl
  /** Word boundary after A/B so “volgens Bram” is not matched as “volgens B”. */
  out = out.replace(/volgens B\b/giu, () => `volgens ${nameB}`)
  out = out.replace(/volgens A\b/giu, () => `volgens ${nameA}`)
  out = out.replace(/persoon B\b/giu, () => nameB)
  out = out.replace(/persoon A\b/giu, () => nameA)
  out = out.replace(/klant A\b/giu, () => nameA)
  out = out.replace(/klant B\b/giu, () => nameB)
  return out
}

function applyEnPhraseRules(en: string, nameA: string, nameB: string): string {
  let out = en
  out = out.replace(/according to B\b/giu, () => `according to ${nameB}`)
  out = out.replace(/according to A\b/giu, () => `according to ${nameA}`)
  out = out.replace(/person B\b/giu, () => nameB)
  out = out.replace(/person A\b/giu, () => nameA)
  out = out.replace(/customer A\b/giu, () => nameA)
  out = out.replace(/customer B\b/giu, () => nameB)
  return out
}

function personalizeDutchListeningText(text: string, nameA: string, nameB: string): string {
  let s = applyNlPhraseRules(text.trim(), nameA, nameB)
  s = replaceSpeakerLetterStrict(s, 'A', nameA)
  s = replaceSpeakerLetterStrict(s, 'B', nameB)
  return s
}

function personalizeEnglishListeningText(text: string, nameA: string, nameB: string): string {
  let s = applyEnPhraseRules(text.trim(), nameA, nameB)
  s = replaceSpeakerLetterStrict(s, 'A', nameA)
  s = replaceSpeakerLetterStrict(s, 'B', nameB)
  return s
}

/**
 * Replace dialogue speaker placeholders A/B in listening MCQ prompts with Dutch first names.
 */
export function personalizeListeningMcqPrompts(
  questionNl: string,
  questionEn: string,
  nameA: string,
  nameB: string,
): { promptNl: string; promptEn: string } {
  return {
    promptNl: personalizeDutchListeningText(questionNl, nameA, nameB),
    promptEn: personalizeEnglishListeningText(questionEn, nameA, nameB),
  }
}

/** Dutch MCQ option line — same rules as the Dutch side of the question stem. */
export function personalizeListeningMcqOptionLabelNl(
  label: string,
  nameA: string,
  nameB: string,
): string {
  return personalizeDutchListeningText(label, nameA, nameB)
}

/** Stable seed for name picks; must stay aligned with {@link resolveListeningMcqDisplayText} fallbacks. */
export function listeningSpeakerNameSeedForTask(
  task: Pick<ExamTaskInstance, 'id' | 'listeningSpeakerNameSeed' | 'listeningScriptNl' | 'promptNl'>,
  sessionId: string,
): string {
  const fromTask = task.listeningSpeakerNameSeed?.trim()
  if (fromTask) return fromTask
  return `${sessionId}:${task.id}:${(task.listeningScriptNl ?? '').trim()}:${task.promptNl}`
}

/**
 * Re-apply A/B → Dutch name substitution for display and read-aloud (covers older persisted sessions).
 */
export function resolveListeningMcqDisplayText(
  task: ExamTaskInstance,
  sessionId: string,
): { promptNl: string; promptEn: string; readAloudTask: Pick<ExamTaskInstance, 'promptNl' | 'mcq'> } | null {
  if (task.taskType !== 'listening_mcq_exam' || !task.mcq?.options?.length) return null
  const seed = listeningSpeakerNameSeedForTask(task, sessionId)
  const { nameA, nameB } = pickListeningSpeakerNames(seed)
  const { promptNl, promptEn } = personalizeListeningMcqPrompts(task.promptNl, task.promptEn, nameA, nameB)
  const options = task.mcq.options.map((o) => ({
    ...o,
    label: personalizeListeningMcqOptionLabelNl(o.label, nameA, nameB),
  }))
  return {
    promptNl,
    promptEn,
    readAloudTask: { promptNl, mcq: { ...task.mcq, options } },
  }
}
