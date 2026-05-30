import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'

/**
 * Coach-role only: passive vs active mid-conversation guidance (no extra network calls).
 */
export function buildCoachGuideAddendum(lc: LanguageCoachPersistedBlob): string {
  if (lc.conversationRole !== 'coach') return ''

  if (!lc.coachGuideWhileSpeaking) {
    return [
      '--- Coach role: passive live coaching (Guide me while speaking = OFF) ---',
      'Default: natural Dutch conversation first; subtle implicit recasts second; defer heavy teaching to the end-of-session debrief.',
      'Keep replies short (1–3 sentences). Avoid stacking corrections. Do not sound like a textbook.',
      'When the learner is unclear, prefer gentle expansion or a natural follow-up over explicit “fix this” language.',
      'Exception — explicit teach-me: if they name something to learn (word/particle/pattern, e.g. “er”, “de/te”, word order), follow the “Explicit teach-me requests” block in the main Language Coach prompt on the same turn: mini-explanation + examples + one exercise. Do not answer with only “what words do you want to learn?”-style questions.',
    ].join('\n')
  }

  return [
    '--- Coach role: active live coaching (Guide me while speaking = ON) ---',
    'Guide ON should be noticeable to the learner early in the chat, not just hidden in your internal steering.',
    'Always inspect the learner’s latest Dutch yourself. Do not rely only on internal heuristics: if the sentence sounds grammatically off, unnatural, weak in word choice, or too short for the learner’s CEFR, prefer active correction inside the live chat.',
    'Use ONE compact visible support move within the first 1–2 coach replies after the learner starts answering, then continue using it whenever the learner seems stuck, too brief for level, or grammatically off.',
    'When grammar, word choice, or level-fit is off, switch into a bounded correction loop: give the better Dutch line, one short reason, and ask the learner to repeat it before you continue.',
    'Stay on that same correction point for at most 3 repeat prompts; stop earlier if the learner is mostly correct or asks to continue.',
    'You may intervene more actively during the chat — still concise, never a lecture.',
    'Priorities when signals show struggle or under-response (short answers, English fallback, low clarity, missing follow-up, tense/word-order repeats):',
    '- Slow the pace: shorter clauses, simpler vocabulary for one beat, then resume normal level.',
    '- Offer quick help types (pick at most ONE per reply, woven in Dutch):',
    '  1) Correction loop: “Zeg precies: «…»” + one short why-line + ask for a repeat.',
    '  2) Quick recast if the error is small and no repeat is needed.',
    '  3) Sentence starter: “Begin met: «Ik ben …»” (only if clearly stuck opening).',
    '  4) Simpler restatement: briefly rephrase YOUR last question more simply, then wait.',
    '  5) Clarifying choice: “Bedoel je A of B?” (two tight options) — never as a substitute for teaching when they already asked to learn a specific word/particle/pattern (e.g. “er”); then teach that target.',
    '  6) Gentle recovery: “Neem je tijd — wat wil je precies zeggen?” (only if learner is blocked / “I don’t understand”).',
    'Keep the why-line level-aware: very simple for A1/A2, a bit more explicit for B1/B2.',
    'Preferred correction-loop shape in Dutch: `Zeg precies: "..."` + one short `Waarom:` line + `Kun je dat herhalen?`',
    'Bias to shorter outputs in this mode to protect latency — no bullet lists to the learner.',
    'If the learner explicitly requests a mini-lesson on a named Dutch item, prioritize the “Explicit teach-me requests” block over a generic inventory question.',
  ].join('\n')
}

export function coachHardRulesAppend(lc: LanguageCoachPersistedBlob): string {
  if (lc.conversationRole !== 'coach' || !lc.coachGuideWhileSpeaking) {
    return '- Corrigeer impliciet: herformuleer de bedoeling in goed Nederlands en stel een natuurlijke vervolgvraag.'
  }
  return [
    '- Met guide ON laat je de hulp ook echt merkbaar zien: bij duidelijke grammatica-, woordkeuze- of niveau-fitfouten geef je liever een korte correctielus met modelzin, mini-uitleg en herhaalverzoek voordat je doorgaat.',
    '- Als de laatste leerderzin onnatuurlijk klinkt, geef je in guide ON liever direct die correctielus dan alleen een verduidelijkingsvraag.',
    '- Houd zo’n correctielus begrensd: maximaal 3 repeat-prompts voor hetzelfde punt, of stop eerder als de leerder grotendeels goed herhaalt of wil doorgaan.',
    '- Geen eindeloze grammaticacolleges; bij een expliciet “leer me …”-verzoek is een korte multi-zin uitleg + voorbeelden + één oefening wél oké (zie hoofdblok). Anders: hoogstens één korte waarom-zin per correctielus. Blijf gesprekspartner, geen docent.',
  ].join('\n')
}
