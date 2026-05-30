import type { ExamLevel } from './types'
import type { KnmMcqItem } from './knmMcqTypes'
import {
  buildExpandedA2KnmEntries,
  sampleA2KnmExamPoolIndices as sampleA2KnmExamPoolIndicesFromMaster,
  stripCategory,
  validateExpandedA2KnmEntries,
  type KnmA2ExamCategory,
  type KnmMcqBankEntry,
} from './a2KnmExamBank'
import { knmIllustrationIdForVignette } from '@/lib/exam-prep/kmn/knmIllustrationRegistry'
import { KNM_FLAG_IMG_BE, KNM_FLAG_IMG_DE, KNM_FLAG_IMG_FR, KNM_FLAG_IMG_NL } from './knmFlagImageUrls'

export type { KnmMcqItem, KnmMcqOption } from './knmMcqTypes'

function seedIndex(seed: string, i: number, mod: number): number {
  let h = 0
  const s = `${seed}:${i}`
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0
  return mod > 0 ? h % mod : 0
}

function assertKnmBank(items: KnmMcqItem[], label: string) {
  for (const it of items) {
    if (label === 'A2' && it.options.length !== 4) {
      throw new Error(`KNM bank A2: expected 4 options, got ${it.options.length}`)
    }
    const ids = new Set(it.options.map((o) => o.id))
    if (!it.correctOptionIds.length) {
      throw new Error(`KNM bank ${label}: empty correctOptionIds`)
    }
    const uniq = new Set(it.correctOptionIds)
    if (uniq.size !== it.correctOptionIds.length) {
      throw new Error(`KNM bank ${label}: duplicate in correctOptionIds`)
    }
    for (const c of it.correctOptionIds) {
      if (!ids.has(c)) {
        throw new Error(`KNM bank ${label}: correct id "${c}" not in options`)
      }
    }
  }
}

