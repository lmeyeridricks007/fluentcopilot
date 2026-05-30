import type { ExamLevel } from './types'

export type SpeakingListeningMcqOption = { id: string; label: string; imageUrl?: string }

export type SpeakingListeningMcqItem = {
  /** Spoken dialogue (TTS) before the learner sees the question. */
  dialogueNl: string
  questionNl: string
  questionEn: string
  options: SpeakingListeningMcqOption[]
  correctOptionIds: string[]
}

function seedIndex(seed: string, i: number, mod: number): number {
  let h = 0
  const s = `${seed}:speaking-listening-mcq:${i}`
  for (let k = 0; k < s.length; k += 1) h = (h * 31 + s.charCodeAt(k)) >>> 0
  return mod > 0 ? h % mod : 0
}

function assertBank(items: SpeakingListeningMcqItem[], label: string) {
  for (const it of items) {
    const ids = new Set(it.options.map((o) => o.id))
    if (!it.correctOptionIds.length) throw new Error(`${label}: empty correctOptionIds`)
    const uniq = new Set(it.correctOptionIds)
    if (uniq.size !== it.correctOptionIds.length) throw new Error(`${label}: duplicate correct ids`)
    for (const c of it.correctOptionIds) {
      if (!ids.has(c)) throw new Error(`${label}: correct id "${c}" missing from options`)
    }
  }
}

