/**
 * Lessons 2–11 for a2-m06-health-doctor. Used by build-a2-m06-health-module.mjs
 * @param {typeof import('./build-a2-m06-health-module.mjs')} _ — helpers passed as object
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
    id: 'a2-m06-l02-listen-read-symptoms-questions',
    title: 'Listening & reading · Symptoms and simple questions',
    lessonType: 'input',
    grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-questions'],
    vocabTargets: ['lemma-keelpijn', 'lemma-hoesten', 'lemma-niesen', 'lemma-moe', 'lemma-sinds'],
    canDoStatements: ['I can match common symptoms to short questions a doctor might ask.'],
    steps: [
      previewStep('m06-l02', 'Warm-up — 5 woorden', [
        { word: 'keelpijn', lemma: 'keelpijn', en: 'sore throat', emoji: '😷' },
        { word: 'hoesten', lemma: 'hoesten', en: 'to cough', emoji: '🤧' },
        { word: 'niesen', lemma: 'niesen', en: 'to sneeze', emoji: '💨' },
        { word: 'moe', lemma: 'moe', en: 'tired', emoji: '😴' },
        { word: 'sinds', lemma: 'sinds', en: 'since', emoji: '📌' },
      ]),
      listenReadStep(
        'm06-l02',
        'Input — vragenlijst op scherm (lees + luister)',
        [
          {
            speaker: 'Scherm',
            nl: 'Sinds wanneer heeft u klachten? — Hoe lang al? — Waar doet het pijn? — Heeft u koorts gehad? — Kunt u goed eten en drinken?',
            en: 'Since when have you had symptoms? How long already? Where does it hurt? Have you had a fever? Can you eat and drink okay?',
          },
          {
            speaker: 'Patiënt (voorbeeldantwoord)',
            nl: 'Sinds gisteren. Ik heb keelpijn en ik ben moe. Geen hoge koorts, denk ik.',
            en: "Since yesterday. I have a sore throat and I'm tired. No high fever, I think.",
          },
        ],
        [
          MC('m06-l02-e1', 'Welke vraag gaat over tijd?', ['Sinds wanneer heeft u klachten?', 'Waar woont u?', 'Wat kost het?'], 'Sinds wanneer heeft u klachten?'),
          MC('m06-l02-e2', '“Hoe lang al?” vraagt naar', ['Duur van de klachten', 'Uw lengte', 'Uw adres'], 'Duur van de klachten'),
          MC('m06-l02-e3', 'Welke vraag gaat over plaats van pijn?', ['Waar doet het pijn?', 'Hoe heet u?', 'Wat is uw beroep?'], 'Waar doet het pijn?'),
          MC('m06-l02-e4', 'Wat zegt de patiënt over koorts?', ['Geen hoge koorts', 'Ik heb altijd koorts', 'Koorts is lekker'], 'Geen hoge koorts'),
          MC('m06-l02-e5', 'Welke klacht noemt de patiënt?', ['Keelpijn + moe', 'Alleen buikpijn', 'Geen klachten'], 'Keelpijn + moe'),
          MC('m06-l02-e6', '“Sinds gisteren” betekent', ['Vanaf gisteren', 'Volgende week', 'Nooit'], 'Vanaf gisteren'),
        ]
      ),
      discoveryStep('m06-l02', 'Vaste combinaties', [
        { nl: 'Sinds wanneer …?', en: 'Since when …?', focus: 'tijd' },
        { nl: 'Hoe lang al?', en: 'How long already?', focus: 'duur' },
        { nl: 'Ik ben moe.', en: 'I am tired.', focus: 'moe' },
        { nl: 'Ik heb keelpijn.', en: 'I have a sore throat.', focus: 'keel' },
      ]),
      practiceLoop(
        'm06-l02-pl1',
        'Practice — 6×',
        ['keelpijn', 'sinds', 'moe'],
        [
          RO('m06-l02-a1', ['gisteren.', 'Sinds', 'klachten', 'ik', 'heb'], 'Sinds gisteren heb ik klachten.'),
          FB('m06-l02-a2', 'Ik heb ___ . (keel)', ['keelpijn', 'rugpijn', 'zonpijn'], 'keelpijn'),
          MC('m06-l02-a3', 'Goede antwoordstart op “Hoe lang al?”', ['Al drie dagen.', 'Alleen blauw.', 'Niet waar.'], 'Al drie dagen.'),
          MC('m06-l02-a4', 'Welk symptoom hoort bij verkoudheid?', ['Niesen en keelpijn', 'Alleen zwemmen', 'Koffie'], 'Niesen en keelpijn'),
          MC('m06-l02-a5', '“Ik ben moe” =', ['Ik heb geen energie', 'Ik ben blij', 'Ik ben een dokter'], 'Ik heb geen energie'),
          MC('m06-l02-a6', 'Kies de juiste vraag bij buikpijn', ['Waar doet het pijn?', 'Wat is uw hobby?', 'Hoe laat is het?'], 'Waar doet het pijn?'),
        ]
      ),
      practiceLoop(
        'm06-l02-pl2',
        'Variatie — 7×',
        ['hoesten', 'gisteren', 'drinken'],
        [
          MC('m06-l02-b1', 'Wat vraagt “Kunt u goed drinken?”', ['Of drinken lukt', 'Of u wijn wilt', 'Of u rijk bent'], 'Of drinken lukt'),
          FB('m06-l02-b2', 'Ik ___ veel. (hoesten)', ['hoest', 'zwem', 'dans'], 'hoest'),
          RO('m06-l02-b3', ['moe.', 'ben', 'Ik', 'heel'], 'Ik ben heel moe.'),
          MC('m06-l02-b4', 'Natuurlijke zin bij arts', ['Ik heb sinds maandag buikpijn.', 'Ik koop een huis.', 'Het regent altijd.'], 'Ik heb sinds maandag buikpijn.'),
          MC('m06-l02-b5', '“Gehad” in “koorts gehad” is', ['verleden / perfectum', 'toekomst', 'een kleur'], 'verleden / perfectum'),
          FB('m06-l02-b6', '___ wanneer? (vraagwoord)', ['Sinds', 'Onder', 'Achter'], 'Sinds'),
          MC('m06-l02-b7', 'Welke vraag is het meest algemeen?', ['Wat voelt u?', 'Wat is uw schoenmaat?', 'Wat is 2+2?'], 'Wat voelt u?'),
        ]
      ),
      speak('m06-l02-sp1', 'Zeg hardop', 'Sinds wanneer heeft u klachten?', ['Sinds wanneer heeft u klachten', 'sinds wanneer heeft u klachten'], 'Sinds wanneer heeft u klachten'),
      speak('m06-l02-sp2', 'Zeg hardop', 'Ik heb sinds gisteren keelpijn.', ['Ik heb sinds gisteren keelpijn', 'ik heb sinds gisteren keelpijn'], 'Ik heb sinds gisteren keelpijn'),
      recapStep('m06-l02', ['sinds', 'keelpijn', 'moe'], [
        { kind: 'fill_blank', sentence: 'Hoe ___ al?', options: ['lang', 'veel', 'hoog'], correctAnswer: 'lang' },
        { kind: 'reorder', tokens: ['wanneer?', 'Sinds', 'heeft', 'u', 'klachten'], correctAnswer: 'Sinds wanneer heeft u klachten?' },
        { kind: 'speak', prompt: 'Zeg: *Ik ben moe.*', targetNl: 'Ik ben moe.', mockPass: true },
        { kind: 'fill_blank', sentence: 'Ik heb ___. (keel)', options: ['keelpijn', 'hoofdpijn', 'rugpijn'], correctAnswer: 'keelpijn' },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Waar doet het pijn?', options: ['Plaats-vraag', 'Tijd-vraag', 'Prijs-vraag'], correctAnswer: 'Plaats-vraag' },
      ]),
    ],
  })

  const L3 = lessonBase(2, {
    durationEstimate: 15,
    id: 'a2-m06-l03-grammar-ik-heb-pijn',
    title: 'Grammar & patterns · Ik heb… / het doet pijn',
    lessonType: 'pattern',
    grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-questions'],
    vocabTargets: ['lemma-pijn', 'lemma-buikpijn', 'lemma-rug', 'lemma-maag', 'lemma-lichaam'],
    canDoStatements: ['I can form short symptom sentences with ik heb and het doet pijn.'],
    steps: [
      previewStep('m06-l03', 'Warm-up', [
        { word: 'buik', lemma: 'maag', en: 'stomach', emoji: '🫃' },
        { word: 'rug', lemma: 'rug', en: 'back', emoji: '🧍' },
        { word: 'lichaam', lemma: 'lichaam', en: 'body', emoji: '🧍‍♂️' },
        { word: 'pijn', lemma: 'pijn', en: 'pain', emoji: '⚡' },
        { word: 'hoofd', lemma: 'hoofdpijn', en: 'head (ache)', emoji: '🤕' },
      ]),
      grammarCard(
        'm06-l03-gc',
        'Patroon',
        'Klachten zeggen',
        '**Ik heb** + znw. pijn (hoofdpijn, buikpijn, keelpijn). **Het doet pijn** + waar: *Het doet pijn in mijn rug.* **Ik voel me** + bijv. nw.: *Ik voel me ziek.*',
        [
          { nl: 'Ik heb buikpijn.', en: 'I have stomach ache.' },
          { nl: 'Het doet pijn hier, bij mijn keel.', en: 'It hurts here, at my throat.' },
        ]
      ),
      listeningStep(
        'm06-l03-mini',
        'Input — korte voorbeelden',
        [
          { speaker: 'A', nl: 'Ik heb rugpijn sinds vorige week.', en: "I've had back pain since last week." },
          { speaker: 'B', nl: 'Waar zit de pijn precies?', en: 'Where exactly is the pain?' },
          { speaker: 'A', nl: 'Hier, in mijn onderrug.', en: 'Here, in my lower back.' },
        ],
        [
          MC('m06-l03-m1', 'Wat zegt A eerst?', ['Rugpijn sinds vorige week', 'Ik wil pizza', 'Het is zomer'], 'Rugpijn sinds vorige week'),
          MC('m06-l03-m2', 'Wat vraagt B?', ['Waar de pijn zit', 'Hoe laat het is', 'Waar de bus is'], 'Waar de pijn zit'),
          MC('m06-l03-m3', 'Waar is de pijn?', ['Onderrug', 'In de koelkast', 'Op school'], 'Onderrug'),
          MC('m06-l03-m4', '“Sinds vorige week” gaat over', ['tijd / duur', 'alleen eten', 'een kleur'], 'tijd / duur'),
        ]
      ),
      practiceLoop(
        'm06-l03-pl1',
        'Practice — 6×',
        ['buikpijn', 'rug', 'pijn'],
        [
          FB('m06-l03-a1', 'Ik heb ___. (buik)', ['buikpijn', 'buikkaas', 'buikfilm'], 'buikpijn'),
          RO('m06-l03-a2', ['mijn', 'keel.', 'in', 'Het', 'doet', 'pijn'], 'Het doet pijn in mijn keel.'),
          MC('m06-l03-a3', 'Welke zin is goed?', ['Ik heb hoofdpijn.', 'Ik heb hoofd fiets.', 'Hoofdpijn ik heb.'], 'Ik heb hoofdpijn.'),
          MC('m06-l03-a4', '“Het doet pijn” gebruik je voor', ['plek + gevoel', 'alleen het weer', 'eten kopen'], 'plek + gevoel'),
          FB('m06-l03-a5', 'Het doet pijn in mijn ___. (rug)', ['rug', 'tas', 'deur'], 'rug'),
          MC('m06-l03-a6', 'Kies: moe =', ['geen energie', 'honger', 'druk'], 'geen energie'),
        ]
      ),
      practiceLoop(
        'm06-l03-pl2',
        'Variatie — 7×',
        ['lichaam', 'maag', 'voelen'],
        [
          MC('m06-l03-b1', 'Ik voel me ziek ≈', ['Ik ben niet gezond', 'Ik ben rijk', 'Ik ben te laat'], 'Ik ben niet gezond'),
          RO('m06-l03-b2', ['ziek.', 'voel', 'Ik', 'me'], 'Ik voel me ziek.'),
          FB('m06-l03-b3', 'Pijn in de ___ (maag)', ['maag', 'muur', 'mus'], 'maag'),
          MC('m06-l03-b4', 'Welke zin is fout?', ['Ik heb pijn hoofd.', 'Ik heb hoofdpijn.', 'Ik heb buikpijn.'], 'Ik heb pijn hoofd.'),
          MC('m06-l03-b5', '“In mijn lichaam” klinkt in klacht vaak', ['Te vaag / liever specifiek: rug, keel', 'Perfect altijd', 'Alleen voor kinderen'], 'Te vaag / liever specifiek: rug, keel'),
          MC('m06-l03-b6', 'Natuurlijk: pijn + tijd', ['Ik heb al twee dagen pijn in mijn arm.', 'Ik heb arm twee dagen pizza.', 'Pijn arm dagen.'], 'Ik heb al twee dagen pijn in mijn arm.'),
          FB('m06-l03-b7', 'Ik heb pijn in mijn ___. (rug)', ['rug', 'auto', 'fiets'], 'rug'),
        ]
      ),
      speak('m06-l03-sp1', 'Zeg hardop', 'Het doet pijn in mijn rug.', ['Het doet pijn in mijn rug', 'het doet pijn in mijn rug'], 'Het doet pijn in mijn rug'),
      speak('m06-l03-sp2', 'Zeg hardop', 'Ik heb buikpijn.', ['Ik heb buikpijn', 'ik heb buikpijn'], 'Ik heb buikpijn'),
      speak('m06-l03-sp3', 'Zeg hardop — combineer', 'Ik heb al drie dagen rugpijn.', ['Ik heb al drie dagen rugpijn', 'ik heb al drie dagen rugpijn'], 'Ik heb al drie dagen rugpijn.'),
      recapStep('m06-l03', ['pijn', 'buikpijn', 'rug'], [
        { kind: 'reorder', tokens: ['hoofdpijn.', 'heb', 'Ik'], correctAnswer: 'Ik heb hoofdpijn.' },
        { kind: 'fill_blank', sentence: 'Het doet pijn ___ mijn keel.', options: ['in', 'op', 'voor'], correctAnswer: 'in' },
        { kind: 'speak', prompt: 'Zeg: *Ik voel me ziek.*', targetNl: 'Ik voel me ziek.', mockPass: true },
        { kind: 'fill_blank', sentence: 'Ik heb pijn in mijn ___.', options: ['rug', 'brood', 'trein'], correctAnswer: 'rug' },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Waar zit de pijn precies?', options: ['Specifieke plek-vraag', 'Vraag over eten', 'Groet'], correctAnswer: 'Specifieke plek-vraag' },
        { kind: 'speak', prompt: 'Zeg: *Ik heb keelpijn.*', targetNl: 'Ik heb keelpijn.', mockPass: true },
      ]),
    ],
  })

  const L4 = lessonBase(3, {
    id: 'a2-m06-l04-practice-body-symptoms-time',
    title: 'Controlled practice · Body parts, symptoms, and time phrases',
    lessonType: 'practice',
    grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-perfectum-light'],
    vocabTargets: ['lemma-hoofdpijn', 'lemma-koorts', 'lemma-gisteren-m6', 'lemma-vannacht', 'lemma-sinds'],
    canDoStatements: ['I can combine body words, symptoms, and sinds / al … dagen.'],
    steps: [
      previewStep('m06-l04', 'Warm-up', [
        { word: 'gisteren', lemma: 'gisteren', en: 'yesterday', emoji: '📅' },
        { word: 'vannacht', lemma: 'vannacht', en: 'last night', emoji: '🌙' },
        { word: 'koorts', lemma: 'koorts', en: 'fever', emoji: '🌡️' },
        { word: 'dagen', lemma: 'dagen', en: 'days', emoji: '📆' },
        { word: 'al', lemma: 'al', en: 'already', emoji: '⏱️' },
      ]),
      discoveryStep('m06-l04', 'Tijd + klacht', [
        { nl: 'Sinds gisteren.', en: 'Since yesterday.', focus: 'sinds' },
        { nl: 'Al twee dagen.', en: 'For two days already.', focus: 'al' },
        { nl: 'Vannacht slecht geslapen.', en: 'Slept badly last night.', focus: 'perfectum' },
        { nl: 'Ik heb koorts.', en: 'I have a fever.', focus: 'koorts' },
      ]),
      practiceLoop(
        'm06-l04-pl1',
        'Match en kies — 6×',
        ['gisteren', 'koorts', 'dagen'],
        [
          MC('m06-l04-a1', '“Al drie dagen” = hoe lang', ['Drie dagen tot nu toe', 'Drie uur', 'Drie jaar geleden'], 'Drie dagen tot nu toe'),
          RO('m06-l04-a2', ['gisteren.', 'sinds', 'Ik', 'hoest', 'al'], 'Ik hoest al sinds gisteren.'),
          FB('m06-l04-a3', 'Ik heb ___. (warm, ziek)', ['koorts', 'zon', 'wind'], 'koorts'),
          MC('m06-l04-a4', 'Welke tijdszin past bij “ik ben ziek”?', ['Sinds maandag', 'Op dinsdag om drie uur precies', 'Volgend jaar'], 'Sinds maandag'),
          MC('m06-l04-a5', '“Vannacht” =', ['de nacht die net voorbij is', 'morgenochtend', 'volgende zomer'], 'de nacht die net voorbij is'),
          MC('m06-l04-a6', 'Kies logische combinatie', ['Hoofdpijn + al twee dagen', 'Hoofdpijn + alleen op kerst', 'Hoofdpijn + nooit'], 'Hoofdpijn + al twee dagen'),
        ]
      ),
      practiceLoop(
        'm06-l04-pl2',
        'Schrijf in je hoofd — 7×',
        ['vannacht', 'slecht', 'geslapen'],
        [
          FB('m06-l04-b1', 'Ik heb slecht ___.', ['geslapen', 'gezwommen', 'gezongen'], 'geslapen'),
          RO('m06-l04-b2', ['dagen', 'buikpijn', 'twee', 'al', 'Ik', 'heb'], 'Ik heb al twee dagen buikpijn.'),
          MC('m06-l04-b3', '“Sinds wanneer” vraagt', ['startpunt in tijd', 'uw naam', 'uw adres'], 'startpunt in tijd'),
          MC('m06-l04-b4', 'Welke zin klinkt natuurlijk?', ['Ik ben moe sinds een week.', 'Ik ben moe sinds een tafel.', 'Moe ik ben week.'], 'Ik ben moe sinds een week.'),
          MC('m06-l04-b5', 'Keelpijn + tijd', ['Ik heb sinds gisteren keelpijn.', 'Ik heb keelpijn sinds de maan.', 'Keelpijn gisteren sinds.'], 'Ik heb sinds gisteren keelpijn.'),
          MC('m06-l04-b6', '“Hoe lang al?” — goed antwoord', ['Een week ongeveer.', 'Rood.', 'De bus.'], 'Een week ongeveer.'),
          FB('m06-l04-b7', '___ gisteren begon het. (Sinds)', ['Sinds', 'Tot', 'Met'], 'Sinds'),
        ]
      ),
      listeningStep(
        'm06-l04-lis',
        'Luister — kort checkgesprek',
        [
          { speaker: 'Arts', nl: 'Sinds wanneer heeft u deze hoest?', en: 'Since when have you had this cough?' },
          { speaker: 'U', nl: 'Sinds dinsdag, en ik ben erg moe.', en: "Since Tuesday, and I'm very tired." },
          { speaker: 'Arts', nl: 'Oké. En koorts?', en: 'Okay. And fever?' },
          { speaker: 'U', nl: 'Gisteren een beetje, vannacht niet meer.', en: 'A little yesterday, not anymore last night.' },
        ],
        [
          MC('m06-l04-l1', 'Sinds wanneer hoest de patiënt?', ['Sinds dinsdag', 'Sinds 1999', 'Sinds morgen'], 'Sinds dinsdag'),
          MC('m06-l04-l2', 'Hoe voelt de patiënt zich?', ['Erg moe', 'Erg blij', 'Erg rijk'], 'Erg moe'),
          MC('m06-l04-l3', 'Koorts gisteren?', ['Een beetje', 'Heel hoog, altijd', 'Nooit'], 'Een beetje'),
          MC('m06-l04-l4', 'Vannacht?', ['Geen koorts meer', 'Alleen pizza', 'Nieuw jaar'], 'Geen koorts meer'),
        ]
      ),
      speak('m06-l04-sp1', 'Zeg hardop', 'Ik heb al drie dagen koorts.', ['Ik heb al drie dagen koorts', 'ik heb al drie dagen koorts'], 'Ik heb al drie dagen koorts'),
      speak('m06-l04-sp2', 'Zeg hardop', 'Sinds gisteren heb ik buikpijn.', ['Sinds gisteren heb ik buikpijn', 'sinds gisteren heb ik buikpijn'], 'Sinds gisteren heb ik buikpijn'),
      recapStep('m06-l04', ['sinds', 'al', 'koorts'], [
        { kind: 'reorder', tokens: ['dagen.', 'twee', 'al', 'moe', 'Ik', 'ben'], correctAnswer: 'Ik ben al twee dagen moe.' },
        { kind: 'fill_blank', sentence: '___ gisteren heb ik hoofdpijn.', options: ['Sinds', 'Tot', 'Zonder'], correctAnswer: 'Sinds' },
        { kind: 'speak', prompt: 'Zeg: *Vannacht heb ik slecht geslapen.*', targetNl: 'Vannacht heb ik slecht geslapen.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Sinds wanneer heeft u deze hoest?', options: ['Starttijd vraag', 'Prijs vraag', 'Groet'], correctAnswer: 'Starttijd vraag' },
        { kind: 'fill_blank', sentence: 'Ik heb al twee ___ hoofdpijn.', options: ['dagen', 'katten', 'euro'], correctAnswer: 'dagen' },
      ]),
    ],
  })

  const L5 = lessonBase(4, {
    id: 'a2-m06-l05-speaking-how-you-feel',
    title: 'Speaking · Explain how you feel',
    lessonType: 'speaking',
    grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-questions'],
    vocabTargets: [
      'lemma-voelen',
      'lemma-moe',
      'lemma-hoofdpijn',
      'lemma-buikpijn',
      'lemma-koorts',
      'lemma-uitleggen-m6',
      'lemma-duidelijk-m6',
      'lemma-langzaam-m6',
      'lemma-herhalen',
      'lemma-begrijpen-m6',
    ],
    canDoStatements: ['I can say how I feel, add duration, and ask the doctor to repeat.'],
    steps: [
      previewStep('m06-l05', 'Rustig ademen — 5 woorden', [
        { word: 'uitleggen', lemma: 'uitleggen-m6', en: 'to explain', emoji: '💬' },
        { word: 'duidelijk', lemma: 'duidelijk-m6', en: 'clear', emoji: '✨' },
        { word: 'langzaam', lemma: 'langzaam-m6', en: 'slowly', emoji: '🐢' },
        { word: 'herhalen', lemma: 'herhalen', en: 'repeat', emoji: '🔁' },
        { word: 'begrijpen', lemma: 'begrijpen-m6', en: 'understand', emoji: '🧠' },
      ]),
      discoveryStep('m06-l05', 'Handige zinnen', [
        { nl: 'Ik voel me niet lekker.', en: "I don't feel well.", focus: 'voelen' },
        { nl: 'Het begon drie dagen geleden.', en: 'It started three days ago.', focus: 'tijd' },
        { nl: 'Kunt u dat herhalen, alstublieft?', en: 'Could you repeat that, please?', focus: 'herhalen' },
        { nl: 'Kunt u langzamer praten?', en: 'Can you speak more slowly?', focus: 'tempo' },
        { nl: 'Rustig: één vraag per keer.', en: 'Stay calm: one question at a time.', focus: 'stress' },
      ]),
      practiceLoop(
        'm06-l05-pl1',
        'Kies de beste reactie — 6×',
        ['herhalen', 'begrijpen', 'langzaam'],
        [
          MC('m06-l05-a1', 'U hoort moeilijke uitleg. Wat zegt u?', ['Kunt u dat herhalen, alstublieft?', 'Ik ga weg.', 'Ik begrijp alles altijd.'], 'Kunt u dat herhalen, alstublieft?'),
          MC('m06-l05-a2', 'Te snel Nederlands', ['Kunt u langzamer praten?', 'Praat harder!', 'Zwijg.'], 'Kunt u langzamer praten?'),
          MC('m06-l05-a3', 'Beleefd “ik snap het niet”', ['Ik begrijp het niet goed.', 'Jij liegt.', 'Ik weet alles.'], 'Ik begrijp het niet goed.'),
          MC('m06-l05-a4', 'Symptoom + duur in één zin', ['Ik heb sinds maandag hoofdpijn en ik ben moe.', 'Ik heb maandag en hoofd.', 'Sinds moe.'], 'Ik heb sinds maandag hoofdpijn en ik ben moe.'),
          RO('m06-l05-a5', ['alstublieft?', 'herhalen,', 'dat', 'Kunt', 'u'], 'Kunt u dat herhalen, alstublieft?'),
          MC('m06-l05-a6', 'Calm tone', ['Rustig en kort antwoorden', 'Schreeuwen helpt', 'Zwijgen altijd'], 'Rustig en kort antwoorden'),
        ]
      ),
      speak('m06-l05-sp1', 'Productie 1', 'Ik voel me niet lekker. Ik ben erg moe.', ['Ik voel me niet lekker ik ben erg moe', 'Ik voel me niet lekker. Ik ben erg moe.'], 'Ik voel me niet lekker. Ik ben erg moe.'),
      speak('m06-l05-sp2', 'Productie 2', 'Ik heb al vier dagen keelpijn.', ['Ik heb al vier dagen keelpijn', 'ik heb al vier dagen keelpijn'], 'Ik heb al vier dagen keelpijn.'),
      speak('m06-l05-sp3', 'Productie 3', 'Kunt u dat herhalen, alstublieft?', ['Kunt u dat herhalen alstublieft', 'Kunt u dat herhalen, alstublieft?'], 'Kunt u dat herhalen, alstublieft?'),
      speak('m06-l05-sp4', 'Productie 4', 'Hoe lang al? — Al sinds gisteren.', ['Hoe lang al al sinds gisteren', 'Hoe lang al? Al sinds gisteren.'], 'Hoe lang al? Al sinds gisteren.'),
      speak('m06-l05-sp5', 'Productie 5', 'Ik begrijp het niet. Kunt u langzamer praten?', ['Ik begrijp het niet kunt u langzamer praten', 'Ik begrijp het niet. Kunt u langzamer praten?'], 'Ik begrijp het niet. Kunt u langzamer praten?'),
      practiceLoop(
        'm06-l05-pl2',
        'Laatste loop — 5×',
        ['voelen', 'moe', 'keel'],
        [
          MC('m06-l05-b1', 'Welke vraag stelt u zelf?', ['Hoe lang moet ik dit medicijn gebruiken?', 'Hoe lang is uw naam?', 'Wat is een huis?'], 'Hoe lang moet ik dit medicijn gebruiken?'),
          FB('m06-l05-b2', 'Ik voel me ___. (niet goed)', ['niet lekker', 'niet trein', 'niet deur'], 'niet lekker'),
          MC('m06-l05-b3', 'Goede combinatie', ['Hoofdpijn + moe + sinds twee dagen', 'Alleen “hallo”', 'Alleen cijfers'], 'Hoofdpijn + moe + sinds twee dagen'),
          RO('m06-l05-b4', ['praten?', 'langzamer', 'Kunt', 'u'], 'Kunt u langzamer praten?'),
          MC('m06-l05-b5', 'Stress-tip', ['Korte zinnen; één ding per keer', 'Alles in één keer schreeuwen', 'Geen antwoord geven'], 'Korte zinnen; één ding per keer'),
        ]
      ),
      recapStep('m06-l05', ['herhalen', 'voelen', 'moe'], [
        { kind: 'speak', prompt: 'Zeg: *Kunt u dat herhalen?*', targetNl: 'Kunt u dat herhalen?', mockPass: true },
        { kind: 'speak', prompt: 'Zeg: *Ik ben erg moe.*', targetNl: 'Ik ben erg moe.', mockPass: true },
        { kind: 'fill_blank', sentence: 'Ik ___ me niet lekker.', options: ['voel', 'ben', 'heb'], correctAnswer: 'voel' },
        { kind: 'reorder', tokens: ['alstublieft?', 'langzamer', 'praten,', 'Kunt', 'u'], correctAnswer: 'Kunt u langzamer praten, alstublieft?' },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Ik begrijp het niet goed.', options: ['Om verduidelijking', 'Groet', 'Afscheid'], correctAnswer: 'Om verduidelijking' },
      ]),
    ],
  })

  const L6 = lessonBase(5, {
    id: 'a2-m06-l06-listening-pharmacy',
    title: 'Listening · At the pharmacy · instructions and advice',
    lessonType: 'input',
    grammarTargets: ['a2.2-health-modals', 'a2.2-health-clarify'],
    vocabTargets: ['lemma-apotheek', 'lemma-medicijn', 'lemma-tablet', 'lemma-recept', 'lemma-eten-m6'],
    canDoStatements: ['I can follow simple pharmacy advice about how often to take medicine.'],
    steps: [
      previewStep('m06-l06', 'Warm-up', [
        { word: 'apotheek', lemma: 'apotheek', en: 'pharmacy', emoji: '💊' },
        { word: 'medicijn', lemma: 'medicijn', en: 'medicine', emoji: '🧴' },
        { word: 'tablet', lemma: 'tablet', en: 'tablet', emoji: '💊' },
        { word: 'recept', lemma: 'recept', en: 'prescription', emoji: '📋' },
        { word: 'per dag', lemma: 'dag', en: 'per day', emoji: '📆' },
      ]),
      listeningStep(
        'm06-l06',
        'Input — bij de apotheek',
        [
          { speaker: 'Apotheker', nl: 'Goedemiddag. Heeft u een recept voor mij?', en: 'Good afternoon. Do you have a prescription for me?' },
          { speaker: 'U', nl: 'Ja, alstublieft. Het is voor mijn keel.', en: 'Yes, please. It is for my throat.' },
          { speaker: 'Apotheker', nl: 'Prima. U neemt twee tabletten per dag: één ’s ochtends en één ’s avonds.', en: 'Fine. You take two tablets a day: one in the morning and one in the evening.' },
          { speaker: 'Apotheker', nl: 'Neem ze na het eten, met water. En rust goed uit.', en: 'Take them after eating, with water. And rest well.' },
          { speaker: 'U', nl: 'Kunt u dat nog een keer zeggen? Voor of na het eten?', en: 'Could you say that again? Before or after food?' },
          { speaker: 'Apotheker', nl: 'Na het eten, hoor. Voor het eten is niet nodig.', en: 'After food, okay. Before food is not necessary.' },
        ],
        [
          MC('m06-l06-l1', 'Waar is het gesprek?', ['Bij de apotheek', 'In de sportschool', 'Op het strand'], 'Bij de apotheek'),
          MC('m06-l06-l2', 'Wat vraagt de apotheker eerst?', ['Het recept', 'Uw paspoort', 'Uw fiets'], 'Het recept'),
          MC('m06-l06-l3', 'Hoeveel tabletten per dag?', ['Twee', 'Eén honderd', 'Nul'], 'Twee'),
          MC('m06-l06-l4', 'Wanneer innemen?', ['Na het eten', 'Tijdens het zwemmen', 'Nooit'], 'Na het eten'),
          MC('m06-l06-l5', 'Wat vraagt de klant?', ['Herhaling: voor of na eten', 'Korting', 'Een kat'], 'Herhaling: voor of na eten'),
          MC('m06-l06-l6', 'Antwoord apotheker', ['Na het eten', 'Alleen water zonder tablet', 'Voor het ontbijt altijd'], 'Na het eten'),
        ]
      ),
      discoveryStep('m06-l06', 'Instructiewoorden', [
        { nl: 'Twee keer per dag.', en: 'Twice a day.', focus: 'frequentie' },
        { nl: 'Voor of na het eten?', en: 'Before or after food?', focus: 'timing' },
        { nl: 'Met water innemen.', en: 'Take with water.', focus: 'inname' },
        { nl: 'Rust goed uit.', en: 'Rest well.', focus: 'rust' },
      ]),
      practiceLoop(
        'm06-l06-pl1',
        'Practice — 6×',
        ['tablet', 'medicijn', 'apotheek'],
        [
          MC('m06-l06-a1', '“Per dag” betekent', ['elke dag', 'elke week', 'een keer'], 'elke dag'),
          FB('m06-l06-a2', 'Twee ___ per dag. (keer)', ['keer', 'kat', 'bus'], 'keer'),
          RO('m06-l06-a3', ['et.', 'het', 'na', 'Neem', 'ze'], 'Neem ze na het eten.'),
          MC('m06-l06-a4', 'Veilig: met water', ['Ja, vaak advies', 'Nee, altijd cola', 'Nee, nooit'], 'Ja, vaak advies'),
          MC('m06-l06-a5', '“’s ochtends” ≈', ['in de ochtend', 'in de zee', 'op maandag alleen'], 'in de ochtend'),
          MC('m06-l06-a6', 'Recept nodig?', ['Soms ja, voor sommige medicijnen', 'Nooit', 'Alleen voor brood'], 'Soms ja, voor sommige medicijnen'),
        ]
      ),
      practiceLoop(
        'm06-l06-pl2',
        'Variatie — 7×',
        ['recept', 'drinken', 'rust'],
        [
          MC('m06-l06-b1', 'Kunt u dat herhalen? gebruikt u bij', ['onduidelijke instructie', 'goed weer', 'korting'], 'onduidelijke instructie'),
          FB('m06-l06-b2', '___ het eten (tegenover “na”)', ['Voor', 'Achter', 'Onder'], 'Voor'),
          MC('m06-l06-b3', '“U moet rust nemen” ≈', ['U moet uitrusten', 'U moet rennen', 'U moet werken'], 'U moet uitrusten'),
          MC('m06-l06-b4', 'Juiste zin', ['Ik haal mijn medicijn bij de apotheek.', 'Ik haal mijn medicijn bij de bakker.', 'Apotheek haal ik nooit.'], 'Ik haal mijn medicijn bij de apotheek.'),
          RO('m06-l06-b5', ['dag.', 'per', 'één', 'tablet', 'Neem'], 'Neem één tablet per dag.'),
          MC('m06-l06-b6', '“Innemen” betekent hier', ['slikken / drinken met tablet', 'koken', 'betalen'], 'slikken / drinken met tablet'),
          MC('m06-l06-b7', 'Na het eten =', ['nadat je gegeten hebt', 'voor je wakker wordt', 'tijdens sport'], 'nadat je gegeten hebt'),
        ]
      ),
      speak('m06-l06-sp1', 'Zeg hardop', 'Twee keer per dag, na het eten.', ['Twee keer per dag na het eten', 'Twee keer per dag, na het eten.'], 'Twee keer per dag, na het eten.'),
      speak('m06-l06-sp2', 'Zeg hardop', 'Kunt u dat herhalen, alstublieft?', ['Kunt u dat herhalen alstublieft', 'Kunt u dat herhalen, alstublieft?'], 'Kunt u dat herhalen, alstublieft?'),
      recapStep('m06-l06', ['apotheek', 'tablet', 'eten'], [
        { kind: 'fill_blank', sentence: 'Neem de tablet ___ het eten.', options: ['na', 'boven', 'achter'], correctAnswer: 'na' },
        { kind: 'reorder', tokens: ['dag.', 'per', 'twee', 'keer'], correctAnswer: 'Twee keer per dag.' },
        { kind: 'speak', prompt: 'Zeg: *Met water, alstublieft.*', targetNl: 'Met water, alstublieft.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Na het eten, met water.', options: ['Inname-instructie', 'Busrooster', 'Weerbericht'], correctAnswer: 'Inname-instructie' },
        { kind: 'fill_blank', sentence: 'Ik haal het medicijn bij de ___.', options: ['apotheek', 'supermarkt', 'bibliotheek'], correctAnswer: 'apotheek' },
      ]),
    ],
  })

  const L7 = lessonBase(6, {
    durationEstimate: 15,
    id: 'a2-m06-l07-grammar-moet-mag-kan',
    title: 'Grammar · Moeten, mogen, kunnen · doctor’s advice',
    lessonType: 'pattern',
    grammarTargets: ['a2.2-health-modals', 'a2.2-health-symptoms'],
    vocabTargets: [
      'lemma-moeten-m6',
      'lemma-mogen-m6',
      'lemma-kunnen-m6',
      'lemma-rust',
      'lemma-drinken-m6',
    ],
    canDoStatements: ['I can recognize must / may / can in short health advice and react politely.'],
    steps: [
      previewStep('m06-l07', 'Warm-up — 5 woorden', [
        { word: 'moeten', lemma: 'moeten-m6', en: 'must / have to', emoji: '⚠️' },
        { word: 'mogen', lemma: 'mogen-m6', en: 'may / allowed', emoji: '✅' },
        { word: 'kunnen', lemma: 'kunnen-m6', en: 'can / able', emoji: '💪' },
        { word: 'rust', lemma: 'rust', en: 'rest', emoji: '🛋️' },
        { word: 'water', lemma: 'drinken-m6', en: 'drink / water', emoji: '💧' },
      ]),
      grammarCard(
        'm06-l07-gc',
        'Patroon',
        'Moeten, mogen, kunnen bij advies',
        '**U moet** … = sterk advies of regel. **U mag** … = het is toegestaan. **U kunt** … = mogelijkheid of vriendelijke suggestie. Bij arts: vaak **u** + rustige toon.\n\n**Let op:** bij *u* + *hebben* hoort **u hebt** (standaard Nederlands).',
        [
          { nl: 'U moet veel water drinken.', en: 'You should / must drink plenty of water.' },
          { nl: 'U mag vandaag rust nemen.', en: 'You may rest today.' },
          { nl: 'U kunt paracetamol gebruiken.', en: 'You can use paracetamol.' },
        ]
      ),
      discoveryStep('m06-l07', 'Let op het verschil', [
        { nl: 'U moet naar huis gaan en uitrusten.', en: 'Clear instruction to go home and rest.', focus: 'moeten' },
        { nl: 'U mag weer werken als u zich beter voelt.', en: 'Permission when you feel better.', focus: 'mogen' },
        { nl: 'U kunt bellen als de koorts terugkomt.', en: 'Option / possibility to call back.', focus: 'kunnen' },
        { nl: 'U moet het medicijn op tijd innemen.', en: 'Medicine timing rule.', focus: 'moeten' },
      ]),
      listeningStep(
        'm06-l07',
        'Input — advies van de huisarts (neem de tijd)',
        [
          { speaker: 'Huisarts', nl: 'U hebt een lichte infectie. U moet veel warm drinken en goed slapen.', en: 'You have a light infection. You must drink plenty of warm drinks and sleep well.' },
          { speaker: 'Huisarts', nl: 'U mag vandaag niet sporten, maar u mag wel een korte wandeling maken.', en: "You may not exercise today, but you may take a short walk." },
          { speaker: 'Huisarts', nl: 'U kunt paracetamol nemen bij koorts. Belt u als het erger wordt.', en: 'You can take paracetamol for fever. Call if it gets worse.' },
          { speaker: 'Patiënt', nl: 'Oké, dank u wel. Ik snap het.', en: 'Okay, thank you. I understand.' },
        ],
        [
          MC('m06-l07-l1', 'Wat moet de patiënt vooral doen?', ['Veel warm drinken en slapen', 'Marathon lopen', 'Niets drinken'], 'Veel warm drinken en slapen'),
          MC('m06-l07-l2', 'Sporten vandaag?', ['Niet sporten', 'Verplicht hardlopen', 'Alleen zwemmen in zee'], 'Niet sporten'),
          MC('m06-l07-l3', 'Wat mag wel?', ['Een korte wandeling', 'Een feest tot laat', 'Geen slaap'], 'Een korte wandeling'),
          MC('m06-l07-l4', 'Bij koorts mag u …', ['Paracetamol nemen', 'Geen medicijn ooit', 'Alleen suiker eten'], 'Paracetamol nemen'),
          MC('m06-l07-l5', '“Belt u als het erger wordt” =', ['Bel opnieuw bij verslechtering', 'Bel nooit meer', 'Bel alleen voor pizza'], 'Bel opnieuw bij verslechtering'),
          MC('m06-l07-l6', 'Welk woord is “toegestaan”?', ['mogen', 'moeten', 'kunnen'], 'mogen'),
          MC('m06-l07-l7', 'Hoe sluit de patiënt rustig af?', ['Dank + begrijpen', 'Boos weglopen', 'Schreeuwen'], 'Dank + begrijpen'),
        ]
      ),
      practiceLoop(
        'm06-l07-pl1',
        'Kies moeten / mogen / kunnen — 6×',
        ['moeten', 'mogen', 'rust'],
        [
          MC('m06-l07-a1', 'Sterk advies: veel rust', ['U moet rust nemen.', 'U mag nooit slapen.', 'U kunt alleen schreeuwen.'], 'U moet rust nemen.'),
          MC('m06-l07-a2', 'Toestemming na beter voelen', ['U mag weer naar school als u beter bent.', 'U moet altijd ziek blijven.', 'U kunt nooit leren.'], 'U mag weer naar school als u beter bent.'),
          FB('m06-l07-a3', 'U ___ veel water drinken. (advies, verplichtend)', ['moet', 'mag', 'kent'], 'moet'),
          RO('m06-l07-a4', ['wordt.', 'erger', 'het', 'als', 'u', 'Belt'], 'Belt u als het erger wordt.'),
          MC('m06-l07-a5', 'Mogelijkheid / optie', ['U kunt morgen terugkomen.', 'U moet nooit komen.', 'U mag nooit praten.'], 'U kunt morgen terugkomen.'),
          MC('m06-l07-a6', 'Beleefd bij twijfel', ['Mag ik nog een vraag stellen?', 'Jij moet zwijgen.', 'Geen vragen.'], 'Mag ik nog een vraag stellen?'),
        ]
      ),
      practiceLoop(
        'm06-l07-pl2',
        'Variatie — 7×',
        ['kunnen', 'medicijn', 'drinken'],
        [
          MC('m06-l07-b1', '“U moet” klinkt', ['meestal serieuzer dan “u mag”', 'altijd als een grap', 'alleen in het Engels'], 'meestal serieuzer dan “u mag”'),
          FB('m06-l07-b2', 'U ___ niet werken vandaag. (niet toegestaan)', ['mag', 'moet', 'kan'], 'mag'),
          MC('m06-l07-b3', 'Juiste zin bij infectie', ['Drink warm en slaap genoeg.', 'Drink alleen cola en niet slapen.', 'Geen vocht.'], 'Drink warm en slaap genoeg.'),
          RO('m06-l07-b4', ['innemen.', 'tijd', 'op', 'moet', 'medicijn', 'Het'], 'Het medicijn moet op tijd innemen.'),
          MC('m06-l07-b5', '“U kunt … bellen” =', ['het is mogelijk om te bellen', 'bellen is verboden', 'bel nu altijd de politie'], 'het is mogelijk om te bellen'),
          MC('m06-l07-b6', 'Welke zin is beleefd naar de arts?', ['Begrijp ik goed dat ik moet rusten?', 'Jij liegt.', 'Ik wil geen uitleg.'], 'Begrijp ik goed dat ik moet rusten?'),
          MC('m06-l07-b7', 'Koppel: medicijn op tijd', ['U moet het op tijd innemen.', 'U mag het nooit innemen.', 'U kunt het vergeten.'], 'U moet het op tijd innemen.'),
        ]
      ),
      speak('m06-l07-sp1', 'Zeg hardop', 'U moet veel water drinken en rust nemen.', ['U moet veel water drinken en rust nemen', 'u moet veel water drinken en rust nemen'], 'U moet veel water drinken en rust nemen.'),
      speak('m06-l07-sp2', 'Zeg hardop', 'Mag ik morgen weer werken?', ['Mag ik morgen weer werken', 'mag ik morgen weer werken'], 'Mag ik morgen weer werken?'),
      speak('m06-l07-sp3', 'Zeg hardop', 'U kunt bellen als de pijn erger wordt.', ['U kunt bellen als de pijn erger wordt', 'u kunt bellen als de pijn erger wordt'], 'U kunt bellen als de pijn erger wordt.'),
      recapStep('m06-l07', ['moeten', 'mogen', 'rust'], [
        { kind: 'fill_blank', sentence: 'U ___ vandaag niet sporten. (toestemming: niet)', options: ['mag', 'moet', 'kan'], correctAnswer: 'mag' },
        { kind: 'reorder', tokens: ['water.', 'veel', 'drinken', 'U', 'moet'], correctAnswer: 'U moet veel water drinken.' },
        { kind: 'speak', prompt: 'Zeg: *U kunt paracetamol nemen.*', targetNl: 'U kunt paracetamol nemen.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'U moet goed uitrusten.', options: ['Sterk advies', 'Een mop', 'Een recept voor taart'], correctAnswer: 'Sterk advies' },
        { kind: 'fill_blank', sentence: '___ ik een vraag stellen?', options: ['Mag', 'Moet', 'Kan'], correctAnswer: 'Mag' },
        {
          kind: 'listen_mcq',
          question: 'Welk woord hoort bij “het is toegestaan”?',
          snippetNl: 'U mag vandaag een korte wandeling maken.',
          options: ['mogen (toestemming)', 'moeten (plicht)', 'hebben (bezit)'],
          correctAnswer: 'mogen (toestemming)',
        },
      ]),
    ],
  })

  const L8 = lessonBase(7, {
    durationEstimate: 15,
    id: 'a2-m06-l08-writing-short-health-message',
    title: 'Writing · Short message about symptoms or an appointment',
    lessonType: 'writing',
    grammarTargets: ['a2.2-health-questions', 'a2.2-health-clarify'],
    vocabTargets: ['lemma-afspraak-m6', 'lemma-huisarts', 'lemma-keelpijn', 'lemma-bericht-m6', 'lemma-morgen-m6'],
    canDoStatements: ['I can write two polite sentences to cancel or request a GP appointment.'],
    steps: [
      previewStep('m06-l08', 'Warm-up', [
        { word: 'bericht', lemma: 'bericht-m6', en: 'message', emoji: '✉️' },
        { word: 'afspraak', lemma: 'afspraak', en: 'appointment', emoji: '📅' },
        { word: 'huisarts', lemma: 'huisarts', en: 'GP', emoji: '👩‍⚕️' },
        { word: 'morgen', lemma: 'morgen-m6', en: 'tomorrow', emoji: '🌅' },
        { word: 'keelpijn', lemma: 'keelpijn', en: 'sore throat', emoji: '😷' },
      ]),
      listenReadStep(
        'm06-l08',
        'Model — patiëntmail + kort antwoord (lees + luister)',
        [
          {
            speaker: 'U (voorbeeld)',
            nl: 'Beste huisartsenpost, ik kan morgen niet komen vanwege koorts. Kunt u een nieuwe afspraak voorstellen? Dank u wel.',
            en: "Dear out-of-hours GP service, I can't come tomorrow because of a fever. Could you suggest a new appointment? Thank you.",
          },
          {
            speaker: 'Praktijk (autoreply)',
            nl: 'Dank voor uw bericht. Bel morgen na 14.00 uur voor een nieuwe tijd, alstublieft.',
            en: 'Thanks for your message. Please call after 2 p.m. tomorrow for a new time.',
          },
        ],
        [
          MC('m06-l08-e1', 'Waarom schrijft de patiënt?', ['Afspraak afzeggen / verzetten', 'Een baan zoeken', 'Een pizza bestellen'], 'Afspraak afzeggen / verzetten'),
          MC('m06-l08-e2', 'Welk symptoom noemt hij/zij?', ['Koorts', 'Alleen hoofdpijn van werk', 'Geen reden'], 'Koorts'),
          MC('m06-l08-e3', 'Wat vraagt hij/zij?', ['Een nieuwe afspraak', 'Een auto', 'Een vakantie'], 'Een nieuwe afspraak'),
          MC('m06-l08-e4', 'Welke slotgroet is netjes?', ['Dank u wel.', 'Yo, fix het even.', 'Niets.'], 'Dank u wel.'),
          MC('m06-l08-e5', '“Vanwege” geeft vaak', ['een reden', 'een kleur', 'een sport'], 'een reden'),
          MC('m06-l08-e6', 'Wat zegt de praktijk over een nieuwe tijd?', ['Bel morgen na 14.00 uur', 'Kom nu zonder afspraak', 'Stuur een kaartje'], 'Bel morgen na 14.00 uur'),
        ]
      ),
      discoveryStep('m06-l08', 'Handige brokjes', [
        { nl: 'Ik kan niet komen vanwege …', en: "I can't come because of …", focus: 'afzeggen' },
        { nl: 'Kunt u een nieuwe tijd voorstellen?', en: 'Could you suggest a new time?', focus: 'verzoek' },
        { nl: 'Ik heb sinds gisteren keelpijn.', en: 'I have had a sore throat since yesterday.', focus: 'symptoom' },
        { nl: 'Met vriendelijke groet,', en: 'Kind regards,', focus: 'mail' },
        { nl: 'Korte zinnen: makkelijker op je telefoon.', en: 'Short sentences: easier on your phone.', focus: 'mobiel' },
      ]),
      practiceLoop(
        'm06-l08-pl1',
        'Kies de beste zin — 6×',
        ['bericht', 'afspraak', 'keelpijn'],
        [
          MC('m06-l08-a1', 'Openen van een bericht', ['Beste huisartsenpraktijk,', 'Hé, luister eens!', 'Geen aanhef'], 'Beste huisartsenpraktijk,'),
          FB('m06-l08-a2', 'Ik wil graag een ___ maken. (afspraak)', ['afspraak', 'feest', 'auto'], 'afspraak'),
          RO('m06-l08-a3', ['komt.', 'niet', 'morgen', 'Ik', 'kan'], 'Ik kan morgen niet komen.'),
          MC('m06-l08-a4', 'Reden noemen', ['Vanwege koorts en hoofdpijn.', 'Vanwege de maan.', 'Geen reden.'], 'Vanwege koorts en hoofdpijn.'),
          MC('m06-l08-a5', 'Beleefd verzoek', ['Kunt u mij terugbellen?', 'Bel nu!', 'Zwijg.'], 'Kunt u mij terugbellen?'),
          MC('m06-l08-a6', 'Slot', ['Met vriendelijke groet,', 'Tot nooit,', 'Bye bye xoxo'], 'Met vriendelijke groet,'),
        ]
      ),
      practiceLoop(
        'm06-l08-pl2',
        'Variatie — 6×',
        ['morgen', 'huisarts', 'symptoom'],
        [
          MC('m06-l08-b1', 'Symptoom in één zin', ['Ik heb al twee dagen keelpijn.', 'Ik heb een nieuwe fiets.', 'Ik ben een trein.'], 'Ik heb al twee dagen keelpijn.'),
          FB('m06-l08-b2', '___ gisteren ben ik ziek geworden. (tijd)', ['Sinds', 'Tot', 'Zonder'], 'Sinds'),
          MC('m06-l08-b3', 'Korte mail: doel', ['Nieuwe afspraak vragen', 'Gratis vakantie', 'Korting op schoenen'], 'Nieuwe afspraak vragen'),
          RO('m06-l08-b4', ['groet,', 'vriendelijke', 'Met'], 'Met vriendelijke groet,'),
          MC('m06-l08-b5', 'Welke zin is te informeel voor de huisarts?', ['Hoi doc, fix dit even.', 'Ik voel me niet goed.', 'Kunt u helpen?'], 'Hoi doc, fix dit even.'),
          MC('m06-l08-b6', '“Dank u wel” past bij', ['beleefd afsluiten', 'beledigen', 'geen context'], 'beleefd afsluiten'),
        ]
      ),
      speak(
        'm06-l08-sp0',
        'Oefenen — eerst hardop (zelfde woorden als uw mail)',
        'Ik kan morgen niet komen. Ik heb keelpijn.',
        ['Ik kan morgen niet komen ik heb keelpijn', 'Ik kan morgen niet komen. Ik heb keelpijn.'],
        'Ik kan morgen niet komen. Ik heb keelpijn.'
      ),
      writingStep(
        'm06-l08-w1',
        'Schrijven — 2 zinnen',
        'Schrijf twee zinnen: u kunt niet komen + noem één symptoom + vraag om een nieuwe afspraak. Sluit beleefd af.',
        [
          'ik kan niet komen ik heb keelpijn kunt u een nieuwe afspraak maken dank u wel',
          'Ik kan niet komen. Ik heb keelpijn. Kunt u een nieuwe afspraak maken? Dank u wel.',
        ],
        'Ik kan niet komen. Ik heb keelpijn. Kunt u een nieuwe afspraak maken? Dank u wel.',
        35
      ),
      speak('m06-l08-sp1', 'Zeg hardop', 'Ik wil graag een afspraak maken bij de huisarts.', ['Ik wil graag een afspraak maken bij de huisarts', 'ik wil graag een afspraak maken bij de huisarts'], 'Ik wil graag een afspraak maken bij de huisarts.'),
      speak('m06-l08-sp2', 'Zeg hardop', 'Kunt u mij terugbellen, alstublieft?', ['Kunt u mij terugbellen alstublieft', 'Kunt u mij terugbellen, alstublieft?'], 'Kunt u mij terugbellen, alstublieft?'),
      recapStep('m06-l08', ['afspraak', 'bericht', 'keelpijn'], [
        { kind: 'fill_blank', sentence: 'Ik kan niet komen ___ koorts.', options: ['vanwege', 'onder', 'achter'], correctAnswer: 'vanwege' },
        { kind: 'reorder', tokens: ['afspraak', 'een', 'Ik', 'wil', 'maken.', 'graag'], correctAnswer: 'Ik wil graag een afspraak maken.' },
        { kind: 'speak', prompt: 'Zeg: *Met vriendelijke groet.*', targetNl: 'Met vriendelijke groet.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Kunt u een nieuwe tijd voorstellen?', options: ['Verzoek om herplanning', 'Weerbericht', 'Sportuitslag'], correctAnswer: 'Verzoek om herplanning' },
        { kind: 'fill_blank', sentence: '___ huisartsenpraktijk, (netjes)', options: ['Beste', 'Hé', 'Yo'], correctAnswer: 'Beste' },
      ]),
    ],
  })

  const L9 = lessonBase(8, {
    id: 'a2-m06-l09-task-appointment-phone',
    title: 'Task · Make or change a GP appointment (text chat)',
    lessonType: 'task',
    grammarTargets: ['a2.2-health-questions', 'a2.2-health-clarify'],
    vocabTargets: ['lemma-afspraak-m6', 'lemma-huisarts', 'lemma-keelpijn', 'lemma-herhalen', 'lemma-morgen-m6'],
    canDoStatements: ['I can follow a short reception chat and pick a suitable appointment time.'],
    steps: [
      previewStep('m06-l09', 'Context', [
        { word: 'afspraak', lemma: 'afspraak', en: 'appointment', emoji: '📅' },
        { word: 'huisarts', lemma: 'huisarts', en: 'GP', emoji: '👩‍⚕️' },
        { word: 'morgen', lemma: 'morgen-m6', en: 'tomorrow', emoji: '🌅' },
        { word: 'keelpijn', lemma: 'keelpijn', en: 'sore throat', emoji: '😷' },
        { word: 'herhalen', lemma: 'herhalen', en: 'repeat', emoji: '🔁' },
      ]),
      scenarioChat(
        'm06-l09-scenario',
        'Simulatie — balie (tekst)',
        [
          { speaker: 'Balie', nl: 'Goedemiddag, huisartsenpraktijk De Linde.', en: 'Good afternoon, GP practice De Linde.' },
          { speaker: 'U', nl: 'Goedemiddag. Ik wil graag een afspraak maken.', en: 'Good afternoon. I would like to make an appointment.' },
          { speaker: 'Balie', nl: 'Wat is het kort voor de huisarts? Koorts, pijn, of iets anders?', en: 'Briefly, what is it for? Fever, pain, or something else?' },
          { speaker: 'U', nl: 'Ik heb al drie dagen keelpijn en ik ben moe.', en: 'I have had a sore throat for three days and I am tired.' },
          { speaker: 'Balie', nl: 'We hebben morgen om half elf of vrijdag om drie uur. Wat past u beter?', en: 'We have tomorrow at half past ten or Friday at three. Which suits you better?' },
          { speaker: 'U', nl: 'Morgen om half elf past goed. Dank u wel.', en: 'Tomorrow at half past ten works well. Thank you.' },
        ],
        [
          MC('m06-l09-s1', 'Waar belt u naartoe?', ['Een huisartsenpraktijk', 'Een zwembad', 'Een tankstation'], 'Een huisartsenpraktijk'),
          MC('m06-l09-s2', 'Wat wilt u?', ['Een afspraak maken', 'Een pizza', 'Een nieuwe auto'], 'Een afspraak maken'),
          MC('m06-l09-s3', 'Welke klachten noemt u?', ['Keelpijn en moe', 'Alleen blijdschap', 'Geen klachten'], 'Keelpijn en moe'),
          MC('m06-l09-s4', 'Welke twee tijden biedt de balie?', ['Morgen 10:30 en vrijdag 15:00', 'Alleen middernacht', 'Geen tijden'], 'Morgen 10:30 en vrijdag 15:00'),
          MC('m06-l09-s5', 'Wat kiest u?', ['Morgen half elf', 'Vrijdag drie uur', 'Geen van beide'], 'Morgen half elf'),
          MC('m06-l09-s6', 'Welke zin is het meest beleefd?', ['Dank u wel.', 'Doei.', 'Snel!'], 'Dank u wel.'),
        ]
      ),
      discoveryStep('m06-l09', 'Vaste zinnen', [
        { nl: 'Ik wil graag een afspraak maken.', en: 'I would like to make an appointment.', focus: 'open' },
        { nl: 'Wat past u beter?', en: 'Which suits you better?', focus: 'keuze' },
        { nl: 'Dat past goed.', en: 'That works well.', focus: 'bevestigen' },
        { nl: 'Kunt u dat herhalen?', en: 'Could you repeat that?', focus: 'herhalen' },
      ]),
      practiceLoop(
        'm06-l09-pl1',
        'Practice — 6×',
        ['afspraak', 'tijd', 'keelpijn'],
        [
          MC('m06-l09-a1', 'Natuurlijke opening', ['Goedemiddag, ik wil graag een afspraak.', 'Hé, luister eens!', 'Stilte.'], 'Goedemiddag, ik wil graag een afspraak.'),
          FB('m06-l09-a2', 'We hebben morgen om ___ elf. (half)', ['half', 'heel', 'kwart'], 'half'),
          RO('m06-l09-a3', ['goed.', 'past', 'Dat', 'Half', 'elf'], 'Half elf past goed.'),
          MC('m06-l09-a4', 'Als u twee opties hoort', ['Kies één tijd en bevestig', 'Zweeg voor altijd', 'Kies alles tegelijk'], 'Kies één tijd en bevestig'),
          MC('m06-l09-a5', 'Symptoom kort noemen', ['Ik heb keelpijn sinds gisteren.', 'Ik heb een raket.', 'Ik weet niets.'], 'Ik heb keelpijn sinds gisteren.'),
          MC('m06-l09-a6', 'Bevestigen', ['Dat past goed.', 'Dat is onmogelijk altijd.', 'Nee nooit.'], 'Dat past goed.'),
        ]
      ),
      practiceLoop(
        'm06-l09-pl2',
        'Variatie — 7×',
        ['balie', 'dank', 'morgen'],
        [
          MC('m06-l09-b1', '“Half elf” =', ['10:30', '11:30', '08:00'], '10:30'),
          FB('m06-l09-b2', '___ u wel. (beleefd bedanken)', ['Dank', 'Bon', 'Kaas'], 'Dank'),
          MC('m06-l09-b3', 'Als de tijd onduidelijk is', ['Kunt u dat herhalen, alstublieft?', 'Zwijg.', 'Schreeuw.'], 'Kunt u dat herhalen, alstublieft?'),
          RO('m06-l09-b4', ['maken.', 'een', 'afspraak', 'wil', 'ik', 'graag'], 'Ik wil graag een afspraak maken.'),
          MC('m06-l09-b5', 'Welke info vraagt de balie vaak eerst?', ['Waarvoor komt u? / klacht', 'Uw schoenmaat', 'Uw lievelingskleur'], 'Waarvoor komt u? / klacht'),
          MC('m06-l09-b6', 'Vrijdag drie uur =', ['15:00', '03:00', '12:00'], '15:00'),
          MC('m06-l09-b7', 'Slot in goede toon', ['Dank u wel, tot morgen.', 'Doei sukkel.', 'Niks.'], 'Dank u wel, tot morgen.'),
        ]
      ),
      speak('m06-l09-sp1', 'Zeg hardop', 'Ik wil graag een afspraak maken bij de huisarts.', ['Ik wil graag een afspraak maken bij de huisarts', 'ik wil graag een afspraak maken bij de huisarts'], 'Ik wil graag een afspraak maken bij de huisarts.'),
      speak('m06-l09-sp2', 'Zeg hardop', 'Morgen om half elf past goed voor mij.', ['Morgen om half elf past goed voor mij', 'morgen om half elf past goed voor mij'], 'Morgen om half elf past goed voor mij.'),
      speak('m06-l09-sp3', 'Zeg hardop', 'Kunt u dat herhalen, alstublieft?', ['Kunt u dat herhalen alstublieft', 'Kunt u dat herhalen, alstublieft?'], 'Kunt u dat herhalen, alstublieft?'),
      recapStep('m06-l09', ['afspraak', 'tijd', 'dank'], [
        { kind: 'fill_blank', sentence: 'Ik wil graag een ___ maken.', options: ['afspraak', 'feest', 'reis'], correctAnswer: 'afspraak' },
        { kind: 'reorder', tokens: ['goed.', 'past', 'Dat'], correctAnswer: 'Dat past goed.' },
        { kind: 'speak', prompt: 'Zeg: *Dank u wel.*', targetNl: 'Dank u wel.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Wat past u beter?', options: ['Keuze tussen opties', 'Weerbericht', 'Sport'], correctAnswer: 'Keuze tussen opties' },
        { kind: 'fill_blank', sentence: '___ elf = 10:30.', options: ['Half', 'Kwart', 'Heel'], correctAnswer: 'Half' },
      ]),
    ],
  })

  const L10 = lessonBase(9, {
    durationEstimate: 15,
    id: 'a2-m06-l10-task-pharmacy-follow-up',
    title: 'Task · After the visit · pharmacy pickup (text chat)',
    lessonType: 'task',
    grammarTargets: ['a2.2-health-modals', 'a2.2-health-clarify'],
    vocabTargets: ['lemma-apotheek', 'lemma-recept', 'lemma-medicijn', 'lemma-tablet', 'lemma-herhalen'],
    canDoStatements: ['I can confirm I have a prescription and ask how to take the medicine.'],
    steps: [
      previewStep('m06-l10', 'Context', [
        { word: 'apotheek', lemma: 'apotheek', en: 'pharmacy', emoji: '💊' },
        { word: 'recept', lemma: 'recept', en: 'prescription', emoji: '📋' },
        { word: 'medicijn', lemma: 'medicijn', en: 'medicine', emoji: '🧴' },
        { word: 'innemen', lemma: 'tablet', en: 'to take (medicine)', emoji: '💧' },
        { word: 'herhalen', lemma: 'herhalen', en: 'repeat', emoji: '🔁' },
      ]),
      scenarioChat(
        'm06-l10-scenario',
        'Simulatie — apotheek (tekst)',
        [
          { speaker: 'Apotheker', nl: 'Goedemiddag. Heeft u een recept voor mij?', en: 'Good afternoon. Do you have a prescription for me?' },
          { speaker: 'U', nl: 'Ja, van de huisarts. Het is voor mijn keel.', en: 'Yes, from the GP. It is for my throat.' },
          { speaker: 'Apotheker', nl: 'Prima. U neemt drie keer per dag één tablet, na het eten.', en: 'Fine. You take one tablet three times a day, after food.' },
          { speaker: 'U', nl: 'Kunt u dat nog een keer zeggen? Voor of na het eten?', en: 'Could you say that again? Before or after food?' },
          { speaker: 'Apotheker', nl: 'Na het eten, met water. Bij twijfel: lees de bijsluiter.', en: 'After food, with water. If in doubt, read the leaflet.' },
          { speaker: 'U', nl: 'Dank u wel. Dat is duidelijk.', en: 'Thank you. That is clear.' },
        ],
        [
          MC('m06-l10-s1', 'Waar is het gesprek?', ['Bij de apotheek', 'In de bioscoop', 'Op het strand'], 'Bij de apotheek'),
          MC('m06-l10-s2', 'Wat geeft u af?', ['Een recept van de huisarts', 'Een broodje', 'Een ticket'], 'Een recept van de huisarts'),
          MC('m06-l10-s3', 'Waarvoor is het medicijn?', ['Voor de keel', 'Voor de auto', 'Voor de tuin'], 'Voor de keel'),
          MC('m06-l10-s4', 'Hoe vaak per dag?', ['Drie keer per dag', 'Eén keer per jaar', 'Nooit'], 'Drie keer per dag'),
          MC('m06-l10-s5', 'Na het eten of ervoor?', ['Na het eten', 'Tijdens zwemmen', 'Voor het ontbijt altijd'], 'Na het eten'),
          MC('m06-l10-s6', 'Wat doet u bij twijfel?', ['Bijsluiter lezen', 'Alles gokken', 'Niets lezen'], 'Bijsluiter lezen'),
        ]
      ),
      discoveryStep('m06-l10', 'Nutige vragen', [
        { nl: 'Heeft u een recept voor mij?', en: 'Do you have a prescription for me?', focus: 'recept' },
        { nl: 'Kunt u dat nog een keer zeggen?', en: 'Could you say that again?', focus: 'herhalen' },
        { nl: 'Voor of na het eten?', en: 'Before or after food?', focus: 'timing' },
        { nl: 'Met water innemen.', en: 'Take with water.', focus: 'inname' },
      ]),
      practiceLoop(
        'm06-l10-pl1',
        'Practice — 6×',
        ['tablet', 'recept', 'eten'],
        [
          MC('m06-l10-a1', 'Beleefd beginnen', ['Goedemiddag, ik heb een recept.', 'Hé, geef medicijn.', 'Stilte.'], 'Goedemiddag, ik heb een recept.'),
          FB('m06-l10-a2', 'Drie ___ per dag. (frequentie)', ['keer', 'katten', 'bussen'], 'keer'),
          RO('m06-l10-a3', ['eten.', 'het', 'na', 'het', 'Neem'], 'Neem het na het eten.'),
          MC('m06-l10-a4', 'Als instructie onduidelijk is', ['Kunt u dat herhalen?', 'Zwijg voor altijd.', 'Schreeuw harder.'], 'Kunt u dat herhalen?'),
          MC('m06-l10-a5', '“Bijsluiter” helpt bij', ['uitleg over medicijn', 'recept voor brood', 'weerbericht'], 'uitleg over medicijn'),
          MC('m06-l10-a6', 'Dank + bevestigen', ['Dank u wel, dat is duidelijk.', 'Doei.', 'Ik begrijp nooit iets.'], 'Dank u wel, dat is duidelijk.'),
        ]
      ),
      practiceLoop(
        'm06-l10-pl2',
        'Variatie — 7×',
        ['apotheek', 'water', 'medicijn'],
        [
          MC('m06-l10-b1', '“Per dag” betekent', ['elke dag', 'elke eeuw', 'eenmalig'], 'elke dag'),
          FB('m06-l10-b2', '___ het eten (tegenover “voor”)', ['Na', 'Boven', 'Onder'], 'Na'),
          MC('m06-l10-b3', 'Veilig: innemen met', ['water', 'cola met alcohol mix', 'niets'], 'water'),
          RO('m06-l10-b4', ['dag.', 'per', 'één', 'tablet', 'Neem'], 'Neem één tablet per dag.'),
          MC('m06-l10-b4b', 'Recept komt meestal van', ['de huisarts of specialist', 'de bakker', 'de kapper'], 'de huisarts of specialist'),
          MC('m06-l10-b5', 'Klant vraagt om herhaling — goede reden', ['onduidelijke instructie', 'mooi weer', 'korting'], 'onduidelijke instructie'),
          MC('m06-l10-b6', 'Welke zin sluit netjes af?', ['Dank u wel.', 'Klaar weg.', 'Snel.'], 'Dank u wel.'),
          MC('m06-l10-b7', '“Dat is duidelijk” =', ['ik snap het', 'ik snap niets', 'ik ben boos'], 'ik snap het'),
        ]
      ),
      speak('m06-l10-sp1', 'Zeg hardop', 'Ja, ik heb een recept van de huisarts.', ['Ja ik heb een recept van de huisarts', 'Ja, ik heb een recept van de huisarts.'], 'Ja, ik heb een recept van de huisarts.'),
      speak('m06-l10-sp2', 'Zeg hardop', 'Kunt u dat nog een keer zeggen, alstublieft?', ['Kunt u dat nog een keer zeggen alstublieft', 'Kunt u dat nog een keer zeggen, alstublieft?'], 'Kunt u dat nog een keer zeggen, alstublieft?'),
      speak('m06-l10-sp3', 'Zeg hardop — rustig afsluiten', 'Dank u wel. Dat is duidelijk.', ['Dank u wel dat is duidelijk', 'Dank u wel. Dat is duidelijk.'], 'Dank u wel. Dat is duidelijk.'),
      recapStep('m06-l10', ['recept', 'tablet', 'apotheek'], [
        { kind: 'fill_blank', sentence: 'Neem de tablet ___ het eten.', options: ['na', 'boven', 'onder'], correctAnswer: 'na' },
        { kind: 'reorder', tokens: ['voor', 'mij?', 'recept', 'een', 'Heeft', 'u'], correctAnswer: 'Heeft u een recept voor mij?' },
        { kind: 'speak', prompt: 'Zeg: *Met water, alstublieft.*', targetNl: 'Met water, alstublieft.', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'Na het eten, met water.', options: ['Inname-instructie', 'Busdienst', 'Film'], correctAnswer: 'Inname-instructie' },
        { kind: 'fill_blank', sentence: 'Kunt u dat ___, alstublieft?', options: ['herhalen', 'eten', 'kopen'], correctAnswer: 'herhalen' },
      ]),
    ],
  })

  const L11 = lessonBase(10, {
    durationEstimate: 15,
    id: 'a2-m06-l11-review-health-module',
    title: 'Review · Health & doctor visits',
    lessonType: 'review',
    grammarTargets: ['a2.2-health-symptoms', 'a2.2-health-clarify', 'a2.2-health-perfectum-light'],
    vocabTargets: ['lemma-hoofdpijn', 'lemma-keelpijn', 'lemma-huisarts', 'lemma-apotheek', 'lemma-medicijn'],
    canDoStatements: ['I can mix symptoms, appointments, and medicine phrases in short exercises.'],
    steps: [
      previewStep('m06-l11', 'Alles bij elkaar — 5 woorden', [
        { word: 'symptoom', lemma: 'pijn', en: 'symptom (idea)', emoji: '🩺' },
        { word: 'huisarts', lemma: 'huisarts', en: 'GP', emoji: '👩‍⚕️' },
        { word: 'apotheek', lemma: 'apotheek', en: 'pharmacy', emoji: '💊' },
        { word: 'sinds', lemma: 'sinds', en: 'since', emoji: '📌' },
        { word: 'herhalen', lemma: 'herhalen', en: 'repeat', emoji: '🔁' },
      ]),
      listeningStep(
        'm06-l11',
        'Luister — mini-gesprek (herkenning)',
        [
          { speaker: 'Huisarts', nl: 'Sinds wanneer heeft u deze hoofdpijn?', en: 'Since when have you had this headache?' },
          { speaker: 'Patiënt', nl: 'Sinds maandag. Ik heb ook slecht geslapen.', en: 'Since Monday. I also slept badly.' },
          { speaker: 'Huisarts', nl: 'U moet rust nemen en veel water drinken.', en: 'You must rest and drink plenty of water.' },
          { speaker: 'Patiënt', nl: 'Begrijpelijk. Dank u wel.', en: 'Understood. Thank you.' },
        ],
        [
          MC('m06-l11-l1', 'Waar is het gesprek?', ['Bij de huisarts', 'In de disco', 'Op school'], 'Bij de huisarts'),
          MC('m06-l11-l2', 'Welk symptoom?', ['Hoofdpijn', 'Buikpijn van pizza', 'Geen klacht'], 'Hoofdpijn'),
          MC('m06-l11-l3', 'Welke openingsvraag hoort bij tijd?', ['Sinds wanneer heeft u …?', 'Wat is uw schoenmaat?', 'Waar woont u?'], 'Sinds wanneer heeft u …?'),
          MC('m06-l11-l4', 'Wat zegt de patiënt over slapen?', ['Slecht geslapen', 'Perfect geslapen', 'Niet geslapen nooit'], 'Slecht geslapen'),
          MC('m06-l11-l5', 'Advies van de arts', ['Rust + water drinken', 'Hardlopen zonder water', 'Niets'], 'Rust + water drinken'),
          MC('m06-l11-l6', '“Slecht geslapen” = perfectum?', ['Ja, ervaring in het verleden', 'Nee, toekomst', 'Alleen een kleur'], 'Ja, ervaring in het verleden'),
          MC('m06-l11-l7', 'Welke reactie is calm en netjes?', ['Begrijpelijk. Dank u wel.', 'Ik wil vechten.', 'Tot nooit.'], 'Begrijpelijk. Dank u wel.'),
        ]
      ),
      practiceLoop(
        'm06-l11-pl1',
        'Mix — 7×',
        ['hoofdpijn', 'sinds', 'rust'],
        [
          MC('m06-l11-a1', 'Natuurlijke klacht', ['Ik heb al twee dagen hoofdpijn.', 'Ik heb een nieuwe auto.', 'Het regent altijd.'], 'Ik heb al twee dagen hoofdpijn.'),
          FB('m06-l11-a2', 'Sinds gisteren ___ ik keelpijn. (hebben)', ['heb', 'ben', 'word'], 'heb'),
          RO('m06-l11-a3', ['alstublieft?', 'herhalen,', 'dat', 'Kunt', 'u'], 'Kunt u dat herhalen, alstublieft?'),
          MC('m06-l11-a4', 'Bij apotheek: eerst vaak', ['Recept laten zien', 'Gratis ijs', 'Dansles'], 'Recept laten zien'),
          MC('m06-l11-a5', '“Ik begrijp het niet” gebruikt u om', ['hulp te vragen', 'te schreeuwen', 'te eindigen'], 'hulp te vragen'),
          MC('m06-l11-a6', '“Hoe lang al?” vraagt naar', ['duur', 'kleur', 'adres'], 'duur'),
          MC('m06-l11-a7', 'Beleefd slot bij balie', ['Dank u wel.', 'Later sukkel.', 'Niks.'], 'Dank u wel.'),
        ]
      ),
      practiceLoop(
        'm06-l11-pl2',
        'Mix — 7×',
        ['medicijn', 'tablet', 'eten'],
        [
          MC('m06-l11-b1', 'Na het eten betekent', ['nadat je gegeten hebt', 'voor je geboren werd', 'tijdens examen'], 'nadat je gegeten hebt'),
          FB('m06-l11-b2', 'Twee ___ per dag. (keer)', ['keer', 'honden', 'deuren'], 'keer'),
          MC('m06-l11-b3', 'Welke zin hoort bij apotheek?', ['Heeft u een recept voor mij?', 'Waar is het zwembad?', 'Ik koop brood.'], 'Heeft u een recept voor mij?'),
          RO('m06-l11-b4', ['lekker.', 'niet', 'voel', 'Ik', 'me'], 'Ik voel me niet lekker.'),
          MC('m06-l11-b5', '“U mag vandaag rust nemen” ≈', ['U mag uitrusten', 'U moet werken', 'U mag niet slapen'], 'U mag uitrusten'),
          MC('m06-l11-b6', 'Afspraak: kies beleefd', ['Ik wil graag een afspraak maken.', 'Kom hier nu.', 'Geen zin.'], 'Ik wil graag een afspraak maken.'),
          MC('m06-l11-b7', 'Kort advies herkennen', ['Drink water en rust uit.', 'Eet alleen suiker.', 'Ren een marathon.'], 'Drink water en rust uit.'),
        ]
      ),
      practiceLoop(
        'm06-l11-pl3',
        'Laatste ronde — 6×',
        ['koorts', 'keelpijn', 'begrijpen'],
        [
          MC('m06-l11-c1', 'Koorts =', ['verhoging / warm worden', 'koud altijd', 'een kleur'], 'verhoging / warm worden'),
          FB('m06-l11-c2', 'Ik heb ___ . (keel)', ['keelpijn', 'zonpijn', 'deurpijn'], 'keelpijn'),
          MC('m06-l11-c3', 'Langzamer praten vragen', ['Kunt u langzamer praten?', 'Praat harder!', 'Zwijg!'], 'Kunt u langzamer praten?'),
          MC('m06-l11-c4', '“Vannacht slecht geslapen” — tijd', ['vorige nacht', 'volgend jaar', 'middag vandaag'], 'vorige nacht'),
          RO('m06-l11-c5', ['dagen.', 'twee', 'al', 'hoofdpijn', 'Ik', 'heb'], 'Ik heb al twee dagen hoofdpijn.'),
          MC('m06-l11-c6', 'Calm tip bij stress op spreekuur', ['Korte zinnen; één vraag tegelijk', 'Schreeuw alles', 'Zwijg altijd'], 'Korte zinnen; één vraag tegelijk'),
        ]
      ),
      speak('m06-l11-sp1', 'Zeg hardop', 'Ik voel me niet lekker en ik heb koorts.', ['Ik voel me niet lekker en ik heb koorts', 'ik voel me niet lekker en ik heb koorts'], 'Ik voel me niet lekker en ik heb koorts.'),
      speak('m06-l11-sp2', 'Zeg hardop', 'Twee keer per dag, na het eten, met water.', ['Twee keer per dag na het eten met water', 'Twee keer per dag, na het eten, met water.'], 'Twee keer per dag, na het eten, met water.'),
      recapStep('m06-l11', ['review', 'gezondheid', 'rust'], [
        { kind: 'fill_blank', sentence: '___ wanneer heeft u klachten?', options: ['Sinds', 'Tot', 'Zonder'], correctAnswer: 'Sinds' },
        { kind: 'reorder', tokens: ['pijn?', 'doet', 'het', 'Waar'], correctAnswer: 'Waar doet het pijn?' },
        { kind: 'speak', prompt: 'Zeg: *Heeft u een recept voor mij?*', targetNl: 'Heeft u een recept voor mij?', mockPass: true },
        { kind: 'listen_mcq', question: 'Snippet:', snippetNl: 'U moet rust nemen.', options: ['Advies', 'Groet', 'Weer'], correctAnswer: 'Advies' },
        { kind: 'fill_blank', sentence: 'Ik heb slecht ___. (slapen)', options: ['geslapen', 'gegeten', 'gewerkt'], correctAnswer: 'geslapen' },
        {
          kind: 'listen_mcq',
          question: 'Waar gaat deze module vooral over?',
          snippetNl: 'Ik wil graag een afspraak maken bij de huisarts.',
          options: ['Gezondheid, arts, apotheek, afspraak', 'Alleen sport', 'Alleen politiek'],
          correctAnswer: 'Gezondheid, arts, apotheek, afspraak',
        },
      ]),
    ],
  })

  return [L2, L3, L4, L5, L6, L7, L8, L9, L10, L11]
}
