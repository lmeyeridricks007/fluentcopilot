import type { SpeakingListeningMcqItem } from './speakingListeningMcqBank'
import { A2_SPEAKING_LISTENING_MCQ_POOL } from './speakingListeningMcqBank'

type McqStem = Omit<SpeakingListeningMcqItem, 'dialogueNl'>

type ScenarioDef = {
  id: string
  titleNl: string
  scriptNl: string
  stems: McqStem[]
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

/** Hand-authored multi-question clips (flattened into the pool). */
const A2_STANDALONE_LISTENING_SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'supermarkt',
    titleNl: 'Supermarkt',
    scriptNl:
      'A: Goedemiddag, waar vind ik de halfvolle melk? B: Gang twee, rechts bij de koeling. A: En brood zonder zaden? B: Bij de bakkerijhoek, vooraan links. A: Dank u wel.',
    stems: [
      {
        questionNl: 'Waar is de halfvolle melk volgens B?',
        questionEn: 'Where is the semi-skimmed milk according to B?',
        options: [
          { id: 'a', label: 'Gang één, links.' },
          { id: 'b', label: 'Gang twee, rechts bij de koeling.' },
          { id: 'c', label: 'Bij de kassa.' },
          { id: 'd', label: 'Buiten bij de fietsenstalling.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Waar moet je volgens B zijn voor brood zonder zaden?',
        questionEn: 'Where should you go for seedless bread, according to B?',
        options: [
          { id: 'a', label: 'Gang twee, rechts.' },
          { id: 'b', label: 'Bij de bakkerijhoek, vooraan links.' },
          { id: 'c', label: 'Alleen online bestellen.' },
          { id: 'd', label: 'Dat verkopen ze niet.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat doet A op het eind?',
        questionEn: 'What does A do at the end?',
        options: [
          { id: 'a', label: 'Ze klaagt over de prijs.' },
          { id: 'b', label: 'Ze bedankt.' },
          { id: 'c', label: 'Ze belt de manager.' },
          { id: 'd', label: 'Ze vraagt om korting.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'tram',
    titleNl: 'Tram',
    scriptNl:
      'Omroep: Let op, tram vier stopt niet bij halte Rembrandtplein. Stap uit bij halte Munt en loop drie minuten. Excuses voor het ongemak.',
    stems: [
      {
        questionNl: 'Welke halte wordt overgeslagen?',
        questionEn: 'Which stop is skipped?',
        options: [
          { id: 'a', label: 'Munt.' },
          { id: 'b', label: 'Rembrandtplein.' },
          { id: 'c', label: 'Centraal Station.' },
          { id: 'd', label: 'Alle haltes.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat moet je doen om in de buurt te komen van je bestemming?',
        questionEn: 'What should you do to get near your destination?',
        options: [
          { id: 'a', label: 'Blijven zitten tot het eindpunt.' },
          { id: 'b', label: 'Uitstappen bij Munt en drie minuten lopen.' },
          { id: 'c', label: 'Overstappen op de metro zonder uitstappen.' },
          { id: 'd', label: 'Een taxi bellen.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Welk vervoermiddel gaat het over?',
        questionEn: 'Which mode of transport is announced?',
        options: [
          { id: 'a', label: 'Bus vijf.' },
          { id: 'b', label: 'Tram vier.' },
          { id: 'c', label: 'Trein naar Schiphol.' },
          { id: 'd', label: 'De ferry.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'huisarts',
    titleNl: 'Huisartsenpost',
    scriptNl:
      'A: Ik bel omdat mijn kind hoge koorts heeft sinds vanavond. B: Hoe oud is uw kind? A: Vijf jaar. B: Bel 112 als uw kind suf is of moeilijk ademt; anders kunt u morgenochtend naar de huisarts.',
    stems: [
      {
        questionNl: 'Waarom belt A?',
        questionEn: 'Why is A calling?',
        options: [
          { id: 'a', label: 'Om een afspraak voor een controle over een jaar.' },
          { id: 'b', label: 'Omdat het kind hoge koorts heeft sinds vanavond.' },
          { id: 'c', label: 'Voor een receptverlenging zonder klachten.' },
          { id: 'd', label: 'Om de openingstijden van de sportschool te vragen.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat zegt B dat A moet doen bij sufheid of moeilijk ademen?',
        questionEn: 'What does B say A should do if the child is drowsy or breathes with difficulty?',
        options: [
          { id: 'a', label: 'Wachten tot maandag.' },
          { id: 'b', label: '112 bellen.' },
          { id: 'c', label: 'Paracetamol uit de automaat halen.' },
          { id: 'd', label: 'Naar de dierenarts gaan.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'werkplek',
    titleNl: 'Werk',
    scriptNl:
      'A: De presentatie is verplaatst van dinsdag naar woensdag om tien uur. B: Heb je de slides al naar het team gestuurd? A: Nog niet, ik doe dat vandaag voor vijf uur. B: Prima, dan review ik ze vanavond.',
    stems: [
      {
        questionNl: 'Wanneer is de presentatie nu?',
        questionEn: 'When is the presentation now?',
        options: [
          { id: 'a', label: 'Dinsdag om tien uur.' },
          { id: 'b', label: 'Woensdag om tien uur.' },
          { id: 'c', label: 'Vrijdagmiddag.' },
          { id: 'd', label: 'De presentatie is geannuleerd.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wanneer stuurt A de slides naar het team?',
        questionEn: 'When will A send the slides to the team?',
        options: [
          { id: 'a', label: 'Morgenochtend.' },
          { id: 'b', label: 'Vandaag voor vijf uur.' },
          { id: 'c', label: 'Na de vakantie.' },
          { id: 'd', label: 'Dat zegt A niet.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wanneer wil B de slides bekijken?',
        questionEn: 'When does B want to review the slides?',
        options: [
          { id: 'a', label: 'Vanavond.' },
          { id: 'b', label: 'Volgend kwartaal.' },
          { id: 'c', label: 'Nooit.' },
          { id: 'd', label: 'Tijdens de presentatie pas.' },
        ],
        correctOptionIds: ['a'],
      },
    ],
  },
  {
    id: 'buren',
    titleNl: 'Buren',
    scriptNl:
      'A: Hallo, kunnen we het volume van de muziek iets lager? Het is al laat. B: Oh sorry, we dachten niet dat het zo hard was. A: Geen probleem, dank je wel.',
    stems: [
      {
        questionNl: 'Wat vraagt A?',
        questionEn: 'What does A ask?',
        options: [
          { id: 'a', label: 'Of B harder kan spelen.' },
          { id: 'b', label: 'Of het volume wat lager kan — het is laat.' },
          { id: 'c', label: 'Of B kan verhuizen.' },
          { id: 'd', label: 'Om geld te lenen.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Hoe reageert B?',
        questionEn: 'How does B respond?',
        options: [
          { id: 'a', label: 'B wordt boos en weigert.' },
          { id: 'b', label: 'B excuseert zich en zegt dat ze het niet zo hard dachten.' },
          { id: 'c', label: 'B belt de politie.' },
          { id: 'd', label: 'B zegt niets.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'ov_chipkaart',
    titleNl: 'OV-chipkaart',
    scriptNl:
      'A: Mijn kaart checkt niet in bij de poortjes. B: Staat saldo op de kaart? A: Ja, twintig euro. B: Probeer een andere poort; anders ga naar de servicebalie op het station.',
    stems: [
      {
        questionNl: 'Wat is het probleem van A?',
        questionEn: "What is A's problem?",
        options: [
          { id: 'a', label: 'De kaart is verlopen sinds 2010.' },
          { id: 'b', label: 'Inchecken bij de poortjes lukt niet.' },
          { id: 'c', label: 'A heeft geen kaart.' },
          { id: 'd', label: 'De trein rijdt niet.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Hoeveel saldo zegt A te hebben?',
        questionEn: 'How much balance does A say they have?',
        options: [
          { id: 'a', label: 'Nul euro.' },
          { id: 'b', label: 'Twintig euro.' },
          { id: 'c', label: 'Honderd euro.' },
          { id: 'd', label: 'Dat zegt A niet.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat adviseert B als het opnieuw misgaat?',
        questionEn: 'What does B advise if it still fails?',
        options: [
          { id: 'a', label: 'De kaart weggooien.' },
          { id: 'b', label: 'Naar de servicebalie op het station.' },
          { id: 'c', label: 'Nooit meer reizen.' },
          { id: 'd', label: 'Een nieuwe auto kopen.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'bibliotheek',
    titleNl: 'Bibliotheek',
    scriptNl:
      'A: Tot wanneer kan ik dit boek lenen? B: Drie weken, met één keer verlengen online. A: En als ik te laat ben? B: Dan betaalt u een kleine boete per dag.',
    stems: [
      {
        questionNl: 'Hoe lang mag je het boek lenen?',
        questionEn: 'How long may you borrow the book?',
        options: [
          { id: 'a', label: 'Eén dag.' },
          { id: 'b', label: 'Drie weken.' },
          { id: 'c', label: 'Eén jaar zonder verlengen.' },
          { id: 'd', label: 'Voor altijd.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat gebeurt er als je te laat bent?',
        questionEn: 'What happens if you are late returning?',
        options: [
          { id: 'a', label: 'Niets.' },
          { id: 'b', label: 'Je betaalt een kleine boete per dag.' },
          { id: 'c', label: 'Je mag nooit meer lenen.' },
          { id: 'd', label: 'Je krijgt een gratis boek.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'pakketpost',
    titleNl: 'Pakketdienst',
    scriptNl:
      'A: Mijn pakket staat op “bezorgd”, maar ik heb niets gekregen. B: Controleer of de buur het heeft aangenomen; anders start ik een onderzoek bij de bezorger. A: Oké, ik vraag het even.',
    stems: [
      {
        questionNl: 'Wat zegt de track-and-trace-status volgens A?',
        questionEn: 'What does the tracking status say according to A?',
        options: [
          { id: 'a', label: '“Onderweg”.' },
          { id: 'b', label: '“Bezorgd”.' },
          { id: 'c', label: '“Verloren”.' },
          { id: 'd', label: '“Teruggestuurd naar China”.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat stelt B voor als eerste stap?',
        questionEn: 'What does B suggest as a first step?',
        options: [
          { id: 'a', label: 'Direct naar de rechtbank.' },
          { id: 'b', label: 'Controleren of de buur het pakket heeft aangenomen.' },
          { id: 'c', label: 'Het pakket opnieuw bestellen zonder onderzoek.' },
          { id: 'd', label: 'Niets doen.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Wat gaat A doen?',
        questionEn: 'What will A do?',
        options: [
          { id: 'a', label: 'B negeren.' },
          { id: 'b', label: 'Het even aan de buur vragen.' },
          { id: 'c', label: 'Het pakket in de fik steken.' },
          { id: 'd', label: 'Verhuizen naar het buitenland.' },
        ],
        correctOptionIds: ['b'],
      },
    ],
  },
  {
    id: 'school',
    titleNl: 'School',
    scriptNl:
      'A: Morgen is de schooltrip naar het museum; vergeet geen lunchpakket en een fles water. B: Hoe laat vertrekken we? A: Om half negen bij de hoofdingang. B: Prima, tot morgen.',
    stems: [
      {
        questionNl: 'Waar gaat de trip naartoe?',
        questionEn: 'Where does the trip go?',
        options: [
          { id: 'a', label: 'Naar het zwembad.' },
          { id: 'b', label: 'Naar het museum.' },
          { id: 'c', label: 'Naar de bioscoop.' },
          { id: 'd', label: 'Naar het strand.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Hoe laat is de afspraak bij de hoofdingang?',
        questionEn: 'What time is the meeting at the main entrance?',
        options: [
          { id: 'a', label: 'Om half negen.' },
          { id: 'b', label: 'Om twaalf uur ’s nachts.' },
          { id: 'c', label: 'Om vier uur ’s nachts.' },
          { id: 'd', label: 'Dat wordt niet gezegd.' },
        ],
        correctOptionIds: ['a'],
      },
    ],
  },
  {
    id: 'restaurant',
    titleNl: 'Restaurant',
    scriptNl:
      'A: Mag ik de vegetarische pasta, maar zonder kaas? B: Ja, dat kan. Het duurt ongeveer twintig minuten. A: Mooi, en mag ik nog kraanwater? B: Natuurlijk.',
    stems: [
      {
        questionNl: 'Wat wil A eten?',
        questionEn: 'What does A want to eat?',
        options: [
          { id: 'a', label: 'Vlees met friet.' },
          { id: 'b', label: 'Vegetarische pasta zonder kaas.' },
          { id: 'c', label: 'Alleen dessert.' },
          { id: 'd', label: 'Niets; A wil alleen slapen.' },
        ],
        correctOptionIds: ['b'],
      },
      {
        questionNl: 'Hoe lang duurt het ongeveer volgens B?',
        questionEn: 'How long will it take approximately according to B?',
        options: [
          { id: 'a', label: 'Twintig minuten.' },
          { id: 'b', label: 'Twee uur.' },
          { id: 'c', label: 'Eén minuut.' },
          { id: 'd', label: 'Een week.' },
        ],
        correctOptionIds: ['a'],
      },
    ],
  },
] as const

function flattenScenarios(scenarios: readonly ScenarioDef[]): SpeakingListeningMcqItem[] {
  const out: SpeakingListeningMcqItem[] = []
  for (const sc of scenarios) {
    const script = sc.scriptNl.trim()
    for (const stem of sc.stems) {
      out.push({ dialogueNl: script, ...stem })
    }
  }
  return out
}

function buildA2StandaloneListeningGenerated(): SpeakingListeningMcqItem[] {
  const out: SpeakingListeningMcqItem[] = []

  const workplaces = [
    'kantoor Noord',
    'kantoor Zuid',
    'vestiging Utrecht',
    'hoofdkantoor',
    'het magazijn',
    'de fabriek',
    'de apotheek',
    'de basisschool',
    'de sportschool',
    'het ziekenhuis',
    'de tandartspraktijk',
    'de bakkerij',
    'het hotel',
    'de garage',
    'de bank',
    'het advocatenkantoor',
    'de kinderopvang',
    'de boekhandel',
    'de kledingwinkel',
    'de bloemenwinkel',
    'de dierenkliniek',
    'de schoenmaker',
    'de opticien',
    'de reisbureau',
    'de kapperszaak',
    'de slijterij',
    'de slagerij',
    'de viswinkel',
    'de kaaswinkel',
    'de marktkraam',
  ]
  const times = ['acht uur', 'half negen', 'tien uur', 'half elf', 'twaalf uur', 'één uur', 'half twee', 'drie uur']
  for (const wp of workplaces) {
    for (const t of times) {
      out.push({
        dialogueNl: `A: Waar is de vergadering morgen? B: Bij ${wp}, om ${t}. A: Prima, ik zet het in mijn agenda. B: Vergeet je laptop niet.`,
        questionNl: 'Hoe laat begint de vergadering volgens B?',
        questionEn: 'What time does the meeting start according to B?',
        options: [
          { id: 'a', label: `Om ${t}.` },
          { id: 'b', label: 'Om zeven uur ’s ochtends, zonder uitzondering.' },
          { id: 'c', label: 'De vergadering is afgelast zonder nieuwe datum.' },
          { id: 'd', label: 'Alleen ’s avonds na tienen.' },
        ],
        correctOptionIds: ['a'],
      })
    }
  }

  const gemeenten = [
    'Amsterdam',
    'Rotterdam',
    'Den Haag',
    'Utrecht',
    'Eindhoven',
    'Groningen',
    'Tilburg',
    'Almere',
    'Breda',
    'Nijmegen',
  ]
  const documenten = [
    'een uittreksel uit de Basisregistratie Personen',
    'een verhuismelding',
    'een parkeervergunning',
    'een paspoortaanvraag',
    'een rijbewijsverlenging',
  ]
  for (const g of gemeenten) {
    for (const d of documenten) {
      out.push({
        dialogueNl: `A: Goedemiddag, ik kom voor ${d} in ${g}. B: Neem een nummer bij de kiosk; u wordt geholpen bij balie twee. A: Moet ik iets meenemen? B: Identiteitsbewijs en eventueel huurcontract.`,
        questionNl: 'Waar moet A volgens B eerst naartoe?',
        questionEn: 'Where should A go first according to B?',
        options: [
          { id: 'a', label: 'Direct naar de balie zonder nummer.' },
          { id: 'b', label: 'Een nummer nemen bij de kiosk.' },
          { id: 'c', label: 'Naar de receptie van het ziekenhuis.' },
          { id: 'd', label: 'Naar het postkantoor in een andere stad.' },
        ],
        correctOptionIds: ['b'],
      })
    }
  }

  const weer = ['regen', 'storm', 'sneeuw', 'mist', 'hagel', 'warmte', 'wind', 'onweer']
  const advies = [
    'neem een paraplu mee',
    'blijf binnen als het niet nodig is om te gaan',
    'rij langzamer op de snelweg',
    'draag een warme jas',
    'drink extra water',
    'let op losse voorwerpen buiten',
  ]
  for (let i = 0; i < weer.length; i += 1) {
    const w = weer[i]!
    const adv = advies[i % advies.length]!
    out.push({
      dialogueNl: `Weerbericht: vandaag verwachten we ${w} in het westen van het land. Reizigers: ${adv}.`,
      questionNl: 'Waar is het weer volgens het bericht vooral slecht?',
      questionEn: 'Where is the weather mainly bad according to the message?',
      options: [
        { id: 'a', label: 'In het oosten.' },
        { id: 'b', label: 'In het westen van het land.' },
        { id: 'c', label: 'Alleen op de Waddeneilanden.' },
        { id: 'd', label: 'Nergens; het wordt overal zonnig.' },
      ],
      correctOptionIds: ['b'],
    })
  }

  const sporten = ['zwemmen', 'fitness', 'voetbal', 'tennis', 'yoga', 'hardlopen', 'schaatsen']
  for (const sp of sporten) {
    for (const u of ['acht uur', 'tien uur', 'half zes ’s avonds']) {
      out.push({
        dialogueNl: `A: Wanneer is er plek voor ${sp}? B: Er is nog ruimte om ${u}. A: Mag ik online reserveren? B: Ja, via onze website.`,
        questionNl: 'Wanneer is er volgens B nog plek?',
        questionEn: 'When is there still space according to B?',
        options: [
          { id: 'a', label: `Om ${u}.` },
          { id: 'b', label: 'Nooit; alles is vol tot volgend jaar.' },
          { id: 'c', label: 'Alleen ’s nachts.' },
          { id: 'd', label: 'Dat zegt B niet.' },
        ],
        correctOptionIds: ['a'],
      })
    }
  }

  const straten = ['de Hoofdstraat', 'de Markt', 'het Plein', 'de Dijk', 'het Stationsplein', 'de Molenweg']
  const werkzaamheden = ['gasleiding', 'waterleiding', 'asfalt', 'riolering', 'glasvezel', 'boomonderhoud']
  for (const s of straten) {
    for (const wz of werkzaamheden) {
      out.push({
        dialogueNl: `Gemeentelijke mededeling: op ${s} zijn werkzaamheden aan de ${wz}. Fietsers en auto’s worden omgeleid via de parallelweg.`,
        questionNl: 'Waar moeten verkeersdeelnemers volgens het bericht langs?',
        questionEn: 'Where should traffic go according to the message?',
        options: [
          { id: 'a', label: 'Via de snelweg zonder omleiding.' },
          { id: 'b', label: 'Via de parallelweg.' },
          { id: 'c', label: 'Door het winkelcentrum te voet.' },
          { id: 'd', label: 'Nergens; alle wegen zijn dicht.' },
        ],
        correctOptionIds: ['b'],
      })
    }
  }

  return out
}

const STANDALONE_GENERATED = buildA2StandaloneListeningGenerated()
const STANDALONE_CORE = flattenScenarios(A2_STANDALONE_LISTENING_SCENARIOS)

/**
 * Pool for A2 standalone listening simulation: hand clips + generated items +
 * shared A2 listening/speaking MCQ templates (same item shape).
 */
export const A2_STANDALONE_LISTENING_MCQ_POOL: readonly SpeakingListeningMcqItem[] = [
  ...STANDALONE_CORE,
  ...STANDALONE_GENERATED,
  ...A2_SPEAKING_LISTENING_MCQ_POOL,
]

assertBank([...A2_STANDALONE_LISTENING_MCQ_POOL], 'A2 standalone listening MCQ pool')

export function getA2StandaloneListeningMcqByPoolIndex(index: number): SpeakingListeningMcqItem {
  const pool = A2_STANDALONE_LISTENING_MCQ_POOL
  if (!pool.length) throw new Error('A2 standalone listening MCQ pool empty')
  const ix = ((index % pool.length) + pool.length) % pool.length
  return pool[ix]!
}
