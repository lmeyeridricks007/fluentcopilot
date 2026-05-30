/**
 * Lessons 2–11 for a2-m07-transport-getting-around
 */
export function makeLessonsL2to11(H) {
  const {
    MC,
    FB,
    RO,
    previewStep,
    listeningStep,
    listenReadStep,
    discoveryStep,
    practiceLoop,
    grammarCard,
    speak,
    writingStep,
    scenarioChat,
    recapStep,
    lessonBase,
    MID,
  } = H

  const L2 = lessonBase(1, {
    id: 'a2-m07-l02-listen-read-directions-routes',
    title: 'Listening & reading · Directions and route questions',
    lessonType: 'input',
    grammarTargets: ['a2.2-transport-questions', 'a2.2-transport-directions'],
    vocabTargets: ['lemma-waar-m7', 'lemma-hoe-m7', 'lemma-rechtdoor-m7', 'lemma-links-m7', 'lemma-rechts-m7'],
    canDoStatements: ['I can read or hear simple route questions and match them to useful answers.'],
    steps: [
      previewStep('m07-l02', 'Warm-up', [
        { word: 'waar', lemma: 'waar-m7', en: 'where', emoji: '📍' },
        { word: 'hoe', lemma: 'hoe-m7', en: 'how', emoji: '❓' },
        { word: 'rechtdoor', lemma: 'rechtdoor-m7', en: 'straight on', emoji: '⬆️' },
        { word: 'links', lemma: 'links-m7', en: 'left', emoji: '⬅️' },
        { word: 'rechts', lemma: 'rechts-m7', en: 'right', emoji: '➡️' },
      ]),
      listenReadStep(
        'm07-l02',
        'Input — bord + voorbeeldantwoord',
        [
          {
            speaker: 'Bord',
            nl: 'Centraal Station: rechtdoor, tweede straat links, het station is aan uw rechterhand.',
            en: 'Central Station: straight on, second street left, the station is on your right.',
          },
          {
            speaker: 'Voorbijganger',
            nl: 'Sorry, hoe kom ik bij het station? — Ga hier rechtdoor en sla links af bij het kruispunt.',
            en: 'Excuse me, how do I get to the station? — Go straight here and turn left at the crossing.',
          },
        ],
        [
          MC('m07-l02-e1', 'Waar gaat het gesprek over?', ['De weg naar het station', 'Een restaurantmenu', 'Het weer'], 'De weg naar het station'),
          MC('m07-l02-e2', 'Eerste richting op het bord?', ['Rechtdoor', 'Meteen links', 'Terug'], 'Rechtdoor'),
          MC('m07-l02-e3', 'Waar sla je volgens het bord?', ['Tweede straat links', 'Eerste straat rechts', 'Nergens'], 'Tweede straat links'),
          MC('m07-l02-e4', '“Aan uw rechterhand” betekent', ['aan de rechterkant', 'achter u', 'boven u'], 'aan de rechterkant'),
          MC('m07-l02-e5', 'Welke vraag is typisch voor een toerist?', ['Hoe kom ik bij het station?', 'Wat is uw salaris?', 'Waar is uw kat?'], 'Hoe kom ik bij het station?'),
          MC('m07-l02-e6', '“Bij het kruispunt” =', ['op het punt waar wegen kruisen', 'in de supermarkt', 'op het dak'], 'op het punt waar wegen kruisen'),
        ]
      ),
      discoveryStep('m07-l02', 'Vaste combinaties', [
        { nl: 'Hoe kom ik bij …?', en: 'How do I get to …?', focus: 'route' },
        { nl: 'Ga rechtdoor.', en: 'Go straight on.', focus: 'rechtdoor' },
        { nl: 'Sla links / rechts af.', en: 'Turn left / right.', focus: 'afslaan' },
        { nl: 'Het is hier dichtbij.', en: 'It is close by here.', focus: 'afstand' },
      ]),
      practiceLoop(
        'm07-l02-pl1',
        'Practice — 6×',
        ['rechtdoor', 'links', 'station'],
        [
          MC('m07-l02-a1', 'Natuurlijke hulp vraag', ['Kunt u mij helpen? Ik zoek het station.', 'Geef geld.', 'Zwijg.'], 'Kunt u mij helpen? Ik zoek het station.'),
          RO('m07-l02-a2', ['Station?', 'is', 'Waar', 'het'], 'Waar is het station?'),
          FB('m07-l02-a3', 'Ga hier ___. (rechtdoor)', ['rechtdoor', 'achteruit', 'draaien'], 'rechtdoor'),
          MC('m07-l02-a4', 'Welke wijzer is “links”?', ['Linksaf', 'Omhoog', 'Achteruit'], 'Linksaf'),
          MC('m07-l02-a5', '“Tweede straat links” =', ['niet de eerste, wel de tweede links', 'alle straten', 'geen straat'], 'niet de eerste, wel de tweede links'),
          MC('m07-l02-a6', 'Beleefd begin', ['Sorry, mag ik iets vragen?', 'Hé jij!', 'Stilte.'], 'Sorry, mag ik iets vragen?'),
        ]
      ),
      practiceLoop(
        'm07-l02-pl2',
        'Variatie — 7×',
        ['rechts', 'halte', 'dichtbij'],
        [
          FB('m07-l02-b1', 'Het station is aan uw ___. (kant rechter)', ['rechterhand', 'linkerhand', 'voet'], 'rechterhand'),
          MC('m07-l02-b2', '“Hoe kom ik …?” vraagt naar', ['de route', 'de prijs van brood', 'uw leeftijd'], 'de route'),
          RO('m07-l02-b3', ['af.', 'links', 'Sla'], 'Sla links af.'),
          MC('m07-l02-b4', 'Als u verdwaald bent', ['Vraag rustig om herhaling', 'Ren weg', 'Schreeuw'], 'Vraag rustig om herhaling'),
          MC('m07-l02-b5', '“Dichtbij” ≈', ['niet ver', 'heel ver', 'onbekend'], 'niet ver'),
          FB('m07-l02-b6', '___ is het station? (plaats)', ['Waar', 'Wie', 'Welke'], 'Waar'),
          MC('m07-l02-b7', 'Juiste volgorde-idee', ['Eerst rechtdoor, dan links', 'Eerst slapen, dan eten', 'Alleen rechts'], 'Eerst rechtdoor, dan links'),
        ]
      ),
      speak('m07-l02-sp1', 'Zeg hardop', 'Hoe kom ik bij het station?', ['Hoe kom ik bij het station', 'hoe kom ik bij het station'], 'Hoe kom ik bij het station'),
      speak('m07-l02-sp2', 'Zeg hardop', 'Ga rechtdoor en sla links af.', ['Ga rechtdoor en sla links af', 'ga rechtdoor en sla links af'], 'Ga rechtdoor en sla links af.'),
      recapStep('m07-l02', ['station', 'links', 'rechtdoor'], [
        { kind: 'fill_blank', sentence: '___ kom ik bij de halte?', options: ['Hoe', 'Wie', 'Welke'], correctAnswer: 'Hoe' },
        { kind: 'reorder', tokens: ['station?', 'het', 'is', 'Waar'], correctAnswer: 'Waar is het station?' },
        { kind: 'speak', prompt: 'Zeg: *Ga rechtdoor.*', targetNl: 'Ga rechtdoor.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Sla links af.', options: ['Richting-aanwijzing', 'Eetadvies', 'Groet'], correctAnswer: 'Richting-aanwijzing' },
        { kind: 'fill_blank', sentence: 'Het is hier ___. (niet ver)', options: ['dichtbij', 'duur', 'laat'], correctAnswer: 'dichtbij' },
      ]),
    ],
  })

  const L3 = lessonBase(2, {
    durationEstimate: 15,
    id: 'a2-m07-l03-grammar-route-questions',
    title: 'Grammar & patterns · Asking about routes and transport',
    lessonType: 'pattern',
    grammarTargets: ['a2.2-transport-questions', 'a2.2-transport-modals'],
    vocabTargets: ['lemma-welke-m7', 'lemma-bus-m7', 'lemma-tram-m7', 'lemma-moeten-m7', 'lemma-kunnen-m7'],
    canDoStatements: ['I can form short questions about which line to take and whether I need to change.'],
    steps: [
      previewStep('m07-l03', 'Warm-up', [
        { word: 'welke', lemma: 'welke-m7', en: 'which', emoji: '🔢' },
        { word: 'bus', lemma: 'bus-m7', en: 'bus', emoji: '🚌' },
        { word: 'tram', lemma: 'tram-m7', en: 'tram', emoji: '🚊' },
        { word: 'moeten', lemma: 'moeten-m7', en: 'must / have to', emoji: '⚠️' },
        { word: 'overstappen', lemma: 'overstappen-m7', en: 'to change (vehicles)', emoji: '🔀' },
      ]),
      grammarCard(
        'm07-l03-gc',
        'Patroon',
        'Vragen over OV',
        '**Welke bus/tram** neem ik? **Waar** stapt u uit? **Moet ik** overstappen? **Hoe laat** vertrekt de trein? Korte zinnen; herhaal het nummer (lijn 12, spoor 5).',
        [
          { nl: 'Welke tram gaat naar het museum?', en: 'Which tram goes to the museum?' },
          { nl: 'Moet ik hier overstappen?', en: 'Do I have to change here?' },
        ]
      ),
      listeningStep(
        'm07-l03-mini',
        'Input — bij de halte',
        [
          { speaker: 'Reiziger', nl: 'Excuseer, welke bus gaat naar het centrum?', en: 'Excuse me, which bus goes to the centre?' },
          { speaker: 'Medereiziger', nl: 'Bus 15, maar u moet bij het station overstappen.', en: 'Bus 15, but you have to change at the station.' },
          { speaker: 'Reiziger', nl: 'Oké, dank u wel.', en: 'Okay, thank you.' },
        ],
        [
          MC('m07-l03-m1', 'Waar is het gesprek?', ['Bij een bushalte / onderweg', 'In een zwembad', 'Thuis'], 'Bij een bushalte / onderweg'),
          MC('m07-l03-m2', 'Welke bus noemt men?', ['Bus 15', 'Bus 99', 'Geen bus'], 'Bus 15'),
          MC('m07-l03-m3', 'Moet de reiziger overstappen?', ['Ja, bij het station', 'Nee, nooit', 'Alleen met de fiets'], 'Ja, bij het station'),
          MC('m07-l03-m4', '“Welke bus …?” vraagt naar', ['het lijnnummer / de juiste bus', 'de kleur van de bus', 'de prijs van brood'], 'het lijnnummer / de juiste bus'),
        ]
      ),
      discoveryStep('m07-l03', 'Handige vragen', [
        { nl: 'Welke tram moet ik nemen?', en: 'Which tram should I take?', focus: 'welke' },
        { nl: 'Moet ik hier uitstappen?', en: 'Do I need to get off here?', focus: 'uitstappen' },
        { nl: 'Hoe laat vertrekt de trein?', en: 'What time does the train leave?', focus: 'tijd' },
        { nl: 'Kunt u dat herhalen?', en: 'Could you repeat that?', focus: 'herhalen' },
      ]),
      practiceLoop(
        'm07-l03-pl1',
        'Practice — 6×',
        ['welke', 'bus', 'tram'],
        [
          RO('m07-l03-a1', ['museum?', 'naar', 'gaat', 'Welke', 'tram', 'het'], 'Welke tram gaat naar het museum?'),
          FB('m07-l03-a2', 'Moet ik hier ___? (van de bus af)', ['uitstappen', 'instappen', 'zwemmen'], 'uitstappen'),
          MC('m07-l03-a3', 'Juiste vraag bij twijfel', ['Welke lijn moet ik hebben?', 'Wat is uw naam?', 'Hoeveel kost een huis?'], 'Welke lijn moet ik hebben?'),
          MC('m07-l03-a4', '“Overstappen” betekent', ['van trein/bus naar andere lijn', 'alleen uitstappen zonder andere lijn', 'betalen bij de bakker'], 'van trein/bus naar andere lijn'),
          MC('m07-l03-a5', 'Hoe laat …? vraagt naar', ['tijd / vertrek', 'kleur', 'gewicht'], 'tijd / vertrek'),
          MC('m07-l03-a6', 'Beleefd als u het niet hoort', ['Kunt u dat herhalen, alstublieft?', 'Zwijg.', 'Schreeuw.'], 'Kunt u dat herhalen, alstublieft?'),
        ]
      ),
      practiceLoop(
        'm07-l03-pl2',
        'Variatie — 7×',
        ['overstappen', 'halte', 'station'],
        [
          MC('m07-l03-b1', 'Moet ik …? gebruikt u voor', ['zeker weten of iets nodig is', 'een recept voor taart', 'alleen het weer'], 'zeker weten of iets nodig is'),
          FB('m07-l03-b2', '___ bus gaat naar het centrum? (keuze)', ['Welke', 'Waar', 'Wie'], 'Welke'),
          RO('m07-l03-b3', ['overstappen?', 'hier', 'ik', 'Moet'], 'Moet ik hier overstappen?'),
          MC('m07-l03-b4', 'Tram vs bus in de stad', ['Beide komen vaak voor', 'Alleen helikopters', 'Nergens in Nederland'], 'Beide komen vaak voor'),
          MC('m07-l03-b5', 'Kort en duidelijk onder stress', ['Eén vraag per keer', 'Tien vragen tegelijk', 'Geen vraag'], 'Eén vraag per keer'),
          MC('m07-l03-b6', '“Naar het centrum” =', ['richting stadskern', 'richting alleen zee', 'naar de maan'], 'richting stadskern'),
          MC('m07-l03-b7', 'Als u het nummer niet verstaat', ['Vraag: welke lijn nog een keer?', 'Raad een willekeurig getal', 'Zwijg hard'], 'Vraag: welke lijn nog een keer?'),
        ]
      ),
      speak('m07-l03-sp1', 'Zeg hardop', 'Welke bus gaat naar het station?', ['Welke bus gaat naar het station', 'welke bus gaat naar het station'], 'Welke bus gaat naar het station'),
      speak('m07-l03-sp2', 'Zeg hardop', 'Moet ik hier overstappen?', ['Moet ik hier overstappen', 'moet ik hier overstappen'], 'Moet ik hier overstappen'),
      recapStep('m07-l03', ['welke', 'bus', 'overstappen'], [
        { kind: 'fill_blank', sentence: '___ tram gaat naar het museum?', options: ['Welke', 'Wie', 'Hoeveel'], correctAnswer: 'Welke' },
        { kind: 'reorder', tokens: ['uitstappen?', 'ik', 'hier', 'Moet'], correctAnswer: 'Moet ik hier uitstappen?' },
        { kind: 'speak', prompt: 'Zeg: *Hoe laat vertrekt de trein?*', targetNl: 'Hoe laat vertrekt de trein?', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Moet ik overstappen?', options: ['Vraag over overstappen', 'Weerbericht', 'Menu'], correctAnswer: 'Vraag over overstappen' },
        { kind: 'fill_blank', sentence: 'Kunt u dat ___, alstublieft?', options: ['herhalen', 'kopen', 'eten'], correctAnswer: 'herhalen' },
      ]),
    ],
  })

  const L4 = lessonBase(3, {
    id: 'a2-m07-l04-practice-directions-transport',
    title: 'Controlled practice · Directions, turns, and transport chunks',
    lessonType: 'practice',
    grammarTargets: ['a2.2-transport-directions', 'a2.2-transport-separable'],
    vocabTargets: ['lemma-volgende-m7', 'lemma-hier-m7', 'lemma-daarna-m7', 'lemma-tegenover-m7', 'lemma-naast-m7'],
    canDoStatements: ['I can use turns, “next stop”, and simple place words in short chunks.'],
    steps: [
      previewStep('m07-l04', 'Warm-up', [
        { word: 'volgende', lemma: 'volgende-m7', en: 'next', emoji: '⏭️' },
        { word: 'hier', lemma: 'hier-m7', en: 'here', emoji: '📍' },
        { word: 'daarna', lemma: 'daarna-m7', en: 'after that', emoji: '➡️' },
        { word: 'tegenover', lemma: 'tegenover-m7', en: 'opposite', emoji: '↔️' },
        { word: 'naast', lemma: 'naast-m7', en: 'next to', emoji: '🧱' },
      ]),
      discoveryStep('m07-l04', 'Brokjes', [
        { nl: 'Bij de volgende halte.', en: 'At the next stop.', focus: 'halte' },
        { nl: 'Het is hier, naast de bakker.', en: 'It is here, next to the bakery.', focus: 'naast' },
        { nl: 'Tegenover het station.', en: 'Opposite the station.', focus: 'tegenover' },
        { nl: 'Eerst rechtdoor, daarna links.', en: 'First straight, then left.', focus: 'volgorde' },
      ]),
      practiceLoop(
        'm07-l04-pl1',
        'Practice — 6×',
        ['volgende', 'halte', 'links'],
        [
          MC('m07-l04-a1', 'Waar moet u uitstappen voor het museum?', ['Bij de volgende halte', 'Bij het vliegveld', 'Nooit'], 'Bij de volgende halte'),
          FB('m07-l04-a2', 'Het hotel is ___ de supermarkt. (tegenover)', ['tegenover', 'onder', 'boven'], 'tegenover'),
          RO('m07-l04-a3', ['halte.', 'volgende', 'de', 'Bij'], 'Bij de volgende halte.'),
          MC('m07-l04-a4', '“Naast” betekent', ['ervoor naast', 'heel ver', 'onder water'], 'ervoor naast'),
          MC('m07-l04-a5', 'Eerst … daarna … =', ['volgorde in stappen', 'alleen één richting', 'geen volgorde'], 'volgorde in stappen'),
          MC('m07-l04-a6', 'Juiste herhaling-vraag', ['Kunt u dat nog een keer zeggen?', 'Zwijg.', 'Schreeuw harder.'], 'Kunt u dat nog een keer zeggen?'),
        ]
      ),
      practiceLoop(
        'm07-l04-pl2',
        'Variatie — 7×',
        ['rechts', 'station', 'uitstappen'],
        [
          FB('m07-l04-b1', 'Moet ik hier ___? (bus/tram verlaten)', ['uitstappen', 'instappen', 'koken'], 'uitstappen'),
          MC('m07-l04-b2', '“Instappen” =', ['in de tram/bus stappen', 'uit de tram vallen zonder reden', 'alleen betalen zonder reizen'], 'in de tram/bus stappen'),
          MC('m07-l04-b3', 'Hier vs daar', ['hier = dichtbij spreker, daar = verder', 'altijd hetzelfde woord', 'alleen voor kleuren'], 'hier = dichtbij spreker, daar = verder'),
          RO('m07-l04-b4', ['links.', 'daarna', 'rechtdoor,', 'Eerst'], 'Eerst rechtdoor, daarna links.'),
          MC('m07-l04-b5', 'Typisch in de tram', ['Volgende halte: …', 'Volgende maand: …', 'Volgende jaar: …'], 'Volgende halte: …'),
          MC('m07-l04-b6', 'Tegenover het station =', ['aan de overkant van het station', 'in het station', 'achter het station'], 'aan de overkant van het station'),
          MC('m07-l04-b7', 'Kies de veiligste tip', ['Stap pas uit als de tram stilstaat.', 'Spring uit tijdens de rit', 'Ren over het spoor'], 'Stap pas uit als de tram stilstaat.'),
        ]
      ),
      listeningStep(
        'm07-l04-mini',
        'Mini-input — omroep + reiziger',
        [
          { speaker: 'Omroep', nl: 'Volgende halte: Centraal Station. Uitstappen aan de rechterzijde.', en: 'Next stop: Central Station. Exit on the right.' },
          { speaker: 'Reiziger', nl: 'Moet ik hier uitstappen voor het museum?', en: 'Do I need to get off here for the museum?' },
          { speaker: 'Medereiziger', nl: 'Nee, één halte verder.', en: 'No, one more stop.' },
        ],
        [
          MC('m07-l04-l1', 'Wat is de volgende halte?', ['Centraal Station', 'Schiphol altijd', 'Parijs'], 'Centraal Station'),
          MC('m07-l04-l2', 'Waar uitstappen volgens omroep?', ['Rechterzijde', 'Op het dak', 'Nergens'], 'Rechterzijde'),
          MC('m07-l04-l3', 'Moet de reiziger nu uit?', ['Nee, één halte verder', 'Ja, meteen zonder nadenken', 'Niemand weet het'], 'Nee, één halte verder'),
        ]
      ),
      speak('m07-l04-sp1', 'Zeg hardop', 'Bij de volgende halte, alstublieft.', ['Bij de volgende halte alstublieft', 'Bij de volgende halte, alstublieft.'], 'Bij de volgende halte, alstublieft.'),
      speak('m07-l04-sp2', 'Zeg hardop', 'Het is hier, naast het station.', ['Het is hier naast het station', 'Het is hier, naast het station.'], 'Het is hier, naast het station.'),
      recapStep('m07-l04', ['halte', 'volgende', 'uitstappen'], [
        { kind: 'fill_blank', sentence: 'Bij de ___ halte stappen we uit.', options: ['volgende', 'vorige', 'geen'], correctAnswer: 'volgende' },
        { kind: 'reorder', tokens: ['stappen?', 'ik', 'hier', 'Moet', 'uit'], correctAnswer: 'Moet ik hier uitstappen?' },
        { kind: 'speak', prompt: 'Zeg: *Tegenover het station.*', targetNl: 'Tegenover het station.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Volgende halte.', options: ['Aankondiging in OV', 'Weerbericht', 'Sport'], correctAnswer: 'Aankondiging in OV' },
        { kind: 'fill_blank', sentence: 'Eerst rechtdoor, ___ links.', options: ['daarna', 'gisteren', 'morgen'], correctAnswer: 'daarna' },
      ]),
    ],
  })

  const L5 = lessonBase(4, {
    durationEstimate: 15,
    id: 'a2-m07-l05-speaking-directions-help',
    title: 'Speaking · Ask for directions and respond calmly',
    lessonType: 'speaking',
    grammarTargets: ['a2.2-transport-directions', 'a2.2-transport-questions'],
    vocabTargets: ['lemma-verdwaald-m7', 'lemma-helpen-m7', 'lemma-station-m7', 'lemma-begrijpen-m7', 'lemma-langzaam-m7'],
    canDoStatements: ['I can say I am lost, ask for help, and ask someone to repeat more slowly.'],
    steps: [
      previewStep('m07-l05', 'Rustig blijven — 5 woorden', [
        { word: 'verdwaald', lemma: 'verdwaald-m7', en: 'lost', emoji: '🧭' },
        { word: 'helpen', lemma: 'helpen-m7', en: 'to help', emoji: '🤝' },
        { word: 'station', lemma: 'station-m7', en: 'station', emoji: '🚉' },
        { word: 'begrijpen', lemma: 'begrijpen-m7', en: 'to understand', emoji: '🧠' },
        { word: 'langzaam', lemma: 'langzaam-m7', en: 'slowly', emoji: '🐢' },
      ]),
      discoveryStep('m07-l05', 'Zinnen die werken', [
        { nl: 'Ik ben verdwaald.', en: 'I am lost.', focus: 'nood' },
        { nl: 'Kunt u mij helpen?', en: 'Can you help me?', focus: 'hulp' },
        { nl: 'Ik zoek het station.', en: 'I am looking for the station.', focus: 'doel' },
        { nl: 'Kunt u langzamer praten?', en: 'Can you speak more slowly?', focus: 'tempo' },
        { nl: 'Kunt u dat herhalen?', en: 'Could you repeat that?', focus: 'herhalen' },
      ]),
      practiceLoop(
        'm07-l05-pl1',
        'Kies de beste reactie — 6×',
        ['helpen', 'verdwaald', 'station'],
        [
          MC('m07-l05-a1', 'U bent de weg kwijt', ['Ik ben verdwaald.', 'Ik ben een trein.', 'Ik ben de zon.'], 'Ik ben verdwaald.'),
          MC('m07-l05-a2', 'Beleefd om hulp vragen', ['Kunt u mij helpen?', 'Help nu!', 'Jij moet.'], 'Kunt u mij helpen?'),
          MC('m07-l05-a3', 'Zeggen waar u naartoe wilt', ['Ik zoek het station.', 'Ik koop een giraffe.', 'Ik weet alles.'], 'Ik zoek het station.'),
          RO('m07-l05-a4', ['praten?', 'langzamer', 'Kunt', 'u'], 'Kunt u langzamer praten?'),
          MC('m07-l05-a5', 'Te snel Nederlands', ['Kunt u dat herhalen?', 'Zwijg voor altijd.', 'Schreeuw.'], 'Kunt u dat herhalen?'),
          MC('m07-l05-a6', 'Calm tip op straat', ['Korte zin, duidelijke bestemming', 'Lange speech zonder pauze', 'Geen bestemming noemen'], 'Korte zin, duidelijke bestemming'),
        ]
      ),
      speak('m07-l05-sp1', 'Productie 1', 'Ik ben verdwaald. Ik zoek het station.', ['Ik ben verdwaald ik zoek het station', 'Ik ben verdwaald. Ik zoek het station.'], 'Ik ben verdwaald. Ik zoek het station.'),
      speak('m07-l05-sp2', 'Productie 2', 'Kunt u mij helpen, alstublieft?', ['Kunt u mij helpen alstublieft', 'Kunt u mij helpen, alstublieft?'], 'Kunt u mij helpen, alstublieft?'),
      speak('m07-l05-sp3', 'Productie 3', 'Hoe kom ik bij de tramhalte?', ['Hoe kom ik bij de tramhalte', 'hoe kom ik bij de tramhalte'], 'Hoe kom ik bij de tramhalte?'),
      speak('m07-l05-sp4', 'Productie 4', 'Kunt u langzamer praten? Ik begrijp het niet goed.', ['Kunt u langzamer praten ik begrijp het niet goed', 'Kunt u langzamer praten? Ik begrijp het niet goed.'], 'Kunt u langzamer praten? Ik begrijp het niet goed.'),
      practiceLoop(
        'm07-l05-pl2',
        'Variatie — 5×',
        ['herhalen', 'dank', 'rust'],
        [
          MC('m07-l05-b1', 'Na goede uitleg', ['Dank u wel.', 'Doei sukkel.', 'Niets.'], 'Dank u wel.'),
          FB('m07-l05-b2', 'Ik ben ___. (de weg kwijt)', ['verdwaald', 'verkocht', 'gebakken'], 'verdwaald'),
          MC('m07-l05-b3', '“Ik begrijp het niet goed” =', ['ik heb hulp nodig met verstaan', 'ik ben boos op u', 'ik wil vechten'], 'ik heb hulp nodig met verstaan'),
          RO('m07-l05-b4', ['helpen?', 'mij', 'Kunt', 'u'], 'Kunt u mij helpen?'),
          MC('m07-l05-b5', 'Beste combinatie', ['Verdwaald zeggen + bestemming noemen', 'Alleen schreeuwen', 'Geen woorden'], 'Verdwaald zeggen + bestemming noemen'),
        ]
      ),
      speak('m07-l05-sp5', 'Productie 5', 'Waar is de dichtstbijzijnde halte?', ['Waar is de dichtstbijzijnde halte', 'waar is de dichtstbijzijnde halte'], 'Waar is de dichtstbijzijnde halte?'),
      recapStep('m07-l05', ['verdwaald', 'helpen', 'station'], [
        { kind: 'speak', prompt: 'Zeg: *Ik ben verdwaald.*', targetNl: 'Ik ben verdwaald.', mockPass: true },
        { kind: 'fill_blank', sentence: 'Kunt u mij ___, alstublieft?', options: ['helpen', 'kopen', 'eten'], correctAnswer: 'helpen' },
        { kind: 'reorder', tokens: ['niet', 'goed.', 'begrijp', 'het', 'Ik'], correctAnswer: 'Ik begrijp het niet goed.' },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Kunt u langzamer praten?', options: ['Tempo / verstaanbaarheid', 'Prijsvraag', 'Sport'], correctAnswer: 'Tempo / verstaanbaarheid' },
        { kind: 'speak', prompt: 'Zeg: *Dank u wel.*', targetNl: 'Dank u wel.', mockPass: true },
      ]),
    ],
  })

  const L6 = lessonBase(5, {
    durationEstimate: 15,
    id: 'a2-m07-l06-listening-delays-platforms',
    title: 'Listening · Delays, platforms, and short announcements',
    lessonType: 'input',
    grammarTargets: ['a2.2-transport-announcements', 'a2.2-transport-questions'],
    vocabTargets: ['lemma-perron-m7', 'lemma-spoor-m7', 'lemma-vertraging-m7', 'lemma-vertrek-m7', 'lemma-trein-m7'],
    canDoStatements: ['I can catch departure time, platform/track, and simple delay messages.'],
    steps: [
      previewStep('m07-l06', 'Warm-up', [
        { word: 'perron', lemma: 'perron-m7', en: 'platform', emoji: '🚉' },
        { word: 'spoor', lemma: 'spoor-m7', en: 'track', emoji: '🛤️' },
        { word: 'vertraging', lemma: 'vertraging-m7', en: 'delay', emoji: '⏱️' },
        { word: 'vertrek', lemma: 'vertrek-m7', en: 'departure', emoji: '🚆' },
        { word: 'trein', lemma: 'trein-m7', en: 'train', emoji: '🚆' },
      ]),
      listeningStep(
        'm07-l06',
        'Input — station (omroep + gesprek)',
        [
          { speaker: 'Omroep', nl: 'De intercity naar Utrecht vertrekt om tien over negen van spoor vijf. Let op: vijf minuten vertraging.', en: 'The intercity to Utrecht departs at nine ten from track five. Attention: five minutes delay.' },
          { speaker: 'Reiziger', nl: 'Sorry, van welk spoor gaat de trein naar Utrecht?', en: 'Sorry, from which track does the train to Utrecht leave?' },
          { speaker: 'Medewerker', nl: 'Spoor vijf, maar er is een kleine vertraging.', en: 'Track five, but there is a small delay.' },
          { speaker: 'Reiziger', nl: 'Oké, dank u wel.', en: 'Okay, thank you.' },
        ],
        [
          MC('m07-l06-l1', 'Waar zijn we ongeveer?', ['Op het station', 'In de bioscoop', 'Op school'], 'Op het station'),
          MC('m07-l06-l2', 'Naar welke stad?', ['Utrecht', 'Tokio', 'Lima'], 'Utrecht'),
          MC('m07-l06-l3', 'Hoe laat vertrekt de trein (volgens omroep)?', ['Tien over negen', 'Half twaalf ’s nachts', 'Geen tijd'], 'Tien over negen'),
          MC('m07-l06-l4', 'Van welk spoor?', ['Spoor vijf', 'Spoor honderd', 'Geen spoor'], 'Spoor vijf'),
          MC('m07-l06-l5', 'Is er vertraging?', ['Ja, vijf minuten', 'Nee, altijd precies op tijd', 'Nooit, zonder uitzondering'], 'Ja, vijf minuten'),
          MC('m07-l06-l6', 'Herhaalt de medewerker het spoor?', ['Ja, spoor vijf', 'Nee, spoor twintig', 'Onbekend'], 'Ja, spoor vijf'),
        ]
      ),
      discoveryStep('m07-l06', 'Herken deze brokken', [
        { nl: 'De trein vertrekt om …', en: 'The train departs at …', focus: 'tijd' },
        { nl: 'Van spoor / perron …', en: 'From track / platform …', focus: 'plek' },
        { nl: 'Er is vertraging.', en: 'There is a delay.', focus: 'vertraging' },
        { nl: 'Eindbestemming …', en: 'Final destination …', focus: 'bestemming' },
      ]),
      practiceLoop(
        'm07-l06-pl1',
        'Practice — 6×',
        ['spoor', 'vertraging', 'vertrek'],
        [
          MC('m07-l06-a1', '“Vertraging” betekent', ['later dan gepland', 'eerder dan gepland', 'geen trein'], 'later dan gepland'),
          FB('m07-l06-a2', 'De trein vertrekt ___ half negen. (tijdwoord)', ['om', 'met', 'onder'], 'om'),
          RO('m07-l06-a3', ['vijf.', 'spoor', 'Van'], 'Van spoor vijf.'),
          MC('m07-l06-a4', 'Spoor vs perron in de praktijk', ['Vaak hetzelfde idee: waar je instapt', 'Altijd over pizza', 'Nooit hetzelfde'], 'Vaak hetzelfde idee: waar je instapt'),
          MC('m07-l06-a5', 'Als u de omroep mist', ['Vraag een medewerker of medereiziger', 'Raad zomaar een spoor', 'Zwijg en wacht'], 'Vraag een medewerker of medereiziger'),
          MC('m07-l06-a6', '“Van welk spoor?” vraagt', ['welk perron/track', 'hoeveel broodjes', 'uw naam'], 'welk perron/track'),
        ]
      ),
      practiceLoop(
        'm07-l06-pl2',
        'Variatie — 7×',
        ['perron', 'trein', 'aankomst'],
        [
          MC('m07-l06-b1', 'Eindbestemming hoort bij', ['waar de trein uiteindelijk naartoe gaat', 'waar u altijd woont', 'alleen het weer'], 'waar de trein uiteindelijk naartoe gaat'),
          FB('m07-l06-b2', 'Er is tien minuten ___.', ['vertraging', 'kaas', 'rust'], 'vertraging'),
          MC('m07-l06-b3', 'Hoe laat …? hoort bij', ['vertrektijd', 'schoenmaat', 'lievelingskleur'], 'vertrektijd'),
          RO('m07-l06-b4', ['vertraging.', 'minuten', 'tien', 'is', 'Er'], 'Er is tien minuten vertraging.'),
          MC('m07-l06-b5', 'Veilig communiceren bij drukte', ['Korte zin + herhalen', 'Lange toespraak', 'Geen oogcontact'], 'Korte zin + herhalen'),
          MC('m07-l06-b6', '“Intercity” in deze les =', ['een treintype (herkenning)', 'een snack in de trein', 'een fietsmerk'], 'een treintype (herkenning)'),
          MC('m07-l06-b7', 'Dank na hulp', ['Dank u wel.', 'Later, sukkel.', 'Niets zeggen'], 'Dank u wel.'),
        ]
      ),
      speak('m07-l06-sp1', 'Zeg hardop', 'Van welk spoor vertrekt de trein?', ['Van welk spoor vertrekt de trein', 'van welk spoor vertrekt de trein'], 'Van welk spoor vertrekt de trein?'),
      speak('m07-l06-sp2', 'Zeg hardop', 'Is er vertraging?', ['Is er vertraging', 'is er vertraging'], 'Is er vertraging?'),
      recapStep('m07-l06', ['spoor', 'vertraging', 'vertrek'], [
        { kind: 'fill_blank', sentence: 'Er is vijf minuten ___.', options: ['vertraging', 'kaartje', 'rust'], correctAnswer: 'vertraging' },
        { kind: 'reorder', tokens: ['Utrecht?', 'naar', 'gaat', 'Welke', 'trein'], correctAnswer: 'Welke trein gaat naar Utrecht?' },
        { kind: 'speak', prompt: 'Zeg: *De trein vertrekt om tien over negen.*', targetNl: 'De trein vertrekt om tien over negen.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Van spoor vijf.', options: ['Plek om te wachten', 'Recept', 'Weer'], correctAnswer: 'Plek om te wachten' },
        { kind: 'fill_blank', sentence: '___ is vertraging. (formeel: er)', options: ['Er', 'Ik', 'Jij'], correctAnswer: 'Er' },
      ]),
    ],
  })

  return [L2, L3, L4, L5, L6]
}