/** Hand-authored A2-style items (short dialogues → best response). */
const A2_BANK_CORE: SpeakingListeningMcqItem[] = [
  {
    dialogueNl:
      'A: Hé, de trein heeft tien minuten vertraging. B: Och, dan halen we onze overstap niet. A: Laten we de conducteur vragen wat we het beste kunnen doen.',
    questionNl: 'Wat stelt persoon A voor?',
    questionEn: 'What does person A suggest?',
    options: [
      { id: 'a', label: 'Thuisblijven en niet reizen.' },
      { id: 'b', label: 'De conducteur vragen wat ze het beste kunnen doen.' },
      { id: 'c', label: 'Een taxi nemen zonder te vragen.' },
      { id: 'd', label: 'Op het perron blijven wachten zonder actie.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Goedemiddag, ik heb een afspraak om half drie bij de huisarts. B: U bent een kwartier te laat; de dokter kan u misschien tussendoor zien. A: Oké, dan wacht ik hier even.',
    questionNl: 'Wat gebeurt er met de afspraak?',
    questionEn: 'What happens with the appointment?',
    options: [
      { id: 'a', label: 'De afspraak wordt automatisch geannuleerd.' },
      { id: 'b', label: 'De patiënt moet morgen terugkomen zonder uitzondering.' },
      { id: 'c', label: 'De patiënt is te laat; de dokter kan de patiënt misschien tussendoor zien.' },
      { id: 'd', label: 'De receptie geeft geen uitleg.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    dialogueNl:
      'A: Mag ik dit broodje zonder ui, alstublieft? B: Ja hoor, even geduld. A: Dank u wel.',
    questionNl: 'Wat wil klant A?',
    questionEn: 'What does customer A want?',
    options: [
      { id: 'a', label: 'Een broodje met extra ui.' },
      { id: 'b', label: 'Een broodje zonder ui.' },
      { id: 'c', label: 'Alleen een drankje.' },
      { id: 'd', label: 'Terugbetaling van gisteren.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: We hebben morgen een teamvergadering om tien uur. B: Ik kan niet; ik moet mijn kind naar school brengen. A: Geen probleem, we verplaatsen het naar half elf.',
    questionNl: 'Waarom past persoon A de tijd aan?',
    questionEn: 'Why does person A change the time?',
    options: [
      { id: 'a', label: 'Omdat B ziek is.' },
      { id: 'b', label: 'Omdat B om tien uur niet kan door het brengen van het kind.' },
      { id: 'c', label: 'Omdat de vergadering wordt geannuleerd.' },
      { id: 'd', label: 'Omdat het kantoor dicht is.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Waar is de uitgang naar het busstation? B: Ga hier rechtdoor, bij de roltrap naar links. A: Bedankt!',
    questionNl: 'Welke richting moet je volgens B ongeveer nemen na rechtdoor?',
    questionEn: 'Which way should you go after straight ahead, according to B?',
    options: [
      { id: 'a', label: 'Meteen naar rechts.' },
      { id: 'b', label: 'Bij de roltrap naar links.' },
      { id: 'c', label: 'Terug naar de ingang.' },
      { id: 'd', label: 'De trap op naar de tweede verdieping.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Ik voel me niet goed; ik denk dat ik griep heb. B: Bel de huisartsenpost als het echt niet kan wachten tot morgen. A: Goed idee, dank je.',
    questionNl: 'Wat adviseert B?',
    questionEn: 'What does B advise?',
    options: [
      { id: 'a', label: 'Direct naar het ziekenhuis rijden zonder te bellen.' },
      { id: 'b', label: 'De huisartsenpost bellen als het niet kan wachten tot morgen.' },
      { id: 'c', label: 'Geen medicijnen gebruiken.' },
      { id: 'd', label: 'Naar de apotheek zonder recept.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Het pakket is beschadigd aangekomen. B: Vul het klachtenformulier in op onze website; stuur ook een foto. A: Dat doe ik vanavond.',
    questionNl: 'Wat moet A doen volgens B?',
    questionEn: 'What should A do according to B?',
    options: [
      { id: 'a', label: 'Het pakket weggooien zonder melding.' },
      { id: 'b', label: 'Het formulier invullen en een foto sturen.' },
      { id: 'c', label: 'Morgen persoonlijk langskomen zonder afspraak.' },
      { id: 'd', label: 'Niets; B regelt alles automatisch.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Mag ik deze jas passen in maat M? B: Ja, de paskamers zijn daar links. A: Prima.',
    questionNl: 'Waar kan A de jas passen?',
    questionEn: 'Where can A try on the jacket?',
    options: [
      { id: 'a', label: 'Bij de kassa rechts.' },
      { id: 'b', label: 'In de paskamers links.' },
      { id: 'c', label: 'Alleen thuis na betaling.' },
      { id: 'd', label: 'Op straat voor de winkel.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: De cursus start volgende week maandag. B: Moet ik iets voorbereiden? A: Lees hoofdstuk één; dat is genoeg voor de eerste les.',
    questionNl: 'Wat moet B voorbereiden?',
    questionEn: 'What should B prepare?',
    options: [
      { id: 'a', label: 'Hele boek uit het hoofd leren.' },
      { id: 'b', label: 'Hoofdstuk één lezen.' },
      { id: 'c', label: 'Niets; de cursus is geannuleerd.' },
      { id: 'd', label: 'Een presentatie van twintig minuten.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Het is vandaag heel druk in de winkel; wilt u in de rij aansluiten? B: Hoe lang duurt het ongeveer? A: Ongeveer tien minuten.',
    questionNl: 'Hoe lang is de wachttijd volgens A ongeveer?',
    questionEn: 'How long is the wait according to A?',
    options: [
      { id: 'a', label: 'Een uur.' },
      { id: 'b', label: 'Ongeveer tien minuten.' },
      { id: 'c', label: 'Er is geen wachtrij.' },
      { id: 'd', label: 'De winkel is dicht.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Ik heb mijn sleutels binnen laten liggen. B: Bel een slotenmaker; ik kan je een nummer geven. A: Graag, dank je wel.',
    questionNl: 'Wat raadt B aan?',
    questionEn: 'What does B recommend?',
    options: [
      { id: 'a', label: 'Het raam inslaan.' },
      { id: 'b', label: 'Een slotenmaker bellen; B kan een nummer geven.' },
      { id: 'c', label: 'Wachten tot de buren op vakantie zijn.' },
      { id: 'd', label: 'Niets doen tot morgen.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: De film begint om half negen. B: Dan moeten we nu vertrekken, anders missen we het begin. A: Oké, ik pak mijn jas.',
    questionNl: 'Waarom willen ze nu vertrekken?',
    questionEn: 'Why do they want to leave now?',
    options: [
      { id: 'a', label: 'Omdat de film al afgelopen is.' },
      { id: 'b', label: 'Omdat ze anders het begin van de film missen.' },
      { id: 'c', label: 'Omdat het restaurant dicht is.' },
      { id: 'd', label: 'Omdat het regent zonder reden.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Ik zoek werk in de zorg, maar ik heb nog geen diploma erkend in Nederland. B: Vraag het DUO om een beoordeling van je buitenlands diploma. A: Dat wist ik niet, bedankt.',
    questionNl: 'Wat stelt B voor?',
    questionEn: 'What does B suggest?',
    options: [
      { id: 'a', label: 'Direct solliciteren zonder documenten.' },
      { id: 'b', label: 'Het DUO vragen om beoordeling van het buitenlandse diploma.' },
      { id: 'c', label: 'Stoppen met zoeken.' },
      { id: 'd', label: 'Een nieuwe opleiding beginnen zonder informatie.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Mag ik dit artikel retourneren? Ik heb de bon nog. B: Binnen veertien dagen is dat geen probleem met bon. A: Mooi, hier is de bon.',
    questionNl: 'Wanneer is retour volgens B mogelijk?',
    questionEn: 'When is return possible according to B?',
    options: [
      { id: 'a', label: 'Alleen op zondag.' },
      { id: 'b', label: 'Binnen veertien dagen met bon.' },
      { id: 'c', label: 'Nooit, zonder uitzondering.' },
      { id: 'd', label: 'Alleen zonder bon.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Het OV-chipkaart saldo is te laag; je kunt niet inchecken. B: Laad op bij een automaat of online. A: Ik doe het bij de automaat hier.',
    questionNl: 'Wat moet A doen?',
    questionEn: 'What must A do?',
    options: [
      { id: 'a', label: 'Niets; het lost zichzelf op.' },
      { id: 'b', label: 'Saldo opwaarderen bij een automaat of online.' },
      { id: 'c', label: 'Een nieuwe kaart kopen zonder de oude te gebruiken.' },
      { id: 'd', label: 'Gratis reizen zonder kaart.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    dialogueNl:
      'A: Ik heb last van mijn rug sinds ik thuiswerk. B: Zorg voor een goede stoel en neem elke uur een korte pauze. A: Dat ga ik proberen.',
    questionNl: 'Welke twee dingen adviseert B?',
    questionEn: 'Which two things does B advise?',
    options: [
      { id: 'a', label: 'Meer uren achter elkaar werken zonder pauze.' },
      { id: 'b', label: 'Een goede stoel en elk uur een korte pauze.' },
      { id: 'c', label: 'Stoppen met werken voor altijd.' },
      { id: 'd', label: 'Alleen ’s nachts werken.' },
    ],
    correctOptionIds: ['b'],
  },
]

function buildA2ListeningMcqGenerated(): SpeakingListeningMcqItem[] {
  const out: SpeakingListeningMcqItem[] = []
  const shops = [
    'Albert Heijn',
    'Jumbo',
    'Lidl',
    'Dirk',
    'Plus',
    'Coop',
    'Spar',
    'Hema',
    'Blokker',
    'Kruidvat',
    'Etos',
    'Action',
    'IKEA',
    'Decathlon',
    'MediaMarkt',
  ]
  const products = [
    { nl: 'volle melk', aisle: 'gang twee, schap vier' },
    { nl: 'diepvriespizza', aisle: 'vriezer bij ingang drie' },
    { nl: 'wasmiddel', aisle: 'gang vijf, onderaan links' },
    { nl: 'wc-papier', aisle: 'gang een, grote stelling' },
    { nl: 'brood zonder zaden', aisle: 'bakkerij achterin' },
  ]
  for (const shop of shops) {
    for (const p of products) {
      out.push({
        dialogueNl: `A: Goedendag, welkom bij ${shop}. B: Waar vind ik ${p.nl}? A: ${p.aisle.charAt(0).toUpperCase() + p.aisle.slice(1)}. B: Bedankt.`,
        questionNl: 'Waar moet B volgens A zijn?',
        questionEn: 'Where should B go according to A?',
        options: [
          { id: 'a', label: 'Alleen bij de servicebalie zonder uitleg.' },
          { id: 'b', label: `${p.aisle.charAt(0).toUpperCase() + p.aisle.slice(1)}.` },
          { id: 'c', label: 'Buiten de winkel bij de fietsenstalling.' },
          { id: 'd', label: 'Dat verkopen ze hier helemaal niet.' },
        ],
        correctOptionIds: ['b'],
      })
    }
  }

  const lines = ['lijn 3', 'lijn 12', 'bus 22', 'tram 7', 'metro B', 'sprinter naar Schiphol']
  const issues = ['omleiding via Centraal', '5 minuten vertraging', 'uitval tussen twee haltes', 'extra controle']
  for (const line of lines) {
    for (const issue of issues) {
      out.push({
        dialogueNl: `A: Beste reizigers, ${line} heeft vandaag ${issue}. B: Wat betekent dat voor ons? A: Volg de omroep of vraag personeel op het perron. B: Oké.`,
        questionNl: 'Wat adviseert A om te doen?',
        questionEn: 'What does A advise travellers to do?',
        options: [
          { id: 'a', label: 'Niet meer reizen tot morgen.' },
          { id: 'b', label: 'De omroep volgen of personeel op het perron vragen.' },
          { id: 'c', label: 'Zelf een nieuwe route uitvinden zonder info.' },
          { id: 'd', label: 'Altijd gratis reizen.' },
        ],
        correctOptionIds: ['b'],
      })
    }
  }

  const days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
  for (const day of days) {
    out.push({
      dialogueNl: `A: Hallo, ik bel over mijn afspraak ${day}. B: Die staat om tien uur. A: Kan dat een uur later? B: Ja, half elf is vrij. A: Prima.`,
      questionNl: 'Op welk tijdstip staat de afspraak uiteindelijk?',
      questionEn: 'What time is the appointment finally set for?',
      options: [
        { id: 'a', label: 'Om tien uur, zonder wijziging.' },
        { id: 'b', label: 'Om half elf.' },
        { id: 'c', label: 'De afspraak is geannuleerd.' },
        { id: 'd', label: 'Om negen uur ’s avonds.' },
      ],
      correctOptionIds: ['b'],
    })
  }

  const roles = ['de schoonmaker', 'de conciërge', 'de receptiemedewerker', 'de beveiliger']
  for (const role of roles) {
    out.push({
      dialogueNl: `A: Goedemorgen, ik zoek ${role}. B: Die is nu op de tweede verdieping bij de lift. A: Dank u wel.`,
      questionNl: 'Waar is de persoon volgens B?',
      questionEn: 'Where is the person according to B?',
      options: [
        { id: 'a', label: 'Buiten bij de rookzone.' },
        { id: 'b', label: 'Op de tweede verdieping bij de lift.' },
        { id: 'c', label: 'Thuis aan het werk.' },
        { id: 'd', label: 'Nergens; die bestaat niet.' },
      ],
      correctOptionIds: ['b'],
    })
  }

  const amounts = ['tien euro', 'twintig euro', 'contactloos betalen', 'pinnen']
  for (const amt of amounts) {
    out.push({
      dialogueNl: `A: Het totaal is ${amt}. B: Mag ik pinnen? A: Ja hoor, pin even hier. B: Gelukt.`,
      questionNl: 'Wat zegt A over betalen?',
      questionEn: 'What does A say about paying?',
      options: [
        { id: 'a', label: 'Alleen contant is mogelijk.' },
        { id: 'b', label: 'Pinnen mag op dit apparaat.' },
        { id: 'c', label: 'Betalen hoeft niet.' },
        { id: 'd', label: 'Alleen met een creditcard uit het buitenland.' },
      ],
      correctOptionIds: ['b'],
    })
  }

  return out
}

/** Full A2 Part 2 pool for Inburgering-style speaking (100+ items). */
export const A2_SPEAKING_LISTENING_MCQ_POOL: readonly SpeakingListeningMcqItem[] = [...A2_BANK_CORE, ...buildA2ListeningMcqGenerated()]

assertBank([...A2_SPEAKING_LISTENING_MCQ_POOL], 'speakingListeningMcq A2 pool')

/** Smaller bank for A1/B1 if used later — reuse subset of A2 pool. */
const A1_BANK: SpeakingListeningMcqItem[] = [...A2_SPEAKING_LISTENING_MCQ_POOL.slice(0, 10)]
const B1_BANK: SpeakingListeningMcqItem[] = [...A2_SPEAKING_LISTENING_MCQ_POOL]

assertBank(A1_BANK, 'speakingListeningMcq A1')
assertBank(B1_BANK, 'speakingListeningMcq B1')

export function getA2SpeakingListeningMcqByPoolIndex(index: number): SpeakingListeningMcqItem {
  const pool = A2_SPEAKING_LISTENING_MCQ_POOL
  if (!pool.length) throw new Error('A2 listening MCQ pool empty')
  const ix = ((index % pool.length) + pool.length) % pool.length
  return pool[ix]!
}

export function pickSpeakingListeningMcq(level: ExamLevel, sessionSeed: string, taskIndex: number): SpeakingListeningMcqItem {
  const bank = level === 'A1' ? A1_BANK : level === 'B1' ? B1_BANK : [...A2_SPEAKING_LISTENING_MCQ_POOL]
  const ix = seedIndex(sessionSeed, taskIndex, bank.length)
  return bank[ix]!
}
