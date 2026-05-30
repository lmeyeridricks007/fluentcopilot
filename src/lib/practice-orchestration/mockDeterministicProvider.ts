/**
 * Deterministic stand-in for an LLM — scenario-bound, keyword-aware.
 * Replace with real provider call using the same `systemPromptForProvider` from orchestrator.
 */
import { getScenario } from '@/ai-conversation-engine/config/scenarios'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

function norm(s: string): string {
  return s.toLowerCase().trim()
}

function hasAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n))
}

export function mockDeterministicAssistantReply(input: {
  scenarioId: string
  mode: PracticeConversationMode
  priorUserTurns: number
  lastUserMessage: string
  /** When `each_turn`, free mode may surface a light coach line. */
  feedbackTiming?: 'each_turn' | 'end' | 'silent'
}): { assistantNl: string; coachEn?: string } {
  const u = norm(input.lastUserMessage)
  const id = input.scenarioId
  const n = input.priorUserTurns
  const semi = input.mode === 'semi_guided' || input.mode === 'guided'

  let assistantNl = 'Prima. Kunt u dat in één korte zin herhalen?'
  let coachEn: string | undefined

  if (u.length < 2) {
    assistantNl = 'Ik hoor u niet goed. Wat wilt u zeggen?'
    coachEn = semi ? 'Try one short sentence in Dutch.' : undefined
    return { assistantNl, coachEn }
  }

  switch (id) {
    case 'cafe':
      if (n === 0 && hasAny(u, ['koffie', 'thee', 'water', 'drink', 'bestel', 'mag ik', 'graag'])) {
        assistantNl = 'Goed. Met melk of zwart? En wilt u hier drinken of meenemen?'
      } else if (hasAny(u, ['melk', 'zwart', 'hier', 'meenemen'])) {
        assistantNl = 'Prima. Dat is twee euro vijftig. Nog iets anders?'
      } else if (hasAny(u, ['nee', 'dank', 'dat is alles', 'niet'])) {
        assistantNl = 'Alstublieft. Eet smakelijk en tot ziens!'
      } else {
        assistantNl = semi
          ? 'Oké. Wat wilt u precies bestellen? Eén drankje is genoeg om te oefenen.'
          : 'Wat mag het zijn?'
      }
      break
    case 'doctor':
      if (n === 0 && hasAny(u, ['pijn', 'keel', 'hoofd', 'misselijk', 'koorts', 'hoest'])) {
        assistantNl = 'Ik begrijp het. Hoelang heeft u dit al?'
      } else if (hasAny(u, ['dag', 'week', 'gisteren', 'dagen', 'lang'])) {
        assistantNl =
          'Dank u. Rust, veel drinken en paracetamol volgens de bijsluiter. Bij koorts: bel de praktijk terug.'
      } else if (hasAny(u, ['dank', 'begrijp', 'oké', 'prima'])) {
        assistantNl = 'Graag. Beterschap en tot ziens.'
      } else {
        assistantNl = semi
          ? 'Vertel kort: waar zit het en hoe erg is het?'
          : 'Wat is er aan de hand?'
      }
      break
    case 'train':
    case 'travel':
      if (n === 0 && hasAny(u, ['perron', 'trein', 'naar', 'vertrek', 'kaartje'])) {
        assistantNl = 'Dat is perron 4b, vertrek om veertien twaalf. Nog een vraag?'
      } else if (hasAny(u, ['vertraging', 'op tijd', 'klopt'])) {
        assistantNl = 'Op dit moment rijdt hij volgens planning. Houd de reisplanner in de gaten.'
      } else if (hasAny(u, ['dank', 'nee'])) {
        assistantNl = 'Graag gedaan. Goede reis!'
      } else {
        assistantNl = semi ? 'Waar wilt u naartoe, en wat wilt u weten?' : 'Waar kan ik u mee helpen?'
      }
      break
    case 'municipality':
      if (n === 0) {
        assistantNl = 'Goedemiddag. Waarmee kan ik u helpen — inschrijven of een document?'
      } else if (hasAny(u, ['document', 'paspoort', 'id', 'formulier'])) {
        assistantNl = 'Geef uw paspoort en een adresbewijs mee. Vult u dit formulier in?'
      } else if (hasAny(u, ['afspraak', 'afspraken'])) {
        assistantNl = 'Er is plek donderdag om tien uur. Past dat?'
      } else {
        assistantNl = semi ? 'Welke stap wilt u zeker weten: inschrijven, ID, of iets anders?' : 'Wat komt u doen?'
      }
      break
    case 'supermarket_shop':
      if (hasAny(u, ['waar', 'melk', 'brood', 'vinden'])) {
        assistantNl = 'De melk staat in gang twee, achterin. Nog iets?'
      } else if (hasAny(u, ['bon', 'kassa', 'betalen'])) {
        assistantNl = 'Kassa drie is open. Bonnetje erbij?'
      } else {
        assistantNl = semi ? 'Waar bent u naar op zoek?' : 'Kan ik u ergens mee helpen?'
      }
      break
    case 'work':
    case 'workplace_meeting':
      if (hasAny(u, ['eens', 'oneens', 'idee', 'voorstel'])) {
        assistantNl = 'Oké. Volgende week verder — is dinsdag goed?'
      } else {
        assistantNl = semi ? 'Wat is uw korte reactie op het voorstel?' : 'Wat vindt u van het plan?'
      }
      break
    case 'housing':
      if (hasAny(u, ['lek', 'lekkage', 'storing', 'warm', 'koud'])) {
        assistantNl = 'Dat noteer ik. We sturen iemand, meestal binnen twee werkdagen. Nog een foto?'
      } else {
        assistantNl = semi ? 'Welk probleem wilt u melden, en sinds wanneer?' : 'Wat is er aan de hand in de woning?'
      }
      break
    case 'social_plans':
    case 'social_small_talk':
      if (hasAny(u, ['afspreken', 'film', 'koffie', 'morgen', 'vanavond'])) {
        assistantNl = 'Leuk! Laten we zaterdag om vijf uur afspreken bij het station — is dat goed?'
      } else {
        assistantNl = semi ? 'Stel één concrete afspraak voor.' : 'Wanneer heeft u tijd?'
      }
      break
    case 'store_service_issue':
      if (hasAny(u, ['retour', 'terugbrengen', 'bon', 'ruilen', 'geld terug'])) {
        assistantNl = 'Prima. Heeft u de bon nog bij u? Wilt u ruilen of liever geld terug?'
      } else if (hasAny(u, ['kapot', 'werkt niet', 'defect', 'kras'])) {
        assistantNl = 'Dat begrijp ik. Kunt u kort zeggen sinds wanneer het zo is?'
      } else {
        assistantNl = semi ? 'Wat is er precies misgegaan?' : 'Waarmee kan ik u helpen?'
      }
      break
    case 'work_colleague_interaction':
      if (hasAny(u, ['deadline', 'wanneer', 'klaar'])) {
        assistantNl = 'Oké — laten we zeggen voor vrijdagmiddag. Kun je dat halen?'
      } else if (hasAny(u, ['help', 'snappen', 'begrijp', 'uitleg'])) {
        assistantNl = 'Natuurlijk. Waar loop je precies vast — het document of de mail?'
      } else {
        assistantNl = semi ? 'Wat wil je vandaag even afstemmen?' : 'Hoe gaat het met jouw stuk?'
      }
      break
    case 'housing_landlord':
      if (hasAny(u, ['huur', 'borg', 'contract', 'opzeg'])) {
        assistantNl = 'Prima — ik zeg het kort: de huur is per de eerste, en de borg krijgt u na inspectie terug.'
      } else if (hasAny(u, ['lek', 'kapot', 'storing', 'monteur'])) {
        assistantNl = 'Dat noteer ik. Wanneer kan iemand langskijken — deze week nog of volgende week?'
      } else {
        assistantNl = semi ? 'Waar kan ik u mee helpen in de woning?' : 'Wat is er precies aan de hand?'
      }
      break
    case 'problem_solving':
    case 'customer_service':
      if (hasAny(u, ['fout', 'verkeerd', 'bestelling', 'probleem'])) {
        assistantNl = 'Sorry daarvoor. We lossen het op: een nieuwe levering vrijdag. Is dat oké?'
      } else {
        assistantNl = semi ? 'Wat is er precies misgegaan?' : 'Hoe kan ik helpen?'
      }
      break
    default: {
      const ctx = getScenario(id)
      if (ctx?.ai_roleplay_instructions?.role) {
        assistantNl =
          n === 0
            ? 'Goedemiddag. Hoe kan ik u helpen met uw vraag?'
            : 'Dank u. Kunt u dat nog eens kort zeggen in het Nederlands?'
      }
    }
  }

  if (semi && u.length < 12 && !coachEn && input.mode !== 'guided') {
    coachEn = 'Aim for a fuller sentence next turn — one clear idea.'
  }

  if (input.mode === 'free') {
    if (input.feedbackTiming === 'each_turn') {
      if (!coachEn) {
        coachEn =
          'Light coaching: notice chunks you could reuse — word order and politeness markers matter in shops and admin.'
      }
    } else {
      coachEn = undefined
    }
  }

  return { assistantNl, coachEn }
}
