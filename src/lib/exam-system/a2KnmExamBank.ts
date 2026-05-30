import { knmIllustrationIdForVignette } from '@/lib/exam-prep/kmn/knmIllustrationRegistry'
import { pushKnmSlideDeckPack } from './knmSlideDeckPack'
import { sampleUniqueIndices, seededShuffle } from './a2SpeakingExamSessionSample'
import type { KnmMcqItem } from './knmMcqTypes'

/** KNM A2 domeinen — verdeeld voor examen (gelijk aantal per domein). */
export const KNMA2_EXAM_CATEGORIES = [
  'zorg_gezondheid',
  'werk_inkomen',
  'onderwijs_opvoeding',
  'wonen_buurt',
  'overheid_recht',
  'integratie_cultuur',
  'veiligheid_hulp',
  'geld_belasting_verzekering',
] as const

export type KnmA2ExamCategory = (typeof KNMA2_EXAM_CATEGORIES)[number]

export type KnmMcqBankEntry = KnmMcqItem & { category: KnmA2ExamCategory }

const EXAM_MCQ_COUNT = 40
const EXAM_PER_CATEGORY = 5

/** Official-style KNM A2: always four answer choices (A–D). */
export const KNM_A2_MCQ_OPTION_COUNT = 4

const WRONG_A = 'In Nederland geldt dit altijd zonder uitzondering voor iedereen, in elke situatie.'
const WRONG_B = 'Dit regelt uitsluitend een buitenlandse ambassade; Nederlandse regels spelen geen rol.'
const WRONG_C = 'Je hoeft je nergens voor te melden en er zijn geen officiële procedures.'

/** Correct + plausible distractors per vignette slot (must match {@link VIGNETTE_QUADS} order). */
type KnmVignetteAnswers = {
  good: string
  wrongs: readonly [string, string, string, string?, string?]
}

/**
 * Scenario-first options: facets only flavour the question text; answers follow the concrete situation.
 * Index 0–3 aligns with {@link VIGNETTE_QUADS}[category][slot].
 */
const KNM_VIGNETTE_ANSWERS: Record<
  KnmA2ExamCategory,
  readonly [KnmVignetteAnswers, KnmVignetteAnswers, KnmVignetteAnswers, KnmVignetteAnswers]
