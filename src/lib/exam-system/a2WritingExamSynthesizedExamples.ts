/**
 * Builds a full Dutch sample answer from the exam prompt when the bank has no `example` string.
 * Used only on the simulation report (not shown during the timed run).
 */

import { composeWritingFillInAnswer } from './writingExamFillInCompose'
import type { ExamTaskInstance } from './types'

export type SynthesizedWritingExample = { text: string; isScaffold: boolean }

/** Turn bank “kwestie” fragments into a complete Dutch sentence for formal mails. */
function meldingSentenceFromTopic(topicRaw: string): string {
  const t = topicRaw.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  if (!t) return 'Ik wil u iets melden.'
  if (/^een vraag\b/i.test(t)) {
    return `Ik heb ${t.charAt(0).toLowerCase() + t.slice(1)}.`
  }
  if (/^een verzoek\b/i.test(t)) {
    return `Ik heb ${t.charAt(0).toLowerCase() + t.slice(1)}.`
  }
  if (/^overlast\b/i.test(t)) {
    return `Ik heb ${t} in mijn woning.`
  }
  if (/^(ik|er|het|de|mijn|wij)\b/i.test(t)) {
    return t.endsWith('.') ? t : `${t}.`
  }
  const lower = t.charAt(0).toLowerCase() + t.slice(1)
  if (/^(kapotte|lekkende|storing|vergeten|grofvuil)\b/i.test(lower)) {
    return `Er is ${lower}.`
  }
  return `Ik meld het volgende: ${lower}.`
}

function promptHeadForMatch(promptNl: string): string {
  const t = promptNl.replace(/\r\n/g, '\n').trim()
  const cut = t.split(/\n\nZo schrijf je je antwoord\b/i)[0]
  return (cut ?? t).split(/\n\nLet op \(alleen Nederlands\)/i)[0]?.trim() ?? t.trim()
}

function formalMailInstitutionNeed(institutionRaw: string, needRaw: string): string {
  const inst = institutionRaw.replace(/\s+/g, ' ').trim()
  const need = needRaw.replace(/\s+/g, ' ').trim()
  const needSentence = need.charAt(0).toLowerCase() + need.slice(1)
  let kern: string
  if (/klacht/i.test(need)) {
    kern = `Ik schrijf u naar aanleiding van het volgende: ${needSentence} Het hindert mij in mijn dagelijks leven. Kunt u aangeven wat de vervolgstappen zijn of wanneer ik een reactie mag verwachten?`
  } else if (/afspraak/i.test(need)) {
    kern = `Graag wil ik ${needSentence} bij ${inst}. Welke dagen en tijden heeft u beschikbaar?`
  } else if (/recept/i.test(need)) {
    kern = `Ik wil graag ${needSentence} aanvragen bij ${inst}. Mijn gegevens staan bij u bekend.`
  } else if (/lening|bewijs|inschrijving|bevestiging|kosten|openingstijden/i.test(need)) {
    kern = `Ik neem contact met u over het volgende: ${needSentence} Zou u mij willen informeren over de mogelijkheden en wat u daarvoor van mij nodig heeft?`
  } else {
    kern = `Ik richt mij tot ${inst} met het volgende verzoek: ${needSentence} Ik hoor graag van u.`
  }
  return ['Geachte heer/mevrouw,', '', kern, '', 'Met vriendelijke groet,', 'Jan de Vries'].join('\n')
}

function werkMail(aanRaw: string, situatieRaw: string): string {
  const aan = aanRaw.replace(/\s+/g, ' ').trim()
  const sit = situatieRaw.replace(/\s+/g, ' ').trim()
  const sitLower = sit.charAt(0).toLowerCase() + sit.slice(1)
  return [
    'Beste,',
    '',
    `Ik wil je kort informeren over het volgende: ${sitLower} Kun je aangeven hoe we dit het beste kunnen oppakken?`,
    '',
    'Met vriendelijke groet,',
    'Jan de Vries',
    `(Aan: ${aan})`,
  ].join('\n')
}

function wonenMail(aanRaw: string, kwestieRaw: string): string {
  const aan = aanRaw.replace(/\s+/g, ' ').trim()
  const melding = meldingSentenceFromTopic(kwestieRaw)
  return [
    'Geachte heer/mevrouw,',
    '',
    `Ik woon bij u in het complex. ${melding} Ik verneem graag hoe u dit oppakt of wanneer ik een reactie kan verwachten.`,
    '',
    'Met vriendelijke groet,',
    'Jan de Vries',
    `(Aan: ${aan})`,
  ].join('\n')
}