const A2_BANK_CORE: KnmMcqItem[] = [
  {
    questionNl: 'Wie betaalt in Nederland meestal de zorgverzekering?',
    questionEn: 'Who usually pays for health insurance in the Netherlands?',
    options: [
      { id: 'a', label: 'De gemeente betaalt alles voor iedereen.' },
      { id: 'b', label: 'Je betaalt zelf een maandelijkse premie (vaak met eigen risico).' },
      { id: 'c', label: 'Alleen werkgevers betalen; werknemers niet.' },
      { id: 'd', label: 'Alleen bij ziekenhuisopname betaal je.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Waarvoor bel je in een acute medische situatie buiten de huisartsenpost 112?',
    questionEn: 'When do you call 112 in an acute medical situation?',
    options: [
      { id: 'a', label: 'Voor een afspraak bij de huisarts volgende week.' },
      { id: 'b', label: 'Alleen voor brand, nooit voor medische hulp.' },
      { id: 'c', label: 'Levensgevaar of direct gevaar waarbij snel professionele hulp nodig is.' },
      { id: 'd', label: 'Als de apotheek dicht is.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    questionNl: 'Wat is een DigiD in de praktijk?',
    questionEn: 'What is DigiD used for in practice?',
    options: [
      { id: 'a', label: 'Een betaalpas voor de supermarkt.' },
      { id: 'b', label: 'Inloggen bij veel overheids- en zorgdiensten online.' },
      { id: 'c', label: 'Alleen een studentenpas.' },
      { id: 'd', label: 'Een vervanging van de rijbewijsproef.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Tot welke leeftijd is leerplicht in Nederland doorgaans van toepassing (kort gezegd)?',
    questionEn: 'Until what age does compulsory education generally apply (roughly)?',
    options: [
      { id: 'a', label: 'Tot 12 jaar.' },
      { id: 'b', label: 'Tot 16 jaar (met bekende uitzonderingen tot 18).' },
      { id: 'c', label: 'Tot 21 jaar voor iedereen.' },
      { id: 'd', label: 'Er is geen leerplicht.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Waar meld je je eerst als je in een gemeente gaat wonen?',
    questionEn: 'Where do you register first when you move to a municipality?',
    options: [
      { id: 'a', label: 'Bij de politie alleen.' },
      { id: 'b', label: 'Bij de gemeente (inschrijving BRP).' },
      { id: 'c', label: 'Alleen bij de belastingdienst via post.' },
      { id: 'd', label: 'Nergens; vrijwillig.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Wat hoort bij respectvolle communicatie op werk (kort)?',
    questionEn: 'What fits respectful communication at work?',
    options: [
      { id: 'a', label: 'Hard schreeuwen om prioriteit te krijgen.' },
      { id: 'b', label: 'Afspraken nakomen en duidelijk en beleefd communiceren.' },
      { id: 'c', label: 'E-mails nooit beantwoorden.' },
      { id: 'd', label: 'Alleen in het Engels spreken, ook als iedereen Nederlands spreekt.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl:
      'Welke van onderstaande zijn vaak nodig bij het huren van een woning van een particuliere verhuurder? (meerdere antwoorden)',
    questionEn: 'Which are often needed when renting from a private landlord? (select all that apply)',
    options: [
      { id: 'a', label: 'Identiteitsbewijs' },
      { id: 'b', label: 'Een diploma van de basisschool van je buurman' },
      { id: 'c', label: 'Bewijs van inkomen (vaak)' },
      { id: 'd', label: 'Een tweede nationaliteit is altijd verplicht' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Welke instanties kun je in veel gevallen bellen voor overlast of niet-levensbedreigende hulp van hulpdiensten?',
    questionEn: 'Which number is often used for non-life-threatening emergencies / municipal help lines?',
    options: [
      { id: 'a', label: '112 voor alles, ook een kapotte fiets.' },
      { id: 'b', label: '0900-8844 (veel gemeenten; geen landelijk uniform nummer voor alles).' },
      { id: 'c', label: '1400 voor alle medische vragen, 24/7 landelijk vast.' },
      { id: 'd', label: '112 alleen als er direct gevaar is; anders vaak gemeente/huisartsenpost.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    questionNl: 'Wat is doorgaans het doel van een proeftijd in een arbeidscontract?',
    questionEn: 'What is usually the purpose of a probation period in an employment contract?',
    options: [
      { id: 'a', label: 'De werkgever en werknemer kunnen de samenwerking beoordelen met kortere opzegtermijn.' },
      { id: 'b', label: 'Je mag daarna nooit meer ontslagen worden.' },
      { id: 'c', label: 'Je hoeft geen belasting te betalen.' },
      { id: 'd', label: 'Je krijgt automatisch een vast contract zonder voorwaarden.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke rechten horen vaak bij veilig werken? (meerdere antwoorden)',
    questionEn: 'Which items often belong to safe working rights? (select all that apply)',
    options: [
      { id: 'a', label: 'Recht op veilige arbeidsmiddelen en een redelijke werkomgeving' },
      { id: 'b', label: 'Recht om altijd zonder pauze door te werken' },
      { id: 'c', label: 'Melden van onveilige situaties (vaak via interne procedures)' },
      { id: 'd', label: 'Geen recht op uitleg over risico’s' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat beschrijft “arbeidsrecht” het best (kort)?',
    questionEn: 'What does labour law mainly cover (briefly)?',
    options: [
      { id: 'a', label: 'Alleen belasting op inkomen.' },
      { id: 'b', label: 'Rechten en plichten van werkgever en werknemer (contract, veiligheid, enz.).' },
      { id: 'c', label: 'Alleen het weer op kantoor.' },
      { id: 'd', label: 'Alleen pensioen van AOW-leeftijd.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Waarvoor gebruik je de Belastingdienst vooral?',
    questionEn: 'What do you mainly use the Belastingdienst (Tax Administration) for?',
    options: [
      { id: 'a', label: 'Aanvragen van een parkeervergunning bij je buurgemeente.' },
      { id: 'b', label: 'Belastingaangifte en veel toeslagen/aangiften rond inkomen en vermogen.' },
      { id: 'c', label: 'Reserveren van zwembadtijden.' },
      { id: 'd', label: 'Alleen het uitgeven van paspoorten.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    questionNl: 'Welke situaties moet je meestal bij de gemeente melden? (meerdere antwoorden)',
    questionEn: 'Which changes do you usually report to the municipality? (select all that apply)',
    options: [
      { id: 'a', label: 'Verhuizing naar een ander adres in Nederland' },
      { id: 'b', label: 'Dat je van merk shampoo bent veranderd' },
      { id: 'c', label: 'Geboorte of overlijden (veel administratie loopt via gemeente/uitschrijving)' },
      { id: 'd', label: 'Je dagelijkse boodschappenlijst' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is een CAO ongeveer?',
    questionEn: 'What is a CAO (collective labour agreement) roughly?',
    options: [
      { id: 'a', label: 'Afspraken tussen vakbonden/werkgevers die voor veel werknemers in een sector gelden.' },
      { id: 'b', label: 'Een persoonlijke brief van de koning.' },
      { id: 'c', label: 'Alleen een verzekering voor je auto.' },
      { id: 'd', label: 'Een verplichte hobbyvereniging.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welk nummer bel je bij brand of levensgevaar?',
    questionEn: 'Which number do you call for fire or life-threatening danger?',
    options: [
      { id: 'a', label: '112' },
      { id: 'b', label: '1404' },
      { id: 'c', label: '088' },
      { id: 'd', label: '0900-info' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke vlag is de Nederlandse vlag?',
    questionEn: 'Which flag is the Dutch flag?',
    options: [
      { id: 'a', label: 'Nederland', imageUrl: KNM_FLAG_IMG_NL },
      { id: 'b', label: 'Duitsland', imageUrl: KNM_FLAG_IMG_DE },
      { id: 'c', label: 'België', imageUrl: KNM_FLAG_IMG_BE },
      { id: 'd', label: 'Frankrijk', imageUrl: KNM_FLAG_IMG_FR },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is de AOW kort gezegd?',
    questionEn: 'What is AOW in brief?',
    options: [
      { id: 'a', label: 'De basis van de Nederlandse ouderdomspensioenregeling (vanaf AOW-leeftijd).' },
      { id: 'b', label: 'Een studiefinanciering voor iedereen tot 30.' },
      { id: 'c', label: 'Een verplichte zorgverzekering voor toeristen.' },
      { id: 'd', label: 'Een belastingkorting voor elektrische auto’s.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een “eigen risico” bij de basisverzekering meestal?',
    questionEn: 'What is the “eigen risico” in basic health insurance usually?',
    options: [
      { id: 'a', label: 'Een jaarlijks bedrag dat je eerst zelf betaalt voordat de verzekering (deels) meebetaalt bij veel zorg.' },
      { id: 'b', label: 'Het bedrag dat je nooit hoeft te betalen.' },
      { id: 'c', label: 'Alleen de premie van je buurman.' },
      { id: 'd', label: 'Een boete van de gemeente.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke voorbeelden passen bij discriminatie op de werkvloer? (meerdere antwoorden)',
    questionEn: 'Which examples fit workplace discrimination? (select all that apply)',
    options: [
      { id: 'a', label: 'Minder kans op promotie puur vanwege afkomst / huidskleur' },
      { id: 'b', label: 'Eerlijke feedback op je werkprestaties' },
      { id: 'c', label: 'Systematisch uitsluiten van trainingen vanwege geslacht' },
      { id: 'd', label: 'Een collega die je helpt met een deadline' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is een UWV-taak ongeveer?',
    questionEn: 'What is roughly a task of UWV?',
    options: [
      { id: 'a', label: 'Onder andere uitkeringen en re-integratie rond werkloosheid (in grote lijnen).' },
      { id: 'b', label: 'Het uitgeven van rijbewijzen.' },
      { id: 'c', label: 'Het bepalen van het weer.' },
      { id: 'd', label: 'Het beheer van alle huisartsenpraktijken.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke uitspraken over stemmen kloppen in grote lijnen? (meerdere antwoorden)',
    questionEn: 'Which statements about voting are broadly correct in the Netherlands? (select all that apply)',
    options: [
      { id: 'a', label: 'Gemeenteraadsverkiezingen gaan over lokale politiek' },
      { id: 'b', label: 'Je mag altijd stemmen zonder Nederlandse nationaliteit bij Tweede Kamerverkiezingen' },
      { id: 'c', label: 'Tweede Kamerverkiezingen gaan over nationale vertegenwoordiging' },
      { id: 'd', label: 'Je stemt altijd per post; fysiek stemmen bestaat niet' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat hoort bij integratie in brede zin (kort)?',
    questionEn: 'What fits “integration” in a broad sense?',
    options: [
      { id: 'a', label: 'Meedoen in de samenleving: taal, werk, regels kennen en contacten.' },
      { id: 'b', label: 'Alleen je eigen taal spreken en geen contact met buren.' },
      { id: 'c', label: 'Geen kennis van lokale regels nodig.' },
      { id: 'd', label: 'Alleen een diploma halen, verder niets.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een kantonrechter ongeveer?',
    questionEn: 'What is a cantonal court judge roughly for?',
    options: [
      { id: 'a', label: 'Geschillen over arbeid en huur op eenvoudige wijze (kort gezegd).' },
      { id: 'b', label: 'Strafzaken met levenslang altijd.' },
      { id: 'c', label: 'Alleen paspoorten.' },
      { id: 'd', label: 'Belastingaangifte controleren.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke thema’s horen vaak bij “burgerschap” in KNM-materiaal? (meerdere antwoorden)',
    questionEn: 'Which themes often belong to “citizenship” in KNM material? (select all that apply)',
    options: [
      { id: 'a', label: 'Werken met regels en instanties (gemeente, belasting, zorg)' },
      { id: 'b', label: 'Alleen het kiezen van een sportschoen' },
      { id: 'c', label: 'Omgaan met werk, school en buren' },
      { id: 'd', label: 'Alleen koken zonder recept' },
    ],
    correctOptionIds: ['a', 'c'],
  },
]

const A1_BANK: KnmMcqItem[] = [
  {
    questionNl: 'Welk nummer bel je bij brand?',
    questionEn: 'Which number do you call for fire?',
    options: [
      { id: 'a', label: '112' },
      { id: 'b', label: '0900' },
      { id: 'c', label: '1404' },
      { id: 'd', label: '088' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Waar koop je meestal brood?',
    questionEn: 'Where do you usually buy bread?',
    options: [
      { id: 'a', label: 'In de bakker of supermarkt.' },
      { id: 'b', label: 'Alleen op het postkantoor.' },
      { id: 'c', label: 'Alleen bij de apotheek.' },
      { id: 'd', label: 'Alleen online met een taxi.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een huisarts ongeveer?',
    questionEn: 'What is a GP (huisarts) roughly?',
    options: [
      { id: 'a', label: 'De eerste dokter voor niet-spoedeisende zorg.' },
      { id: 'b', label: 'Alleen een specialist in het ziekenhuis.' },
      { id: 'c', label: 'Iemand die alleen tanden trekt.' },
      { id: 'd', label: 'Een sportschool.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke vlag is hier die van Nederland?',
    questionEn: 'Which flag here is the flag of the Netherlands?',
    options: [
      { id: 'a', label: 'Nederland', imageUrl: KNM_FLAG_IMG_NL },
      { id: 'b', label: 'Duitsland', imageUrl: KNM_FLAG_IMG_DE },
      { id: 'c', label: 'Frankrijk', imageUrl: KNM_FLAG_IMG_FR },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Waar ga je met je paspoort voor verlenging (kort)?',
    questionEn: 'Where do you go to renew your passport (briefly)?',
    options: [
      { id: 'a', label: 'Bij de gemeente (afspraak).' },
      { id: 'b', label: 'Alleen bij de supermarkt.' },
      { id: 'c', label: 'Alleen bij de huisarts.' },
      { id: 'd', label: 'Nergens; het verlengt zichzelf.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke dingen zijn “werk” in eenvoudige taal? (meerdere antwoorden)',
    questionEn: 'Which things are “work” in simple terms? (select all that apply)',
    options: [
      { id: 'a', label: 'Betaald werk voor een baas' },
      { id: 'b', label: 'Alleen gamen thuis' },
      { id: 'c', label: 'Stage (als dat bij je opleiding hoort)' },
      { id: 'd', label: 'Altijd vrijwilligerswerk zonder uitzondering als “geen werk”' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is de bus of tram in de stad?',
    questionEn: 'What is the bus or tram in the city?',
    options: [
      { id: 'a', label: 'Openbaar vervoer (OV).' },
      { id: 'b', label: 'Een privévliegtuig.' },
      { id: 'c', label: 'Alleen voor postpakketten.' },
      { id: 'd', label: 'Een zwembad.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een apotheek?',
    questionEn: 'What is a pharmacy?',
    options: [
      { id: 'a', label: 'Waar je medicijnen haalt met recept of soms zonder.' },
      { id: 'b', label: 'Waar je brood koopt.' },
      { id: 'c', label: 'Waar je een rijbewijs haalt.' },
      { id: 'd', label: 'Een sportschool.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke plekken zijn voor zieke mensen (niet spoed)? (meerdere antwoorden)',
    questionEn: 'Which places are for sick people (non-emergency)? (select all that apply)',
    options: [
      { id: 'a', label: 'Huisartsenpraktijk' },
      { id: 'b', label: 'Discotheek op vrijdagavond' },
      { id: 'c', label: 'Huisartsenpost (buiten reguliere tijden, niet-levensbedreigend)' },
      { id: 'd', label: 'Alleen een pretpark' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is een OV-chipkaart ongeveer?',
    questionEn: 'What is an OV-chipkaart roughly?',
    options: [
      { id: 'a', label: 'Een kaart om mee te reizen met bus/trein/metro (betalen/inchecken).' },
      { id: 'b', label: 'Een spaarkaart voor de supermarkt.' },
      { id: 'c', label: 'Een verzekeringspas.' },
      { id: 'd', label: 'Een bibliotheekpas voor alleen boeken in het buitenland.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een basisschool?',
    questionEn: 'What is a primary school?',
    options: [
      { id: 'a', label: 'School voor jonge kinderen (ongeveer 4–12 jaar).' },
      { id: 'b', label: 'Alleen voor volwassenen.' },
      { id: 'c', label: 'Een ziekenhuis.' },
      { id: 'd', label: 'Een zwembad.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke voorbeelden zijn beleefd? (meerdere antwoorden)',
    questionEn: 'Which examples are polite? (select all that apply)',
    options: [
      { id: 'a', label: '“Dank u wel” zeggen' },
      { id: 'b', label: 'Deur dichtslaan bij de buurman zonder woorden' },
      { id: 'c', label: '“Goedemorgen” tegen de buschauffeur' },
      { id: 'd', label: 'Hard schreeuwen in de wachtrij' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Waar meld je je als je nieuw in Nederland woont (eenvoudig)?',
    questionEn: 'Where do you register when you are new in the Netherlands (simple)?',
    options: [
      { id: 'a', label: 'Bij de gemeente.' },
      { id: 'b', label: 'Alleen bij de kapper.' },
      { id: 'c', label: 'Alleen in het café.' },
      { id: 'd', label: 'Nergens.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Wat is een bibliotheek?',
    questionEn: 'What is a library?',
    options: [
      { id: 'a', label: 'Een plek om boeken te lenen en soms te studeren.' },
      { id: 'b', label: 'Een plek om alleen auto’s te kopen.' },
      { id: 'c', label: 'Een ziekenhuis.' },
      { id: 'd', label: 'Een restaurant.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke dingen zijn “gezond leven” (eenvoudig)? (meerdere antwoorden)',
    questionEn: 'Which things are “healthy living” (simple)? (select all that apply)',
    options: [
      { id: 'a', label: 'Bewegen / wandelen' },
      { id: 'b', label: 'Alleen snoep eten, elke dag' },
      { id: 'c', label: 'Genoeg slapen' },
      { id: 'd', label: 'Nooit water drinken' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Welk land hoort bij deze vlag?',
    questionEn: 'Which country matches this flag?',
    questionImageUrl: KNM_FLAG_IMG_NL,
    options: [
      { id: 'a', label: 'Nederland' },
      { id: 'b', label: 'Duitsland' },
      { id: 'c', label: 'België' },
    ],
    correctOptionIds: ['a'],
  },
]

const B1_ONLY: KnmMcqItem[] = [
  {
    questionNl: 'Wat is een “WW-uitkering” in grote lijnen?',
    questionEn: 'What is a WW benefit in broad terms?',
    options: [
      { id: 'a', label: 'Een werkloosheidsuitkering onder voorwaarden (verzekerd werk, wachttijd, zoekplicht).' },
      { id: 'b', label: 'Een studiebeurs voor iedereen zonder voorwaarden.' },
      { id: 'c', label: 'Een gratis auto van de gemeente.' },
      { id: 'd', label: 'Een belastingkorting voor boodschappen.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke principes passen bij privacy (AVG) op werk? (meerdere antwoorden)',
    questionEn: 'Which principles fit workplace privacy (GDPR)? (select all that apply)',
    options: [
      { id: 'a', label: 'Alleen noodzakelijke persoonsgegevens verwerken' },
      { id: 'b', label: 'Alle privé-apps van collega’s doorzoeken zonder reden' },
      { id: 'c', label: 'Doelbinding: gegevens gebruiken voor het doel waarvoor ze zijn verzameld' },
      { id: 'd', label: 'Gegevens altijd voor altijd bewaren “voor de zekerheid”' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is een OR (ondernemingsraad) kort?',
    questionEn: 'What is a works council (OR) briefly?',
    options: [
      { id: 'a', label: 'Vertegenwoordiging van werknemers die meepraat over belangrijke bedrijfsbeslissingen (in grote lijnen).' },
      { id: 'b', label: 'Een club voor alleen managers.' },
      { id: 'c', label: 'Een verzekering tegen diefstal.' },
      { id: 'd', label: 'Een belastingdienst-kantoor in het bedrijf.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke uitspraken over een arbeidsconflict zijn redelijk? (meerdere antwoorden)',
    questionEn: 'Which statements about a labour conflict are reasonable? (select all that apply)',
    options: [
      { id: 'a', label: 'Je kunt vaak eerst intern klachtprocedures proberen' },
      { id: 'b', label: 'Je moet altijd direct ontslag nemen zonder praten' },
      { id: 'c', label: 'Juridisch advies (bijv. vakbond/juridisch loket) kan helpen' },
      { id: 'd', label: 'Je mag nooit documenten bewaren die bij je zaak horen' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is “scheiding van machten” in het Nederlandse stelsel (zeer kort)?',
    questionEn: 'What is “separation of powers” in the Dutch system (very short)?',
    options: [
      { id: 'a', label: 'Wetgevende, uitvoerende en rechterlijke macht zijn onderscheiden (hoofdlijn).' },
      { id: 'b', label: 'Alleen de koning maakt wetten en rechtspraak tegelijk.' },
      { id: 'c', label: 'Gemeenten zijn altijd hetzelfde als rechtbanken.' },
      { id: 'd', label: 'Er is geen onafhankelijke rechtspraak.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke thema’s horen bij duurzaamheid op werk? (meerdere antwoorden)',
    questionEn: 'Which themes fit sustainability at work? (select all that apply)',
    options: [
      { id: 'a', label: 'Minder verspillen (papier, energie, materialen)' },
      { id: 'b', label: 'Meer plastic wegwerpproducten zonder nadenken' },
      { id: 'c', label: 'Veilige afvalscheiding en milieuregels volgen' },
      { id: 'd', label: 'Alleen thuis duurzaam zijn; op werk maakt het niet uit' },
    ],
    correctOptionIds: ['a', 'c'],
  },
  {
    questionNl: 'Wat is een WW-uitkering niet?',
    questionEn: 'What is a WW benefit not?',
    options: [
      { id: 'a', label: 'Een automatisch levenslang inkomen zonder voorwaarden.' },
      { id: 'b', label: 'Iets waar vaak voorwaarden aan vastzitten (verzekerd, zoeken naar werk).' },
      { id: 'c', label: 'Een uitkering die met regels te maken kan hebben.' },
      { id: 'd', label: 'Iets waar het UWV bij kan betrokken zijn.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    questionNl: 'Welke van de drie vlaggen is de Duitse vlag?',
    questionEn: 'Which of the three flags is the German flag?',
    options: [
      { id: 'a', label: 'Nederland', imageUrl: KNM_FLAG_IMG_NL },
      { id: 'b', label: 'Duitsland', imageUrl: KNM_FLAG_IMG_DE },
      { id: 'c', label: 'België', imageUrl: KNM_FLAG_IMG_BE },
    ],
    correctOptionIds: ['b'],
  },
]

/** Eén label per kernvraag — zelfde volgorde als `A2_BANK_CORE`. */
const A2_CORE_CATEGORIES: KnmA2ExamCategory[] = [
  'zorg_gezondheid',
  'veiligheid_hulp',
  'overheid_recht',
  'onderwijs_opvoeding',
  'wonen_buurt',
  'werk_inkomen',
  'wonen_buurt',
  'overheid_recht',
  'werk_inkomen',
  'werk_inkomen',
  'werk_inkomen',
  'geld_belasting_verzekering',
  'overheid_recht',
  'werk_inkomen',
  'veiligheid_hulp',
  'integratie_cultuur',
  'geld_belasting_verzekering',
  'zorg_gezondheid',
  'werk_inkomen',
  'werk_inkomen',
  'overheid_recht',
  'integratie_cultuur',
  'overheid_recht',
  'integratie_cultuur',
]

if (A2_BANK_CORE.length !== A2_CORE_CATEGORIES.length) {
  throw new Error('KNM A2: A2_BANK_CORE and A2_CORE_CATEGORIES length mismatch')
}

const EXPANDED_A2_KNM: KnmMcqBankEntry[] = buildExpandedA2KnmEntries()
validateExpandedA2KnmEntries(EXPANDED_A2_KNM)

const A2_KNM_MASTER: KnmMcqBankEntry[] = [
  ...A2_BANK_CORE.map((it, i) => {
    const category = A2_CORE_CATEGORIES[i]!
    return {
      ...it,
      category,
      illustrationId: it.illustrationId ?? knmIllustrationIdForVignette(category, 0),
    }
  }),
  ...EXPANDED_A2_KNM,
]

const A2_BANK: KnmMcqItem[] = A2_KNM_MASTER.map(stripCategory)

/** A2 KNM volledige simulatie: 5 vragen per domein, willekeurig binnen elk domein, volgorde geschud. */
export function sampleA2KnmExamPoolIndices(sessionSeed: string): number[] {
  return sampleA2KnmExamPoolIndicesFromMaster(sessionSeed, A2_KNM_MASTER)
}

const B1_BANK: KnmMcqItem[] = [...A2_BANK, ...B1_ONLY]

assertKnmBank(A1_BANK, 'A1')
assertKnmBank(A2_BANK, 'A2')
assertKnmBank(B1_BANK, 'B1')

export function pickKnmMcq(level: ExamLevel, seed: string, taskIndex: number): KnmMcqItem {
  const bank = level === 'A1' ? A1_BANK : level === 'B1' ? B1_BANK : A2_BANK
  const ix = seedIndex(seed, taskIndex, bank.length)
  return bank[ix]!
}

/** Deterministic lookup for A2 KNM exam draws (full bank including generated items). */
export function getA2KnmMcqByPoolIndex(index: number): KnmMcqItem {
  const pool = A2_BANK
  const ix = ((index % pool.length) + pool.length) % pool.length
  return pool[ix]!
}

export function getA2KnmMcqPoolLength(): number {
  return A2_BANK.length
}
