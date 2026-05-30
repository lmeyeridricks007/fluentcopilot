import { isWritingExamGibberish } from './scoringEngine'
import { writingPromptIsInformalApp } from './writingExamRegister'

const PROMPT_STOP = new Set([
  'schrijf',
  'je',
  'jij',
  'het',
  'een',
  'de',
  'dat',
  'dit',
  'voor',
  'naar',
  'met',
  'van',
  'op',
  'aan',
  'in',
  'bij',
  'als',
  'niet',
  'wel',
  'kunt',
  'moet',
  'wilt',
  'zijn',
  'wordt',
  'waarin',
  'waar',
  'korte',
  'kort',
  'mail',
  'bericht',
  'nederlands',
  'precies',
  'maximaal',
  'vijf',
  'zinnen',
])

/** Filler lines like “bla bla ba” — not a real attempt at the task. */
export function writingAnswerHasPlaceholderNoise(answer: string): boolean {
  const lines = answer.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (/^(bla|blah|test|asdf|qwerty|fds|fdaf)(\s+(bla|blah|ba|test|fds|fdaf))*\s*$/i.test(line)) {
      return true
    }
    if (/\bbla\s+bla\b/i.test(line) && line.split(/\s+/).length <= 6) return true
  }
  const t = answer.trim()
  if (/^(bla|blah|test)\s*$/i.test(t)) return true
  return false
}

/** Learner meta-commentary that does not answer the exam situation. */
export function writingAnswerHasOffTaskMeta(answer: string): boolean {
  return /\b(dit is niet correct|jij moet dit niet doen|ik wil dit niet|geen zin om|maakt niet uit|random antwoord|weet ik niet wat)\b/i.test(
    answer,
  )
}

function promptTopicTokens(promptNl: string): string[] {
  const scenario = promptNl.split(/\n\nSchrijf\b/i)[0] ?? promptNl
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of scenario.toLowerCase().replace(/[^a-zà-ÿ\s]/g, ' ').split(/\s+/)) {
    if (raw.length < 4 || PROMPT_STOP.has(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out
}

/** Count prompt scenario words that appear in the learner answer. */
export function writingAnswerPromptTokenOverlap(answer: string, promptNl: string): number {
  const a = answer.toLowerCase()
  let n = 0
  for (const tok of promptTopicTokens(promptNl)) {
    if (a.includes(tok)) n += 1
  }
  return n
}

function writingAnswerHasSituationCues(answer: string, promptNl: string): boolean {
  const a = answer.toLowerCase()
  const p = promptNl.toLowerCase()

  if (writingPromptIsInformalApp(promptNl)) {
    return /\b(hoi|hey|hallo|groetjes|groeten|app|sms)\b/i.test(answer) && /\b(ik|je|jou)\b/i.test(a)
  }
  if (/\bkoffie|reservekan\b/.test(p)) {
    return /\b(koffie|reserve|kan|kantoor|collega|apparaat|kapot)\b/i.test(a)
  }
  if (/\bprinter|printen\b/.test(p)) {
    return /\b(printer|printen|afdruk|dubbelzijdig|papier)\b/i.test(a)
  }
  if (/\bdocument|schijf|bestand\b/.test(p)) {
    return /\b(document|bestand|schijf|map|bestandsnaam|openen|lezen)\b/i.test(a)
  }
  if (/\bafspraak|donderdag|verzet\b/.test(p)) {
    return /\b(afspraak|donderdag|verzet|uitkomt|moment|agenda)\b/i.test(a)
  }
  if (/\bafval|gemeente\b/.test(p)) {
    return /\b(afval|gemeente|scheid|wijk|straat)\b/i.test(a)
  }
  if (/\bpincode|bank\b/.test(p)) {
    return /\b(pincode|bank|pas|betaal)\b/i.test(a)
  }
  if (/\blevering|klant\b/.test(p)) {
    return /\b(levering|klant|excuses|leverdag|planning)\b/i.test(a)
  }
  if (/\bgeachte|formele mail|beleefde mail\b/.test(p)) {
    return /\b(geachte|beste|verzoek|graag|melden|groet|hoogachtend)\b/i.test(a)
  }
  if (/\bziek|school|leerkracht\b/.test(p)) {
    return /\b(ziek|school|kind|groep|klas|koorts)\b/i.test(a)
  }
  if (/\buitnodiging|etentje|feest\b/.test(p)) {
    return /\b(uitnodiging|bedank|feest|etentje|afspraak)\b/i.test(a)
  }
  if (/\bkinderopvang|ophalen\b/.test(p)) {
    return /\b(kinderopvang|ophalen|later|minuten)\b/i.test(a)
  }
  if (/\boverlast|geluid|buur\b/.test(p)) {
    return /\b(overlast|geluid|buur|slapen|avond)\b/i.test(a)
  }
  if (/\bsollicitatie|gesprek\b/.test(p)) {
    return /\b(sollicitatie|gesprek|bevestig|afspraak|bedank)\b/i.test(a)
  }

  return /\b(ik|wij|u|graag|omdat|want|vraag|melden|verzoek)\b/i.test(a) && a.length >= 12
}

/**
 * True when the submission looks like a genuine attempt at the prompt (not filler / unrelated Dutch).
 */
export function writingAnswerAddressesPrompt(answer: string, promptNl: string): boolean {
  const t = answer.trim()
  if (!t || isWritingExamGibberish(t)) return false
  if (writingAnswerHasPlaceholderNoise(t)) return false

  const overlap = writingAnswerPromptTokenOverlap(t, promptNl)
  const cues = writingAnswerHasSituationCues(t, promptNl)

  if (writingAnswerHasOffTaskMeta(t) && overlap < 2 && !cues) return false
  if (overlap >= 2) return true
  if (overlap >= 1 && cues) return true
  if (cues && !writingAnswerHasOffTaskMeta(t)) return true

  return false
}