> = {
  zorg_gezondheid: [
    {
      good: 'Bel de huisarts voor advies; bij levensgevaar bel je 112.',
      wrongs: [
        'Bel 112 voor elke lichte koorts, ook zonder spoed.',
        'Je hoeft nooit naar de huisarts; alleen het ziekenhuis telt.',
        'Geef geen drinken en wacht een week zonder contact.',
      ],
    },
    {
      good: 'Bel de huisartsenpost buiten kantooruren of volg advies van je huisarts; 112 bij levensgevaar.',
      wrongs: [
        'Ga altijd direct naar 112, ook zonder levensgevaar.',
        'Je mag alleen naar de apotheek, zonder contact met de huisarts.',
        'Wacht tot de pijn vanzelf weg is zonder hulp.',
      ],
    },
    {
      good: 'Vraag uitleg en check vergoeding en eigen risico voordat je instemt met onderzoek.',
      wrongs: [
        'Teken meteen zonder vragen; uitleg is niet nodig.',
        'Stop alle medicijnen zelf zonder overleg met de arts.',
        'Bel 112 voor een gewone doorverwijzing.',
      ],
    },
    {
      good: 'Los het op met apotheek en huisarts over recept en medicijnen.',
      wrongs: [
        'Stop je medicijn zelf; de apotheek mag niet helpen.',
        'Koop hetzelfde medicijn in het buitenland zonder recept.',
        'Bel de politie voor een nieuw recept.',
      ],
    },
  ],
  werk_inkomen: [
    {
      good: 'Meld je ziek bij je werkgever zo snel mogelijk volgens je contract of CAO.',
      wrongs: [
        'Je meldt ziek alleen op sociale media; dat is genoeg.',
        'Je gaat altijd naar werk, ook met koorts.',
        'Je hoeft de werkgever nooit te bellen bij ziekte.',
      ],
    },
    {
      good: 'Lees contract en CAO; vraag uitleg over loon en uren voordat je tekent.',
      wrongs: [
        'Je tekent direct zonder het contract te lezen.',
        'Mondelinge beloftes zijn altijd genoeg; papier niet nodig.',
        'Je mag nooit vragen stellen over je salaris.',
      ],
    },
    {
      good: 'Praat met werkgever of HR; noteer wat er gebeurde; zoek advies bij onrecht.',
      wrongs: [
        'Je schreeuwt op kantoor; dat is de normale eerste stap.',
        'Je doet niets; discriminatie mag je niet melden.',
        'Je stopt met werken zonder iets te zeggen dezelfde dag.',
      ],
    },
    {
      good: 'Lees de brief; vraag uitleg over opzegtermijn en wat er daarna gebeurt.',
      wrongs: [
        'Je gooit de brief weg; dan vervalt het contract.',
        'Je werkgever mag je loon zomaar stoppen zonder regels.',
        'Je hoeft geen afspraken na te komen bij einde contract.',
      ],
    },
  ],
  onderwijs_opvoeding: [
    {
      good: 'Meld verzuim bij school en plan een gesprek met de docent.',
      wrongs: [
        'De school hoeft verzuim niet te weten.',
        'Alleen het kind meldt zichzelf; ouders doen niets.',
        'Je wacht een maand zonder contact met school.',
      ],
    },
    {
      good: 'Kom op afspraak en praat samen over leren en welbevinden van je kind.',
      wrongs: [
        'Alleen de leraar praat; ouders mogen niet reageren.',
        'Je hoeft niet te komen; het gesprek is vrijblijvend.',
        'Je stuurt alleen een boze e-mail zonder gesprek.',
      ],
    },
    {
      good: 'Schrijf je kind in bij de nieuwe school en geef je adres door bij de gemeente.',
      wrongs: [
        'Je hoeft verhuizing niet door te geven als je in dezelfde stad blijft.',
        'Het kind gaat niet meer naar school; dat mag altijd.',
        'Alleen de oude school regelt alles; gemeente hoort er niet bij.',
      ],
    },
    {
      good: 'Vraag de school om taalhulp of ondersteuning en bespreek wat thuis helpt.',
      wrongs: [
        'Je negeert het bericht; de school lost het alleen op zonder ouders.',
        'Je haalt je kind meteen van school zonder overleg.',
        'Je eist dat alle lessen in het Engels zijn, altijd.',
      ],
    },
  ],
  wonen_buurt: [
    {
      good: 'Praat rustig met de buren; volg huisregels; meld aanhoudende overlast aan verhuurder of gemeente.',
      wrongs: [
        'Je filmt de buren en zet het online zonder te praten.',
        'Je stopt met huurbetalen tot de muziek stopt.',
        'Je belt 112 voor harde muziek zonder spoed.',
      ],
    },
    {
      good: 'Meld het lek schriftelijk aan de verhuurder; maak foto’s; regel huur en verhuizing apart volgens regels.',
      wrongs: [
        'Je stopt met huurbetalen tot het plafond droog is.',
        'Je repareert het plafond zelf zonder de verhuurder te informeren.',
        'Je meldt alleen bij de politie, niet bij de verhuurder.',
      ],
    },
    {
      good: 'Lees het huurcontract over borg en kosten; stel vragen voordat je tekent of betaalt.',
      wrongs: [
        'Je tekent zonder te lezen; kleine lettertjes tellen niet.',
        'Je betaalt contant zonder bon of contract.',
        'Je mag nooit vragen stellen over servicekosten.',
      ],
    },
    {
      good: 'Geef je nieuwe adres door bij de gemeente en update verhuurder en post.',
      wrongs: [
        'Je geeft je adres niet door omdat je in dezelfde stad blijft.',
        'Alleen je buren hoeven het te weten, niet de gemeente.',
        'Je wacht een jaar met inschrijving; dat is gebruikelijk.',
      ],
    },
  ],
  overheid_recht: [
    {
      good: 'Neem geldig ID mee en volg de instructies op het stembureau.',
      wrongs: [
        'Je mag stemmen zonder identiteitsbewijs.',
        'Alleen inwoners van Den Haag mogen landelijk stemmen.',
        'Je kunt je stem verkopen als je niet gaat.',
      ],
    },
    {
      good: 'Maak tijdig een afspraak bij de gemeente voor paspoort of ID met de juiste papieren.',
      wrongs: [
        'Een paspoort regel je alleen via een buitenlandse bank.',
        'Je reist altijd zonder document; dat is toegestaan.',
        'Je wacht tot het document verlopen is en dan pas aanvragen.',
      ],
    },
    {
      good: 'Vraag hulp bij de gemeente of via rijksoverheid.nl; neem ID mee naar het loket.',
      wrongs: [
        'Je koopt een DigiD-code op een onbekende website.',
        'Je deelt je wachtwoord met de buurman.',
        'Je doet niets; online regelen lukt nooit meer.',
      ],
    },
    {
      good: 'In Nederland maken gekozen volksvertegenwoordigers wetten; de rechter is onafhankelijk (kort).',
      wrongs: [
        'De koning maakt elke dag alle wetten alleen.',
        'Er zijn geen verkiezingen in Nederland.',
        'De gemeenteraad is hetzelfde als de Tweede Kamer landelijk.',
      ],
    },
  ],
  integratie_cultuur: [
    {
      good: 'Meld je aan bij een club of activiteit en praat met buren over afspraken.',
      wrongs: [
        'Je moet altijd thuis blijven; meedoen is verboden.',
        'Je hoeft geen Nederlands te leren om mee te doen.',
        'Je mag nooit met buren praten in Nederland.',
      ],
    },
    {
      good: 'Koningsdag is een feestdag met oranje; houd rekening met buren en regels.',
      wrongs: [
        'Koningsdag is een stille rouwdag zonder activiteiten.',
        'Je mag overal onbeperkt lawaai maken zonder grenzen.',
        'Koningsdag is dezelfde dag als 5 mei (bevrijding), altijd.',
      ],
    },
    {
      good: 'Check ophaaldagen bij gemeente of verhuurder en sorteer afval volgens de regels.',
      wrongs: [
        'Alles mag in één bak; scheiden is niet nodig.',
        'Je mag afval maanden buiten laten staan zonder probleem.',
        'Je belt 112 als de container een dag vol is.',
      ],
    },
    {
      good: 'Praat met trainer of school; help je kind; geen geweld of online shaming.',
      wrongs: [
        'Je kind moet terugvechten op het veld; dat is normaal.',
        'Je filmt andere kinderen en plaatst het meteen online.',
        'Je doet niets; pesten hoort bij sport.',
      ],
    },
  ],
  veiligheid_hulp: [
    {
      good: 'Waarschuw anderen; bel 112 bij brand of direct gevaar en ga naar een veilige plek.',
      wrongs: [
        'Je loopt naar de rook om te kijken zonder te bellen.',
        'Je belt 112 voor een verloren concertkaartje.',
        'Je doet niets; brandlucht is altijd onschuldig.',
      ],
    },
    {
      good: 'Blijf op veilige afstand; bel de politie (niet-spoed); 112 alleen bij direct gevaar.',
      wrongs: [
        'Je gaat tussen de ruziënde mensen staan om te filmen.',
        'Je belt altijd 112 voor geschreeuw zonder letsel.',
        'Je rent weg zonder iemand te waarschuwen of te melden.',
      ],
    },
    {
      good: 'Bij ernstig bloeden en twijfel over spoed: 112; anders laat je de wond medisch bekijken.',
      wrongs: [
        'Je fietst verder; het bloed stopt altijd vanzelf.',
        'Je belt alleen de politie voor aangifte, geen medische hulp.',
        'Je gaat alleen naar de apotheek zonder de wond te laten zien.',
      ],
    },
    {
      good: 'Bel de huisartsenpost of volg het nachtadvies van je huisarts; 112 alleen bij levensgevaar.',
      wrongs: [
        'Je belt 112 voor elke koorts bij een baby die nog drinkt.',
        'Je doet een aangifte bij de politie in plaats van medische hulp.',
        'Je wacht een week zonder iets te doen bij koorts.',
      ],
    },
  ],
  geld_belasting_verzekering: [
    {
      good: 'Open de brief, noteer de datum en reageer op tijd aan de Belastingdienst.',
      wrongs: [
        'Je gooit de blauwe envelop weg; dan vervalt de aanslag.',
        'Belasting betalen is vrijwillig zonder gevolgen.',
        'Je wacht vijf jaar met reageren.',
      ],
    },
    {
      good: 'Noteer gegevens van het ongeval, bel je verzekeraar en bewaar foto’s en bonnen.',
      wrongs: [
        'Je meldt schade pas na vijf jaar bij de verzekeraar.',
        'Je vertelt alleen vrienden; de verzekeraar hoeft het niet te weten.',
        'Je reparatieert zelf zonder melding en vraagt later geld terug.',
      ],
    },
    {
      good: 'Bewaar bonnetjes en declaraties volgens de afspraken met je werkgever.',
      wrongs: [
        'Je gooit alle bonnen weg; declareren kan zonder bewijs.',
        'Je mag bonnen verzinnen; dat is gebruikelijk.',
        'Je werkgever betaalt alles zonder administratie.',
      ],
    },
    {
      good: 'Lees de brief, vergelijk polissen en bel je verzekeraar met vragen voor je overstapt.',
      wrongs: [
        'Je zegt de verzekering op zonder de brief te lezen.',
        'Premie stijgt nooit; je hoeft niets te doen.',
        'Je betaalt dubbel bij twee verzekeraars zonder te kijken.',
      ],
    },
  ],
}

function pickScenarioWrongs(
  pool: readonly (string | undefined)[],
  seed: number,
  good: string,
): [string, string, string] {
  const candidates = pool.filter((w): w is string => Boolean(w) && w !== good)
  const out: string[] = []
  for (let step = 0; step < candidates.length * 2 && out.length < 3; step += 1) {
    const w = candidates[(seed + step) % candidates.length]!
    if (!out.includes(w)) out.push(w)
  }
  while (out.length < 3) out.push(WRONG_A)
  return [out[0]!, out[1]!, out[2]!]
}

function knmMcqFourOptions(good: string, wrongs: string[]): KnmMcqItem['options'] {
  if (wrongs.length < 3) {
    throw new Error('KNM A2: need 3 distractors for a four-option MCQ')
  }
  return [
    { id: 'a', label: good },
    { id: 'b', label: wrongs[0]! },
    { id: 'c', label: wrongs[1]! },
    { id: 'd', label: wrongs[2]! },
  ]
}

