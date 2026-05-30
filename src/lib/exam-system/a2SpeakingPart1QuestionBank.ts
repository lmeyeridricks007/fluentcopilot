import type { ExamScoringDimension } from './types'
import { a2SpeakingBankExampleNl } from './speakingPromptModelAnswer'

export type A2Part1BankTaskType = 'short_response' | 'practical_request' | 'follow_up_response'

export type A2Part1QuestionItem = {
  taskType: A2Part1BankTaskType
  nl: string
  en: string
  scenarioScriptNl?: string
  hints?: string[]
  example?: string
}

/** Timers and scoring match Inburgering A2 speaking Part 1 profile. */
export function a2Part1BlueprintForTaskType(taskType: A2Part1BankTaskType): {
  prepSeconds: number
  answerSeconds: number
  scoringDimensions: ExamScoringDimension[]
  taskWeighting: number
  followDepth: 0 | 1 | 2
} {
  if (taskType === 'practical_request') {
    return {
      prepSeconds: 35,
      answerSeconds: 90,
      scoringDimensions: [
        'task_completion',
        'directness',
        'politeness',
        'natural_wording',
        'grammar_control',
        'pronunciation_delivery',
      ],
      taskWeighting: 1.1,
      followDepth: 1,
    }
  }
  if (taskType === 'follow_up_response') {
    return {
      prepSeconds: 28,
      answerSeconds: 85,
      scoringDimensions: [
        'responsiveness',
        'continuation',
        'relevance',
        'structure',
        'pronunciation_delivery',
      ],
      taskWeighting: 1.05,
      followDepth: 2,
    }
  }
  return {
    prepSeconds: 30,
    answerSeconds: 75,
    scoringDimensions: [
      'task_completion',
      'understandability',
      'grammar_control',
      'structure',
      'pronunciation_delivery',
    ],
    taskWeighting: 1,
    followDepth: 1,
  }
}

function pushShort(
  out: A2Part1QuestionItem[],
  nl: string,
  en: string,
  scenarioScriptNl?: string,
  hints?: string[],
): void {
  out.push({
    taskType: 'short_response',
    nl,
    en,
    scenarioScriptNl,
    hints,
    example: a2SpeakingBankExampleNl('short_response', nl, en),
  })
}

function pushPractical(
  out: A2Part1QuestionItem[],
  nl: string,
  en: string,
  scenarioScriptNl?: string,
  hints?: string[],
  example?: string,
): void {
  out.push({
    taskType: 'practical_request',
    nl,
    en,
    scenarioScriptNl,
    hints,
    example: example ?? a2SpeakingBankExampleNl('practical_request', nl, en),
  })
}

function pushFollow(out: A2Part1QuestionItem[], nl: string, en: string, scenarioScriptNl?: string): void {
  out.push({
    taskType: 'follow_up_response',
    nl,
    en,
    scenarioScriptNl,
    example: a2SpeakingBankExampleNl('follow_up_response', nl, en),
  })
}

