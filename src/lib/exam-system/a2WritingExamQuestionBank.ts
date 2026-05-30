import type { ExamScoringDimension } from './types'
import { FORM_FILL_SCORING_DIMENSIONS } from './writingExamFillInCompose'

/** Real-exam-style task family for stratified four-task simulations. */
export type A2WritingExamStratum = 'form_fill' | 'formal_email' | 'informal_social' | 'short_note'

/** Shown only in training when hints are enabled — always Dutch. */
export type A2WritingExamBankItem = {
  nl: string
  /** Legacy field; full simulation strips English via `getA2WritingExamBankItem`. */
  en: string
  hints?: string[]
  example?: string
  scoringDimensions?: ExamScoringDimension[]
  /** Checklist appended in simulation/training task payload (Dutch only). */
  examFooter?: 'mail' | 'app' | 'form' | 'paragraph' | 'formal_short'
  /** Formulier-opdracht: wat invullen (UI + kopiëren); alleen bij `form_fill` met formulierstijl. */
  fillInBulletsNl?: string[]
  /** Starttekst voor het antwoordvak (lege regels om in te vullen). */
  answerSkeletonNl?: string
  /** Used to build a mixed session like the official Schrijven exam. */
  stratum: A2WritingExamStratum
}

const HINT_MAIL = ['Begin met een korte groet.', 'Sluit beleefd af.', 'Houd het bij maximaal zes zinnen.']
const HINT_SMS = ['Gebruik korte zinnen.', 'Geen lange formele aanhef nodig.']
const HINT_FORM = ['Antwoord precies wat gevraagd wordt.', 'Let op spelling van namen en data.']

const NL_EXAM_FOOTER_MAIL = `

Zo schrijf je je antwoord (alleen Nederlands):
• Begin met een passende aanhef voor een mail.
• Leg uit wat er speelt en gebruik minstens één concreet detail (tijd, datum, plek of naam mag je zelf verzinnen).
• Maak duidelijk wat je van de lezer verwacht (actie, bevestiging of informatie) en noem eventueel een redelijke deadline.
• Sluit beleefd af met een korte groet en een fictieve naam.`

const NL_EXAM_FOOTER_APP = `

Zo schrijf je je antwoord (alleen Nederlands):
• Gebruik een informele toon die past bij een sms of app.
• Zeg in de eerste zinnen waarom je schrijft en wat de ander moet weten.
• Houd het kort; geen lange formele aanhef nodig.`

const NL_EXAM_FOOTER_FORM = `

Let op (alleen Nederlands):
• Vul precies wat de opdracht vraagt; geen Engels in je antwoord.
• Als er meerdere gegevens nodig zijn, zet die duidelijk uit elkaar (bijvoorbeeld op aparte regels).`

const NL_EXAM_FOOTER_PARAGRAPH = `

Let op (alleen Nederlands):
• Houd je strikt aan het gevraagde aantal zinnen of alinea's.
• Maak je punt concreet met minstens één plausibel detail; blijf respectvol.`

const NL_EXAM_FOOTER_FORMAL_SHORT = `

Let op (alleen Nederlands):
• Houd je aan de gevraagde lengte (bijvoorbeeld één zin of één korte briefzin).
• Gebruik een formele toon passend bij werk, overheidsinstantie of bank.`