type VignetteFn = (a: string, b: string) => { questionNl: string; audioScriptNl: string }

/** Facets only vary which items are generated; the stem stays one concrete A2 scenario. */
function knmVignette(questionNl: string, audioScriptNl: string): VignetteFn {
  return (_a, _b) => ({ questionNl, audioScriptNl })
}

/** Concrete tijd/plaats-situaties (zoals voorbeeldexamen) — geen losse thema-faceten in de vraagtekst. */
const VIGNETTE_QUADS: Record<KnmA2ExamCategory, readonly [VignetteFn, VignetteFn, VignetteFn, VignetteFn]> = {
  zorg_gezondheid: [
    knmVignette(
      'Het is dinsdagochtend en je kind heeft 38,5 °C en een lichte verkoudheid, maar drinkt en speelt nog. Wat doe je meestal als eerste?',
      'Dinsdagochtend: kind met lichte koorts, drinkt nog. Wat doe je als eerste?',
    ),
    knmVignette(
      'Je partner heeft ’s avonds buiten kantooruren pijn en wil meteen naar het ziekenhuis, maar het lijkt niet levensbedreigend. Wat past het meest bij de gebruikelijke route in Nederland?',
      '’s Avonds pijn, niet duidelijk spoed. Wat is de gebruikelijke route?',
    ),
    knmVignette(
      'De huisarts stuurt je door voor onderzoek en geeft uitleg. Wat is verstandig voordat je ergens mee instemt?',
      'Doorverwijzing door de huisarts. Wat check je eerst?',
    ),
    knmVignette(
      'Je gebruikt chronisch medicijn en de apotheek belt over je recept. Waar los je dit in de regel mee op?',
      'Apotheek belt over je chronische medicijn en recept. Waar los je het op?',
    ),
  ],
  werk_inkomen: [
    knmVignette(
      'Je wordt maandagochtend wakker met koorts en kunt echt niet werken. Je baas verwacht je om negenen. Wat moet je doorgaans als eerste regelen?',
      'Maandagochtend ziek, kunt niet werken. Wat regel je eerst?',
    ),
    knmVignette(
      'Je hebt net een baan aangeboden gekregen en krijgt een stapeltje papier. Wat is slim om te checken voordat je tekent?',
      'Nieuwe baan, papieren om te tekenen. Wat check je eerst?',
    ),
    knmVignette(
      'Op kantoor voel je je oneerlijk behandeld vanwege je afkomst. Wat is een normale eerste stap in Nederland?',
      'Oneerlijk behandeld op werk. Wat doe je als eerste?',
    ),
    knmVignette(
      'Je contract loopt bijna af en je werkgever stuurt een brief. Hoe pak je dit het beste aan?',
      'Contract loopt af, brief van werkgever. Hoe pak je het aan?',
    ),
  ],
  onderwijs_opvoeding: [
    knmVignette(
      'Je zoon mist drie dagen achter elkaar school zonder bericht. De school belt. Wat is gebruikelijk om nu te doen?',
      'Kind mist drie dagen school. De school belt. Wat doe je?',
    ),
    knmVignette(
      'Je hebt volgende week een gesprek op school over de cijfers. Wat hoort daar goed bij?',
      'Gesprek op school over cijfers. Wat hoort erbij?',
    ),
    knmVignette(
      'Je verhuist naar een andere gemeente en je kind moet van school wisselen. Wat is meestal de juiste volgorde?',
      'Verhuizing, kind moet van school. Wat is de juiste volgorde?',
    ),
    knmVignette(
      'De leraar meldt dat je dochter moeite heeft met Nederlands. Wat is een logische eerste stap?',
      'School meldt moeite met Nederlands. Wat doe je eerst?',
    ),
  ],
  wonen_buurt: [
    knmVignette(
      'Het is halverwege de avond en je hoort nog steeds harde muziek door de muur, terwijl je morgen vroeg op moet. Wat doe je het liefst als eerste?',
      '’s Avonds harde muziek bij de buren. Wat doe je eerst?',
    ),
    knmVignette(
      'Je ziet een natte plek op het plafond na een regenbui. Je belt de verhuurder. Wat is meestal de verstandige volgorde?',
      'Nat plafond na regen. Je belt de verhuurder. Wat is verstandig?',
    ),
    knmVignette(
      'Je sleutels zijn net binnen en je leest de kleine lettertjes in het huurcontract. Wat is verstandig voordat je tekent of betaalt?',
      'Nieuwe sleutels, huurcontract lezen. Wat is verstandig?',
    ),
    knmVignette(
      'Aan het eind van de maand verhuis je naar een andere straat in dezelfde stad. Wat moet je vaak niet vergeten?',
      'Verhuizing binnen dezelfde stad. Wat mag je niet vergeten?',
    ),
  ],
  overheid_recht: [
    knmVignette(
      'Je stemt voor het eerst bij de Tweede Kamerverkiezingen en staat in de rij met je stembiljet. Wat moet je meenemen?',
      'Eerste keer stemmen voor de Tweede Kamer. Wat neem je mee?',
    ),
    knmVignette(
      'Je paspoort verloopt over twee maanden en je wilt op reis. Wat is gebruikelijk om te regelen?',
      'Paspoort verloopt bijna, je wilt reizen. Wat regel je?',
    ),
    knmVignette(
      'DigiD werkt niet en je moet iets online regelen bij de gemeente. Waar begin je het best?',
      'DigiD werkt niet, je moet online bij de gemeente. Waar begin je?',
    ),
    knmVignette(
      'In de krant lees je een discussie over de Tweede Kamer en de rechter. Wat klopt in grote lijnen in Nederland?',
      'Discussie over politiek en rechters in Nederland. Wat klopt in grote lijnen?',
    ),
  ],
  integratie_cultuur: [
    knmVignette(
      'Je bent nieuw in de buurt en wilt graag meedoen. Wat is een normale manier om aan te sluiten?',
      'Nieuw in de buurt, je wilt meedoen. Hoe sluit je aan?',
    ),
    knmVignette(
      'Het is 27 april en de straat is druk en oranje. Wat hoort bij deze dag in Nederland?',
      '27 april, oranje en druk op straat. Welke dag is het?',
    ),
    knmVignette(
      'Je container wordt niet geleegd. Wat is meestal de nette aanpak?',
      'Je afvalcontainer wordt niet geleegd. Wat doe je?',
    ),
    knmVignette(
      'Je kind wordt uitgelachen op het voetbalveld om de taal. Wat is een redelijke eerste stap?',
      'Kind wordt uitgelachen op voetbal om de taal. Wat doe je eerst?',
    ),
  ],
  veiligheid_hulp: [
    knmVignette(
      'Je ruikt brandlucht in de trappenhuis van je flat, maar ziet geen vuur. Wat is het eerste dat je doet?',
      'Brandlucht in de flat, geen vuur zichtbaar. Wat doe je eerst?',
    ),
    knmVignette(
      'Op straat zie je twee mensen schreeuwen en duwen, maar niemand lijkt gewond. Wat is verstandig?',
      'Ruzie op straat, niemand lijkt gewond. Wat is verstandig?',
    ),
    knmVignette(
      'Op de fiets val je en je knie bloedt; je kunt nog praten. Iemand roept “bel 112!”. Wat past het meest?',
      'Val van de fiets met bloedende knie. Iemand roept 112. Wat past?',
    ),
    knmVignette(
      'Het is 23:00 en je baby heeft koorts; je twijfelt tussen wachten en bellen. Wat is meestal de eerste keuze buiten kantooruren?',
      'Baby met koorts laat op de avond. Wat doe je buiten kantooruren eerst?',
    ),
  ],
  geld_belasting_verzekering: [
    knmVignette(
      'Je vindt een blauwe envelop van de Belastingdienst in de bus met een datum. Wat is verstandig om te doen?',
      'Blauwe envelop van de Belastingdienst met een datum. Wat doe je?',
    ),
    knmVignette(
      'Je auto heeft schade na een klein ongeluk. Je belt je verzekeraar. Wat moet je vaak klaar hebben?',
      'Kleine autoschade, je belt de verzekeraar. Wat heb je nodig?',
    ),
    knmVignette(
      'Je werkgever vraagt bonnetjes voor declareren. Wat is gebruikelijk om te bewaren?',
      'Werkgever vraagt bonnetjes voor declaraties. Wat bewaar je?',
    ),
    knmVignette(
      'Je premie stijgt volgend jaar en je krijgt een brief van de verzekeraar. Wat is slim voordat je overstapt of belt?',
      'Premie stijgt, brief van verzekeraar. Wat doe je eerst?',
    ),
  ],
}