function buildBank(): A2Part1QuestionItem[] {
  const b: A2Part1QuestionItem[] = []

  const hobbies = [
    'fietsen',
    'koken',
    'zwemmen',
    'lezen',
    'wandelen',
    'fotografie',
    'tuinieren',
    'muziek maken',
    'sport kijken',
    'gamen',
    'breien',
    'schilderen',
    'hardlopen',
    'yoga',
    'vogels kijken',
  ]
  for (const h of hobbies) {
    pushShort(
      b,
      `Leg in twee zinnen uit waarom je ${h} leuk vindt.`,
      `In two sentences, explain why you enjoy ${h}.`,
      `Iemand uit je buurt vraagt: “Waarom doe je graag ${h}?”`,
      ['Gebruik “omdat” of “daarom”.'],
    )
  }

  const places = [
    'Amsterdam',
    'Rotterdam',
    'Utrecht',
    'Groningen',
    'Maastricht',
    'Een klein dorp',
    'Bij de zee',
    'In het oosten van het land',
    'In de randstad',
    'Bij het bos',
  ]
  for (const p of places) {
    pushShort(
      b,
      `Waarom vind je het wonen in of bij ${p} prettig of minder prettig? Twee zinnen.`,
      `Why do you like or dislike living in/near ${p}? Two sentences.`,
      `In een korte enquête op straat: “Hoe bevalt wonen in ${p}?”`,
    )
  }

  const times = ['’s ochtends', 'in de pauze', 'na het werk', 'in het weekend', 'op maandag']
  for (const t of times) {
    pushShort(
      b,
      `Beschrijf kort wat je meestal ${t} doet (twee zinnen).`,
      `Briefly describe what you usually do ${t} (two sentences).`,
      `Iemand vraagt informeel: “Wat doe jij ${t}?”`,
    )
  }

  const jobs = ['in een winkel', 'in een ziekenhuis', 'op kantoor', 'in een restaurant', 'in een magazijn', 'thuis']
  for (const j of jobs) {
    pushShort(
      b,
      `Wat vind je het leukst aan werken ${j}? Eén of twee zinnen.`,
      `What do you like most about working ${j}? One or two sentences.`,
      `Een collega vraagt: “Wat vind jij het beste aan werken ${j}?”`,
    )
  }

  const services = [
    { nl: 'de huisartsenpost', en: 'the out-of-hours GP', line: 'U wilt een afspraak morgenochtend' },
    { nl: 'de tandarts', en: 'the dentist', line: 'U wilt een controleafspraak' },
    { nl: 'de apotheek', en: 'the pharmacy', line: 'U vraagt of een medicijn op voorraad is' },
    { nl: 'de sportschool', en: 'the gym', line: 'U vraagt om lidmaatschap een maand te pauzeren' },
    { nl: 'de klantenservice van uw internet', en: 'your ISP support', line: 'U meldt storing en vraagt om een monteur' },
    { nl: 'de kinderopvang', en: 'daycare', line: 'U meldt dat uw kind vandaag ziek is' },
    { nl: 'een hotel', en: 'a hotel', line: 'U vraagt om late checkout' },
    { nl: 'de NS-service', en: 'NS service desk', line: 'Uw kaart werkt niet bij de poortjes' },
    { nl: 'de bibliotheek', en: 'the library', line: 'U vraagt of u een boek kunt verlengen' },
    { nl: 'de gemeente', en: 'the municipality', line: 'U vraagt om een nieuw paspoort' },
    { nl: 'de bank', en: 'the bank', line: 'U vraagt om uitleg over een afschrijving' },
    { nl: 'een restaurant', en: 'a restaurant', line: 'U reserveert voor zaterdag negentien uur, twee personen' },
    { nl: 'de ov-vervoerder', en: 'public transport', line: 'U vraagt om een geldige route bij omleiding' },
    { nl: 'de verhuurder', en: 'your landlord', line: 'U meldt lekkage en vraagt om reparatie' },
    { nl: 'de garage', en: 'the garage', line: 'U vraagt om een afspraak voor een apk' },
  ]
  for (const s of services) {
    pushPractical(
      b,
      `Je belt of spreekt ${s.nl}. ${s.line.charAt(0).toUpperCase() + s.line.slice(1)}. Wat zeg je in het Nederlands?`,
      `You contact ${s.en}. ${s.line}. What do you say in Dutch?`,
      `Situatie: u bent in contact met ${s.nl}.`,
      ['Blijf beleefd en concreet.', 'Noem wat u wilt bereiken.'],
    )
  }

  const inPerson = [
    { nl: 'je buurman', en: 'your neighbour', ask: 'minder geluid na elf uur ’s avonds' },
    { nl: 'een collega', en: 'a colleague', ask: 'of u een dienst kunt ruilen' },
    { nl: 'een vriend', en: 'a friend', ask: 'of u morgen kunt helpen met verhuizen' },
    { nl: 'de buschauffeur', en: 'the bus driver', ask: 'of dit de bus naar het centrum is' },
    { nl: 'een winkelmedewerker', en: 'a shop assistant', ask: 'waar de broodafdeling is' },
    { nl: 'een docent', en: 'a teacher', ask: 'om uitstel voor een opdracht' },
    { nl: 'een voorbijganger', en: 'a passer-by', ask: 'waar het dichtstbijzijnde toilet is' },
    { nl: 'je leidinggevende', en: 'your manager', ask: 'of u vrijdag een uur later mag beginnen' },
    { nl: 'de receptie', en: 'reception', ask: 'of er nog een kamer vrij is' },
    { nl: 'een kennis', en: 'an acquaintance', ask: 'of u de weg naar het station weet' },
  ]
  for (const x of inPerson) {
    pushPractical(
      b,
      `Je spreekt ${x.nl} aan. Vraag beleefd om ${x.ask}.`,
      `You approach ${x.en}. Politely ask to ${x.ask}.`,
      `U moet ${x.nl} aanspreken over een praktisch verzoek.`,
    )
  }

  const followStems = [
    {
      nl: 'Je collega zegt: “Ik heb de deadline niet gehaald.” Reageer ondersteunend en stel één vervolgstap voor.',
      en: 'Your colleague says they missed the deadline — support them and suggest one next step.',
      sc: 'Uw collega kijkt geschrokken en zegt dat de deadline niet is gehaald.',
    },
    {
      nl: 'Je buur zegt: “De lift is weer kapot.” Reageer rustig en nuttig.',
      en: 'Your neighbour says the lift is broken again — calm, helpful reply.',
      sc: 'In de galerij zegt uw buur dat de lift het niet doet.',
    },
    {
      nl: 'Je vriend zegt: “Ik heb hoofdpijn en kan vanavond niet komen.” Reageer begripvol en bied een alternatief.',
      en: 'Your friend cancels with a headache — understanding reply + alternative.',
      sc: 'Uw vriend appt over hoofdpijn en annuleert vanavond.',
    },
    {
      nl: 'Iemand zegt: “Ik heb de bus gemist.” Wat antwoord je om te helpen?',
      en: 'Someone missed the bus — what do you say to help?',
      sc: 'Op het station zegt iemand paniekerig dat de bus is gemist.',
    },
    {
      nl: 'Je collega zegt: “Het is veel te koud op kantoor.” Reageer natuurlijk.',
      en: 'They say the office is too cold — natural reply.',
      sc: 'Tijdens het overleg klaagt uw collega over de kou.',
    },
    {
      nl: 'Je vriend twijfelt of hij deze baan moet houden. Reageer kort en respectvol (geen preek).',
      en: 'Your friend doubts keeping their job — short, respectful response.',
      sc: 'Bij koffie zegt uw vriend dat hij twijfelt over zijn baan.',
    },
    {
      nl: 'Een klant zegt: “Ik begrijp uw uitleg niet.” Wat zeg je terug?',
      en: 'A customer says they do not understand your explanation — what do you reply?',
      sc: 'Aan de balie schudt de klant het hoofd.',
    },
    {
      nl: 'Je huisgenoot zegt: “Ik ben mijn sleutels vergeten.” Geef een nuttige reactie.',
      en: 'Your housemate forgot their keys — helpful response.',
      sc: 'Uw huisgenoot staat voor de deur zonder sleutel.',
    },
    {
      nl: 'Je teamgenoot zegt: “Ik snap deze instructies niet.” Hoe reageer je?',
      en: 'Your teammate does not understand the instructions — how do you respond?',
      sc: 'Op werk leunt iemand over uw bureau met een vraag over instructies.',
    },
    {
      nl: 'Een vriendin zegt: “Ik ben nerveus voor het sollicitatiegesprek.” Reageer warm en concreet.',
      en: 'Your friend is nervous about a job interview — warm, concrete reply.',
      sc: 'Uw vriendin belt kort voor haar sollicitatie.',
    },
    {
      nl: 'Je buurvrouw zegt: “Er is weer te weinig parkeerruimte.” Reageer begripvol.',
      en: 'Your neighbour says there is too little parking again — empathetic reply.',
      sc: 'Bij de brievenbus start uw buurvrouw over parkeren.',
    },
    {
      nl: 'Je collega zegt: “Ik moet vandaag vroeger weg vanwege mijn kind.” Wat zeg je?',
      en: 'Your colleague must leave early for their child — what do you say?',
      sc: 'Kort voor een vergadering meldt uw collega een kinderafspraak.',
    },
    {
      nl: 'Iemand op straat zegt: “Ik ben de weg kwijt naar het museum.” Hoe help je?',
      en: 'Someone is lost on the way to the museum — how do you help?',
      sc: 'Een toerist wijst op een plattegrond.',
    },
    {
      nl: 'Je leidinggevende zegt: “We moeten het project versnellen.” Geef een voorzichtige reactie.',
      en: 'Your manager says the project must speed up — cautious reply.',
      sc: 'In een kort gesprek zegt uw leidinggevende dat het dringender wordt.',
    },
    {
      nl: 'Je vriend zegt: “Ik heb ruzie met mijn partner gehad.” Reageer kort en steunend.',
      en: 'Your friend had a fight with their partner — brief supportive reply.',
      sc: 'Uw vriend zucht en vertelt over thuis.',
    },
    {
      nl: 'Een nieuwe collega zegt: “Ik voel me nog een beetje verloren hier.” Wat zeg je?',
      en: 'A new colleague feels a bit lost — what do you say?',
      sc: 'De nieuwe collega zit naast u bij lunch.',
    },
    {
      nl: 'Je buur zegt: “De containers zijn weer vol.” Reageer praktisch.',
      en: 'Your neighbour says the bins are full again — practical reply.',
      sc: 'Bij de ondergrondse container staat uw buur te klagen.',
    },
    {
      nl: 'Je collega zegt: “Ik heb te veel werk deze week.” Hoe reageer je?',
      en: 'Your colleague has too much work this week — how do you respond?',
      sc: 'Op de gang ziet u uw collega gestrest.',
    },
    {
      nl: 'Iemand in de rij zegt: “Ik ben bang dat ik mijn aansluiting mis.” Wat zeg je?',
      en: 'Someone in line fears missing their connection — what do you say?',
      sc: 'Bij het perron kijkt iemand nerveus op het bord.',
    },
    {
      nl: 'Je vriend zegt: “Ik heb slecht geslapen.” Reageer vriendelijk.',
      en: 'Your friend slept badly — kind reply.',
      sc: 'Uw vriend zucht bij het ontbijt.',
    },
    {
      nl: 'Een klant zegt: “Dit product is kapot gegaan na één dag.” Hoe reageer je (als medewerker)?',
      en: 'A customer says the product broke after one day — how do you respond as staff?',
      sc: 'U werkt achter de servicebalie.',
    },
  ]
  for (const f of followStems) {
    pushFollow(b, f.nl, f.en, f.sc)
  }

  // Extra short variety
  const seasons = ['lente', 'zomer', 'herfst', 'winter']
  for (const s of seasons) {
    pushShort(
      b,
      `Wat doe je graag in de ${s}? Antwoord in twee zinnen.`,
      `What do you like to do in ${s}? Two sentences.`,
      `Een podcast-microfoon: “Wat doet u graag in de ${s}?”`,
    )
  }

  const transport = ['de fiets', 'de bus', 'de trein', 'de auto', 'lopen']
  for (const tr of transport) {
    pushShort(
      b,
      `Wanneer kies je liever ${tr} voor een korte afstand? Eén of twee zinnen.`,
      `When do you prefer ${tr} for a short distance? One or two sentences.`,
      `Korte peiling: “Wanneer pakt u ${tr}?”`,
    )
  }

  // Extra practical (written-style prompts still spoken)
  const moreCalls = [
    'Je belt de dierenarts: je hond moet dringend gezien worden morgenochtend.',
    'Je belt de pizzeria: je wilt een grote pizza bestellen voor acht uur afhalen.',
    'Je belt de schoonmaker: je wilt de afspraak van donderdag verzetten naar vrijdag.',
    'Je belt een vriend: je kunt niet komen en stelt een ander moment voor.',
    'Je belt je werk: je hebt een doktersafspraak en komt een uur later.',
    'Je belt de leverancier: het pakket is incompleet geleverd.',
    'Je belt de sportschool: je wilt je pincode voor de deur opnieuw instellen.',
    'Je belt de huisarts: je vraagt om herhaalrecept voor medicijnen.',
    'Je belt de technische dienst: de verwarming doet het niet.',
    'Je belt een taxicentrale: je wilt over twintig minuten opgehaald worden op station Zuid.',
  ]
  for (const line of moreCalls) {
    const en =
      line.includes('dierenarts')
        ? 'You call the vet: your dog must be seen urgently tomorrow morning.'
        : line.includes('pizzeria')
          ? 'You call the pizzeria: order a large pizza for pickup at eight.'
          : line.includes('schoonmaker')
            ? 'You call the cleaner: reschedule Thursday to Friday.'
            : line.includes('vriend:')
              ? 'You call a friend: you cannot come and suggest another time.'
              : line.includes('werk:')
                ? 'You call work: doctor appointment, you will be an hour late.'
                : line.includes('leverancier')
                  ? 'You call the supplier: incomplete delivery.'
                  : line.includes('sportschool:')
                    ? 'You call the gym: reset door PIN.'
                    : line.includes('huisarts:')
                      ? 'You call the GP: repeat prescription.'
                      : line.includes('technische')
                        ? 'You call maintenance: heating not working.'
                        : 'You call a taxi: pickup in twenty minutes at Station Zuid.'
    pushPractical(b, `${line} Wat zeg je?`, `${en} What do you say?`, line)
  }

  const foods = ['stamppot', 'pasta', 'rijst met groente', 'soep', 'broodjes', 'salade', 'vis', 'vegan maaltijden']
  for (const f of foods) {
    pushShort(
      b,
      `Beschrijf kort hoe je thuis ${f} bereidt of bestelt (twee zinnen).`,
      `Briefly describe how you prepare or order ${f} at home (two sentences).`,
      `In een kookprogramma vraagt iemand: “Hoe doe jij ${f}?”`,
    )
  }

  const weather = ['regen', 'storm', 'mist', 'sneeuw', 'warmte', 'harde wind']
  for (const w of weather) {
    pushShort(
      b,
      `Hoe reageer je op ${w} onderweg naar werk? Eén of twee zinnen.`,
      `How do you deal with ${w} on your way to work? One or two sentences.`,
      `Radiofragment: “Wat doet u bij ${w}?”`,
    )
  }

  const study = ['grammatica', 'uitspraak', 'luisteren', 'schrijven', 'woordenschat', 'spreekvaardigheid']
  for (const s of study) {
    pushShort(
      b,
      `Wat helpt jou het meest bij het leren van ${s} in het Nederlands? Twee zinnen.`,
      `What helps you most when learning ${s} in Dutch? Two sentences.`,
      `In de les vraagt de docent: “Wat werkt voor jou bij ${s}?”`,
    )
  }

  const extraFollow = [
    {
      nl: 'Je collega zegt: “Ik heb geen zin om vandaag te presenteren.” Hoe reageer je?',
      en: 'Your colleague does not feel like presenting today — your response?',
      sc: 'Kort voor de vergadering trekt uw collega een gezicht.',
    },
    {
      nl: 'Je buur zegt: “Er is weer rommel naast de containers.” Reageer neutraal en vriendelijk.',
      en: 'Your neighbour complains about mess by the bins — neutral, friendly reply.',
      sc: 'Bij de containers wijst uw buur naar zakken.',
    },
    {
      nl: 'Je vriend zegt: “Ik heb geen zin om uit te gaan vanavond.” Stel iets anders voor.',
      en: 'Your friend does not want to go out — suggest something else.',
      sc: 'Uw vriend appt vlak voor vanavond.',
    },
  ]
  for (const f of extraFollow) {
    pushFollow(b, f.nl, f.en, f.sc)
  }

  return b
}

export const A2_PART1_QUESTION_BANK: readonly A2Part1QuestionItem[] = buildBank()