/** Bank clauses like “dat je de boodschappen meeneemt” → complete A2 app sentences (first person). */
export function informalAppBodyFromSituation(situationRaw: string): string {
  const sit = situationRaw.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  const key = sit.toLowerCase()

  const exact: Record<string, string> = {
    'dat je te laat bent voor de afspraak':
      'Sorry, ik ben iets later voor onze afspraak. Ik kom zo snel mogelijk.',
    'dat je de film wilt verzetten naar zaterdag':
      'Zullen we de film verzetten naar zaterdag? Laat maar weten of dat voor jou uitkomt.',
    'dat je ziek bent en niet meegaat naar het feest':
      'Ik ben ziek en kan helaas niet mee naar het feest. Sorry!',
    'dat je de boodschappen meeneemt':
      'Ik neem de boodschappen mee. Ik kom vanavond even langs.',
    'dat je de sleutel onder de mat legt':
      'Ik leg de sleutel onder de mat bij jou. Laat maar weten als je hem hebt.',
    'dat je morgen eerder weg moet van werk':
      'Morgen moet ik eerder weg van mijn werk. Ik ben rond vier uur weg.',
  }
  if (exact[key]) return exact[key]

  const meeneem = sit.match(/^dat je\s+(.+?)\s+meeneemt$/i)
  if (meeneem?.[1]) return `Ik neem ${meeneem[1].trim()} mee.`

  const leg = sit.match(/^dat je\s+(.+?)\s+legt\s+(.+)$/i)
  if (leg?.[1] && leg[2]) return `Ik leg ${leg[1].trim()} ${leg[2].trim()}.`

  if (/^dat je ziek bent/i.test(sit)) {
    const naar = sit.match(/naar\s+(.+)$/i)?.[1]?.trim()
    if (naar) return `Ik ben ziek en kan niet mee naar ${naar}.`
    return 'Ik ben ziek en kan helaas niet meekomen.'
  }

  if (/^dat je te laat bent/i.test(sit)) {
    const rest = sit.replace(/^dat je te laat bent\s*/i, '').trim()
    return rest ? `Sorry, ik ben te laat ${rest}.` : 'Sorry, ik ben iets later.'
  }

  const wil = sit.match(/^dat je\s+(.+?)\s+wilt\s+(.+)$/i)
  if (wil?.[1] && wil[2]) {
    const subj = wil[1].trim()
    const rest = wil[2].trim()
    if (/verzetten/i.test(rest)) return `Kunnen we ${subj} ${rest}?`
    return `Ik wil ${subj} ${rest}.`
  }

  if (/^dat je morgen\s+/i.test(sit)) {
    const rest = sit.replace(/^dat je morgen\s+/i, '').trim()
    return `Morgen moet ik ${rest}.`
  }

  if (/^dat je\s+/i.test(sit)) {
    let rest = sit.replace(/^dat je\s+/i, '').trim()
    rest = rest.replace(/\bbent\b/gi, 'ben')
    const line = `Ik ${rest}`
    return line.endsWith('.') ? line.charAt(0).toUpperCase() + line.slice(1) : `${line.charAt(0).toUpperCase() + line.slice(1)}.`
  }

  const fallback = sit.charAt(0).toUpperCase() + sit.slice(1)
  return fallback.endsWith('.') ? fallback : `${fallback}.`
}

function informalAppGreeting(recipientRaw: string): string {
  const r = recipientRaw.toLowerCase()
  if (/\bvriendin\b/.test(r)) return 'Hoi!'
  if (/\bvriend\b/.test(r)) return 'Hoi!'
  if (/\bpartner\b/.test(r)) return 'Hoi!'
  if (/\bbuur\b/.test(r)) return 'Hoi!'
  if (/\bklasgenoot\b/.test(r)) return 'Hoi!'
  return 'Hoi!'
}

/** Full app-bericht sample: greeting, message, closing (no meta “Aan: …” line). */
function informalApp(naarRaw: string, meldingRaw: string): string {
  const greeting = informalAppGreeting(naarRaw)
  const body = informalAppBodyFromSituation(meldingRaw)
  return [greeting, '', body, '', 'Groetjes,', 'Jan de Vries'].join('\n')
}

function winkelMail(winkelRaw: string, kwestieRaw: string): string {
  const w = winkelRaw.replace(/\s+/g, ' ').trim()
  const k = kwestieRaw.replace(/\s+/g, ' ').trim()
  const kLower = k.charAt(0).toLowerCase() + k.slice(1)
  return [
    'Geachte heer/mevrouw,',
    '',
    `Ik neem contact met u over het volgende: bij ${w} heb ik ${kLower} Ik hoop op een passende oplossing en hoor graag van u.`,
    '',
    'Met vriendelijke groet,',
    'Jan de Vries',
  ].join('\n')
}