function concreteScenarioStem(
  cat: KnmA2ExamCategory,
  a: string,
  b: string,
  stemKind: number,
): { questionNl: string; audioScriptNl?: string } {
  const fn = VIGNETTE_QUADS[cat][stemKind % 4]!
  return fn(a, b)
}

const WRONG_EXTRA: Record<KnmA2ExamCategory, readonly string[]> = {
  zorg_gezondheid: [
    'Je belt 112 voor elke lichte klacht, ook als er geen spoed is.',
    'Je regelt altijd zelf een specialist zonder huisarts of verwijzing.',
    'Je betaalt nooit eigen risico; elke behandeling is automatisch gratis.',
  ],
  werk_inkomen: [
    'Je werkgever mag je loon zomaar halveren zonder overleg of contract.',
    'Een mondelinge afspraak zonder brief is altijd juridisch hetzelfde als een contract.',
    'Je meldt je ziek alleen via sociale media; dat telt officieel.',
  ],
  onderwijs_opvoeding: [
    'De school hoeft verzuim niet te weten als het maar een paar dagen is.',
    'Ouders mogen nooit op gesprek komen; dat doet alleen de leerling.',
    'Inburgeringsonderwijs is verplicht voor iedereen zonder uitzondering.',
  ],
  wonen_buurt: [
    'Je filmt de buren en zet het meteen online zonder eerst met hen te praten.',
    'Je stopt met huurbetalen tot de verhuurder het plafond repareert, zonder iets schriftelijks te sturen.',
    'Je geeft je nieuwe adres niet door omdat je “toch in dezelfde stad” blijft wonen.',
  ],
  overheid_recht: [
    'Je kiestrecht kun je verkopen aan een ander als je niet gaat stemmen.',
    'Een paspoort regel je alleen via een buitenlandse bank, niet in Nederland.',
    'De Tweede Kamer bepaalt alle rechtszaken in plaats van de rechter.',
  ],
  integratie_cultuur: [
    'Vrijwilligerswerk is in Nederland verplicht voor iedereen met een verblijfsvergunning.',
    'Afval scheiden mag thuis: alles in één zak is gebruikelijk.',
    'Sportclubs weigeren altijd nieuwe leden zonder reden; dat is normaal.',
  ],
  veiligheid_hulp: [
    'Je belt 112 voor een ingekocht concertkaartje dat kwijt is.',
    'Bij een kleine ruzie zonder letsel bel je altijd 112 en blijf je in de clinch.',
    'Bij rook op straat ren je altijd dicht naar de brand zonder te bellen.',
  ],
  geld_belasting_verzekering: [
    'Belastingaangifte is optioneel: je mag jaren overslaan zonder gevolgen.',
    'Je bewaart geen bonnen; de Belastingdienst raadt dat af.',
    'Schade melden bij de verzekeraar hoeft pas na vijf jaar.',
  ],
}

function wrongPool(cat: KnmA2ExamCategory): string[] {
  return [...WRONG_EXTRA[cat], WRONG_A, WRONG_B, WRONG_C]
}

function pickWrongs(cat: KnmA2ExamCategory, seed: number, good: string, need: number): string[] {
  const pool = wrongPool(cat)
  const out: string[] = []
  let step = 0
  while (out.length < need && step < pool.length * 4) {
    const w = pool[(seed + step) % pool.length]!
    if (w !== good && !out.includes(w)) out.push(w)
    step += 1
  }
  while (out.length < need) out.push(WRONG_A)
  return out.slice(0, need)
}

/** Pad static bank rows to four A–D options using category distractors. */
function padKnmEntryToFourOptions(entry: KnmMcqBankEntry, seed: number): KnmMcqBankEntry {
  if (entry.options.length >= KNM_A2_MCQ_OPTION_COUNT) return entry
  const correctLabel = entry.options.find((o) => entry.correctOptionIds.includes(o.id))?.label ?? ''
  const existing = new Set(entry.options.map((o) => o.label))
  const extra = pickWrongs(entry.category, seed, correctLabel, 6).filter((w) => !existing.has(w))
  const ids = ['a', 'b', 'c', 'd'] as const
  const padded = [...entry.options]
  while (padded.length < KNM_A2_MCQ_OPTION_COUNT) {
    const id = ids[padded.length]!
    const label = extra.shift() ?? WRONG_A
    padded.push({ id, label })
    existing.add(label)
  }
  return { ...entry, options: padded }
}

function pushCombo(
  out: KnmMcqBankEntry[],
  cat: KnmA2ExamCategory,
  max: number,
  facetsA: readonly string[],
  facetsB: readonly string[],
  goodEn: (a: string, b: string) => string,
) {
  outer: for (const a of facetsA) {
    for (const b of facetsB) {
      if (out.filter((e) => e.category === cat).length >= max) break outer
      const idxInCat = out.filter((e) => e.category === cat).length
      const stemKind = idxInCat % 4
      const stem = concreteScenarioStem(cat, a, b, stemKind)
      const answerPack = KNM_VIGNETTE_ANSWERS[cat][stemKind]!
      const good = answerPack.good
      const wrongs = pickScenarioWrongs(answerPack.wrongs, out.length + idxInCat * 13, good)
      out.push({
        category: cat,
        questionNl: stem.questionNl,
        questionEn: goodEn(a, b),
        illustrationId: knmIllustrationIdForVignette(cat, stemKind),
        options: knmMcqFourOptions(good, wrongs),
        correctOptionIds: ['a'],
        ...(stem.audioScriptNl ? { audioScriptNl: stem.audioScriptNl } : {}),
      })
    }
  }
}

/**
 * DUO-style voorbeeldexamen KNM: korte concrete vraagzin, vier antwoorden (A–D),
 * afbeelding waar het om interpretatie gaat — geluidsscript = vraag (TTS).
 */
