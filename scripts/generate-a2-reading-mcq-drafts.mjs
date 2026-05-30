#!/usr/bin/env node
/**
 * One-off generator for a2ReadingExamMcqItems.ts — 165+ unique drafts.
 * Run: node scripts/generate-a2-reading-mcq-drafts.mjs
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/lib/exam-system/a2ReadingExamMcqItems.ts')

/** @type {import('../src/lib/exam-system/a2ReadingExamMcqItemDraft.ts').ReadingExamItemDraft[]} */
const ITEMS = []

function add(category, item) {
  ITEMS.push({ ...item, _category: category })
}

function opt(id, label) {
  return { id, label }
}

// ─── E-mails (18) ───────────────────────────────────────────────────────────
add('emails', {
  introNl: 'Lees deze e-mail.',
  readHintEn: 'Read the email.',
  passageNl:
    'Beste mevrouw Jansen, uw pakket wordt morgen tussen 13:00 en 15:00 bezorgd. U hoeft niet thuis te zijn als u toestemming geeft voor de brievenbus. Track en trace vindt u in uw account. Met vriendelijke groet, het bezorgteam.',
  passageEn:
    'Dear Ms Jansen, your parcel will be delivered tomorrow between 1:00 p.m. and 3:00 p.m. You do not need to be home if you allow delivery to the letterbox. Track and trace is in your account. Kind regards, the delivery team.',
  questionNl: 'Wanneer wordt het pakket bezorgd?',
  questionEn: 'When will the parcel be delivered?',
  options: [
    opt('a', 'Vandaag voor twaalf uur.'),
    opt('b', 'Morgen tussen 13:00 en 15:00.'),
    opt('c', 'Alleen in het weekend, zonder tijdvenster.'),
    opt('d', 'De tekst noemt geen bezorgmoment.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de huisartsenpraktijk.',
  readHintEn: 'Read the email from the GP practice.',
  passageNl:
    'Geachte heer Bakker, uw bloeduitslag is binnen. U kunt de uitslag ophalen bij de balie op maandag tot woensdag tussen 08:30 en 12:00. Neem uw identiteitsbewijs mee. Voor uitleg kunt u een telefonisch consult van tien minuten inplannen via onze website.',
  passageEn:
    'Dear Mr Bakker, your blood test results are in. You can collect them at the desk Monday to Wednesday between 8:30 a.m. and 12:00 noon. Bring your ID. For explanation you can schedule a ten-minute phone consultation via our website.',
  questionNl: 'Wanneer kunt u de uitslag ophalen?',
  questionEn: 'When can you collect the results?',
  options: [
    opt('a', 'Elke dag tot 17:00 uur aan de balie.'),
    opt('b', 'Maandag tot woensdag tussen 08:30 en 12:00.'),
    opt('c', 'Alleen per post, niet aan de balie.'),
    opt('d', 'De uitslag wordt automatisch per e-mail verstuurd.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw werkgever.',
  readHintEn: 'Read the email from your employer.',
  passageNl:
    'Beste collega, volgende week is er een brandoefening op dinsdag om 14:00 uur. Alle medewerkers moeten via trappenhuis B naar de verzamelplaats bij parkeerterrein P2 gaan. Liftgebruik is tijdens de oefening niet toegestaan. Meld u aan bij uw teamleider.',
  passageEn:
    'Dear colleague, next week there is a fire drill on Tuesday at 2:00 p.m. All staff must go via stairwell B to the assembly point at car park P2. Using the lift is not allowed during the drill. Report to your team leader.',
  questionNl: 'Wat moet u tijdens de oefening niet doen?',
  questionEn: 'What must you not do during the drill?',
  options: [
    opt('a', 'Naar parkeerterrein P2 lopen.'),
    opt('b', 'De lift gebruiken.'),
    opt('c', 'Zich melden bij de teamleider.'),
    opt('d', 'Via trappenhuis B naar buiten gaan.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de school.',
  readHintEn: 'Read the email from the school.',
  passageNl:
    'Beste ouders, donderdag is er een ouderavond over de overstap naar groep 8. De avond begint om 19:30 in de aula. Kinderen hoeven niet mee te komen. Wilt u zich voor maandag aanmelden via Parro, zodat wij voldoende stoelen kunnen reserveren?',
  passageEn:
    'Dear parents, on Thursday there is a parents’ evening about the move to group 8. The evening starts at 7:30 p.m. in the hall. Children do not need to come. Please register via Parro by Monday so we can reserve enough chairs.',
  questionNl: 'Wat moeten ouders doen voor maandag?',
  questionEn: 'What must parents do by Monday?',
  options: [
    opt('a', 'Hun kind meenemen naar de aula.'),
    opt('b', 'Zich aanmelden via Parro voor de ouderavond.'),
    opt('c', 'Een presentatie voorbereiden voor groep 8.'),
    opt('d', 'De school bellen op donderdagochtend.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw verhuurder.',
  readHintEn: 'Read the email from your landlord.',
  passageNl:
    'Geachte huurder, op woensdag 12 juni voeren wij onderhoud uit aan de cv-ketel in uw flat. Tussen 09:00 en 12:00 moet de monteur binnen kunnen. Zorg dat iemand thuis is of laat een sleutel achter bij de buren op nummer 14. Zonder toegang verplaatsen wij de afspraak.',
  passageEn:
    'Dear tenant, on Wednesday 12 June we will maintain the central heating boiler in your flat. Between 9:00 a.m. and 12:00 noon the engineer must be able to enter. Make sure someone is home or leave a key with the neighbours at number 14. Without access we will reschedule.',
  questionNl: 'Wat gebeurt er als niemand thuis is en er geen sleutel is?',
  questionEn: 'What happens if no one is home and there is no key?',
  options: [
    opt('a', 'De monteur forceert de deur open.'),
    opt('b', 'De afspraak wordt verplaatst.'),
    opt('c', 'De huur wordt automatisch verlaagd.'),
    opt('d', 'Het onderhoud gaat door zonder toegang.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de bibliotheek.',
  readHintEn: 'Read the email from the library.',
  passageNl:
    'Beste lid, uw gereserveerde boek Staatsexamen NT2 is klaar om op te halen. U heeft nog zeven dagen; daarna gaat het terug naar de plank. Ophalen kan bij de balie op de begane grond met uw pas. Verlengen kan online als niemand anders het boek heeft gereserveerd.',
  passageEn:
    'Dear member, your reserved book Staatsexamen NT2 is ready to collect. You have seven days; after that it goes back on the shelf. Collect at the ground-floor desk with your card. You can renew online if no one else has reserved it.',
  questionNl: 'Hoe lang kunt u het boek maximaal laten liggen voor ophalen?',
  questionEn: 'How long can the book wait for collection at most?',
  options: [
    opt('a', 'Veertien dagen zonder verlenging.'),
    opt('b', 'Zeven dagen, daarna gaat het terug.'),
    opt('c', 'Een maand als u online verlengt.'),
    opt('d', 'Er is geen tijdslimiet genoemd.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw sportschool.',
  readHintEn: 'Read the email from your gym.',
  passageNl:
    'Hallo Ahmed, uw abonnement verloopt op 30 april. Wilt u doorlopen? Stuur vóór 25 april een bericht naar info@fitcentrum.nl met uw lidnummer. Zonder reactie stopt uw pas automatisch. Introductieles voor nieuwe groepslessen is gratis op zaterdagochtend.',
  passageEn:
    'Hello Ahmed, your membership expires on 30 April. Do you want to continue? Send a message to info@fitcentrum.nl with your member number before 25 April. Without a reply your pass stops automatically. Intro class for new group lessons is free on Saturday morning.',
  questionNl: 'Wat moet Ahmed doen om door te gaan?',
  questionEn: 'What must Ahmed do to continue?',
  options: [
    opt('a', 'Op 30 april persoonlijk langskomen met contant geld.'),
    opt('b', 'Vóór 25 april mailen met zijn lidnummer.'),
    opt('c', 'Een introductieles op zaterdag verplicht volgen.'),
    opt('d', 'Niets; het abonnement verlengt vanzelf.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de belastingdienst.',
  readHintEn: 'Read the email from the tax office.',
  passageNl:
    'Geachte mevrouw Demir, wij hebben uw aangifte inkomstenbelasting 2024 ontvangen. U hoeft nu niets te doen. Als wij aanvullende stukken nodig hebben, sturen wij u een brief binnen acht weken. Controleer Mijn Belastingdienst voor de status van uw teruggave.',
  passageEn:
    'Dear Ms Demir, we have received your 2024 income tax return. You do not need to do anything now. If we need additional documents we will send you a letter within eight weeks. Check Mijn Belastingdienst for the status of your refund.',
  questionNl: 'Wat moet mevrouw Demir nu doen volgens de e-mail?',
  questionEn: 'What must Ms Demir do now according to the email?',
  options: [
    opt('a', 'Direct extra bonnen uploaden.'),
    opt('b', 'Niets, tenzij zij later een brief krijgt.'),
    opt('c', 'Na acht weken opnieuw aangifte doen.'),
    opt('d', 'Naar het kantoor komen met originele documenten.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van een sollicitant.',
  readHintEn: 'Read the email from a job applicant.',
  passageNl:
    'Beste mevrouw Visser, hartelijk dank voor het gesprek gisteren. Ik stuur u, zoals afgesproken, mijn referenties en een kopie van mijn VOG vóór vrijdag 17:00. Mocht u nog vragen hebben, dan ben ik bereikbaar via dit adres. Met vriendelijke groet, Samira El Amrani.',
  passageEn:
    'Dear Ms Visser, thank you for yesterday’s interview. As agreed I will send my references and a copy of my VOG before Friday 5:00 p.m. If you have any questions I am reachable at this address. Kind regards, Samira El Amrani.',
  questionNl: 'Wat beloofde Samira vóór vrijdag 17:00 te sturen?',
  questionEn: 'What did Samira promise to send before Friday 5:00 p.m.?',
  options: [
    opt('a', 'Een nieuw cv en motivatiebrief.'),
    opt('b', 'Referenties en een kopie van haar VOG.'),
    opt('c', 'Haar diploma en rijbewijs per post.'),
    opt('d', 'Een afspraak voor een tweede gesprek.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de tandarts.',
  readHintEn: 'Read the email from the dentist.',
  passageNl:
    'Beste mevrouw Kaya, uw afspraak op 4 maart om 11:15 gaat niet door wegens ziekte van de behandelaar. Wij hebben u ingepland op 11 maart om 09:45 bij assistente Linda. Kunt u bevestigen via de link in deze mail? Bij geen reactie binnen drie dagen vervalt het tijdslot.',
  passageEn:
    'Dear Ms Kaya, your appointment on 4 March at 11:15 a.m. is cancelled because the dentist is ill. We have scheduled you on 11 March at 9:45 a.m. with assistant Linda. Can you confirm via the link in this email? Without a reply within three days the slot expires.',
  questionNl: 'Wat moet mevrouw Kaya doen binnen drie dagen?',
  questionEn: 'What must Ms Kaya do within three days?',
  options: [
    opt('a', 'Op 4 maart toch naar de praktijk komen.'),
    opt('b', 'De nieuwe afspraak via de link bevestigen.'),
    opt('c', 'Een andere tandarts in de buurt zoeken.'),
    opt('d', 'Telefonisch een recept aanvragen.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw kinderdagverblijf.',
  readHintEn: 'Read the email from your daycare.',
  passageNl:
    'Beste ouders, vrijdag is het foto dag op het KDV. Kinderen graag in een neutrale shirt zonder grote logo. Foto bestellen kan tot 20 maart via het ouderportaal; papieren bestelformulieren accepteren wij niet meer. Vragen? Bel tussen 08:00 en 09:00 het vaste nummer.',
  passageEn:
    'Dear parents, Friday is photo day at the daycare. Please dress children in a plain top without large logos. Order photos until 20 March via the parent portal; we no longer accept paper order forms. Questions? Call the main number between 8:00 and 9:00 a.m.',
  questionNl: 'Hoe kunnen ouders foto’s bestellen volgens deze mail?',
  questionEn: 'How can parents order photos according to this email?',
  options: [
    opt('a', 'Met een papieren formulier op vrijdag.'),
    opt('b', 'Via het ouderportaal tot 20 maart.'),
    opt('c', 'Alleen telefonisch na 20 maart.'),
    opt('d', 'Automatisch; bestellen is niet nodig.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw energieleverancier.',
  readHintEn: 'Read the email from your energy supplier.',
  passageNl:
    'Geachte klant, per 1 juli wijzigen onze tarieven. Uw maandbedrag stijgt naar circa €142. In de bijlage staat een overzicht per stroom en gas. Wilt u een termijnbedrag aanpassen? Dat kan in Mijn Energie tot uiterlijk 25 juni. Na die datum blijft het oude bedrag staan.',
  passageEn:
    'Dear customer, from 1 July our rates change. Your monthly amount rises to about €142. The attachment shows a breakdown for electricity and gas. Want to adjust your instalment? You can do so in Mijn Energie until 25 June at the latest. After that date the old amount remains.',
  questionNl: 'Tot wanneer kunt u uw termijnbedrag zelf aanpassen?',
  questionEn: 'Until when can you adjust your instalment yourself?',
  options: [
    opt('a', 'Tot 1 juli via de klantenservice telefonisch.'),
    opt('b', 'Tot uiterlijk 25 juni in Mijn Energie.'),
    opt('c', 'Het termijnbedrag kan nooit worden gewijzigd.'),
    opt('d', 'Alleen na ontvangst van de jaarnota.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw buurthuis.',
  readHintEn: 'Read the email from your community centre.',
  passageNl:
    'Beste buurtbewoner, op zaterdag 22 juni organiseren wij een opruimdag in het park. Start om 10:00 bij de speeltuin; wij zorgen voor handschoenen en vuilniszakken. Koffie en broodjes zijn om 12:30 gratis voor vrijwilligers. Aanmelden hoeft niet, maar graag even een seintje als u komt.',
  passageEn:
    'Dear neighbour, on Saturday 22 June we are organising a clean-up day in the park. Start at 10:00 a.m. at the playground; we provide gloves and bin bags. Coffee and rolls are free at 12:30 p.m. for volunteers. Registration is not required, but please let us know if you are coming.',
  questionNl: 'Waar begint de opruimdag volgens de e-mail?',
  questionEn: 'Where does the clean-up day start according to the email?',
  options: [
    opt('a', 'Bij het buurthuis om 12:30 uur.'),
    opt('b', 'Bij de speeltuin om 10:00 uur.'),
    opt('c', 'Aan de noordkant van het park om 09:00 uur.'),
    opt('d', 'De locatie staat niet in de tekst.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw verzekeraar.',
  readHintEn: 'Read the email from your insurer.',
  passageNl:
    'Geachte heer Peters, uw schademelding 2024-8812 is in behandeling. Wij hebben nog een foto nodig van de schade aan de achterbumper. Upload deze uiterlijk 5 april via de app Schade Direct. Zonder foto kunnen wij de claim niet afhandelen. Vragen? Bel werkdagen tussen 09:00 en 17:00.',
  passageEn:
    'Dear Mr Peters, your damage report 2024-8812 is being processed. We still need a photo of the damage to the rear bumper. Upload it by 5 April at the latest via the Schade Direct app. Without a photo we cannot settle the claim. Questions? Call on weekdays between 9:00 a.m. and 5:00 p.m.',
  questionNl: 'Wat moet meneer Peters uiterlijk 5 april doen?',
  questionEn: 'What must Mr Peters do by 5 April at the latest?',
  options: [
    opt('a', 'Naar de garage rijden voor een offerte.'),
    opt('b', 'Een foto uploaden via de app Schade Direct.'),
    opt('c', 'Een papieren formulier per post sturen.'),
    opt('d', 'Wachten tot de verzekeraar langskomt.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw uitzendbureau.',
  readHintEn: 'Read the email from your temp agency.',
  passageNl:
    'Beste Fatima, morgen werkt u bij LogiPack van 07:00 tot 15:30. Meld u om 06:45 aan bij ingang C met uw pas en veiligheidsschoenen. Parkeren mag op P-West; P-Oost is gereserveerd voor vrachtwagens. Bij ziekte belt u vóór 06:00 het storingsnummer, niet uw contactpersoon.',
  passageEn:
    'Dear Fatima, tomorrow you work at LogiPack from 7:00 a.m. to 3:30 p.m. Report at 6:45 a.m. at entrance C with your pass and safety shoes. You may park on P-West; P-East is reserved for lorries. If ill, call the emergency number before 6:00 a.m., not your contact person.',
  questionNl: 'Waar mag Fatima parkeren?',
  questionEn: 'Where may Fatima park?',
  options: [
    opt('a', 'Op P-Oost naast de vrachtwagens.'),
    opt('b', 'Op P-West.'),
    opt('c', 'Alleen op straat voor ingang C.'),
    opt('d', 'Parkeren is helemaal niet toegestaan.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van de universiteit.',
  readHintEn: 'Read the email from the university.',
  passageNl:
    'Beste student, uw inschrijving voor het vak Nederlands 2 is bevestigd. De eerste les is op donderdag 5 september om 13:30 in lokaal 2.14. Koop het boek NT2 Praktijk vóór die datum; de bibliotheek heeft maar twee exemplaren. Wachtlijststudenten horen uiterlijk woensdag of er plek is.',
  passageEn:
    'Dear student, your registration for Dutch 2 is confirmed. The first lesson is on Thursday 5 September at 1:30 p.m. in room 2.14. Buy the book NT2 Praktijk before that date; the library has only two copies. Waitlisted students will hear by Wednesday at the latest if there is a place.',
  questionNl: 'Wanneer is de eerste les?',
  questionEn: 'When is the first lesson?',
  options: [
    opt('a', 'Woensdag 4 september om 09:00 uur.'),
    opt('b', 'Donderdag 5 september om 13:30 uur.'),
    opt('c', 'Donderdag in de bibliotheek zonder lokaal.'),
    opt('d', 'De datum staat niet in de e-mail.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw apotheek.',
  readHintEn: 'Read the email from your pharmacy.',
  passageNl:
    'Geachte mevrouw Nguyen, uw herhaalrecept voor metformine is klaar. U kunt het afhalen tot en met vrijdag 21:00 bij de balie aan de Stationsstraat. Neem uw zorgpas mee. Wilt u laten bezorgen? Dat kost €4,95 en duurt één werkdag na aanvraag via onze site.',
  passageEn:
    'Dear Ms Nguyen, your repeat prescription for metformin is ready. You can collect it until Friday 9:00 p.m. at the desk on Stationsstraat. Bring your health insurance card. Want delivery? That costs €4.95 and takes one working day after requesting via our site.',
  questionNl: 'Wat kost bezorgen volgens de apotheek?',
  questionEn: 'How much does delivery cost according to the pharmacy?',
  options: [
    opt('a', 'Bezorgen is gratis binnen de stad.'),
    opt('b', '€4,95 voor één werkdag bezorging.'),
    opt('c', '€9,90 alleen op zaterdag.'),
    opt('d', 'De apotheek bezorgt niet aan huis.'),
  ],
  correctOptionIds: ['b'],
})

add('emails', {
  introNl: 'Lees deze e-mail van uw boodschappendienst.',
  readHintEn: 'Read the email from your grocery delivery service.',
  passageNl:
    'Hallo, uw bestelling #44821 komt morgen tussen 18:00 en 20:00. Laat een boodschap achter als u niet thuis bent; anders leveren wij bij de buren op nummer 8. Verse producten nemen wij terug als u niet thuis bent zonder instructie. Wijzigingen tot vanmiddag 14:00 via de app.',
  passageEn:
    'Hello, your order #44821 arrives tomorrow between 6:00 and 8:00 p.m. Leave a note if you are not home; otherwise we deliver to the neighbours at number 8. Fresh products we take back if you are not home without instructions. Changes until this afternoon 2:00 p.m. via the app.',
  questionNl: 'Wat gebeurt er met verse producten als u niet thuis bent zonder instructie?',
  questionEn: 'What happens to fresh products if you are not home without instructions?',
  options: [
    opt('a', 'Ze worden bij de buren achtergelaten.'),
    opt('b', 'Ze worden mee terug genomen.'),
    opt('c', 'Ze blijven voor de deur staan.'),
    opt('d', 'De bestelling wordt gratis opnieuw bezorgd.'),
  ],
  correctOptionIds: ['b'],
})

// Part 2: explicit add() calls only — executed in this scope so add/opt are in scope
const part2Source = readFileSync(
  join(__dirname, 'generate-a2-reading-mcq-drafts-part2.mjs'),
  'utf8',
)
new Function('add', 'opt', part2Source)(add, opt)

const CATEGORY_ORDER = [
  'emails',
  'shop_notices',
  'ov_transit',
  'job_ads',
  'gemeente',
  'school_notices',
  'housing',
  'healthcare',
  'workplace',
  'news',
  'web_pages',
  'neighbor_notices',
  'insurance_bank',
  'misc',
]

const CATEGORY_LABELS = {
  emails: 'E-mails',
  shop_notices: 'Winkelmededelingen',
  ov_transit: 'OV-meldingen',
  job_ads: 'Vacatures',
  gemeente: 'Gemeente',
  school_notices: 'School',
  housing: 'Wonen',
  healthcare: 'Gezondheidszorg',
  workplace: 'Werk',
  news: 'Nieuws',
  web_pages: "Webpagina's",
  neighbor_notices: 'Buurt',
  insurance_bank: 'Verzekering en bank',
  misc: 'Overig',
}

const ORDER = ['a', 'b', 'c', 'd']

function rotateOptions(options, correctIds, rot) {
  const rotated = [...options.slice(rot), ...options.slice(0, rot)]
  const idMap = Object.fromEntries(rotated.map((o, i) => [o.id, ORDER[i]]))
  return {
    options: rotated.map((o, i) => ({ id: ORDER[i], label: o.label })),
    correctOptionIds: correctIds.map((id) => idMap[id]),
  }
}

function escapeTsString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatItem(item, index) {
  const { options, correctOptionIds } = rotateOptions(item.options, item.correctOptionIds, index % 4)
  const lines = [
    '  {',
    `    introNl: '${escapeTsString(item.introNl)}',`,
    `    readHintEn: '${escapeTsString(item.readHintEn)}',`,
    `    passageNl:`,
    `      '${escapeTsString(item.passageNl)}',`,
    `    passageEn:`,
    `      '${escapeTsString(item.passageEn)}',`,
    `    questionNl: '${escapeTsString(item.questionNl)}',`,
    `    questionEn: '${escapeTsString(item.questionEn)}',`,
    '    options: [',
    ...options.map((o) => `      { id: '${o.id}', label: '${escapeTsString(o.label)}' },`),
    '    ],',
    `    correctOptionIds: [${correctOptionIds.map((id) => `'${id}'`).join(', ')}],`,
    '  },',
  ]
  return lines.join('\n')
}

function validateDrafts(items) {
  const CURLY = /[\u201c\u201d]/
  if (items.length < 165) throw new Error(`Expected at least 165 items, got ${items.length}`)
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const pl = it.passageNl.length
    if (pl < 180 || pl > 340) {
      throw new Error(`Item ${i + 1}: passageNl length ${pl} out of [180,340]: ${it.passageNl.slice(0, 60)}…`)
    }
    if (CURLY.test(it.passageNl)) throw new Error(`Item ${i + 1}: passageNl contains curly quotes`)
    if (!it.readHintEn.trim().endsWith('.')) throw new Error(`Item ${i + 1}: readHintEn must end with period`)
    if (it.options.length !== 4) throw new Error(`Item ${i + 1}: expected 4 options`)
    for (const o of it.options) {
      if (o.label.length < 5 || o.label.length > 140) {
        throw new Error(`Item ${i + 1} option ${o.id}: label length ${o.label.length}`)
      }
    }
    const ids = new Set(it.options.map((o) => o.id))
    for (const c of it.correctOptionIds) {
      if (!ids.has(c)) throw new Error(`Item ${i + 1}: correct id ${c} missing`)
    }
  }
}

validateDrafts(ITEMS)

const grouped = new Map(CATEGORY_ORDER.map((c) => [c, []]))
for (const it of ITEMS) {
  const cat = it._category ?? 'misc'
  if (!grouped.has(cat)) grouped.set(cat, [])
  grouped.get(cat).push(it)
}

const chunks = [
  `import type { ReadingExamItemDraft } from './a2ReadingExamMcqItemDraft'`,
  '',
  '/** A2 reading exam MCQ drafts — 165+ unique scenarios for inburgering-style leesvaardigheid. */',
  'export const A2_READING_EXAM_MCQ_DRAFTS: ReadingExamItemDraft[] = [',
]

let globalIndex = 0

for (const cat of CATEGORY_ORDER) {
  const list = grouped.get(cat) ?? []
  if (!list.length) continue
  chunks.push(`  // ─── ${CATEGORY_LABELS[cat] ?? cat} (${list.length}) ───`)
  for (const it of list) {
    chunks.push(formatItem(it, globalIndex++))
  }
}

chunks.push(']', '')

writeFileSync(OUT, chunks.join('\n'), 'utf8')
console.log(`Wrote ${ITEMS.length} items to ${OUT}`)