function formFillExample(head: string): string | null {
  if (!/vul in|vul het volgende|elk op een eigen regel|zoals op een echt formulier|uw naam/i.test(head))
    return null
  if (/sportvereniging/i.test(head)) {
    return ['Lisa Vermeulen', 'Hoofdweg 45', '3012 AB Rotterdam', '15-03-1990', '0611223344'].join('\n')
  }
  if (/gemeente|adreswijziging|verhuizing/i.test(head)) {
    return [
      'Jan de Vries',
      'Oude adres: Kerkstraat 3, 1234 AA Amersfoort',
      'Nieuw adres: Stationsplein 12, 3818 LE Amersfoort',
      'Ingangsdatum nieuw adres: 01-06-2026',
    ].join('\n')
  }
  if (/basisschool|studiedag/i.test(head)) {
    return [
      'Kind: Sam de Vries',
      'Groep: 4A',
      'Datum: 14-05-2026',
      'Halve dag / hele dag: halve dag',
      'Reden: doktersbezoek',
    ].join('\n')
  }
  if (/aansprakelijkheidsverzekering|meldt een kleine schade|polisnummer.*fictief/i.test(head)) {
    return null
  }
  return ['Jan de Vries', 'Hoofdstraat 12', '1234 AB Utrecht', '01-02-1985', '0612345678'].join('\n')
}

/** Ideal invulvelden aligned with task bullets (when the bank has no `example` string). */
function formFillIdealValuesForBullets(bullets: readonly string[]): string[] | null {
  const joined = bullets.join(' ').toLowerCase()
  if (/\bpolis|schade|gebeurd/i.test(joined) && bullets.length >= 3) {
    return [
      'Jan de Vries',
      'AV-908172',
      'Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde gisteren.',
    ]
  }
  if (/\bsportvereniging|voor- en achternaam/i.test(joined) && /\bgeboorte|telefoon/i.test(joined)) {
    return ['Lisa Vermeulen', 'Hoofdstraat 45, 3012 AB Rotterdam', '15-03-1990', '0611223344']
  }
  if (/\badreswijziging|oud adres|nieuw adres/i.test(joined)) {
    return [
      'Jan de Vries',
      'Kerkstraat 3, 1234 AA Amersfoort',
      'Stationsplein 12, 3818 LE Amersfoort',
      '01-06-2026',
    ]
  }
  if (/\bkind|groep|studiedag/i.test(joined)) {
    return ['Sam de Vries', '4A', '14-05-2026', 'halve dag', 'Ik neem mijn zoon mee naar een doktersbezoek.']
  }
  if (/\bbibliotheek|motiv|reden/i.test(joined)) {
    return [
      'Jan de Vries',
      'Hoofdstraat 12, 1234 AB Utrecht',
      'Ik wil graag boeken lenen om mijn Nederlands te oefenen.',
    ]
  }
  return null
}

function fallbackFormalMail(): string {
  return [
    'Geachte heer/mevrouw,',
    '',
    'Hierbij reageer ik op uw bericht. Ik verzoek u vriendelijk om de gevraagde informatie of actie zo spoedig mogelijk te bevestigen.',
    '',
    'Met vriendelijke groet,',
    'Jan de Vries',
  ].join('\n')
}

/**
 * Produces a complete Dutch sample text tailored to common A2 writing prompt shapes.
 * `isScaffold` is true only for the last-resort generic paragraph (no prompt structure matched).
 */