function pushKnmVoorbeeldExamenStylePack(out: KnmMcqBankEntry[]) {
  type Row = KnmMcqBankEntry

  const rows: Row[] = [
    {
      category: 'wonen_buurt',
      questionNl: 'Waarom zijn de Deltawerken in Nederland gebouwd?',
      questionEn: 'Why were the Delta Works built in the Netherlands?',
      illustrationId: 'voorbeeld_delta',
      audioScriptNl: 'Waarom zijn de Deltawerken in Nederland gebouwd?',
      options: [
        { id: 'a', label: 'Om meer vis te kunnen vangen.' },
        { id: 'b', label: 'Om Nederland te beschermen tegen de zee.' },
        { id: 'c', label: 'Om nieuwe steden te kunnen bouwen.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'overheid_recht',
      questionNl: 'Nederland is lid van de VN (Verenigde Naties). Wat is het belangrijkste doel van de VN?',
      questionEn: 'The Netherlands is a UN member. What is the main purpose of the UN?',
      illustrationId: 'voorbeeld_un',
      audioScriptNl: 'Nederland is lid van de Verenigde Naties. Wat is het belangrijkste doel van de VN?',
      options: [
        { id: 'a', label: 'Bescherming van de natuur.' },
        { id: 'b', label: 'Beter onderwijs voor alle kinderen ter wereld.' },
        { id: 'c', label: 'Vrede en veiligheid.' },
      ],
      correctOptionIds: ['c'],
    },
    {
      category: 'wonen_buurt',
      questionNl: 'Waar ligt Amsterdam, de hoofdstad van Nederland?',
      questionEn: 'Where is Amsterdam, the capital of the Netherlands?',
      illustrationId: 'voorbeeld_amsterdam',
      audioScriptNl: 'Waar ligt Amsterdam, de hoofdstad van Nederland?',
      options: [
        { id: 'a', label: 'In de provincie Noord-Holland.' },
        { id: 'b', label: 'In de provincie Utrecht.' },
        { id: 'c', label: 'In de provincie Zeeland.' },
      ],
      correctOptionIds: ['a'],
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Wat is het Wilhelmus?',
      questionEn: 'What is the Wilhelmus?',
      illustrationId: 'voorbeeld_wilhelmus',
      audioScriptNl: 'Wat is het Wilhelmus?',
      options: [
        { id: 'a', label: 'De Nederlandse grondwet.' },
        { id: 'b', label: 'Het nationale voetbalteam.' },
        { id: 'c', label: 'Het Nederlandse volkslied.' },
      ],
      correctOptionIds: ['c'],
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Wanneer vond de Holocaust in Europa hoofdzakelijk plaats?',
      questionEn: 'When did the Holocaust in Europe mainly take place?',
      illustrationId: 'voorbeeld_holocaust',
      audioScriptNl: 'Wanneer vond de Holocaust in Europa hoofdzakelijk plaats?',
      options: [
        { id: 'a', label: 'Tijdens de Eerste Wereldoorlog.' },
        { id: 'b', label: 'Tijdens de Koude Oorlog.' },
        { id: 'c', label: 'Tijdens de Tweede Wereldoorlog.' },
      ],
      correctOptionIds: ['c'],
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Wanneer wordt Koningsdag in Nederland gevierd?',
      questionEn: 'When is King’s Day celebrated in the Netherlands?',
      illustrationId: 'voorbeeld_koningsdag',
      audioScriptNl: 'Wanneer wordt Koningsdag in Nederland gevierd?',
      options: [
        { id: 'a', label: 'Op 30 april.' },
        { id: 'b', label: 'Op 27 april (of 26 april als 27 op zondag valt).' },
        { id: 'c', label: 'Op 5 mei.' },
        { id: 'd', label: 'Op 1 januari.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'overheid_recht',
      questionNl: 'Wat is de Tweede Kamer van de Staten-Generaal in grote lijnen?',
      questionEn: 'What is the House of Representatives in broad terms?',
      illustrationId: 'voorbeeld_tweede_kamer',
      audioScriptNl: 'Wat is de Tweede Kamer van de Staten-Generaal in grote lijnen?',
      options: [
        { id: 'a', label: 'De rechter die straffen uitspreekt.' },
        { id: 'b', label: 'De gekozen Kamerleden die wetten maken en de regering controleren.' },
        { id: 'c', label: 'De gemeenteraad van Den Haag.' },
        { id: 'd', label: 'De koning die elke dag de regering leidt.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'overheid_recht',
      questionNl: 'Wat hoort bij stemmen voor de Tweede Kamer in Nederland?',
      questionEn: 'What applies when voting for the House of Representatives?',
      illustrationId: 'voorbeeld_stembus',
      audioScriptNl: 'Wat hoort bij stemmen voor de Tweede Kamer in Nederland?',
      options: [
        { id: 'a', label: 'Je moet minstens 21 jaar zijn.' },
        { id: 'b', label: 'Je moet aan de kiesregels voldoen (meestal 18 jaar en de juiste nationaliteit).' },
        { id: 'c', label: 'Alleen mensen die in Den Haag wonen mogen stemmen.' },
        { id: 'd', label: 'Iedereen mag stemmen, ook zonder ID.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Welk museum op de foto staat in Amsterdam?',
      questionEn: 'Which museum in the photo is in Amsterdam?',
      illustrationId: 'voorbeeld_rijksmuseum',
      audioScriptNl: 'Welk museum op de foto staat in Amsterdam?',
      options: [
        { id: 'a', label: 'Het Van Gogh Museum.' },
        { id: 'b', label: 'Het Rijksmuseum.' },
        { id: 'c', label: 'Het Anne Frank Huis.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'werk_inkomen',
      questionNl: 'Wat is een CAO in Nederland in één zin?',
      questionEn: 'What is a CAO in the Netherlands in one sentence?',
      illustrationId: 'voorbeeld_cao',
      audioScriptNl: 'Wat is een CAO in Nederland in één zin?',
      options: [
        { id: 'a', label: 'Een persoonlijke brief van de burgemeester.' },
        { id: 'b', label: 'Afspraken over loon en werk in een sector of bedrijf (CAO).' },
        { id: 'c', label: 'Een verzekering tegen ziekte.' },
        { id: 'd', label: 'Een paspoort voor vakantie.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'zorg_gezondheid',
      questionNl: 'Wat is de huisarts in Nederland vooral bedoeld voor?',
      questionEn: 'What is the GP mainly for in the Netherlands?',
      illustrationId: 'voorbeeld_huisarts',
      audioScriptNl: 'Wat is de huisarts in Nederland vooral bedoeld voor?',
      options: [
        { id: 'a', label: 'Alleen voor spoed na een ongeluk op straat.' },
        { id: 'b', label: 'Eerste lijn: niet-spoed klachten, verwijzing en chronische zorg.' },
        { id: 'c', label: 'Alleen voor het halen van medicijnen zonder recept.' },
        { id: 'd', label: 'Alleen voor tandartszorg zonder afspraak.' },
      ],
      correctOptionIds: ['b'],
    },
    {
      category: 'geld_belasting_verzekering',
      questionNl: 'Wat is de Belastingdienst in Nederland?',
      questionEn: 'What is the Tax Administration in the Netherlands?',
      illustrationId: 'voorbeeld_belastingdienst',
      audioScriptNl: 'Wat is de Belastingdienst in Nederland?',
      options: [
        { id: 'a', label: 'Een bank die leningen verstrekt.' },
        { id: 'b', label: 'De overheid die belastingen heft volgens de wet.' },
        { id: 'c', label: 'Een verzekeraar voor je auto.' },
        { id: 'd', label: 'Een sportclub in de buurt.' },
      ],
      correctOptionIds: ['b'],
    },
  ]

  for (const row of rows) out.push(padKnmEntryToFourOptions(row, out.length))
}

/** Beelduitwerking + thema: vaste items met realistische situatiefoto's. */
function pushKnmImageInterpretationPack(out: KnmMcqBankEntry[]) {
  type Row = KnmMcqBankEntry

  const rows: Row[] = [
    {
      category: 'zorg_gezondheid',
      questionNl: 'Je ziet dit symbool bij de ingang. Waar ben je waarschijnlijk het meest?',
      questionEn: 'You see this symbol at the entrance. Where are you most likely?',
      illustrationId: 'beeld_medical_cross',
      options: [
        { id: 'a', label: 'Bij medische zorg (bijvoorbeeld ziekenhuis, huisartsenpost of huisarts).' },
        { id: 'b', label: 'Bij een sportschool of zwembad, alleen voor ontspanning.' },
        { id: 'c', label: 'Bij de Belastingdienst voor een afspraak.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je ziet dit symbool bij de ingang. Waar ben je waarschijnlijk?',
    },
    {
      category: 'zorg_gezondheid',
      questionNl: 'Je voelt je niet goed, maar het is niet spoed. Wat is overdag meestal een goede eerste stap?',
      questionEn: 'What is a good first step for non-urgent complaints during the day?',
      illustrationId: 'zorg_gezondheid_0',
      options: [
        { id: 'a', label: 'Contact opnemen met je huisarts (telefonisch of via de praktijk).' },
        { id: 'b', label: 'Direct naar de spoedeisende hulp zonder iets te melden.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Wat is een goede eerste stap bij niet-spoedeisende klachten overdag?',
    },
    {
      category: 'werk_inkomen',
      questionNl: 'Je ziet dit soort document op de foto. Waar hoort het in de regel bij?',
      questionEn: 'The document in the image often relates to…',
      illustrationId: 'beeld_work_document',
      options: [
        { id: 'a', label: 'Een arbeidscontract of brief van je werkgever (werk en inkomen).' },
        { id: 'b', label: 'Alleen bij een restaurantmenu.' },
        { id: 'c', label: 'Alleen bij een verjaardagskaart.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je document op de foto hoort vaak bij werk en inkomen. Wat klopt?',
    },
    {
      category: 'werk_inkomen',
      questionNl: 'Je bent ziek en kunt niet werken. Wat moet je in de regel als eerste doen?',
      questionEn: 'You are ill. What do you usually do first?',
      illustrationId: 'werk_inkomen_0',
      options: [
        { id: 'a', label: 'Ziek melden bij je werkgever volgens de afspraken in je contract/CAO.' },
        { id: 'b', label: 'Niets melden tot je beter bent.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je bent ziek en kunt niet werken. Wat moet je in de regel als eerste doen?',
    },
    {
      category: 'onderwijs_opvoeding',
      questionNl: 'Bij deze afbeelding denk je in Nederland vooral aan…',
      questionEn: 'With this image you mainly think of…',
      illustrationId: 'beeld_school_books',
      options: [
        { id: 'a', label: 'School, leren en onderwijs (boeken en studie).' },
        { id: 'b', label: 'Alleen een boekwinkel als hobby, zonder link met school.' },
        { id: 'c', label: 'Alleen sport op tv.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Bij deze afbeelding denk je vooral aan school en leren.',
    },
    {
      category: 'onderwijs_opvoeding',
      questionNl: 'Je kind mist veel lessen. Wat is in Nederland gebruikelijk om te doen?',
      questionEn: 'Your child has a lot of absence. What is usual?',
      illustrationId: 'onderwijs_opvoeding_1',
      options: [
        { id: 'a', label: 'Verzuim tijdig en volgens afspraak melden bij school.' },
        { id: 'b', label: 'Wachten tot de school zelf belt zonder zelf iets te doen.' },
        { id: 'c', label: 'De school hoeft het niet te weten.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je kind heeft veel verzuim. Wat is gebruikelijk in Nederland?',
    },
    {
      category: 'onderwijs_opvoeding',
      questionNl: 'Je hebt een oudergesprek op school. Wat hoort daar doorgaans bij?',
      questionEn: 'What fits a parent–teacher meeting at school?',
      illustrationId: 'onderwijs_opvoeding_2',
      options: [
        { id: 'a', label: 'Samen praten over het welbevinden en leren van je kind, op afspraak.' },
        { id: 'b', label: 'Alleen de leraar spreekt; ouders mogen niet reageren.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je hebt een oudergesprek op school. Wat hoort daar doorgaans bij?',
    },
    {
      category: 'wonen_buurt',
      questionNl: 'Dit plaatje wordt vaak gebruikt als het over dit thema gaat. Wat is dat?',
      questionEn: 'This picture often stands for…',
      illustrationId: 'beeld_house_wonen',
      options: [
        { id: 'a', label: 'Wonen: een woning of huur/koop van een huis.' },
        { id: 'b', label: 'Alleen een vakantiehotel in het buitenland.' },
        { id: 'c', label: 'Alleen openbaar vervoer.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Dit plaatje staat vaak voor wonen. Wat klopt?',
    },
    {
      category: 'wonen_buurt',
      questionNl: 'Je ziet dit verkeersbord. Wat moet je doen?',
      questionEn: 'You see this traffic sign. What must you do?',
      illustrationId: 'beeld_stop_sign',
      options: [
        { id: 'a', label: 'Stoppen en voorrang verlenen volgens de verkeersregels.' },
        { id: 'b', label: 'Harder rijden om snel weg te zijn.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je ziet een stopbord. Wat moet je doen?',
    },
    {
      category: 'overheid_recht',
      questionNl: 'Dit document op de foto is vooral bedoeld als…',
      questionEn: 'This document in the photo is mainly…',
      illustrationId: 'beeld_id_card',
      options: [
        { id: 'a', label: 'Een identiteitsbewijs voor officiële identificatie in Nederland.' },
        { id: 'b', label: 'Een rijbewijs van een ander land zonder betekenis hier.' },
        { id: 'c', label: 'Een krantenabonnement.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Dit document op de foto is vooral bedoeld als identiteitsbewijs. Wat klopt?',
    },
    {
      category: 'overheid_recht',
      questionNl: 'Je verhuist binnen Nederland naar een nieuw adres. Wat moet je vaak doen?',
      questionEn: 'You move within the Netherlands. What do you often need to do?',
      illustrationId: 'overheid_recht_0',
      options: [
        { id: 'a', label: 'Je nieuwe adres doorgeven aan de gemeente (inschrijving).' },
        { id: 'b', label: 'Niets doorgeven; de gemeente ziet het vanzelf.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je verhuist binnen Nederland naar een nieuw adres. Wat moet je vaak doen?',
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Dit symbool op de afbeelding hoort in de buurt vooral bij…',
      questionEn: 'This symbol in the image relates to…',
      illustrationId: 'beeld_recycle_symbol',
      options: [
        { id: 'a', label: 'Afval scheiden en milieu in de buurt (duurzaam gedrag).' },
        { id: 'b', label: 'Alleen reclame voor een winkel.' },
        { id: 'c', label: 'Alleen muziek op straat.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Dit symbool hoort in de buurt vooral bij afval scheiden en milieu.',
    },
    {
      category: 'integratie_cultuur',
      questionNl: 'Je buren klagen over geluid na 22:00. Wat is sociaal het meest gebruikelijk?',
      questionEn: 'Neighbours complain about noise after 22:00. What is socially usual?',
      illustrationId: 'integratie_cultuur_1',
      options: [
        { id: 'a', label: 'Rustiger doen en rekening houden met woontijden en afspraken in de buurt.' },
        { id: 'b', label: 'Harder muziek zetten om je “recht” te tonen.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je buren klagen over geluid na 22:00. Wat is sociaal het meest gebruikelijk?',
    },
    {
      category: 'veiligheid_hulp',
      questionNl: 'Dit nummer op de afbeelding. Wanneer gebruik je het in Nederland?',
      questionEn: 'This number in the image. When do you call it?',
      illustrationId: 'beeld_112_number',
      options: [
        { id: 'a', label: 'Bij direct levensgevaar, acute zware verwonding of acute brand (112).' },
        { id: 'b', label: 'Alleen als je een pizza wilt bestellen.' },
        { id: 'c', label: 'Voor een afspraak bij de huisarts overdag.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Wanneer bel je 112?',
    },
    {
      category: 'veiligheid_hulp',
      questionNl: 'Je ziet iets verdachts op straat, maar er is geen direct gevaar. Wat is verstandig?',
      questionEn: 'You see a suspicious situation on the street, no immediate danger. What is sensible?',
      illustrationId: 'veiligheid_hulp_1',
      options: [
        {
          id: 'a',
          label:
            '112 alleen bij direct levensgevaar of acute brand; anders meld je bij de politie via het niet-spoednummer of online, zoals op de site staat.',
        },
        { id: 'b', label: 'Altijd 112 bellen, ook als er geen spoed is.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je ziet iets verdachts op straat, maar er is geen direct gevaar. Wat is verstandig?',
    },
    {
      category: 'geld_belasting_verzekering',
      questionNl: 'Dit symbool op de foto hoort vooral bij…',
      questionEn: 'This symbol in the photo mainly relates to…',
      illustrationId: 'beeld_euro_symbol',
      options: [
        { id: 'a', label: 'Betalen, bankieren of belastingen/verzekeringen in de eurozone.' },
        { id: 'b', label: 'Alleen sportprijzen in dollars.' },
        { id: 'c', label: 'Alleen vliegtickets buiten Europa.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Dit symbool op de foto hoort vooral bij betalen en belastingen in de eurozone.',
    },
    {
      category: 'geld_belasting_verzekering',
      questionNl: 'Je krijgt een brief van de Belastingdienst met een termijn. Wat is verstandig?',
      questionEn: 'You get a letter from the Tax Administration with a deadline. What is sensible?',
      illustrationId: 'geld_belasting_verzekering_1',
      options: [
        { id: 'a', label: 'De termijn respecteren en op tijd reageren of bezwaar maken volgens regels.' },
        { id: 'b', label: 'De brief negeren; dan verdwijnt het probleem vanzelf.' },
      ],
      correctOptionIds: ['a'],
      audioScriptNl: 'Je krijgt een brief van de Belastingdienst met een termijn. Wat is verstandig?',
    },
  ]

  for (const row of rows) out.push(padKnmEntryToFourOptions(row, out.length))
}

/** Minimaal ~38 gegenereerde vragen per domein → ruim boven 300 met de kernbank. */
export function buildExpandedA2KnmEntries(): KnmMcqBankEntry[] {
  const out: KnmMcqBankEntry[] = []
  const n = 38

  const zA = [
    'de huisarts',
    'de apotheek',
    'de huisartsenpost',
    'het ziekenhuis (spoedeisende hulp)',
    'de GGD',
    'de verloskundige',
    'de fysiotherapeut',
    'de basisverzekering',
  ]
  const zB = [
    'niet-levensbedreigende klachten overdag',
    'medicijnen met recept',
    'infectieziekten en vaccinaties',
    'eigen risico en vergoedingen',
    'verwijzing naar een specialist',
    'nacht/weekend buiten kantooruren',
    'preventie en gezondheidsvoorlichting',
    'chronische zorg op lange termijn',
  ]
  pushCombo(
    out,
    'zorg_gezondheid',
    n,
    zA,
    zB,
    (a, b) =>
      `For much care involving ${a} and ${b}, you often start with the GP in the Netherlands (unless it is an emergency); for life-threatening emergencies call 112.`,
  )

  const wA = [
    'een arbeidscontract',
    'minimumloon en uitbetaling',
    'vakantiedagen en verlof',
    'een proeftijd',
    'ontslag en opzegtermijn',
    'veiligheid op de werkvloer',
    'discriminatie melden',
    'UWV en werkloosheid',
  ]
  const wB = [
    'CAO-afspraken in een sector',
    'sollicitatie en een brief',
    'een tijdelijk contract',
    'overwerk en pauzes',
    'ziek melden bij de werkgever',
    'zwangerschapsverlof (in grote lijnen)',
    're-integratie na ziekte',
    'stage en leerwerk',
  ]
  pushCombo(
    out,
    'werk_inkomen',
    n,
    wA,
    wB,
    (a, b) =>
      `For ${a} and ${b}, Dutch labour law and often a CLA or contract apply; legal advice can help if unsure.`,
  )

  const oA = [
    'leerplicht en schoolgang',
    'basisschool en voortgezet onderwijs',
    'studiefinanciering (onder voorwaarden)',
    'examen en diploma’s',
    'oudergesprekken en ouderbetrokkenheid',
    'schoolzwemmen en excursies',
    'inburgeringsonderwijs',
    'volwasseneneducatie (mbo/hbo in grote lijnen)',
  ]
  const oB = [
    'aanmelding bij een school',
    'verzuim melden bij school',
    'huiswerk en begeleiding thuis',
    'ondersteuning bij taalachterstand',
    'schoolarts en sociale omgeving',
    'veiligheid op school',
    'privacy van leerlinggegevens',
    'overstappen naar een andere school',
  ]
  pushCombo(
    out,
    'onderwijs_opvoeding',
    n,
    oA,
    oB,
    (a, b) =>
      `For ${a} and ${b}, parents, the school and sometimes the municipality are involved under clear rules.`,
  )

  const hA = [
    'huren van een woning',
    'inschrijven bij de gemeente',
    'buren en overlast',
    'servicekosten en onderhoud',
    'hypotheek (eigen woning)',
    'energielabel en verduurzamen',
    'woningcorporatie en wachtlijsten',
    'anti-kraak en tijdelijk wonen',
  ]
  const hB = [
    'huurcontract en voorwaarden',
    'borg en documenten',
    'melden van gebreken aan de verhuurder',
    'WOZ-waarde en gemeentelijke heffingen',
    'verhuizing doorgeven',
    'geluid na 22:00 uur',
    'afval en scheiden aan huis',
    'verzekering van je inboedel',
  ]
  pushCombo(
    out,
    'wonen_buurt',
    n,
    hA,
    hB,
    (a, b) =>
      `For ${a} and ${b}, Dutch law, your contract and often municipal policy apply; read agreements carefully.`,
  )

  const ovrA = [
    'de Tweede Kamer',
    'de gemeenteraad',
    'DigiD en online diensten',
    'paspoort en identiteitsbewijs',
    'kiesrecht en verkiezingen',
    'de grondwet (hoofdlijnen)',
    'de rechterlijke macht',
    'de koning (rol in het stelsel, kort)',
  ]
  const ovrB = [
    'democratische vertegenwoordiging',
    'lokale besluiten over wonen en ruimte',
    'toegang tot overheidsloketten',
    'reisdocumenten aanvragen',
    'stemmen op een stembureau',
    'rechten en vrijheden met grenzen',
    'onafhankelijke rechtspraak',
    'staatshoofd zonder dagelijkse regering',
  ]
  pushCombo(
    out,
    'overheid_recht',
    n,
    ovrA,
    ovrB,
    (a, b) =>
      `In the Dutch system, ${a} and ${b} relate to how powers are divided and democracy works (in brief).`,
  )

  const iA = [
    'vrijwilligerswerk',
    'sportclubs en verenigingen',
    'feestdagen en tradities',
    'normen in de buurt',
    'duurzaamheid in het dagelijks leven',
    'digitale vaardigheden',
    'respect voor verschillen',
    'taal leren en meedoen',
  ]
  const iB = [
    'meedoen in de lokale gemeenschap',
    'inschrijven bij een club',
    'koningsdag en kerst (gangbaar)',
    'afspraken met buren',
    'afval scheiden en milieu',
    'veilig internetgedrag',
    'gelijke behandeling',
    'contact met scholen en werk',
  ]
  pushCombo(
    out,
    'integratie_cultuur',
    n,
    iA,
    iB,
    (a, b) =>
      `Integration often involves ${a} and ${b}: voluntary, but welcome and useful in Dutch society.`,
  )

  const vA = [
    '112 bij levensgevaar',
    '112 bij acute brand',
    'politie voor aangifte',
    'huisartsenpost buiten kantooruren',
    'melden van huiselijk geweld (routes)',
    'verkeersongeval met letsel',
    'verdachte situatie op straat',
    'natuurbrand en rook',
  ]
  const vB = [
    'direct professionele hulp',
    'brandweer en ambulance',
    'online of op het bureau',
    'niet-levensbedreigend maar wel spoed',
    'vertrouwelijk hulp via hulpverlening',
    '112 of 112 waar nodig',
    'veilig afstand houden en wachten',
    'gemeente of crisisdienst',
  ]
  pushCombo(
    out,
    'veiligheid_hulp',
    n,
    vA,
    vB,
    (a, b) =>
      `For ${a} and ${b}, use the right channel in the Netherlands; 112 only for immediate life danger or acute fire.`,
  )

  const gA = [
    'belastingaangifte inkomstenbelasting',
    'toeslagen (onder voorwaarden)',
    'omzetbelasting voor ondernemers',
    'motorrijtuigenbelasting',
    'aanslagen en bezwaar',
    'zorgpremie en polis',
    'aansprakelijkheidsverzekering',
    'reisverzekering en zorg buitenland',
  ]
  const gB = [
    'jaarlijks of periodiek invullen',
    'DigiD of machtiging',
    'bewaar administratie en bonnen',
    'wijziging van adres doorgeven',
    'bezwaartermijnen respecteren',
    'premie per maand',
    'schade melden bij de maatschappij',
    'dekking lezen in polisvoorwaarden',
  ]
  pushCombo(
    out,
    'geld_belasting_verzekering',
    n,
    gA,
    gB,
    (a, b) =>
      `For ${a} and ${b}, follow official rules: check the Tax Administration or your insurer’s information.`,
  )

  pushKnmVoorbeeldExamenStylePack(out)
  pushKnmImageInterpretationPack(out)
  pushKnmSlideDeckPack(out)

  for (const cat of KNMA2_EXAM_CATEGORIES) {
    const got = out.filter((e) => e.category === cat).length
    if (got < n) {
      throw new Error(`a2KnmExamBank: category ${cat} only has ${got} items, need at least ${n}`)
    }
  }

  return out
}

function assertKnmEntries(items: KnmMcqBankEntry[], label: string) {
  for (const it of items) {
    if (!it.illustrationId?.trim()) {
      throw new Error(`${label}: missing illustrationId on KNM item`)
    }
    if (it.options.length !== KNM_A2_MCQ_OPTION_COUNT) {
      throw new Error(`${label}: expected ${KNM_A2_MCQ_OPTION_COUNT} options, got ${it.options.length}`)
    }
    const ids = new Set(it.options.map((o) => o.id))
    if (!it.correctOptionIds.length) throw new Error(`${label}: empty correctOptionIds`)
    const uniq = new Set(it.correctOptionIds)
    if (uniq.size !== it.correctOptionIds.length) throw new Error(`${label}: duplicate correctOptionIds`)
    for (const c of it.correctOptionIds) {
      if (!ids.has(c)) throw new Error(`${label}: correct id "${c}" not in options`)
    }
  }
}

/**
 * Voor het A2 KNM-examen: per domein `EXAM_PER_CATEGORY` unieke vragen (zonder terugleggen binnen dat domein),
 * daarna door elkaar geschud — zelfde seed ⇒ zelfde examen.
 */
export function sampleA2KnmExamPoolIndices(sessionSeed: string, master: readonly KnmMcqBankEntry[]): number[] {
  const byCat: Record<KnmA2ExamCategory, number[]> = {
    zorg_gezondheid: [],
    werk_inkomen: [],
    onderwijs_opvoeding: [],
    wonen_buurt: [],
    overheid_recht: [],
    integratie_cultuur: [],
    veiligheid_hulp: [],
    geld_belasting_verzekering: [],
  }
  for (let i = 0; i < master.length; i += 1) {
    byCat[master[i]!.category].push(i)
  }
  const picks: number[] = []
  for (const cat of KNMA2_EXAM_CATEGORIES) {
    const pool = byCat[cat]
    if (pool.length < EXAM_PER_CATEGORY) {
      throw new Error(
        `a2KnmExamBank: category ${cat} has only ${pool.length} items, need at least ${EXAM_PER_CATEGORY} for the exam draw`,
      )
    }
    const local = sampleUniqueIndices(sessionSeed, `a2-knm-exam-cat:${cat}`, EXAM_PER_CATEGORY, pool.length)
    for (const li of local) picks.push(pool[li]!)
  }
  if (picks.length !== EXAM_MCQ_COUNT) {
    throw new Error(`a2KnmExamBank: expected ${EXAM_MCQ_COUNT} exam picks, got ${picks.length}`)
  }
  return seededShuffle(picks, sessionSeed, 'a2-knm-exam-order')
}

export function stripCategory(entry: KnmMcqBankEntry): KnmMcqItem {
  const { category: _c, ...rest } = entry
  return rest
}

/** Runtime check for expanded bank (called from knmMcqBank when assembling A2 pool). */
export function validateExpandedA2KnmEntries(entries: KnmMcqBankEntry[]): void {
  assertKnmEntries(entries, 'A2 KNM expanded')
  if (entries.length < 300) {
    throw new Error(`a2KnmExamBank: expected at least 300 expanded items, got ${entries.length}`)
  }
}
