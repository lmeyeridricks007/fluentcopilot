/**
 * Builds knmSlideDeckQuestionsData.ts from slide PDF OCR (scripts/knm-slides-ocr.txt).
 * Run: node scripts/build-knm-slide-deck-questions.mjs
 */
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

/** @type {Array<{category:string,questionNl:string,questionEn:string,good:string,wrongs:[string,string,string]}>} */
const ROWS = [
  // —— Wonen (slides 1–6) ——
  {
    category: 'wonen_buurt',
    questionNl: 'Voor wie zijn sociale huurwoningen in Nederland bedoeld?',
    questionEn: 'Who are social rental homes in the Netherlands meant for?',
    good: 'Voor mensen met een laag inkomen; je schrijft je in bij een woningbouwvereniging (woningcorporatie).',
    wrongs: [
      'Alleen voor mensen met een hoog inkomen zonder inschrijving.',
      'Alleen via de politie; woningcorporaties bestaan niet.',
      'Iedereen krijgt direct een huis zonder wachttijd of voorwaarden.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Wat is een urgentieverklaring bij sociale huur?',
    questionEn: 'What is an urgency declaration for social housing?',
    good: 'Een verklaring van de gemeente bij een speciale situatie (bijv. scheiding met kinderen of gezondheid) om sneller aan een woning te komen.',
    wrongs: [
      'Een verzekering tegen waterschade.',
      'Een paspoort voor reizen binnen Europa.',
      'Automatisch voor iedereen die langer dan een jaar wacht.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Huren in de vrije sector is in de regel…',
    questionEn: 'Renting in the private sector is usually…',
    good: 'Duurder dan sociale huur; je huurt van een woningcorporatie of huisbaas en zoekt via advertenties of een makelaar.',
    wrongs: [
      'Altijd goedkoper dan sociale huur zonder contract.',
      'Alleen mogelijk zonder inkomen.',
      'Verboden voor mensen met een baan.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Wat hoort in een huurcontract in Nederland vaak?',
    questionEn: 'What is often included in a Dutch rental contract?',
    good: 'Huurprijs, servicekosten, opzegtermijn en wie onderhoud en reparaties betaalt.',
    wrongs: [
      'Alleen je stemrecht bij verkiezingen.',
      'Geen regels over lekkage; dat is altijd voor de huurder.',
      'Alleen mondelinge afspraken zonder schriftelijke rechten.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Waar vraag je huurtoeslag aan als de huur te hoog is voor je inkomen?',
    questionEn: 'Where do you apply for rent allowance if rent is too high for your income?',
    good: 'Via www.toeslagen.nl (belastingdienst).',
    wrongs: ['Bij de politie voor elke huurvraag.', 'Bij 112.', 'Huurtoeslag bestaat niet in Nederland.'],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Om een huis te kopen hebben de meeste mensen…',
    questionEn: 'To buy a house most people need…',
    good: 'Een hypotheek (lening) van de bank na advies over hun financiële situatie.',
    wrongs: [
      'Geen geld en geen contract; de bank betaalt alles automatisch.',
      'Alleen toestemming van de buren.',
      'Een rijbewijs in plaats van een hypotheek.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Wat is renteaftrek bij een hypotheek?',
    questionEn: 'What is mortgage interest deduction?',
    good: 'Je mag de rente die je betaalt vaak aftrekken bij de belastingaangifte.',
    wrongs: [
      'Je hoeft nooit rente te betalen.',
      'De gemeente betaalt je hele hypotheek.',
      'Alleen voor autoverzekeringen.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Een aansprakelijkheidsverzekering dekt vooral…',
    questionEn: 'Liability insurance mainly covers…',
    good: 'Schade die jij of je kind aan spullen van anderen toebrengt (vaak vergoed).',
    wrongs: [
      'Alleen je eigen huurprijs.',
      'Alleen reizen buiten Europa.',
      'Alle belastingen van de Belastingdienst.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Energie in huis regel je in Nederland meestal…',
    questionEn: 'Energy at home in the Netherlands you usually arrange…',
    good: 'Zelf bij een energiebedrijf; je kiest een aanbieder en betaalt maandelijks.',
    wrongs: [
      'Alleen via de huisarts.',
      'Automatisch via de politie zonder contract.',
      'Je mag nooit zelf een bedrijf kiezen.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Je ruikt gas in huis. Wat is een verstandige eerste stap volgens de slides?',
    questionEn: 'You smell gas at home. What is a sensible first step per the slides?',
    good: 'Zelf de hoofdkraan van het gas dichtdraaien en daarna je energiebedrijf bellen als nodig.',
    wrongs: [
      'Meteen 112 bellen zonder iets te doen.',
      'Niets doen; gas lost zichzelf op.',
      'De buren altijd schuldig stellen zonder te controleren.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Waar zet je glas en papier volgens veel gemeenten?',
    questionEn: 'Where do you put glass and paper in many municipalities?',
    good: 'Glas in de glasbak en papier in de papierbak (afval scheiden).',
    wrongs: [
      'Alles in één zak zonder scheiden is verplicht.',
      'Alleen bij de Belastingdienst.',
      'In de supermarkt bij de kassa.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Je zet huisafval op een verkeerde dag op straat. Wat kan er gebeuren?',
    questionEn: 'You put household waste on the street on the wrong day. What can happen?',
    good: 'Je kunt een boete krijgen; de gemeente haalt afval op vaste dagen op.',
    wrongs: [
      'Je krijgt automatisch huurtoeslag.',
      'Niets; afval mag altijd elke dag.',
      'Je verliest je paspoort.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Harde muziek van buren: wat is meestal de eerste stap?',
    questionEn: 'Loud music from neighbours: what is usually the first step?',
    good: 'Eerst met de buren praten; als dat niet helpt kun je hulp van de politie vragen.',
    wrongs: [
      'Meteen 112 voor elke muzieknoot.',
      'Harder muziek zetten als antwoord.',
      'Niets doen; overlast is altijd toegestaan.',
    ],
  },

  // —— Werk en Inkomen (7–16) ——
  {
    category: 'werk_inkomen',
    questionNl: 'Waar kun je vacatures vinden volgens de slides?',
    questionEn: 'Where can you find job vacancies per the slides?',
    good: 'Bijvoorbeeld UWV WERKbedrijf (werk.nl), nationalevacaturebank.nl, vacant.nl of een uitzendbureau.',
    wrongs: [
      'Alleen bij de tandarts.',
      'Alleen via 112.',
      'Vacatures zijn geheim en niet publiek.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Wat is een uitzendbureau?',
    questionEn: 'What is a temp agency?',
    good: 'Een bureau met vaak tijdelijk werk; je kunt je inschrijven en solliciteren op vacatures.',
    wrongs: [
      'Een school voor kinderen onder 12 jaar.',
      'Een ziekenhuisafdeling voor spoed.',
      'Een politiebureau alleen voor paspoorten.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Je bent ziek en kunt niet werken. Wat moet je volgens je contract vaak doen?',
    questionEn: 'You are ill and cannot work. What must you often do per your contract?',
    good: 'Je ziek melden bij je werkgever; bij langdurige ziekte ook bij de bedrijfsarts en re-integratie.',
    wrongs: [
      'Niets melden tot je beter bent.',
      'Alleen op sociale media posten.',
      'Direct stoppen met werken zonder iets te zeggen.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Wat is een WW-uitkering?',
    questionEn: 'What is WW unemployment benefit?',
    good: 'Een uitkering als je werkloos bent en aan voorwaarden voldoet (o.a. gewerkt vóór werkloosheid).',
    wrongs: [
      'Gratis studie aan de universiteit voor iedereen.',
      'Een verzekering tegen lekkage.',
      'Automatisch zonder inschrijven bij UWV.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Wat staat er vaak in een arbeidscontract?',
    questionEn: 'What is often in an employment contract?',
    good: 'Salaris, startdatum, uren per week, vakantie en eventueel proeftijd.',
    wrongs: [
      'Alleen je BSN zonder salaris.',
      'Geen regels over ziek melden.',
      'Alleen feestdagen zonder werktijden.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Wat is een CAO?',
    questionEn: 'What is a CAO?',
    good: 'Collectieve afspraken over loon en arbeidsvoorwaarden in een sector.',
    wrongs: ['Een paspoort.', 'Een huisartsenpost.', 'Een gemeentelijke vuilniszak.'],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Bruto salaris versus netto salaris: wat klopt?',
    questionEn: 'Gross vs net salary: what is correct?',
    good: 'Bruto is vóór belasting en premies; netto is wat je ontvangt na inhoudingen.',
    wrongs: [
      'Bruto en netto zijn altijd hetzelfde bedrag.',
      'Netto is altijd hoger dan bruto.',
      'Premies bestaan niet in Nederland.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Discriminatie op het werk is in Nederland…',
    questionEn: 'Discrimination at work in the Netherlands is…',
    good: 'Wettelijk verboden; je kunt melden bij anti-discriminatiebureau of politie.',
    wrongs: [
      'Toegestaan als het een grapje is.',
      'Alleen verboden voor werkgevers, niet voor collega’s.',
      'Niet te melden; je moet zwijgen.',
    ],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'Wat doet de Kamer van Koophandel (KvK)?',
    questionEn: 'What does the Chamber of Commerce do?',
    good: 'Bedrijven registreren (KvK-nummer) en informatie geven aan ondernemers.',
    wrongs: [
      'Alleen ziekenhuisopnames regelen.',
      'Paspoorten uitgeven voor iedereen.',
      'WW-uitkeringen betalen aan werknemers.',
    ],
  },

  // —— Interactie, waarden en normen (17–27) ——
  {
    category: 'integratie_cultuur',
    questionNl: 'Hoe begroeten veel Nederlanders elkaar informeel?',
    questionEn: 'How do many Dutch people greet each other informally?',
    good: 'Met een hand geven en je naam zeggen; soms drie zoenen in informele kring.',
    wrongs: [
      'Altijd alleen met een diepe buiging zonder woorden.',
      'Nooit handen geven; dat is onbeleefd.',
      'Alleen via een brief van de Belastingdienst.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Wanneer gebruik je vaak “u” in plaats van “jij”?',
    questionEn: 'When do you often use formal “u” instead of “jij”?',
    good: 'Vaak tegen oudere mensen of soms tegen je baas; veel Nederlanders zeggen “jij” onder elkaar.',
    wrongs: [
      'Altijd tegen kinderen op school.',
      'Nooit in Nederland; “u” bestaat niet.',
      'Alleen tegen de politie op 112.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Op Koningsdag vier je in Nederland vooral…',
    questionEn: 'On King’s Day you mainly celebrate…',
    good: 'De verjaardag van koning Willem-Alexander (27 april, vrije dag, vaak oranje).',
    wrongs: [
      'De bevrijding in 1945 op 5 mei.',
      'Sinterklaas op 5 december.',
      'Kerst op 25 december alleen in scholen.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Wat gebeurt er op 4 mei in Nederland?',
    questionEn: 'What happens on 4 May in the Netherlands?',
    good: 'Dodenherdenking (herdenken van oorlogsslachtoffers).',
    wrongs: [
      'Koningsdag met vrijmarkt.',
      'Start van het schooljaar.',
      'Verplichte belastingaangifte.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Wat viert Nederland op 5 mei?',
    questionEn: 'What does the Netherlands celebrate on 5 May?',
    good: 'Bevrijdingsdag (einde Duitse bezetting 1945); soms vrije dag.',
    wrongs: ['Sinterklaas.', 'Koningsdag op 27 april.', 'Pasen alleen in de kerk.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Sinterklaas wordt in Nederland vooral gevierd…',
    questionEn: 'Sinterklaas is mainly celebrated in the Netherlands…',
    good: 'Begin december (o.a. 5 december); kinderen zetten schoenen en krijgen cadeaus/snoep.',
    wrongs: ['In juli met oranje versiering.', 'Alleen op het werk zonder traditie.', 'Op 4 mei.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'In de rij bij de supermarkt vindt veel Nederlanders het vervelend als je…',
    questionEn: 'In the supermarket queue many Dutch find it annoying if you…',
    good: 'Voordringt (cut the queue).',
    wrongs: [
      'Rustig wacht op je beurt.',
      'Een bonnetje laat zien.',
      'Vriendelijk groet.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Nederlandse directheid betekent in de omgang vaak…',
    questionEn: 'Dutch directness in interaction often means…',
    good: 'Open je mening geven; bij problemen eerst direct praten (bijv. met buren).',
    wrongs: [
      'Nooit je mening zeggen.',
      'Alleen schreeuwen op straat.',
      'Altijd via de koning beslissen.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Vrijheid van meningsuiting in de grondwet betekent…',
    questionEn: 'Freedom of expression in the constitution means…',
    good: 'Je mag je mening geven, ook in media, met grenzen (geen oproep tot geweld).',
    wrongs: [
      'Je mag alles zeggen inclusief oproep tot geweld.',
      'Alleen de koning mag spreken.',
      'Er is geen vrijheid van meningsuiting.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Huiselijk geweld in Nederland is…',
    questionEn: 'Domestic violence in the Netherlands is…',
    good: 'Verboden; je kunt melden bij Slachtofferhulp of de politie.',
    wrongs: [
      'Toegestaan binnenshuis.',
      'Alleen een privézaak zonder hulp.',
      'Niet strafbaar.',
    ],
  },

  // —— Onderwijs en Opvoeding (28–32) ——
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Vanaf welke leeftijd is leerplicht in Nederland?',
    questionEn: 'From what age is compulsory education in the Netherlands?',
    good: 'Vanaf 5 jaar; tot 16 jaar (of 18 zonder diploma).',
    wrongs: ['Vanaf 16 jaar alleen.', 'School is vrijwillig tot 25.', 'Alleen in de vakantie.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Wat doet het consultatiebureau?',
    questionEn: 'What does the child health clinic do?',
    good: 'Controleert gezondheid en ontwikkeling van baby’s/kinderen 0–4 jaar en geeft vaccinaties.',
    wrongs: [
      'Alleen paspoorten aanvragen.',
      'Alleen WW-uitkeringen.',
      'Alleen rijlessen geven.',
    ],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Na de basisschool gaan leerlingen meestal naar…',
    questionEn: 'After primary school pupils usually go to…',
    good: 'Voortgezet onderwijs (middelbare school: vmbo, havo of vwo).',
    wrongs: ['Alleen universiteit direct.', 'Geen school meer.', 'Alleen inburgering zonder onderwijs.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Kinderopvangtoeslag vraag je aan via…',
    questionEn: 'Childcare allowance you apply for via…',
    good: 'www.toeslagen.nl (belastingdienst).',
    wrongs: ['112.', 'De politie voor elke rekening.', 'Alleen op school zonder website.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Kinderbijslag ontvang je van…',
    questionEn: 'Child benefit you receive from…',
    good: 'De SVB (Sociale Verzekeringsbank) tot het kind 18 jaar is.',
    wrongs: ['De sportschool.', 'Je werkgever alleen voor vakantie.', 'De apotheek.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Studiefinanciering na de middelbare school regel je via…',
    questionEn: 'Student finance after secondary school you arrange via…',
    good: 'DUO (lening of geld voor studiekosten, aanvragen).',
    wrongs: ['De gemeente voor elk vak.', '112.', 'Alleen contant zonder aanvraag.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Ouders zijn juridisch verantwoordelijk voor kinderen tot…',
    questionEn: 'Parents are legally responsible for children until…',
    good: '16 jaar (daarna zijn 18-jarigen volwassen voor contracten).',
    wrongs: ['30 jaar.', 'Alleen tot 5 jaar.', 'Nooit; kinderen zijn altijd zelf verantwoordelijk.'],
  },

  // —— Gezondheid (33–41) ——
  {
    category: 'zorg_gezondheid',
    questionNl: 'Bij niet-spoedeisende klachten overdag ga je meestal eerst naar…',
    questionEn: 'For non-urgent complaints during the day you usually go first to…',
    good: 'Je huisarts (bellen voor een afspraak).',
    wrongs: ['Altijd 112.', 'Alleen de tandarts voor koorts.', 'De Belastingdienst.'],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Medicijnen op recept haal je bij…',
    questionEn: 'Prescription medicines you get at…',
    good: 'De apotheek met het recept van de huisarts of specialist.',
    wrongs: [
      'De supermarkt zonder recept voor alles.',
      'Het UWV.',
      'De gemeente zonder afspraak.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'De tandarts valt in Nederland…',
    questionEn: 'Dental care in the Netherlands…',
    good: 'Meestal niet onder de basisverzekering; vaak aparte tandartsverzekering (kinderen tot 18 gratis).',
    wrongs: [
      'Altijd volledig gratis in de basisverzekering voor volwassenen.',
      'Alleen via 112.',
      'Verboden zonder diploma.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Buiten kantooruren bel je voor huisartsenhulp vaak…',
    questionEn: 'Outside office hours for GP care you often call…',
    good: 'Het nummer op het antwoordapparaat van je huisarts of de huisartsenpost.',
    wrongs: [
      'Alleen 112 voor elke hoofdpijn.',
      'De Belastingdienst.',
      'Je hoeft nooit te bellen; wacht altijd tot maandag.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Wanneer bel je 112?',
    questionEn: 'When do you call 112?',
    good: 'Bij levensgevaar of zeer urgente situaties (bijv. niet ademen, ernstig ongeluk).',
    wrongs: [
      'Voor een gewone afspraak bij de huisarts.',
      'Om huurtoeslag aan te vragen.',
      'Als je paspoort kwijt is zonder spoed.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Iedereen die in Nederland woont moet hebben…',
    questionEn: 'Everyone living in the Netherlands must have…',
    good: 'Minstens een basisverzekering voor zorgkosten.',
    wrongs: [
      'Geen verzekering; zorg is altijd gratis.',
      'Alleen een autoverzekering.',
      'Alleen reisverzekering buiten Europa.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Wat is eigen risico bij de zorgverzekering?',
    questionEn: 'What is the health insurance deductible?',
    good: 'Een jaarlijks bedrag dat je zelf betaalt voordat de verzekering veel zorg vergoedt.',
    wrongs: [
      'Je maandpremie aan de gemeente.',
      'Een boete voor te laat stemmen.',
      'Gratis tandarts voor iedereen.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Zorgtoeslag is voor mensen met…',
    questionEn: 'Healthcare allowance is for people with…',
    good: 'Een lager inkomen; aanvragen via belastingdienst.nl.',
    wrongs: [
      'Alleen een hoog inkomen.',
      'Alleen kinderen op de basisschool.',
      'Iedereen automatisch zonder aanvraag.',
    ],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'De verloskundige helpt vooral bij…',
    questionEn: 'The midwife mainly helps with…',
    good: 'Zwangerschap, controles en bevalling.',
    wrongs: ['Autoreparaties.', 'Belasting invullen.', 'Rijbewijs verlengen.'],
  },

  // —— Instanties: Gemeente, Politie, Belasting (42–47) ——
  {
    category: 'overheid_recht',
    questionNl: 'Waar schrijf je je in als je in Nederland gaat wonen?',
    questionEn: 'Where do you register when you live in the Netherlands?',
    good: 'Bij de gemeente (GBA/BRP) waar je woont.',
    wrongs: [
      'Alleen bij de supermarkt.',
      'Nergens; de gemeente ziet verhuizing vanzelf.',
      'Alleen via sociale media.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Paspoort of ID-kaart vraag je aan bij…',
    questionEn: 'Passport or ID card you apply for at…',
    good: 'Je eigen gemeente.',
    wrongs: ['Elke bank zonder afspraak.', '112.', 'De sportschool.'],
  },
  {
    category: 'overheid_recht',
    questionNl: 'DigiD gebruik je vooral om…',
    questionEn: 'You mainly use DigiD to…',
    good: 'Veilig in te loggen bij overheidswebsites (met BSN).',
    wrongs: [
      'Gratis medicijnen te bestellen zonder arts.',
      'Te stemmen zonder identiteit.',
      'Je rijbewijs te verlengen zonder gemeente.',
    ],
  },
  {
    category: 'veiligheid_hulp',
    questionNl: 'Identificatieplicht geldt in Nederland vanaf…',
    questionEn: 'Obligation to show ID in the Netherlands applies from age…',
    good: '14 jaar (in OV vanaf 12); geldig ID: paspoort, ID-kaart of rijbewijs.',
    wrongs: ['30 jaar alleen.', 'Geen ID nodig in Nederland.', 'Alleen op Koningsdag.'],
  },
  {
    category: 'veiligheid_hulp',
    questionNl: 'Wat zijn drie taken van de politie volgens de slides?',
    questionEn: 'What are three police tasks per the slides?',
    good: 'Hulpverlening, handhaving openbare orde, en voorkomen/beëindigen van strafbare feiten.',
    wrongs: [
      'Belasting innen en scholen bouwen.',
      'Alleen paspoorten maken.',
      'Alleen verkeersborden plaatsen.',
    ],
  },
  {
    category: 'veiligheid_hulp',
    questionNl: 'Voor niet-spoed meldingen bij de politie bel je vaak…',
    questionEn: 'For non-urgent police matters you often call…',
    good: '0900-8844 (niet 112 tenzij spoed).',
    wrongs: ['112 voor een verloren portemonnee zonder gevaar.', 'De huisarts.', 'DUO.'],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Iedereen in Nederland heeft een…',
    questionEn: 'Everyone in the Netherlands has a…',
    good: 'BSN (burgerservicenummer) op paspoort en formulieren.',
    wrongs: ['Alleen een rijbewijs zonder nummer.', 'Geen persoonlijk nummer.', 'Alleen een KvK-nummer als kind.'],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Belastingaangifte doen de meeste mensen…',
    questionEn: 'Most people file tax returns…',
    good: 'Elk jaar bij de Belastingdienst (inkomsten en kosten doorgeven).',
    wrongs: [
      'Nooit; belasting is optioneel.',
      'Alleen bij de politie.',
      'Alleen als je werkloos bent.',
    ],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Welke toeslagen noemt de slide deck expliciet?',
    questionEn: 'Which allowances does the slide deck name explicitly?',
    good: 'Huurtoeslag, zorgtoeslag en kinderopvangtoeslag.',
    wrongs: [
      'Alleen vakantiegeld van werkgever.',
      'Alleen studiefinanciering via school.',
      'Geen toeslagen in Nederland.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Bij bezwaar tegen een overheidsbesluit kun je gratis hulp krijgen van…',
    questionEn: 'For objection against a government decision you can get free help from…',
    good: 'Sociale raadslieden (geen advocaten, wel formulieren en brieven).',
    wrongs: [
      'Alleen 112.',
      'Je mag nooit bezwaar maken.',
      'Alleen de koning persoonlijk.',
    ],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Juridisch advies voor burgers is o.a. te vinden bij…',
    questionEn: 'Legal advice for citizens is available at…',
    good: 'Het Juridisch Loket (gratis informatie; doorverwijzing naar advocaat indien nodig).',
    wrongs: ['Alleen de supermarkt.', '112 voor elk formulier.', 'De GGD voor elke rechtszaak.'],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'In Nederland is verplicht…',
    questionEn: 'In the Netherlands it is mandatory to have…',
    good: 'Zorgverzekering en autoverzekering (als je een auto hebt).',
    wrongs: [
      'Alleen een reisverzekering.',
      'Geen verzekeringen.',
      'Alleen inboedelverzekering voor iedereen.',
    ],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Je bankpas is gestolen. Wat moet je eerst doen?',
    questionEn: 'Your debit card is stolen. What must you do first?',
    good: 'Snel je rekening laten blokkeren bij de bank en aangifte bij de politie.',
    wrongs: [
      'Niets; diefstal is niet erg.',
      'Alleen een nieuwe pas aanvragen zonder blokkeren.',
      'Wachten tot de dief terugkomt.',
    ],
  },

  // —— Politiek (51–57) ——
  {
    category: 'overheid_recht',
    questionNl: 'De grondwet noemt onder meer…',
    questionEn: 'The constitution mentions among other things…',
    good: 'Vrijheid van meningsuiting, godsdienst, onderwijs en verbod op discriminatie.',
    wrongs: [
      'Alleen voetbalregels.',
      'Dat de koning alle wetten maakt.',
      'Geen rechten voor burgers.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'De drie machten in Nederland zijn…',
    questionEn: 'The three powers in the Netherlands are…',
    good: 'Uitvoerend (regering), wetgevend (parlement) en rechterlijk (rechters).',
    wrongs: [
      'Alleen de koning.',
      'Gemeente, school en ziekenhuis.',
      'Politie, bank en supermarkt.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'De Tweede Kamer heeft hoeveel leden?',
    questionEn: 'How many members does the House of Representatives have?',
    good: '150 personen.',
    wrongs: ['75 personen.', '12 personen.', 'Eén minister.'],
  },
  {
    category: 'overheid_recht',
    questionNl: 'De Eerste Kamer heeft vooral de rol om…',
    questionEn: 'The Senate mainly has the role to…',
    good: 'Wetten te controleren en te stemmen over nieuwe wetten (75 leden).',
    wrongs: [
      'Dagelijks de regering te leiden.',
      'Paspoorten uit te geven.',
      'Ziekenhuiszorg te betalen.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Nederland is een…',
    questionEn: 'The Netherlands is a…',
    good: 'Democratie, koninkrijk en rechtstaat.',
    wrongs: ['Dictatuur zonder verkiezingen.', 'Alleen een republiek zonder koning.', 'Geen rechtsstaat.'],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Stemmen voor de Tweede Kamer mag je vanaf…',
    questionEn: 'You may vote for the House of Representatives from age…',
    good: '18 jaar (met Nederlandse nationaliteit en aan kiesregels voldoen).',
    wrongs: ['12 jaar.', 'Alleen in Den Haag wonend.', 'Zonder identiteitsbewijs altijd.'],
  },
  {
    category: 'overheid_recht',
    questionNl: 'De koning heeft vooral…',
    questionEn: 'The king mainly has…',
    good: 'Een ceremoniële/symbolische functie; hij ondertekent wetten en leest de troonrede op Prinsjesdag.',
    wrongs: [
      'Alle dagelijkse regeringstaken alleen.',
      'Geen rol in het stelsel.',
      'De macht om rechters te ontslaan.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Gemeenteraadsverkiezingen zijn…',
    questionEn: 'Municipal council elections are…',
    good: 'Om de 4 jaar; stemmen vanaf 18 jaar (ook met langdurig legaal verblijf zonder NL-nationaliteit).',
    wrongs: [
      'Elke maand verplicht.',
      'Alleen voor mensen ouder dan 50.',
      'Alleen online zonder ID.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Nederland is lid van de Europese Unie. De EU maakt wetten voor o.a.…',
    questionEn: 'The Netherlands is an EU member. The EU makes laws for e.g.…',
    good: 'Economie, veiligheid en milieu (landen kunnen ook afspraken maken).',
    wrongs: [
      'Alleen voetbal en scholen.',
      'Niets; Nederland volgt geen EU-regels.',
      'Alleen paspoorten voor de hele wereld.',
    ],
  },

  // —— Geschiedenis en Geografie (58–65) ——
  {
    category: 'integratie_cultuur',
    questionNl: 'Het Wilhelmus is het Nederlandse…',
    questionEn: 'The Wilhelmus is the Dutch…',
    good: 'Volkslied (verbonden met Willem van Oranje).',
    wrongs: ['Grondwet op papier.', 'Paspoort.', 'Belastingformulier.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'De Tachtigjarige Oorlog eindigde in…',
    questionEn: 'The Eighty Years’ War ended in…',
    good: '1648; de Republiek werd een zelfstandige staat.',
    wrongs: ['1945.', '1814 alleen.', '2002 met de euro.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'De VOC was vooral…',
    questionEn: 'The VOC was mainly…',
    good: 'Een handelsmaatschappij in de Gouden Eeuw (handel in Azië).',
    wrongs: ['Een zorgverzekeraar.', 'Een school.', 'De politie.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'De Tweede Wereldoorlog in Nederland eindigde met bevrijding in…',
    questionEn: 'WWII in the Netherlands ended with liberation in…',
    good: '1945 (5 mei Bevrijdingsdag, 4 mei herdenking).',
    wrongs: ['1918.', '1648.', '1957 met de EU.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Na de watersnoodramp van 1953 kwam onder meer…',
    questionEn: 'After the 1953 flood disaster came among other things…',
    good: 'Het Deltaplan voor betere bescherming tegen water.',
    wrongs: [
      'Het afschaffen van alle dijken.',
      'Verhuizing van Amsterdam naar België.',
      'De eerste grondwet in 1814 alleen.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'De hoofdstad van Nederland is…',
    questionEn: 'The capital of the Netherlands is…',
    good: 'Amsterdam (regering en parlement zitten grotendeels in Den Haag).',
    wrongs: ['Rotterdam alleen.', 'Utrecht.', 'Maastricht.'],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'De Randstad bestaat vooral uit…',
    questionEn: 'The Randstad mainly consists of…',
    good: 'Amsterdam, Rotterdam, Den Haag en Utrecht (westen, veel werk).',
    wrongs: [
      'Alleen het noorden met Waddeneilanden.',
      'Flevoland alleen.',
      'Limburg in het zuiden.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Nederland grenst aan…',
    questionEn: 'The Netherlands borders…',
    good: 'België (zuid) en Duitsland (oost).',
    wrongs: ['Spanje en Italië.', 'Alleen Engeland over land.', 'Frankrijk direct.'],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Flevoland is vooral…',
    questionEn: 'Flevoland is mainly…',
    good: 'Een provincie op drooggelegd land (polder).',
    wrongs: ['Een eiland in de Noordzee zonder land.', 'De hoofdstad.', 'Een bergketen.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Een polder is…',
    questionEn: 'A polder is…',
    good: 'Land dat eerst water was en droog is gemaakt (met dijken/gemalen).',
    wrongs: ['Een woestijn.', 'Een berg.', 'Een andere taal.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'De officiële taal van Nederland is…',
    questionEn: 'The official language of the Netherlands is…',
    good: 'Nederlands (Fries is ook officieel in Friesland).',
    wrongs: ['Alleen Engels.', 'Duits overal verplicht.', 'Frans.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Anne Frank is bekend van…',
    questionEn: 'Anne Frank is known for…',
    good: 'Haar dagboek over onderduiken tijdens de Tweede Wereldoorlog.',
    wrongs: ['De Deltawerken bouwen.', 'Het ontwerp van de euro.', 'De VOC oprichten.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Sinds 2002 gebruiken veel EU-landen de munt…',
    questionEn: 'Since 2002 many EU countries use the currency…',
    good: 'Euro (€).',
    wrongs: ['Gulden alleen in Nederland.', 'Dollar.', 'Geen gemeenschappelijke munt.'],
  },
  {
    category: 'wonen_buurt',
    questionNl: '27% van Nederland ligt…',
    questionEn: '27% of the Netherlands lies…',
    good: 'Onder zeeniveau (beschermd door dijken en Deltawerken).',
    wrongs: ['Boven 3000 meter hoogte.', 'In de woestijn.', 'Op de maan.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Op 31 december en 1 januari vieren veel Nederlanders…',
    questionEn: 'On 31 December and 1 January many Dutch celebrate…',
    good: 'Oud en nieuw (nieuw jaar, vaak vuurwerk en oliebollen).',
    wrongs: ['Koningsdag.', 'Sinterklaas officieel.', 'Alleen 4 mei.'],
  },

  // —— Extra uit PDF (tot 100+) ——
  {
    category: 'werk_inkomen',
    questionNl: 'WIA-uitkering krijg je vooral als je…',
    questionEn: 'WIA benefit you mainly get if you…',
    good: 'Langdurig arbeidsongeschikt bent en niet kunt werken.',
    wrongs: ['Op vakantie bent.', 'Een paspoort aanvraagt.', '18 jaar wordt.'],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'AOW krijg je vanaf ongeveer…',
    questionEn: 'State pension AOW you get from about…',
    good: '67 jaar (ouderdomspensioen).',
    wrongs: ['18 jaar.', '12 jaar.', 'Alleen als je werkloos bent.'],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'De Arbo-wet gaat over…',
    questionEn: 'The Arbo law is about…',
    good: 'Veilig en gezond werken (bijv. goede stoel, helm in de bouw).',
    wrongs: ['Belasting op honden.', 'Paspoorten.', 'Schoolvakanties.'],
  },
  {
    category: 'werk_inkomen',
    questionNl: 'De ondernemingsraad (OR) mag onder meer beslissen over…',
    questionEn: 'The works council may among other things decide on…',
    good: 'Plannen van de werkgever die werknemers raken, zoals werktijden.',
    wrongs: ['Je paspoort.', 'Huurtoeslag.', '112.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Bij kraamvisite krijgen gasten vaak…',
    questionEn: 'At a maternity visit guests often receive…',
    good: 'Beschuit met muisjes (roze voor meisje, blauw voor jongen).',
    wrongs: ['Alleen een rijbewijs.', 'Belastingformulieren.', 'Niets; kraamvisite bestaat niet.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Trouwen (formeel) in Nederland gebeurt meestal eerst…',
    questionEn: 'Formal marriage in the Netherlands usually happens first…',
    good: 'In het gemeentehuis (burgerlijke stand).',
    wrongs: ['Alleen in de supermarkt.', 'Via 112.', 'Alleen online zonder gemeente.'],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'NPO 1, 2 en 3 zijn…',
    questionEn: 'NPO 1, 2 and 3 are…',
    good: 'Nederlandse publieke televisiekanalen (betaald door de overheid).',
    wrongs: ['Partijen in de Tweede Kamer.', 'Ziekenhuizen.', 'Energieleveranciers.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'In een stiltecoupé in de trein…',
    questionEn: 'In a quiet zone on the train…',
    good: 'Mag je niet praten (rust voor reizigers).',
    wrongs: ['Moet je hard muziek draaien.', 'Mag je alleen eten.', 'Is praten verplicht.'],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'Aan het einde van groep 8 op de basisschool…',
    questionEn: 'At the end of group 8 in primary school…',
    good: 'Krijgen leerlingen de CITO-toets en advies voor het niveau op de middelbare school.',
    wrongs: [
      'Stoppen alle kinderen met school.',
      'Krijgen ze alleen een rijbewijs.',
      'Gaat iedereen direct naar de universiteit.',
    ],
  },
  {
    category: 'onderwijs_opvoeding',
    questionNl: 'VWO, HAVO en VMBO zijn…',
    questionEn: 'VWO, HAVO and VMBO are…',
    good: 'Niveaus op de middelbare school (voortgezet onderwijs).',
    wrongs: ['Provincies.', 'Verzekeringen.', 'Politieke partijen.'],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Voor een SOA kun je ook terecht bij…',
    questionEn: 'For an STI you can also go to…',
    good: 'De GGD (gemeentelijke gezondheidsdienst), naast de huisarts.',
    wrongs: ['De Kamer van Koophandel.', 'DUO alleen.', 'De sportschool.'],
  },
  {
    category: 'zorg_gezondheid',
    questionNl: 'Huisartsen hebben beroepsgeheim. Dat betekent…',
    questionEn: 'GPs have professional secrecy. That means…',
    good: 'De huisarts mag niet zomaar over je gezondheid praten met buitenstaanders.',
    wrongs: [
      'Alles op internet zetten.',
      'Altijd de buren informeren.',
      'Geen afspraak nodig.',
    ],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Voor een permanente verblijfsvergunning moet je minstens…',
    questionEn: 'For a permanent residence permit you must at least…',
    good: '5 jaar in Nederland wonen (aanvragen bij gemeente).',
    wrongs: ['1 week wonen.', 'Nooit inschrijven.', 'Alleen toerist zijn.'],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Op veel producten in de winkel zit…',
    questionEn: 'On many products in shops there is…',
    good: '21% BTW die naar de belastingdienst gaat.',
    wrongs: ['Geen belasting.', 'Alleen huurtoeslag.', 'Alleen premie voor AOW.'],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Een acceptgiro gebruik je om…',
    questionEn: 'You use a payment slip (acceptgiro) to…',
    good: 'Een rekening te betalen door het formulier naar het bedrijf te sturen.',
    wrongs: [
      'Te stemmen bij verkiezingen.',
      'Een paspoort aan te vragen.',
      'Medicijnen zonder recept te krijgen.',
    ],
  },
  {
    category: 'geld_belasting_verzekering',
    questionNl: 'Brandverzekering dekt vooral schade door…',
    questionEn: 'Fire insurance mainly covers damage from…',
    good: 'Brand in je huis (volgens polisvoorwaarden).',
    wrongs: ['Salaris van je baas.', 'Studiekosten.', 'Paspoort kwijt.'],
  },
  {
    category: 'overheid_recht',
    questionNl: 'Een referendum is volgens de slides…',
    questionEn: 'A referendum according to the slides is…',
    good: 'Een bijzondere verkiezing waarbij je ja of nee stemt (komt niet vaak voor).',
    wrongs: [
      'Elke week verplicht.',
      'Alleen voor de koning.',
      'Hetzelfde als de CITO-toets.',
    ],
  },
  {
    category: 'wonen_buurt',
    questionNl: 'Het IJsselmeer en de Afsluitdijk…',
    questionEn: 'The IJsselmeer and Afsluitdijk…',
    good: 'Beschermen Nederland tegen water; de Afsluitdijk verbindt Noord-Holland en Friesland.',
    wrongs: [
      'Zijn politieke partijen.',
      'Zijn alleen voor vliegtuigen.',
      'Liggen in Limburg.',
    ],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'Aruba, Curaçao en Sint-Maarten horen bij…',
    questionEn: 'Aruba, Curaçao and Sint-Maarten belong to…',
    good: 'Het Koninkrijk der Nederlanden (Caribisch deel).',
    wrongs: ['Alleen België.', 'De EU zonder Nederland.', 'Duitsland.'],
  },
  {
    category: 'integratie_cultuur',
    questionNl: 'In Nederland wonen ongeveer hoeveel mensen?',
    questionEn: 'Approximately how many people live in the Netherlands?',
    good: 'Ongeveer 17 miljoen.',
    wrongs: ['Ongeveer 1 miljoen.', 'Ongeveer 100 miljoen.', 'Niemand; het land is leeg.'],
  },
]

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const lines = [
  "import type { KnmA2ExamCategory } from './a2KnmExamBank'",
  '',
  'export type SlideDeckQuestionRow = {',
  '  category: KnmA2ExamCategory',
  '  questionNl: string',
  '  questionEn: string',
  '  good: string',
  '  wrongs: readonly [string, string, string]',
  '  audioScriptNl?: string',
  '}',
  '',
  '/** KNM vragen afgeleid van OCR van dutch kmn slides.pdf */',
  `export const KNM_SLIDE_DECK_QUESTION_ROWS: SlideDeckQuestionRow[] = [`,
]

for (const r of ROWS) {
  lines.push('  {')
  lines.push(`    category: '${r.category}',`)
  lines.push(`    questionNl: '${esc(r.questionNl)}',`)
  lines.push(`    questionEn: '${esc(r.questionEn)}',`)
  lines.push(`    good: '${esc(r.good)}',`)
  lines.push(`    wrongs: [`)
  for (const w of r.wrongs) lines.push(`      '${esc(w)}',`)
  lines.push('    ],')
  lines.push(`    audioScriptNl: '${esc(r.questionNl)}',`)
  lines.push('  },')
}

lines.push(']')
lines.push('')
lines.push(`export const KNM_SLIDE_DECK_QUESTION_COUNT = ${ROWS.length}`)
lines.push('')

const out = join(root, 'src/lib/exam-system/knmSlideDeckQuestionsData.ts')
writeFileSync(out, lines.join('\n'), 'utf8')
console.log('Wrote', out, 'with', ROWS.length, 'questions')