/** Extra items aligned with official Schrijven-style variety (forms, social, short notes). */
const EXAM_MIX_ANCHORS: A2WritingExamBankItem[] = [
  {
    stratum: 'form_fill',
    nl: `Je schrijft je in bij een lokale sportvereniging.

Vul in (elk op een eigen regel): voor- en achternaam, volledig adres (straat, huisnummer, postcode en woonplaats), geboortedatum (dd-mm-jjjj) en een mobiel telefoonnummer.`,
    en: '',
    scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
    hints: HINT_FORM,
    example:
      'Lisa Vermeulen\nHoofdweg 45\n3012 AB Rotterdam\n15-03-1990\n0611223344',
    examFooter: 'form',
    fillInBulletsNl: [
      'Voor- en achternaam',
      'Volledig adres (straat, huisnummer, postcode en woonplaats)',
      'Geboortedatum (dd-mm-jjjj)',
      'Mobiel telefoonnummer',
    ],
    answerSkeletonNl:
      'Voor- en achternaam:\n\n\nVolledig adres:\n\n\nGeboortedatum (dd-mm-jjjj):\n\n\nMobiel telefoonnummer:\n\n\n',
  },
  {
    stratum: 'form_fill',
    nl: `Je meldt een adreswijziging bij de gemeente na een verhuizing binnen dezelfde plaats.

Vul in: uw voor- en achternaam, uw oude adres, uw nieuwe adres en de ingangsdatum vanaf wanneer u op het nieuwe adres woont.`,
    en: '',
    scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
    hints: HINT_FORM,
    examFooter: 'form',
    fillInBulletsNl: [
      'Uw voor- en achternaam',
      'Uw oude adres',
      'Uw nieuwe adres',
      'Ingangsdatum vanaf wanneer u op het nieuwe adres woont',
    ],
    answerSkeletonNl:
      'Uw voor- en achternaam:\n\n\nOud adres:\n\n\nNieuw adres:\n\n\nIngangsdatum:\n\n\n',
  },
  {
    stratum: 'form_fill',
    nl: `Je vraagt een halve studiedag vrij voor je kind bij de basisschool.

Vul in: naam van het kind, groep of klas, datum en of het om de hele dag of een halve dag gaat, plus in één zin de reden (bijvoorbeeld doktersbezoek).`,
    en: '',
    scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
    hints: HINT_FORM,
    examFooter: 'form',
    fillInBulletsNl: [
      'Naam van het kind',
      'Groep of klas',
      'Datum',
      'Hele dag of halve dag',
      'Reden in één zin (bijvoorbeeld doktersbezoek)',
    ],
    answerSkeletonNl:
      'Naam kind:\n\n\nGroep/klas:\n\n\nDatum:\n\n\nHele of halve dag:\n\n\nReden (één zin):\n\n\n',
  },
  {
    stratum: 'form_fill',
    nl: `Je meldt een kleine schade bij je aansprakelijkheidsverzekering.

Vul in: uw voor- en achternaam, polisnummer (fictief mag) en in twee korte zinnen wat er gebeurd is en wanneer.`,
    en: '',
    scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
    hints: HINT_FORM,
    examFooter: 'form',
    fillInBulletsNl: [
      'Uw voor- en achternaam',
      'Polisnummer (fictief mag)',
      'Wat er gebeurd is en wanneer (twee korte zinnen)',
    ],
    answerSkeletonNl: 'Uw voor- en achternaam:\n\n\nPolisnummer:\n\n\nWat er gebeurde en wanneer (twee zinnen):\n\n\n',
  },
  {
    stratum: 'informal_social',
    nl: `Je wilt vrienden uitnodigen voor een tuinfeest of borrel op zaterdagavond. Je geeft tijd, ongeveer hoe lang het duurt en of ze iets mee mogen nemen.

Schrijf een korte, vriendelijke uitnodiging per mail of app-bericht (jij kiest het medium) aan een paar vrienden.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'informal_social',
    nl: `Je geeft een feestje thuis en wilt je buren van tevoren informeren, zodat ze niet voor verrassingen komen te staan.

Schrijf een korte, vriendelijke brief of mail aan je buren met tijdstip en dat er wat geluid kan zijn, en bedank ze voor hun begrip.`,
    en: '',
    hints: HINT_MAIL,
    examFooter: 'mail',
  },
  {
    stratum: 'formal_email',
    nl: `Je kind is ziek en kan vandaag niet naar school. Je moet de leerkracht of de school informeren volgens de gebruikelijke afspraken.

Schrijf een korte, formele mail aan de school waarin je meldt dat je kind vandaag niet komt, de groep noemt en kort de reden geeft.`,
    en: '',
    hints: HINT_MAIL,
    example:
      'Geachte juffrouw,\n\nMijn zoon Jan de Vries uit groep 5B is vandaag ziek en kan niet naar school komen. Hij heeft koorts sinds gisteravond.\n\nMet vriendelijke groet,\nM. de Vries',
    scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    examFooter: 'mail',
  },
  {
    stratum: 'formal_email',
    nl: `Je kunt vandaag niet op je werk komen vanwege een dringende persoonlijke afspraak (niet ziekte). Je wilt je netjes afmelden bij je leidinggevende.

Schrijf een korte, formele mail aan je leidinggevende waarin je vandaag afwezig meldt, kort uitlegt waarom (zonder te veel privé) en voorstelt hoe je achterstand inhalen kunt.`,
    en: '',
    hints: HINT_MAIL,
    example:
      'Beste mevrouw Jansen,\n\nVandaag kan ik niet op kantoor zijn vanwege een dringende afspraak. Morgen ben ik weer aanwezig en werk ik mijn openstaande taken bij.\n\nMet vriendelijke groet,\nJan de Vries',
    examFooter: 'mail',
  },
  {
    stratum: 'short_note',
    nl: `Op kantoor is het koffiezetapparaat kapot gegaan; jij hebt een reservekan op de afdelingsgroep gelegd.

Schrijf een kort briefje of interne mail (maximaal vijf zinnen) aan je collega’s op dezelfde afdeling: wat er aan de hand is en wat ze in de tussentijd kunnen doen.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'short_note',
    nl: `Je hebt een belangrijk document voor iedereen klaarstaan op de gedeelde schijf en wilt je directe collega’s attenderen.

Schrijf een korte interne boodschap aan je collega’s (informeel maar duidelijk) met de bestandsnaam en wat ze ermee moeten doen.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
]

const CORE_LEGACY: A2WritingExamBankItem[] = [
  {
    stratum: 'formal_email',
    nl: `De vaste weekvergadering van jullie team kan niet op de gebruikelijke locatie of tijd doorgaan door werkzaamheden in het gebouw. Je collega's moeten tijdig weten waar en wanneer jullie elkaar nu treffen en of zij akkoord gaan.

Schrijf een korte mail naar je team over deze verhuizing van de vergadering.`,
    en: '',
    hints: HINT_MAIL,
    example: 'Beste team, de vergadering van dinsdag vindt nu plaats in zaal B. Groet, …',
    examFooter: 'mail',
  },
  {
    stratum: 'informal_social',
    nl: `Je bent onderweg naar een afspraak met een vriend, maar door onverwachte vertraging kom je ongeveer tien minuten later dan afgesproken.

Schrijf een korte sms aan die vriend waarin je meldt dat je later bent en eventueel voorstelt waar of hoe laat jullie elkaar alsnog kunnen treffen.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'form_fill',
    nl: `Je wilt een bibliotheekpas aanvragen. Op het formulier moeten je naam, je adres en in één zin je motivatie duidelijk staan (bijvoorbeeld studeren, kinderboeken lenen of taal-oefenen).

Vul het volgende in zoals op een echt formulier: uw naam, uw adres en in één zin de reden van uw aanvraag voor een bibliotheekpas.`,
    en: '',
    scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
    hints: HINT_FORM,
    examFooter: 'form',
    fillInBulletsNl: ['Uw naam', 'Uw adres', 'In één zin: reden van uw aanvraag (bibliotheekpas)'],
    answerSkeletonNl: 'Uw naam:\n\n\nUw adres:\n\n\nReden van uw aanvraag (één zin):\n\n\n',
  },
  {
    stratum: 'formal_email',
    nl: `In je huurwoning heb je sinds korte tijd vochtplekken of druppels in de badkamer. Je wilt niet onnodig escaleren, maar wel dat de verhuurder of beheerder meekijkt naar een reparatie.

Schrijf een korte mail aan de verhuurder waarin je het probleem kort beschrijft, zegt waar het ongeveer lekt, en voorstelt wat je als vervolgstap verwacht (bijvoorbeeld een reactie of afspraak binnen enkele dagen).`,
    en: '',
    hints: HINT_MAIL,
    examFooter: 'mail',
  },
  {
    stratum: 'short_note',
    nl: `Je had een afspraak met een collega op een bepaalde dag, maar je rooster wijzigt: je kunt pas op donderdag op hetzelfde tijdstip.

Schrijf een kort bericht aan je collega waarin je de afspraak verzet naar donderdag en vraagt of dat uitkomt. Als het niet uitkomt, stel je een ander concreet moment voor.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'formal_email',
    nl: `Je voelt je vandaag te ziek om veilig te werken en je wilt je volgens de gebruikelijke gang van zaken ziek melden bij je werk.

Schrijf één formele zin waarin je je ziek meldt bij je werk voor vandaag en duidelijk maakt dat je niet komt opdagen (gebruik waar passend “Ik meld me ziek” of een gelijkwaardige formulering).`,
    en: '',
    hints: ['Gebruik “Ik meld me ziek” of vergelijkbaar.', 'Noem de datum van vandaag.'],
    examFooter: 'formal_short',
  },
  {
    stratum: 'formal_email',
    nl: `Door vakantie, revalidatie of tijdelijke drukte wil je je sportschoolabonnement een maand pauzeren in plaats van op te zeggen.

Schrijf een korte mail aan de sportschool waarin je kort uitlegt waarom, expliciet vraagt om pauze van precies één maand (noem zelf een start- en eindmaand), en vraagt om schriftelijke bevestiging als dat nodig is.`,
    en: '',
    hints: HINT_MAIL,
    examFooter: 'mail',
  },
  {
    stratum: 'informal_social',
    nl: `Je bent uitgenodigd voor een etentje of ander sociaal moment, maar je kunt op de voorgestelde dag echt niet. Je wilt de relatie wel warm houden.

Schrijf een korte reactie op die uitnodiging: bedank voor de uitnodiging, leg kort uit dat je niet kunt, en stel een concreet ander moment voor (bijvoorbeeld een andere avond in dezelfde week).`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'formal_email',
    nl: `Nieuwe regels over afvalscheiding in je buurt zijn op de website van de gemeente niet helemaal duidelijk en je wilt geen fouten maken bij het aanbieden van afval.

Schrijf een korte, beleefde mail aan de gemeente met een concrete vraag over afvalscheiding. Noem je wijk of straat (fictief mag) en vraag zo nodig welk document of welke contactroute je nodig hebt.`,
    en: '',
    hints: HINT_MAIL,
    scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    examFooter: 'mail',
  },
  {
    stratum: 'informal_social',
    nl: `Je buur maakt tot laat op de avond geluid (muziek, tv of meubels verslepen), waardoor jij of je gezin slecht kunt slapen. Je wilt het netjes oplossen voordat je een officiële klacht overweegt.

Schrijf precies drie zinnen in het Nederlands: leg de situatie kort uit en vraag vriendelijk om een aanpassing. Noem zelf het tijdstip waar het om gaat.`,
    en: '',
    hints: ['Blijf respectvol.', 'Noem het tijdstip.'],
    examFooter: 'paragraph',
  },
  {
    stratum: 'formal_email',
    nl: `Je hebt een uitnodiging ontvangen voor een sollicitatiegesprek en je wilt bevestigen dat je komt én beleefd bedanken voor de kans.

Schrijf een korte mail waarin je de afspraak bevestigt, de datum en tijd van het gesprek herhaalt (verzin zelf passende, realistische gegevens), en professioneel bedankt.`,
    en: '',
    hints: HINT_MAIL,
    scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    examFooter: 'mail',
  },
  {
    stratum: 'informal_social',
    nl: `De kinderopvang sluit precies op tijd; door verkeer of werk ben je iets te laat onderweg om je kind op te halen.

Schrijf een sms aan de kinderopvang waarin je meldt dat je ongeveer vijf minuten later bent bij het ophalen en—als het relevant is—wie er eventueel meekomt om het kind op te halen.`,
    en: '',
    hints: HINT_SMS,
    examFooter: 'app',
  },
  {
    stratum: 'short_note',
    nl: `Op je afdeling geldt vanaf volgende week een nieuwe regel voor printen (bijvoorbeeld dubbelzijdig, een maximum per week of een andere procedure). Niet iedereen heeft de interne memo goed gelezen.

Schrijf een korte mail aan je afdeling waarin je de nieuwe printerregel in één duidelijke paragraaf uitlegt en zegt waar mensen met vragen terechtkunnen.`,
    en: '',
    hints: HINT_MAIL,
    examFooter: 'mail',
  },
  {
    stratum: 'formal_email',
    nl: `Je pincode werkt niet goed, je vermoedt ongeautoriseerde toegang, of je pinapparaat is defect. Je wilt veilig een nieuwe pincode aanvragen zonder gevoelige gegevens onnodig te delen.

Schrijf één of twee korte, formele zinnen aan de bank waarin je vriendelijk vraagt om een nieuwe pincode. Noem geen volledig rekeningnummer; verwijs hooguit naar “mijn betaalpas” of de laatste twee cijfers als dat in deze oefening nodig is.`,
    en: '',
    hints: ['Gebruik “Geachte …” of “Beste …”.'],
    scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    examFooter: 'formal_short',
  },
  {
    stratum: 'formal_email',
    nl: `Op je werk speelt iets met een levering, planning, software of samenwerking. Je hebt al één of twee redelijke stappen gezet om het op te lossen.

Beschrijf in precies vier zinnen een klein concreet probleem op je werk, wat je al hebt gedaan, en wat je nu nog nodig hebt van je leidinggevende of team.`,
    en: '',
    hints: ['Gebruik verleden tijd waar nodig.'],
    examFooter: 'paragraph',
  },
  {
    stratum: 'formal_email',
    nl: `Een klant wacht op een levering. Door een fout in planning of voorraad komt de levering één dag later dan eerder gecommuniceerd.

Schrijf een korte mail aan die klant: bied korte excuses, leg uit dat de levering één dag uitloopt, noem de nieuwe leverdag (verzin zelf een geloofwaardige datum), en vraag of dat acceptabel is.`,
    en: '',
    hints: HINT_MAIL,
    scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    examFooter: 'mail',
  },
]

const CORE: A2WritingExamBankItem[] = [...EXAM_MIX_ANCHORS, ...CORE_LEGACY]

function capFirst(s: string): string {
  const t = s.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function buildA2WritingExamGenerated(): A2WritingExamBankItem[] {
  const out: A2WritingExamBankItem[] = []

  const aan = [
    'je teamleider',
    'een collega',
    'de receptie',
    'je afdelingshoofd',
    'de planning',
    'de HR-afdeling',
    'je mentor',
    'de servicedesk',
    'een projectpartner',
    'de facilitair medewerker',
  ]
  const onderwerp = [
    'een verplaatsing van de weekvergadering',
    'een ontbrekend document in de drive',
    'een verzoek om thuiswerken op vrijdag',
    'een fout in het rooster',
    'een reservering van een vergaderruimte',
    'een korte samenvatting van je voortgang',
    'een vraag over declaraties',
    'een melding van een kapotte stoel',
    'een uitnodiging voor een kennismakingsgesprek',
    'een verzoek om feedback op je tekst',
  ]
  for (const a of aan) {
    for (const o of onderwerp) {
      out.push({
        stratum: 'formal_email',
        nl: `Situatie (werk): ${capFirst(o)}. Je moet dit helder en professioneel communiceren naar ${a}.

Schrijf een korte mail in het Nederlands aan ${a} over dit onderwerp.`,
        en: '',
        hints: HINT_MAIL,
        examFooter: 'mail',
      })
    }
  }

  const verhuurder = ['de verhuurder', 'het beheer', 'de VvE', 'de huismeester']
  const wonen = [
    'overlast door geluid van bovenburen',
    'een kapotte verwarmingsknop',
    'een vergeten sleutel bij afsluiting',
    'grofvuil dat te lang op het pleintje staat',
    'een lekkende kraan in de keuken',
    'een vraag over servicekosten',
    'een storing in de intercom',
    'een verzoek om een extra sleutel',
  ]
  for (const v of verhuurder) {
    for (const w of wonen) {
      out.push({
        stratum: 'formal_email',
        nl: `Situatie (wonen): ${capFirst(w)}. Je wilt dit netjes en schriftelijk melden aan ${v}.

Schrijf een korte mail in het Nederlands aan ${v} over deze kwestie.`,
        en: '',
        hints: HINT_MAIL,
        examFooter: 'mail',
      })
    }
  }

  const vriend = ['een vriend', 'een vriendin', 'je buur', 'je partner', 'een klasgenoot']
  const situatie = [
    'dat je te laat bent voor de afspraak',
    'dat je de film wilt verzetten naar zaterdag',
    'dat je ziek bent en niet meegaat naar het feest',
    'dat je de boodschappen meeneemt',
    'dat je de sleutel onder de mat legt',
    'dat je morgen eerder weg moet van werk',
  ]
  for (const vf of vriend) {
    for (const sit of situatie) {
      out.push({
        stratum: 'informal_social',
        nl: `Je stuurt een app-bericht naar ${vf}. Je wilt kort en duidelijk melden ${sit}.

Schrijf een kort app-bericht in het Nederlands aan ${vf} waarin je dit meldt.`,
        en: '',
        hints: HINT_SMS,
        examFooter: 'app',
      })
    }
  }

  const instantie = [
    'de huisartsenpost',
    'de apotheek',
    'de bibliotheek',
    'het zwembad',
    'de sportschool',
    'het buurtcentrum',
    'de school van je kind',
    'de kinderopvang',
  ]
  const doel = [
    'een afspraak voor volgende week',
    'een herhaalrecept',
    'een verlenging van je lening',
    'een vraag over openingstijden in de vakantie',
    'een klacht over lawaai tijdens bouwwerkzaamheden',
    'een bevestiging van je inschrijving',
    'een vraag over kosten',
    'een verzoek om een bewijs van inschrijving',
  ]
  for (const ins of instantie) {
    for (const d of doel) {
      out.push({
        stratum: 'formal_email',
        nl: `Je richt je tot ${ins}. Je hebt het volgende nodig: ${d}. Je wilt beleefd en bondig zijn.

Schrijf een korte mail in het Nederlands aan ${ins} waarin je dit verzoek of deze vraag uitlegt.`,
        en: '',
        hints: HINT_MAIL,
        scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
        examFooter: 'mail',
      })
    }
  }

  const winkel = ['de supermarkt', 'de kledingwinkel', 'de bouwmarkt', 'de fietsenmaker', 'het postkantoor']
  const klachtOfVraag = [
    'een retour zonder bon — vraag beleefd wat kan',
    'een beschadigd product dat je gisteren kocht',
    'een vraag over garantie op een apparaat',
    'een verzoek om een factuur per e-mail',
    'een klacht over lange wachttijd bij de kassa',
  ]
  for (const w of winkel) {
    for (const k of klachtOfVraag) {
      out.push({
        stratum: 'formal_email',
        nl: `Je hebt een kwestie bij ${w}: ${k}. Je wilt het netjes oplossen zonder onnodig conflict.

Schrijf een korte mail in het Nederlands aan ${w} over dit onderwerp.`,
        en: '',
        hints: HINT_MAIL,
        examFooter: 'mail',
      })
    }
  }

  return out
}

const FOOTERS: Record<NonNullable<A2WritingExamBankItem['examFooter']>, string> = {
  mail: NL_EXAM_FOOTER_MAIL,
  app: NL_EXAM_FOOTER_APP,
  form: NL_EXAM_FOOTER_FORM,
  paragraph: NL_EXAM_FOOTER_PARAGRAPH,
  formal_short: NL_EXAM_FOOTER_FORMAL_SHORT,
}

const GENERATED = buildA2WritingExamGenerated()

/** Pool for A2 writing simulation draws (four unique prompts per run). */
export const A2_WRITING_EXAM_QUESTION_BANK: readonly A2WritingExamBankItem[] = [...CORE, ...GENERATED]

if (A2_WRITING_EXAM_QUESTION_BANK.length < 150) {
  throw new Error(`A2 writing exam bank too small: ${A2_WRITING_EXAM_QUESTION_BANK.length}`)
}

const STRATA: A2WritingExamStratum[] = ['form_fill', 'formal_email', 'informal_social', 'short_note']
for (const s of STRATA) {
  const n = A2_WRITING_EXAM_QUESTION_BANK.filter((x) => x.stratum === s).length
  if (n < 4) {
    throw new Error(`A2 writing exam bank: need at least 4 prompts in stratum "${s}", found ${n}`)
  }
}

export function getA2WritingExamBankItem(index: number): A2WritingExamBankItem {
  const pool = A2_WRITING_EXAM_QUESTION_BANK
  const ix = ((index % pool.length) + pool.length) % pool.length
  const raw = pool[ix]!
  const kind = raw.examFooter ?? 'mail'
  const footer = FOOTERS[kind]
  return {
    ...raw,
    nl: `${raw.nl.trim()}${footer}`,
    en: '',
  }
}