export function synthesizeA2WritingReportExampleNl(promptNl: string): SynthesizedWritingExample {
  const head = promptHeadForMatch(promptNl)

  const instNeed = head.match(
    /Je richt je tot\s+(.+?)\.\s*Je hebt het volgende nodig:\s*(.+?)\.\s*Je wilt\b/is,
  )
  if (instNeed?.[1] && instNeed[2]) {
    return { text: formalMailInstitutionNeed(instNeed[1]!, instNeed[2]!), isScaffold: false }
  }

  const werk = head.match(
    /Situatie \(werk\):\s*(.+?)\.\s*Je moet dit helder en professioneel communiceren naar\s+(.+?)\./is,
  )
  if (werk?.[1] && werk[2]) {
    return { text: werkMail(werk[2]!, werk[1]!), isScaffold: false }
  }

  const wonen = head.match(
    /Situatie \(wonen\):\s*(.+?)\.\s*Je wilt dit netjes en schriftelijk melden aan\s+(.+?)\./is,
  )
  if (wonen?.[1] && wonen[2]) {
    return { text: wonenMail(wonen[2]!, wonen[1]!), isScaffold: false }
  }

  const app = head.match(
    /Je stuurt een app-bericht naar\s+(.+?)\.\s*Je wilt kort en duidelijk melden\s+(.+?)\./is,
  )
  if (app?.[1] && app[2]) {
    return { text: informalApp(app[1]!, app[2]!), isScaffold: false }
  }

  const winkel = head.match(/Je hebt een kwestie bij\s+(.+?):\s*(.+?)\.\s*Je wilt\b/is)
  if (winkel?.[1] && winkel[2]) {
    return { text: winkelMail(winkel[1]!, winkel[2]!), isScaffold: false }
  }

  if (/De vaste weekvergadering/i.test(head) && /naar je team/i.test(head)) {
    return {
      text: [
        'Beste team,',
        '',
        'De weekvergadering van dinsdag kan niet op de gebruikelijke plek door werkzaamheden in het gebouw. We spreken af in zaal B om 10:00 uur. Laat even weten of dit voor jullie uitkomt.',
        '',
        'Groet,',
        'Jan',
      ].join('\n'),
      isScaffold: false,
    }
  }

  if (/te ziek om veilig te werken/i.test(head) || /Schrijf één formele zin[\s\S]*ziek meldt/i.test(head)) {
    return {
      text: 'Ik meld me vandaag ziek en kan daarom niet op het werk verschijnen.',
      isScaffold: false,
    }
  }

  if (/koffiezetapparaat|reservekan/i.test(head) && /collega/i.test(head)) {
    return {
      text: [
        'Beste collega’s,',
        '',
        'Het koffiezetapparaat op onze afdeling is kapot. Er staat een reservekan op de afdelingsgroep. Tot het gerepareerd is, kunt u die gebruiken.',
        '',
        'Groet,',
        'Jan',
      ].join('\n'),
      isScaffold: false,
    }
  }

  if (/document.*gedeelde schijf|bestandsnaam/i.test(head)) {
    return {
      text: [
        'Hoi collega’s,',
        '',
        'Het document “Planning_Q2.pdf” staat op de gedeelde schijf. Kijk het vandaag even na en laat weten of alles klopt.',
        '',
        'Groetjes,',
        'Jan',
      ].join('\n'),
      isScaffold: false,
    }
  }

  if (/afspraak.*donderdag|verzet naar donderdag/i.test(head)) {
    return {
      text: [
        'Hoi,',
        '',
        'Mijn rooster is gewijzigd: kan onze afspraak naar donderdag op hetzelfde tijdstip? Als dat niet uitkomt, stel ik woensdag 14:00 uur voor.',
        '',
        'Groetjes,',
        'Jan',
      ].join('\n'),
      isScaffold: false,
    }
  }

  if (/printerregel|nieuwe regel voor printen/i.test(head)) {
    return {
      text: [
        'Beste collega’s,',
        '',
        'Vanaf volgende week geldt op onze afdeling een nieuwe printerregel: print dubbelzijdig en maximaal 100 pagina’s per week. Vragen? Mail naar facilitair@bedrijf.nl.',
        '',
        'Met vriendelijke groet,',
        'Jan de Vries',
      ].join('\n'),
      isScaffold: false,
    }
  }

  if (/Een klant wacht op een levering/i.test(head)) {
    return {
      text: [
        'Geachte mevrouw/heer,',
        '',
        'Onze excuses: door een planningsfout valt de levering één dag later uit dan eerder aangekondigd. De nieuwe leverdag is woensdag 28 mei. Laat u alstublieft weten of dit voor u acceptabel is.',
        '',
        'Met vriendelijke groet,',
        'Jan de Vries',
        'Customer Service',
      ].join('\n'),
      isScaffold: false,
    }
  }

  const form = formFillExample(head)
  if (form) return { text: form, isScaffold: false }

  return { text: fallbackFormalMail(), isScaffold: true }
}

/**
 * Report sample answer for a writing task: bank example, form-fill with labels, or prompt-shaped synthesis.
 */
export function synthesizeWritingReportExampleForTask(task: ExamTaskInstance): SynthesizedWritingExample {
  const bank = task.trainingExampleNl?.trim()
  if (bank) return { text: bank, isScaffold: false }

  const bullets = task.writingFillInBulletsNl ?? []
  if (bullets.length) {
    const values = formFillIdealValuesForBullets(bullets)
    if (values?.length === bullets.length) {
      return { text: composeWritingFillInAnswer([...bullets], values), isScaffold: false }
    }
    const legacy = formFillExample(promptHeadForMatch(task.promptNl))
    if (legacy) {
      const legacyValues = legacy.split('\n')
      if (legacyValues.length === bullets.length) {
        return { text: composeWritingFillInAnswer([...bullets], legacyValues), isScaffold: false }
      }
    }
  }

  return synthesizeA2WritingReportExampleNl(task.promptNl)
}
