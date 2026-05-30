import type { ReadingExamItemDraft } from './a2ReadingExamMcqItemDraft'

/** A2 reading exam MCQ drafts — 165+ unique scenarios for inburgering-style leesvaardigheid. */
export const A2_READING_EXAM_MCQ_DRAFTS: ReadingExamItemDraft[] = [
  // ─── E-mails (18) ───
  {
    introNl: 'Lees deze e-mail.',
    readHintEn: 'Read the email.',
    passageNl:
      'Beste mevrouw Jansen, uw pakket wordt morgen tussen 13:00 en 15:00 bezorgd. U hoeft niet thuis te zijn als u toestemming geeft voor de brievenbus. Track en trace vindt u in uw account. Met vriendelijke groet, het bezorgteam.',
    passageEn:
      'Dear Ms Jansen, your parcel will be delivered tomorrow between 1:00 p.m. and 3:00 p.m. You do not need to be home if you allow delivery to the letterbox. Track and trace is in your account. Kind regards, the delivery team.',
    questionNl: 'Wanneer wordt het pakket bezorgd?',
    questionEn: 'When will the parcel be delivered?',
    options: [
      { id: 'a', label: 'Vandaag voor twaalf uur.' },
      { id: 'b', label: 'Morgen tussen 13:00 en 15:00.' },
      { id: 'c', label: 'Alleen in het weekend, zonder tijdvenster.' },
      { id: 'd', label: 'De tekst noemt geen bezorgmoment.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze e-mail van de huisartsenpraktijk.',
    readHintEn: 'Read the email from the GP practice.',
    passageNl:
      'Geachte heer Bakker, uw bloeduitslag is binnen. U kunt de uitslag ophalen bij de balie op maandag tot woensdag tussen 08:30 en 12:00. Neem uw identiteitsbewijs mee. Voor uitleg kunt u een telefonisch consult van tien minuten inplannen via onze website.',
    passageEn:
      'Dear Mr Bakker, your blood test results are in. You can collect them at the desk Monday to Wednesday between 8:30 a.m. and 12:00 noon. Bring your ID. For explanation you can schedule a ten-minute phone consultation via our website.',
    questionNl: 'Wanneer kunt u de uitslag ophalen?',
    questionEn: 'When can you collect the results?',
    options: [
      { id: 'a', label: 'Maandag tot woensdag tussen 08:30 en 12:00.' },
      { id: 'b', label: 'Alleen per post, niet aan de balie.' },
      { id: 'c', label: 'De uitslag wordt automatisch per e-mail verstuurd.' },
      { id: 'd', label: 'Elke dag tot 17:00 uur aan de balie.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze e-mail van uw werkgever.',
    readHintEn: 'Read the email from your employer.',
    passageNl:
      'Beste collega, volgende week is er een brandoefening op dinsdag om 14:00 uur. Alle medewerkers moeten via trappenhuis B naar de verzamelplaats bij parkeerterrein P2 gaan. Liftgebruik is tijdens de oefening niet toegestaan. Meld u aan bij uw teamleider.',
    passageEn:
      'Dear colleague, next week there is a fire drill on Tuesday at 2:00 p.m. All staff must go via stairwell B to the assembly point at car park P2. Using the lift is not allowed during the drill. Report to your team leader.',
    questionNl: 'Wat moet u tijdens de oefening niet doen?',
    questionEn: 'What must you not do during the drill?',
    options: [
      { id: 'a', label: 'Zich melden bij de teamleider.' },
      { id: 'b', label: 'Via trappenhuis B naar buiten gaan.' },
      { id: 'c', label: 'Naar parkeerterrein P2 lopen.' },
      { id: 'd', label: 'De lift gebruiken.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze e-mail van de school.',
    readHintEn: 'Read the email from the school.',
    passageNl:
      'Beste ouders, donderdag is er een ouderavond over de overstap naar groep 8. De avond begint om 19:30 in de aula. Kinderen hoeven niet mee te komen. Wilt u zich voor maandag aanmelden via Parro, zodat wij voldoende stoelen kunnen reserveren?',
    passageEn:
      'Dear parents, on Thursday there is a parents’ evening about the move to group 8. The evening starts at 7:30 p.m. in the hall. Children do not need to come. Please register via Parro by Monday so we can reserve enough chairs.',
    questionNl: 'Wat moeten ouders doen voor maandag?',
    questionEn: 'What must parents do by Monday?',
    options: [
      { id: 'a', label: 'De school bellen op donderdagochtend.' },
      { id: 'b', label: 'Hun kind meenemen naar de aula.' },
      { id: 'c', label: 'Zich aanmelden via Parro voor de ouderavond.' },
      { id: 'd', label: 'Een presentatie voorbereiden voor groep 8.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze e-mail van uw verhuurder.',
    readHintEn: 'Read the email from your landlord.',
    passageNl:
      'Geachte huurder, op woensdag 12 juni voeren wij onderhoud uit aan de cv-ketel in uw flat. Tussen 09:00 en 12:00 moet de monteur binnen kunnen. Zorg dat iemand thuis is of laat een sleutel achter bij de buren op nummer 14. Zonder toegang verplaatsen wij de afspraak.',
    passageEn:
      'Dear tenant, on Wednesday 12 June we will maintain the central heating boiler in your flat. Between 9:00 a.m. and 12:00 noon the engineer must be able to enter. Make sure someone is home or leave a key with the neighbours at number 14. Without access we will reschedule.',
    questionNl: 'Wat gebeurt er als niemand thuis is en er geen sleutel is?',
    questionEn: 'What happens if no one is home and there is no key?',
    options: [
      { id: 'a', label: 'De monteur forceert de deur open.' },
      { id: 'b', label: 'De afspraak wordt verplaatst.' },
      { id: 'c', label: 'De huur wordt automatisch verlaagd.' },
      { id: 'd', label: 'Het onderhoud gaat door zonder toegang.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze e-mail van de bibliotheek.',
    readHintEn: 'Read the email from the library.',
    passageNl:
      'Beste lid, uw gereserveerde boek Staatsexamen NT2 is klaar om op te halen. U heeft nog zeven dagen; daarna gaat het terug naar de plank. Ophalen kan bij de balie op de begane grond met uw pas. Verlengen kan online als niemand anders het boek heeft gereserveerd.',
    passageEn:
      'Dear member, your reserved book Staatsexamen NT2 is ready to collect. You have seven days; after that it goes back on the shelf. Collect at the ground-floor desk with your card. You can renew online if no one else has reserved it.',
    questionNl: 'Hoe lang kunt u het boek maximaal laten liggen voor ophalen?',
    questionEn: 'How long can the book wait for collection at most?',
    options: [
      { id: 'a', label: 'Zeven dagen, daarna gaat het terug.' },
      { id: 'b', label: 'Een maand als u online verlengt.' },
      { id: 'c', label: 'Er is geen tijdslimiet genoemd.' },
      { id: 'd', label: 'Veertien dagen zonder verlenging.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze e-mail van uw sportschool.',
    readHintEn: 'Read the email from your gym.',
    passageNl:
      'Hallo Ahmed, uw abonnement verloopt op 30 april. Wilt u doorlopen? Stuur vóór 25 april een bericht naar info@fitcentrum.nl met uw lidnummer. Zonder reactie stopt uw pas automatisch. Introductieles voor nieuwe groepslessen is gratis op zaterdagochtend.',
    passageEn:
      'Hello Ahmed, your membership expires on 30 April. Do you want to continue? Send a message to info@fitcentrum.nl with your member number before 25 April. Without a reply your pass stops automatically. Intro class for new group lessons is free on Saturday morning.',
    questionNl: 'Wat moet Ahmed doen om door te gaan?',
    questionEn: 'What must Ahmed do to continue?',
    options: [
      { id: 'a', label: 'Een introductieles op zaterdag verplicht volgen.' },
      { id: 'b', label: 'Niets; het abonnement verlengt vanzelf.' },
      { id: 'c', label: 'Op 30 april persoonlijk langskomen met contant geld.' },
      { id: 'd', label: 'Vóór 25 april mailen met zijn lidnummer.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze e-mail van de belastingdienst.',
    readHintEn: 'Read the email from the tax office.',
    passageNl:
      'Geachte mevrouw Demir, wij hebben uw aangifte inkomstenbelasting 2024 ontvangen. U hoeft nu niets te doen. Als wij aanvullende stukken nodig hebben, sturen wij u een brief binnen acht weken. Controleer Mijn Belastingdienst voor de status van uw teruggave.',
    passageEn:
      'Dear Ms Demir, we have received your 2024 income tax return. You do not need to do anything now. If we need additional documents we will send you a letter within eight weeks. Check Mijn Belastingdienst for the status of your refund.',
    questionNl: 'Wat moet mevrouw Demir nu doen volgens de e-mail?',
    questionEn: 'What must Ms Demir do now according to the email?',
    options: [
      { id: 'a', label: 'Naar het kantoor komen met originele documenten.' },
      { id: 'b', label: 'Direct extra bonnen uploaden.' },
      { id: 'c', label: 'Niets, tenzij zij later een brief krijgt.' },
      { id: 'd', label: 'Na acht weken opnieuw aangifte doen.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze e-mail van een sollicitant.',
    readHintEn: 'Read the email from a job applicant.',
    passageNl:
      'Beste mevrouw Visser, hartelijk dank voor het gesprek gisteren. Ik stuur u, zoals afgesproken, mijn referenties en een kopie van mijn VOG vóór vrijdag 17:00. Mocht u nog vragen hebben, dan ben ik bereikbaar via dit adres. Met vriendelijke groet, Samira El Amrani.',
    passageEn:
      'Dear Ms Visser, thank you for yesterday’s interview. As agreed I will send my references and a copy of my VOG before Friday 5:00 p.m. If you have any questions I am reachable at this address. Kind regards, Samira El Amrani.',
    questionNl: 'Wat beloofde Samira vóór vrijdag 17:00 te sturen?',
    questionEn: 'What did Samira promise to send before Friday 5:00 p.m.?',
    options: [
      { id: 'a', label: 'Een nieuw cv en motivatiebrief.' },
      { id: 'b', label: 'Referenties en een kopie van haar VOG.' },
      { id: 'c', label: 'Haar diploma en rijbewijs per post.' },
      { id: 'd', label: 'Een afspraak voor een tweede gesprek.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze e-mail van de tandarts.',
    readHintEn: 'Read the email from the dentist.',
    passageNl:
      'Beste mevrouw Kaya, uw afspraak op 4 maart om 11:15 gaat niet door wegens ziekte van de behandelaar. Wij hebben u ingepland op 11 maart om 09:45 bij assistente Linda. Kunt u bevestigen via de link in deze mail? Bij geen reactie binnen drie dagen vervalt het tijdslot.',
    passageEn:
      'Dear Ms Kaya, your appointment on 4 March at 11:15 a.m. is cancelled because the dentist is ill. We have scheduled you on 11 March at 9:45 a.m. with assistant Linda. Can you confirm via the link in this email? Without a reply within three days the slot expires.',
    questionNl: 'Wat moet mevrouw Kaya doen binnen drie dagen?',
    questionEn: 'What must Ms Kaya do within three days?',
    options: [
      { id: 'a', label: 'De nieuwe afspraak via de link bevestigen.' },
      { id: 'b', label: 'Een andere tandarts in de buurt zoeken.' },
      { id: 'c', label: 'Telefonisch een recept aanvragen.' },
      { id: 'd', label: 'Op 4 maart toch naar de praktijk komen.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze e-mail van uw kinderdagverblijf.',
    readHintEn: 'Read the email from your daycare.',
    passageNl:
      'Beste ouders, vrijdag is het foto dag op het KDV. Kinderen graag in een neutrale shirt zonder grote logo. Foto bestellen kan tot 20 maart via het ouderportaal; papieren bestelformulieren accepteren wij niet meer. Vragen? Bel tussen 08:00 en 09:00 het vaste nummer.',
    passageEn:
      'Dear parents, Friday is photo day at the daycare. Please dress children in a plain top without large logos. Order photos until 20 March via the parent portal; we no longer accept paper order forms. Questions? Call the main number between 8:00 and 9:00 a.m.',
    questionNl: 'Hoe kunnen ouders foto’s bestellen volgens deze mail?',
    questionEn: 'How can parents order photos according to this email?',
    options: [
      { id: 'a', label: 'Alleen telefonisch na 20 maart.' },
      { id: 'b', label: 'Automatisch; bestellen is niet nodig.' },
      { id: 'c', label: 'Met een papieren formulier op vrijdag.' },
      { id: 'd', label: 'Via het ouderportaal tot 20 maart.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze e-mail van uw energieleverancier.',
    readHintEn: 'Read the email from your energy supplier.',
    passageNl:
      'Geachte klant, per 1 juli wijzigen onze tarieven. Uw maandbedrag stijgt naar circa €142. In de bijlage staat een overzicht per stroom en gas. Wilt u een termijnbedrag aanpassen? Dat kan in Mijn Energie tot uiterlijk 25 juni. Na die datum blijft het oude bedrag staan.',
    passageEn:
      'Dear customer, from 1 July our rates change. Your monthly amount rises to about €142. The attachment shows a breakdown for electricity and gas. Want to adjust your instalment? You can do so in Mijn Energie until 25 June at the latest. After that date the old amount remains.',
    questionNl: 'Tot wanneer kunt u uw termijnbedrag zelf aanpassen?',
    questionEn: 'Until when can you adjust your instalment yourself?',
    options: [
      { id: 'a', label: 'Alleen na ontvangst van de jaarnota.' },
      { id: 'b', label: 'Tot 1 juli via de klantenservice telefonisch.' },
      { id: 'c', label: 'Tot uiterlijk 25 juni in Mijn Energie.' },
      { id: 'd', label: 'Het termijnbedrag kan nooit worden gewijzigd.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze e-mail van uw buurthuis.',
    readHintEn: 'Read the email from your community centre.',
    passageNl:
      'Beste buurtbewoner, op zaterdag 22 juni organiseren wij een opruimdag in het park. Start om 10:00 bij de speeltuin; wij zorgen voor handschoenen en vuilniszakken. Koffie en broodjes zijn om 12:30 gratis voor vrijwilligers. Aanmelden hoeft niet, maar graag even een seintje als u komt.',
    passageEn:
      'Dear neighbour, on Saturday 22 June we are organising a clean-up day in the park. Start at 10:00 a.m. at the playground; we provide gloves and bin bags. Coffee and rolls are free at 12:30 p.m. for volunteers. Registration is not required, but please let us know if you are coming.',
    questionNl: 'Waar begint de opruimdag volgens de e-mail?',
    questionEn: 'Where does the clean-up day start according to the email?',
    options: [
      { id: 'a', label: 'Bij het buurthuis om 12:30 uur.' },
      { id: 'b', label: 'Bij de speeltuin om 10:00 uur.' },
      { id: 'c', label: 'Aan de noordkant van het park om 09:00 uur.' },
      { id: 'd', label: 'De locatie staat niet in de tekst.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze e-mail van uw verzekeraar.',
    readHintEn: 'Read the email from your insurer.',
    passageNl:
      'Geachte heer Peters, uw schademelding 2024-8812 is in behandeling. Wij hebben nog een foto nodig van de schade aan de achterbumper. Upload deze uiterlijk 5 april via de app Schade Direct. Zonder foto kunnen wij de claim niet afhandelen. Vragen? Bel werkdagen tussen 09:00 en 17:00.',
    passageEn:
      'Dear Mr Peters, your damage report 2024-8812 is being processed. We still need a photo of the damage to the rear bumper. Upload it by 5 April at the latest via the Schade Direct app. Without a photo we cannot settle the claim. Questions? Call on weekdays between 9:00 a.m. and 5:00 p.m.',
    questionNl: 'Wat moet meneer Peters uiterlijk 5 april doen?',
    questionEn: 'What must Mr Peters do by 5 April at the latest?',
    options: [
      { id: 'a', label: 'Een foto uploaden via de app Schade Direct.' },
      { id: 'b', label: 'Een papieren formulier per post sturen.' },
      { id: 'c', label: 'Wachten tot de verzekeraar langskomt.' },
      { id: 'd', label: 'Naar de garage rijden voor een offerte.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze e-mail van uw uitzendbureau.',
    readHintEn: 'Read the email from your temp agency.',
    passageNl:
      'Beste Fatima, morgen werkt u bij LogiPack van 07:00 tot 15:30. Meld u om 06:45 aan bij ingang C met uw pas en veiligheidsschoenen. Parkeren mag op P-West; P-Oost is gereserveerd voor vrachtwagens. Bij ziekte belt u vóór 06:00 het storingsnummer, niet uw contactpersoon.',
    passageEn:
      'Dear Fatima, tomorrow you work at LogiPack from 7:00 a.m. to 3:30 p.m. Report at 6:45 a.m. at entrance C with your pass and safety shoes. You may park on P-West; P-East is reserved for lorries. If ill, call the emergency number before 6:00 a.m., not your contact person.',
    questionNl: 'Waar mag Fatima parkeren?',
    questionEn: 'Where may Fatima park?',
    options: [
      { id: 'a', label: 'Alleen op straat voor ingang C.' },
      { id: 'b', label: 'Parkeren is helemaal niet toegestaan.' },
      { id: 'c', label: 'Op P-Oost naast de vrachtwagens.' },
      { id: 'd', label: 'Op P-West.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze e-mail van de universiteit.',
    readHintEn: 'Read the email from the university.',
    passageNl:
      'Beste student, uw inschrijving voor het vak Nederlands 2 is bevestigd. De eerste les is op donderdag 5 september om 13:30 in lokaal 2.14. Koop het boek NT2 Praktijk vóór die datum; de bibliotheek heeft maar twee exemplaren. Wachtlijststudenten horen uiterlijk woensdag of er plek is.',
    passageEn:
      'Dear student, your registration for Dutch 2 is confirmed. The first lesson is on Thursday 5 September at 1:30 p.m. in room 2.14. Buy the book NT2 Praktijk before that date; the library has only two copies. Waitlisted students will hear by Wednesday at the latest if there is a place.',
    questionNl: 'Wanneer is de eerste les?',
    questionEn: 'When is the first lesson?',
    options: [
      { id: 'a', label: 'De datum staat niet in de e-mail.' },
      { id: 'b', label: 'Woensdag 4 september om 09:00 uur.' },
      { id: 'c', label: 'Donderdag 5 september om 13:30 uur.' },
      { id: 'd', label: 'Donderdag in de bibliotheek zonder lokaal.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze e-mail van uw apotheek.',
    readHintEn: 'Read the email from your pharmacy.',
    passageNl:
      'Geachte mevrouw Nguyen, uw herhaalrecept voor metformine is klaar. U kunt het afhalen tot en met vrijdag 21:00 bij de balie aan de Stationsstraat. Neem uw zorgpas mee. Wilt u laten bezorgen? Dat kost €4,95 en duurt één werkdag na aanvraag via onze site.',
    passageEn:
      'Dear Ms Nguyen, your repeat prescription for metformin is ready. You can collect it until Friday 9:00 p.m. at the desk on Stationsstraat. Bring your health insurance card. Want delivery? That costs €4.95 and takes one working day after requesting via our site.',
    questionNl: 'Wat kost bezorgen volgens de apotheek?',
    questionEn: 'How much does delivery cost according to the pharmacy?',
    options: [
      { id: 'a', label: 'Bezorgen is gratis binnen de stad.' },
      { id: 'b', label: '€4,95 voor één werkdag bezorging.' },
      { id: 'c', label: '€9,90 alleen op zaterdag.' },
      { id: 'd', label: 'De apotheek bezorgt niet aan huis.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze e-mail van uw boodschappendienst.',
    readHintEn: 'Read the email from your grocery delivery service.',
    passageNl:
      'Hallo, uw bestelling #44821 komt morgen tussen 18:00 en 20:00. Laat een boodschap achter als u niet thuis bent; anders leveren wij bij de buren op nummer 8. Verse producten nemen wij terug als u niet thuis bent zonder instructie. Wijzigingen tot vanmiddag 14:00 via de app.',
    passageEn:
      'Hello, your order #44821 arrives tomorrow between 6:00 and 8:00 p.m. Leave a note if you are not home; otherwise we deliver to the neighbours at number 8. Fresh products we take back if you are not home without instructions. Changes until this afternoon 2:00 p.m. via the app.',
    questionNl: 'Wat gebeurt er met verse producten als u niet thuis bent zonder instructie?',
    questionEn: 'What happens to fresh products if you are not home without instructions?',
    options: [
      { id: 'a', label: 'Ze worden mee terug genomen.' },
      { id: 'b', label: 'Ze blijven voor de deur staan.' },
      { id: 'c', label: 'De bestelling wordt gratis opnieuw bezorgd.' },
      { id: 'd', label: 'Ze worden bij de buren achtergelaten.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Winkelmededelingen (14) ───
  {
    introNl: 'Lees deze winkelmededeling.',
    readHintEn: 'Read the store notice.',
    passageNl:
      'Supermarkt De Linde, Hoofdstraat 22: vanwege inventaris is de winkel op dinsdag 14 mei gesloten. Woensdag opent de winkel weer om 08:00 uur. Online bestellen blijft mogelijk; afhalen kan vanaf woensdag vanaf 10:00 bij ingang B.',
    passageEn:
      'Supermarket De Linde, Hoofdstraat 22: due to stocktaking the shop is closed on Tuesday 14 May. On Wednesday the shop opens again at 8:00 a.m. Online ordering remains possible; collection from Wednesday from 10:00 at entrance B.',
    questionNl: 'Wanneer is de winkel dicht?',
    questionEn: 'When is the shop closed?',
    options: [
      { id: 'a', label: 'Elke dag in mei na 20:00 uur.' },
      { id: 'b', label: 'De mededeling noemt geen sluitingsdag.' },
      { id: 'c', label: 'Op dinsdag 14 mei de hele dag.' },
      { id: 'd', label: 'Alleen op woensdagochtend tot 10:00.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit prijskaartje in de kledingwinkel.',
    readHintEn: 'Read this price tag in the clothing store.',
    passageNl:
      'Winterjassen: van €129,95 voor €79,95. Actie geldig tot en met zondag. Ruilen kan binnen veertien dagen met bon en kaartje. Sale-artikelen worden niet teruggenomen in contanten, alleen tegoedbon of omruilen.',
    passageEn:
      'Winter coats: from €129.95 for €79.95. Offer valid until Sunday. Exchange within fourteen days with receipt and tag. Sale items are not refunded in cash, only store credit or exchange.',
    questionNl: 'Wat is volgens de tekst niet mogelijk bij sale-artikelen?',
    questionEn: 'What is not possible for sale items according to the text?',
    options: [
      { id: 'a', label: 'Ruilen met kaartje en bon.' },
      { id: 'b', label: 'Omruilen binnen veertien dagen met bon.' },
      { id: 'c', label: 'Contant geld terugkrijgen.' },
      { id: 'd', label: 'Een tegoedbon ontvangen.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de mededeling bij de kassa.',
    readHintEn: 'Read the notice at the checkout.',
    passageNl:
      'Let op: pinbetaling alleen boven €1. Bij kleinere bedragen graag contactloos of contant. Zelfscankassa 1 t/m 4 is vandaag buiten gebruik door onderhoud. Gebruik kassa 5 bij de ingang van de versafdeling.',
    passageEn:
      'Note: PIN payment only above €1. For smaller amounts please use contactless or cash. Self-checkout 1–4 is out of use today due to maintenance. Use checkout 5 at the entrance to the fresh section.',
    questionNl: 'Welke kassa moet u gebruiken volgens de mededeling?',
    questionEn: 'Which checkout must you use according to the notice?',
    options: [
      { id: 'a', label: 'Zelfscankassa 3 bij de hoofdingang.' },
      { id: 'b', label: 'Kassa 5 bij de versafdeling.' },
      { id: 'c', label: 'Alleen contant bij kassa 1.' },
      { id: 'd', label: 'Elke kassa behalve de versafdeling.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de folder van de bouwmarkt.',
    readHintEn: 'Read the DIY store flyer.',
    passageNl:
      'Bouwmarkt Fix-All: gratis bezorging bij bestellingen vanaf €75 binnen 15 km. Bestel voor woensdag 18:00, dan bezorgen wij op vrijdag. Grote artikelen zoals tegels alleen op afspraak; bel de klantenservice op 088-1234567.',
    passageEn:
      'DIY store Fix-All: free delivery on orders from €75 within 15 km. Order before Wednesday 6:00 p.m., then we deliver on Friday. Large items such as tiles by appointment only; call customer service on 088-1234567.',
    questionNl: 'Vanaf welk bedrag is bezorging gratis?',
    questionEn: 'From what amount is delivery free?',
    options: [
      { id: 'a', label: 'Vanaf €75 binnen 15 km.' },
      { id: 'b', label: 'Alleen bij tegels op afspraak.' },
      { id: 'c', label: 'Bezorging is nooit gratis volgens de folder.' },
      { id: 'd', label: 'Vanaf €50 binnen heel Nederland.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het bord bij de ingang van de markt.',
    readHintEn: 'Read the sign at the market entrance.',
    passageNl:
      'Weekmarkt centrum: zaterdag 08:00-16:00 uur op het Plein. Honden aan de lijn. Geen fietsen op het plein tussen 07:00 en 17:00. Standplaatsen voor groente en brood aan de noordzijde; kleding aan de oostkant bij de fontein.',
    passageEn:
      'Town centre market: Saturday 8:00 a.m.–4:00 p.m. on the square. Dogs on a lead. No bicycles on the square between 7:00 a.m. and 5:00 p.m. Stalls for vegetables and bread on the north side; clothing on the east side by the fountain.',
    questionNl: 'Wat is niet toegestaan op het plein volgens het bord?',
    questionEn: 'What is not allowed on the square according to the sign?',
    options: [
      { id: 'a', label: 'Groente kopen aan de noordzijde.' },
      { id: 'b', label: 'De markt op zaterdag bezoeken.' },
      { id: 'c', label: 'Honden aan de lijn meenemen.' },
      { id: 'd', label: 'Fietsen tussen 07:00 en 17:00.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees de mededeling in de drogist.',
    readHintEn: 'Read the notice in the drugstore.',
    passageNl:
      'Drogist Gezond+: vanaf 1 juni zijn plastic tasjes niet meer gratis. Een herbruikbare tas kost €0,25. Medicijnen zonder recept blijven achter de balie; neem een wachtnummer. De apotheekhoek is open tot 18:30 op werkdagen.',
    passageEn:
      'Drugstore Gezond+: from 1 June plastic bags are no longer free. A reusable bag costs €0.25. Non-prescription medicines remain behind the counter; take a queue number. The pharmacy corner is open until 6:30 p.m. on weekdays.',
    questionNl: 'Hoeveel kost een herbruikbare tas?',
    questionEn: 'How much does a reusable bag cost?',
    options: [
      { id: 'a', label: 'De prijs staat niet in de tekst.' },
      { id: 'b', label: 'Gratis bij elke aankoop.' },
      { id: 'c', label: '€0,25 per tas.' },
      { id: 'd', label: '€1,00 alleen op zaterdag.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees het briefje op de deur van de bakker.',
    readHintEn: 'Read the note on the bakery door.',
    passageNl:
      'Vandaag gesloten wegens familiefeest. Morgen gewoon open van 07:00 tot 17:00. Bestelde taarten kunt u ophalen bij de achterdeur aan de Kerkstraat tussen 10:00 en 12:00. Bel bij vragen naar 06-12345678.',
    passageEn:
      'Closed today due to a family celebration. Tomorrow open as usual from 7:00 a.m. to 5:00 p.m. Ordered cakes can be collected at the back door on Kerkstraat between 10:00 a.m. and 12:00 noon. Call 06-12345678 with questions.',
    questionNl: 'Waar kunt u bestelde taarten vandaag ophalen?',
    questionEn: 'Where can you collect ordered cakes today?',
    options: [
      { id: 'a', label: 'Aan de voordeur op het Plein de hele dag.' },
      { id: 'b', label: 'Bij de achterdeur aan de Kerkstraat tussen 10:00 en 12:00.' },
      { id: 'c', label: 'Alleen morgen bij de kassa.' },
      { id: 'd', label: 'Taarten worden vandaag niet uitgegeven.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de actieposter in de elektronicawinkel.',
    readHintEn: 'Read the promotion poster in the electronics store.',
    passageNl:
      'MediaWorld: koop een wasmachine en krijg gratis bezorging en installatie t/m 30 juni. Garantie twee jaar; uitbreiden naar vijf jaar kost €49. Oude apparaten nemen wij gratis mee als u het nieuwe apparaat laat bezorgen.',
    passageEn:
      'MediaWorld: buy a washing machine and get free delivery and installation until 30 June. Two-year warranty; extend to five years for €49. We take old appliances free if you have the new one delivered.',
    questionNl: 'Wat krijgt u gratis bij aankoop van een wasmachine volgens de poster?',
    questionEn: 'What do you get free when buying a washing machine according to the poster?',
    options: [
      { id: 'a', label: 'Bezorging en installatie tot 30 juni.' },
      { id: 'b', label: 'Een tweede wasmachine halve prijs.' },
      { id: 'c', label: 'Alleen afhalen in de winkel, geen service.' },
      { id: 'd', label: 'Vijf jaar garantie zonder meerprijs.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het bord bij de uitgang van het tuincentrum.',
    readHintEn: 'Read the sign at the garden centre exit.',
    passageNl:
      'Tuincentrum Groen & Zo: grote planten alleen vervoeren met eigen aanhanger of bezorgservice (vanaf €15). Kleine potten passen in de auto. Parkeerplaats P3 is voor laden; maximaal 30 minuten. Bon tonen bij de slagboom.',
    passageEn:
      'Garden centre Groen & Zo: large plants only with your own trailer or delivery service (from €15). Small pots fit in the car. Car park P3 is for loading; maximum 30 minutes. Show receipt at the barrier.',
    questionNl: 'Waar moet u laden volgens het bord?',
    questionEn: 'Where must you load according to the sign?',
    options: [
      { id: 'a', label: 'Op P1 voor maximaal twee uur gratis.' },
      { id: 'b', label: 'Laden is overal op het terrein toegestaan.' },
      { id: 'c', label: 'Op parkeerplaats P3 met bon bij de slagboom.' },
      { id: 'd', label: 'Alleen achter de hoofdingang zonder tijdslimiet.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de mededeling bij de servicebalie.',
    readHintEn: 'Read the notice at the service desk.',
    passageNl:
      'Winkel Stadshart: ruilen zonder bon alleen bij identieke producten en binnen 48 uur. Met bon: veertien dagen. Schoenen die gedragen zijn buiten de winkel worden niet geruild. Klachten? Vul een formulier in bij balie 2 op de eerste verdieping.',
    passageEn:
      'Stadshart store: exchange without receipt only for identical products and within 48 hours. With receipt: fourteen days. Shoes worn outside the shop are not exchanged. Complaints? Fill in a form at desk 2 on the first floor.',
    questionNl: 'Waar vult u een klachtenformulier in?',
    questionEn: 'Where do you fill in a complaint form?',
    options: [
      { id: 'a', label: 'Bij de schoenenafdeling zonder formulier.' },
      { id: 'b', label: 'Bij balie 2 op de eerste verdieping.' },
      { id: 'c', label: 'Bij elke kassa op de begane grond.' },
      { id: 'd', label: 'Alleen online via de webshop.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het scherm bij de broodafdeling.',
    readHintEn: 'Read the screen at the bread section.',
    passageNl:
      'Vers gebakken: bruin brood om 11:30 en 15:00. Croissants om 09:00 en 14:00. Vooraf bestellen kan via de app tot twee uur voor het bakmoment. Zonder bestelling: wie het eerst komt, het eerst maalt bij drukte.',
    passageEn:
      'Freshly baked: brown bread at 11:30 a.m. and 3:00 p.m. Croissants at 9:00 a.m. and 2:00 p.m. Pre-order via the app up to two hours before baking time. Without order: first come, first served when busy.',
    questionNl: 'Hoe laat zijn croissants vers volgens het scherm?',
    questionEn: 'When are croissants fresh according to the screen?',
    options: [
      { id: 'a', label: 'Om 11:30 en 15:00 uur.' },
      { id: 'b', label: 'Om 09:00 en 14:00 uur.' },
      { id: 'c', label: 'Alleen na vooraf bestellen via de app.' },
      { id: 'd', label: 'De tekst noemt geen tijden voor croissants.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de poster bij de kassa van de kringloopwinkel.',
    readHintEn: 'Read the poster at the thrift shop checkout.',
    passageNl:
      'Kringloop De Meeuw: vandaag 50% korting op alle boeken en speelgoed. Meubels zijn uitgezonderd. Betalen kan met pin of contant; creditcard niet. Donaties in goede staat graag voor 16:00 aan de achterzijde.',
    passageEn:
      'Thrift shop De Meeuw: today 50% off all books and toys. Furniture excluded. Pay by debit or cash; no credit card. Donations in good condition please before 4:00 p.m. at the rear.',
    questionNl: 'Waar brengt u donaties volgens de poster?',
    questionEn: 'Where do you bring donations according to the poster?',
    options: [
      { id: 'a', label: 'Voor 16:00 aan de achterzijde.' },
      { id: 'b', label: 'Alleen op maandag bij de manager.' },
      { id: 'c', label: 'Donaties worden niet meer aangenomen.' },
      { id: 'd', label: 'Aan de kassa op de begane grond.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het bord bij de viskraam.',
    readHintEn: 'Read the sign at the fish stall.',
    passageNl:
      'Viskraam Noordzee: verse haring alleen op vrijdag en zaterdag. Voor bestellingen vanaf €30: bel een dag van tevoren. Zonder bestelling wacht u in de rij aan de kraam op de Vismarkt. Pin alleen; geen contant onder €5.',
    passageEn:
      'Fish stall Noordzee: fresh herring only on Friday and Saturday. For orders from €30: call one day in advance. Without order wait in the queue at the stall on Vismarkt. Debit only; no cash under €5.',
    questionNl: 'Op welke dagen is verse haring verkrijgbaar?',
    questionEn: 'On which days is fresh herring available?',
    options: [
      { id: 'a', label: 'Alleen na telefonische bestelling van €30.' },
      { id: 'b', label: 'De tekst vermeldt geen dagen voor haring.' },
      { id: 'c', label: 'Elke werkdag tot 18:00 uur.' },
      { id: 'd', label: 'Alleen op vrijdag en zaterdag.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees de mededeling bij de bloemist.',
    readHintEn: 'Read the notice at the florist.',
    passageNl:
      'Bloemist Flora: valentijnsboeketten ophalen op 13 februari tussen 14:00 en 18:00. Zonder reserveringsnummer geen afhalen. Bezorging op 14 februari is vol; alleen nog afhalen in de winkel. Neem uw bevestigingsmail mee.',
    passageEn:
      'Florist Flora: collect Valentine bouquets on 13 February between 2:00 p.m. and 6:00 p.m. No collection without reservation number. Delivery on 14 February is full; only collection in shop. Bring your confirmation email.',
    questionNl: 'Wat moet u meenemen om een boeket op te halen?',
    questionEn: 'What must you bring to collect a bouquet?',
    options: [
      { id: 'a', label: 'Niets; afhalen kan zonder afspraak de hele dag.' },
      { id: 'b', label: 'Alleen contant geld voor de restbetaling.' },
      { id: 'c', label: 'Uw bevestigingsmail en reserveringsnummer.' },
      { id: 'd', label: 'Een eigen vaas van minimaal 30 cm.' },
    ],
    correctOptionIds: ['c'],
  },
  // ─── OV-meldingen (14) ───
  {
    introNl: 'Lees dit omroepbericht in de tram.',
    readHintEn: 'Read this tram announcement.',
    passageNl:
      'Let op reizigers: tram 7 rijdt vandaag om via halte Museumplein vanwege werkzaamheden aan de Leidsestraat. U kunt overstappen op tram 2 bij halte Rijksmuseum. Extra reistijd is ongeveer tien minuten. Excuses voor het ongemak.',
    passageEn:
      'Attention passengers: tram 7 is diverted via Museumplein stop today due to work on Leidsestraat. You can change to tram 2 at Rijksmuseum stop. Extra travel time is about ten minutes. Sorry for the inconvenience.',
    questionNl: 'Waarom rijdt tram 7 vandaag anders?',
    questionEn: 'Why is tram 7 running differently today?',
    options: [
      { id: 'a', label: 'Wegens werkzaamheden aan de Leidsestraat.' },
      { id: 'b', label: 'Omdat halte Museumplein permanent is opgeheven.' },
      { id: 'c', label: 'Vanwege een staking bij het GVB.' },
      { id: 'd', label: 'De tekst geeft geen reden.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het bord op het station.',
    readHintEn: 'Read the sign at the station.',
    passageNl:
      'Station Utrecht Centraal: lift 4 naar spoor 9-12 is buiten gebruik tot vrijdag 18:00. Gebruik de roltrap bij ingang Jaarbeurs of de lift bij spoor 5. Rolstoelgebruikers kunnen bij de servicedesk om begeleiding vragen.',
    passageEn:
      'Utrecht Centraal station: lift 4 to platforms 9-12 is out of use until Friday 6:00 p.m. Use the escalator at Jaarbeurs entrance or the lift at platform 5. Wheelchair users can ask for assistance at the service desk.',
    questionNl: 'Tot wanneer is lift 4 buiten gebruik?',
    questionEn: 'Until when is lift 4 out of use?',
    options: [
      { id: 'a', label: 'Tot vrijdag 18:00 uur.' },
      { id: 'b', label: 'Permanent; er komt geen nieuwe lift.' },
      { id: 'c', label: 'De tekst noemt geen einddatum.' },
      { id: 'd', label: 'Tot maandagochtend 08:00 uur.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling bij de bushalte.',
    readHintEn: 'Read the notice at the bus stop.',
    passageNl:
      'Lijn 15: halte Parkweg is verplaatst 100 meter naar de hoek met de Dorpsstraat. De oude halte is afgezet wegens rioleringswerk. De bus stopt hier tot en met 22 augustus. Kaartjes kopen kan in de bus met pin.',
    passageEn:
      'Line 15: Parkweg stop has moved 100 metres to the corner with Dorpsstraat. The old stop is closed due to sewer work. The bus stops here until 22 August. You can buy tickets on the bus by debit card.',
    questionNl: 'Waar stopt de bus tijdelijk?',
    questionEn: 'Where does the bus stop temporarily?',
    options: [
      { id: 'a', label: 'Alleen bij het busstation centrum.' },
      { id: 'b', label: 'Lijn 15 rijdt niet meer in de wijk.' },
      { id: 'c', label: 'Op de oude plek bij Parkweg 12.' },
      { id: 'd', label: 'Bij de hoek Parkweg en Dorpsstraat.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het NS-bericht op het scherm.',
    readHintEn: 'Read the NS message on the screen.',
    passageNl:
      'Trein naar Den Haag Centraal vertrekt vandaag met 15 minuten vertraging van spoor 7a. De intercity naar Rotterdam vertrekt planmatig van spoor 4. Reizigers naar Leiden kunnen ook de sprinter op spoor 9 nemen.',
    passageEn:
      'Train to Den Haag Centraal departs today with a 15-minute delay from platform 7a. The intercity to Rotterdam departs on time from platform 4. Passengers to Leiden can also take the sprinter on platform 9.',
    questionNl: 'Van welk spoor vertrekt de trein naar Den Haag?',
    questionEn: 'From which platform does the train to Den Haag depart?',
    options: [
      { id: 'a', label: 'De tekst noemt geen spoor voor Den Haag.' },
      { id: 'b', label: 'Van spoor 4 naar Rotterdam.' },
      { id: 'c', label: 'Van spoor 7a met vertraging.' },
      { id: 'd', label: 'Van spoor 9, de sprinter.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de mededeling in de metro.',
    readHintEn: 'Read the notice in the metro.',
    passageNl:
      'Metro lijn B: tussen stations Beurs en Blaak rijden de metro\'s langzamer door spooronderhoud. Houd rekening met 5-8 minuten extra. Uitstappen voor overstap op tram 21 kan ook bij station Eendrachtsplein.',
    passageEn:
      'Metro line B: between Beurs and Blaak metros run slower due to track maintenance. Allow 5–8 minutes extra. To change to tram 21 you can also get off at Eendrachtsplein station.',
    questionNl: 'Waarom rijden de metro\'s langzamer?',
    questionEn: 'Why are the metros running slower?',
    options: [
      { id: 'a', label: 'Wegens spooronderhoud tussen Beurs en Blaak.' },
      { id: 'b', label: 'Omdat tram 21 de tunnel blokkeert.' },
      { id: 'c', label: 'Door een storing in de airconditioning.' },
      { id: 'd', label: 'Er is geen reden genoemd in de tekst.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het briefje bij de fietsenstalling.',
    readHintEn: 'Read the note at the bike parking.',
    passageNl:
      'Stalling station Zuid: vanaf maandag alleen toegang met OV-chipkaart of abonnement. Dagkaart fietsstalling kost €1,25 per 24 uur. Fietsen zonder slot worden na 72 uur verwijderd. Cameratoezicht 24 uur per dag.',
    passageEn:
      'Parking at Zuid station: from Monday access only with OV-chip card or subscription. Day ticket bike parking costs €1.25 per 24 hours. Bikes without a lock are removed after 72 hours. CCTV 24 hours a day.',
    questionNl: 'Wat gebeurt er met fietsen zonder slot na 72 uur?',
    questionEn: 'What happens to bikes without a lock after 72 hours?',
    options: [
      { id: 'a', label: 'Ze worden verwijderd.' },
      { id: 'b', label: 'Ze mogen blijven staan met dagkaart.' },
      { id: 'c', label: 'De tekst zegt niets over sloten.' },
      { id: 'd', label: 'Ze krijgen een gratis slot van de beheerder.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de omroep in de ferry.',
    readHintEn: 'Read the ferry announcement.',
    passageNl:
      'Pont naar Noord: laatste overtocht vandaag om 23:45. Daarna alleen nog fietsers tot 00:15 bij gunstig weer. Auto\'s moeten uiterlijk 23:30 aan boord zijn. Bij storm kan de dienstregeling wijzigen; kijk op veerpont.nl.',
    passageEn:
      'Ferry to Noord: last crossing today at 11:45 p.m. After that only cyclists until 12:15 a.m. in good weather. Cars must be on board by 11:30 p.m. at the latest. In storms the timetable may change; see veerpont.nl.',
    questionNl: 'Tot hoe laat mogen auto\'s nog mee?',
    questionEn: 'Until what time can cars still board?',
    options: [
      { id: 'a', label: 'De hele nacht bij gunstig weer.' },
      { id: 'b', label: 'Auto\'s zijn vandaag niet toegestaan.' },
      { id: 'c', label: 'Tot 00:15 uur samen met fietsers.' },
      { id: 'd', label: 'Uiterlijk om 23:30 aan boord.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het RET-bericht op de halte.',
    readHintEn: 'Read the RET message at the stop.',
    passageNl:
      'Metro A en B: station Capelsebrug is deze week gesloten. Uitstappen bij station Kralingse Zoom en loop 8 minuten via de Capelseweg. Bus 38 vervangt de metro in de spits elk kwartier.',
    passageEn:
      'Metro A and B: Capelsebrug station is closed this week. Get off at Kralingse Zoom station and walk 8 minutes via Capelseweg. Bus 38 replaces the metro in rush hour every fifteen minutes.',
    questionNl: 'Welke bus vervangt de metro in de spits?',
    questionEn: 'Which bus replaces the metro in rush hour?',
    options: [
      { id: 'a', label: 'Tram 21 via Eendrachtsplein.' },
      { id: 'b', label: 'Bus 15 via de Dorpsstraat.' },
      { id: 'c', label: 'Bus 38 elk kwartier.' },
      { id: 'd', label: 'Geen bus; alleen lopen.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de mededeling bij de parkeerplaats P+R.',
    readHintEn: 'Read the notice at the park-and-ride.',
    passageNl:
      'P+R Meerzicht: vandaag vol vanaf 07:30. Volgende vrije plekken verwacht rond 09:00. Met geldig OV-abonnement reist u door naar het centrum; parkeerkosten eerste 24 uur €6,00. Zonder OV-kaart €18 per dag.',
    passageEn:
      'P+R Meerzicht: full today from 7:30 a.m. Next free spaces expected around 9:00 a.m. With a valid public transport subscription you travel on to the centre; parking first 24 hours €6.00. Without OV card €18 per day.',
    questionNl: 'Hoeveel kost parkeren de eerste 24 uur met OV-abonnement?',
    questionEn: 'How much does parking cost for the first 24 hours with an OV subscription?',
    options: [
      { id: 'a', label: '€18 per dag zonder kaart.' },
      { id: 'b', label: '€6,00 de eerste 24 uur.' },
      { id: 'c', label: 'Gratis de hele week.' },
      { id: 'd', label: 'De prijs staat niet in de tekst.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bord bij de werkzaamheden aan het spoor.',
    readHintEn: 'Read the sign at the rail works.',
    passageNl:
      'Let op: tussen Haarlem en Leiden rijden bussen in plaats van treinen van 6 t/m 10 mei, van 22:00 tot 05:00. Overdag rijden de treinen planmatig. Reisadvies en tijden staan op ns.nl/planning.',
    passageEn:
      'Note: between Haarlem and Leiden buses replace trains from 6–10 May, from 10:00 p.m. to 5:00 a.m. During the day trains run on schedule. Travel advice and times are on ns.nl/planning.',
    questionNl: 'Wanneer rijden er bussen in plaats van treinen?',
    questionEn: 'When do buses run instead of trains?',
    options: [
      { id: 'a', label: 'Van 22:00 tot 05:00 tussen 6 en 10 mei.' },
      { id: 'b', label: 'Alleen in het weekend overdag.' },
      { id: 'c', label: 'De hele week zonder treinen.' },
      { id: 'd', label: 'Overdag tussen 6 en 10 mei.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling op het perron.',
    readHintEn: 'Read the notice on the platform.',
    passageNl:
      'Sprinter naar Zwolle: stop in Hattem wordt overgeslagen wegens te korte perrons. Uitstappen in Zwolle en neem bus 203 naar Hattem. De bus vertrekt 10 minuten na aankomst van de trein bij uitgang Oost.',
    passageEn:
      'Sprinter to Zwolle: Hattem stop is skipped due to platforms being too short. Get off in Zwolle and take bus 203 to Hattem. The bus leaves 10 minutes after the train arrives at the east exit.',
    questionNl: 'Hoe komt u in Hattem volgens de mededeling?',
    questionEn: 'How do you get to Hattem according to the notice?',
    options: [
      { id: 'a', label: 'Met de taxi bij uitgang West.' },
      { id: 'b', label: 'De trein stopt toch in Hattem.' },
      { id: 'c', label: 'Met de sprinter die in Hattem stopt.' },
      { id: 'd', label: 'Uitstappen in Zwolle en bus 203 nemen.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het GVB-bericht in de halte.',
    readHintEn: 'Read the GVB message at the stop.',
    passageNl:
      'Tram 14: einde halte Westergasfabriek tot 1 oktober. Tijdelijke eindhalte bij halte Van Hallstraat. Reizigers naar het park lopen 6 minuten of nemen bus 22. Nachtbus N14 rijdt niet in deze periode.',
    passageEn:
      'Tram 14: terminus Westergasfabriek until 1 October. Temporary terminus at Van Hallstraat stop. Passengers to the park walk 6 minutes or take bus 22. Night bus N14 does not run in this period.',
    questionNl: 'Wat is volgens de tekst niet mogelijk in deze periode?',
    questionEn: 'What is not possible according to the text in this period?',
    options: [
      { id: 'a', label: 'Zes minuten lopen naar het park.' },
      { id: 'b', label: 'Bus 22 nemen naar het park.' },
      { id: 'c', label: 'Nachtbus N14 gebruiken.' },
      { id: 'd', label: 'Uitstappen bij Van Hallstraat.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de mededeling bij de OV-kaartautomaat.',
    readHintEn: 'Read the notice at the OV card machine.',
    passageNl:
      'Automaten 1 en 2 accepteren geen contant geld meer. Opladen kan met pin of creditcard. Saldo onder €4? U kunt niet inchecken. Bij problemen: bel 0900-0989 of gebruik de servicebalie in de stationshal.',
    passageEn:
      'Machines 1 and 2 no longer accept cash. Top up with debit or credit card. Balance under €4? You cannot check in. For problems: call 0900-0989 or use the service desk in the station hall.',
    questionNl: 'Wat moet u doen als inchecken niet lukt door laag saldo?',
    questionEn: 'What must you do if you cannot check in due to low balance?',
    options: [
      { id: 'a', label: 'Contant opladen bij automaat 1.' },
      { id: 'b', label: 'Saldo opladen tot minimaal €4.' },
      { id: 'c', label: 'Gratis reizen zonder kaart.' },
      { id: 'd', label: 'Niets; onder €4 mag u toch reizen.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bord bij de taxistandplaats.',
    readHintEn: 'Read the sign at the taxi rank.',
    passageNl:
      'Taxistandplaats Schiphol Plaza: rij 1 voor reserveringen met naam op het bord. Rij 2 voor regulier verkeer naar Amsterdam. Vaste prijs naar centrum €48, inclusief twee koffers. Pin en contant mogelijk; fooi niet verplicht.',
    passageEn:
      'Taxi rank Schiphol Plaza: row 1 for bookings with name on the board. Row 2 for regular traffic to Amsterdam. Fixed price to centre €48, including two suitcases. Debit and cash possible; tip not required.',
    questionNl: 'Waar wacht u als u een reservering heeft?',
    questionEn: 'Where do you wait if you have a booking?',
    options: [
      { id: 'a', label: 'Bij rij 1 met uw naam op het bord.' },
      { id: 'b', label: 'Bij de bushalte voor lijn 397.' },
      { id: 'c', label: 'Reserveringen zijn niet mogelijk op Schiphol.' },
      { id: 'd', label: 'Bij rij 2 voor regulier verkeer.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Vacatures (12) ───
  {
    introNl: 'Lees deze vacature.',
    readHintEn: 'Read this job advertisement.',
    passageNl:
      'Wij zoeken een magazijnmedewerker (32-40 uur) in Rotterdam. U werkt in twee ploegen; ervaring is niet verplicht. Salaris volgens CAO vanaf €2.450 bruto per maand. Solliciteren kan tot 15 maart via werkenbijlogistiek.nl met cv en korte motivatie.',
    passageEn:
      'We are looking for a warehouse worker (32–40 hours) in Rotterdam. You work in two shifts; experience is not required. Salary according to collective agreement from €2,450 gross per month. Apply by 15 March via werkenbijlogistiek.nl with CV and short motivation.',
    questionNl: 'Wat moet u meesturen bij uw sollicitatie?',
    questionEn: 'What must you send with your application?',
    options: [
      { id: 'a', label: 'Een referentie van uw huisarts.' },
      { id: 'b', label: 'Niets; u kunt telefonisch solliciteren zonder cv.' },
      { id: 'c', label: 'Alleen een kopie van uw diploma.' },
      { id: 'd', label: 'Cv en korte motivatie.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze vacature in de krant.',
    readHintEn: 'Read this job ad in the newspaper.',
    passageNl:
      'Horeca De Gouwe zoekt een parttime afwasser (max. 20 uur per week). Werkdagen: vrijdag en zaterdag van 17:00 tot sluit. Goede beheersing Nederlands is gewenst. Interesse? Stuur een app naar 06-44556677 of kom langs op dinsdag tussen 14:00 en 16:00.',
    passageEn:
      'Restaurant De Gouwe is looking for a part-time dishwasher (max. 20 hours per week). Work days: Friday and Saturday from 5:00 p.m. until closing. Good command of Dutch is preferred. Interested? Send a message to 06-44556677 or visit on Tuesday between 2:00 and 4:00 p.m.',
    questionNl: 'Wanneer kunt u langskomen voor een gesprek?',
    questionEn: 'When can you visit for a talk?',
    options: [
      { id: 'a', label: 'Langskomen is niet mogelijk volgens de advertentie.' },
      { id: 'b', label: 'Elke dag tussen 17:00 en sluit.' },
      { id: 'c', label: 'Op dinsdag tussen 14:00 en 16:00.' },
      { id: 'd', label: 'Alleen op zaterdagochtend.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze vacature op Indeed.',
    readHintEn: 'Read this vacancy on Indeed.',
    passageNl:
      'Gemeente Almere: taalcoach NT2 (ZZP, 8-12 uur per week). U begeleidt inburgeraars bij spreekvaardigheid. VOG en pedagogische ervaring verplicht. Tarief €35-€42 per uur. Reageren vóór 1 april met portfolio en beschikbaarheid.',
    passageEn:
      'Municipality of Almere: NT2 language coach (self-employed, 8–12 hours per week). You support civic integration students with speaking skills. VOG and teaching experience required. Rate €35–€42 per hour. Respond before 1 April with portfolio and availability.',
    questionNl: 'Wat is verplicht voor deze functie?',
    questionEn: 'What is required for this position?',
    options: [
      { id: 'a', label: 'Alleen een rijbewijs C.' },
      { id: 'b', label: 'VOG en pedagogische ervaring.' },
      { id: 'c', label: 'Fulltime beschikbaarheid van 40 uur.' },
      { id: 'd', label: 'Geen eisen; iedereen kan reageren.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze vacature van een zorginstelling.',
    readHintEn: 'Read this vacancy from a care organisation.',
    passageNl:
      'Zorggroep Midden: helpende niveau 2 gezocht voor nachtdienst in Utrecht. Contract voor een jaar met kans op vast. Training intern mogelijk. Sollicitatiegesprekken in week 12; stuur uw cv naar vacatures@zorgmidden.nl onder vermelding van referentie ZM-882.',
    passageEn:
      'Care group Midden: care assistant level 2 wanted for night shift in Utrecht. One-year contract with chance of permanent post. Internal training possible. Interviews in week 12; send your CV to vacatures@zorgmidden.nl with reference ZM-882.',
    questionNl: 'Waar moet u uw cv naartoe sturen?',
    questionEn: 'Where must you send your CV?',
    options: [
      { id: 'a', label: 'Per post naar het hoofdkantoor in Amsterdam.' },
      { id: 'b', label: 'Alleen via een uitzendbureau zonder referentie.' },
      { id: 'c', label: 'De advertentie noemt geen e-mailadres.' },
      { id: 'd', label: 'Naar vacatures@zorgmidden.nl met referentie ZM-882.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze vacature voor een kantoorbaan.',
    readHintEn: 'Read this vacancy for an office job.',
    passageNl:
      'Administratief medewerker (24 uur): u verwerkt facturen en plant afspraken. Thuiswerken maximaal twee dagen per week. Start 1 juni. Salaris €2.200-€2.600 bruto. Hybride werken vereist eigen laptop; vergoeding €15 per maand.',
    passageEn:
      'Administrative assistant (24 hours): you process invoices and schedule appointments. Work from home max two days per week. Start 1 June. Salary €2,200–€2,600 gross. Hybrid work requires own laptop; allowance €15 per month.',
    questionNl: 'Hoeveel dagen per week mag u thuiswerken?',
    questionEn: 'How many days per week may you work from home?',
    options: [
      { id: 'a', label: 'Thuiswerken is niet toegestaan.' },
      { id: 'b', label: 'De advertentie noemt geen thuiswerkdagen.' },
      { id: 'c', label: 'Vijf dagen, volledig thuis.' },
      { id: 'd', label: 'Maximaal twee dagen per week.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze vacature voor een schoonmaakbedrijf.',
    readHintEn: 'Read this vacancy for a cleaning company.',
    passageNl:
      'Schoonmaakbedrijf Blink: medewerker kantoren gezocht in Den Haag. Werk van maandag tot vrijdag 06:00-10:00. Eigen vervoer naar verschillende locaties. Geen ervaring nodig; introductie eerste week. Loon €13,50 per uur plus reiskostenvergoeding.',
    passageEn:
      'Cleaning company Blink: office cleaner wanted in Den Haag. Work Monday to Friday 6:00 a.m.–10:00 a.m. Own transport to various locations. No experience needed; introduction first week. Wage €13.50 per hour plus travel allowance.',
    questionNl: 'Hoe laat begint het werk meestal?',
    questionEn: 'What time does work usually start?',
    options: [
      { id: 'a', label: 'De tijden staan niet in de advertentie.' },
      { id: 'b', label: 'Om 06:00 uur, maandag tot vrijdag.' },
      { id: 'c', label: 'Om 14:00 uur in het weekend.' },
      { id: 'd', label: 'Om 22:00 uur voor nachtdienst.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze vacature voor een bezorger.',
    readHintEn: 'Read this delivery driver vacancy.',
    passageNl:
      'Pakketbezorger gezocht: rijbewijs B en fietskennis verplicht. Werkgebied regio Amersfoort. Parttime of fulltime. U gebruikt een bus van het bedrijf; tanken is gratis. Sollicitatiedag woensdag 9 april om 10:00 op Industrieweg 4.',
    passageEn:
      'Parcel deliverer wanted: driving licence B and bike knowledge required. Work area Amersfoort region. Part-time or full-time. You use a company van; fuel is free. Application day Wednesday 9 April at 10:00 a.m. at Industrieweg 4.',
    questionNl: 'Wanneer is de sollicitatiedag?',
    questionEn: 'When is the application day?',
    options: [
      { id: 'a', label: 'Woensdag 9 april om 10:00 uur.' },
      { id: 'b', label: 'Elke vrijdag zonder afspraak.' },
      { id: 'c', label: 'Alleen online, geen fysieke dag.' },
      { id: 'd', label: 'De datum staat niet in de tekst.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze vacature voor een winkel.',
    readHintEn: 'Read this shop vacancy.',
    passageNl:
      'Kassa- en vakkenvuller gezocht bij supermarkt Plus. Weekendwerk verplicht. Contract 12 uur per week, uitbreiding mogelijk. Training op de werkvloer eerste maand. Neem cv mee naar open sollicitatie zaterdag 10:00-12:00 bij ingang personeel.',
    passageEn:
      'Checkout and shelf filler wanted at Plus supermarket. Weekend work required. Contract 12 hours per week, expansion possible. On-the-job training first month. Bring CV to open application Saturday 10:00 a.m.–12:00 noon at staff entrance.',
    questionNl: 'Wat is verplicht volgens de advertentie?',
    questionEn: 'What is required according to the ad?',
    options: [
      { id: 'a', label: 'Weekendwerk.' },
      { id: 'b', label: 'Een diploma in logistiek.' },
      { id: 'c', label: 'Fulltime 40 uur zonder uitzondering.' },
      { id: 'd', label: 'Alleen werken op doordeweekse ochtenden.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze vacature voor een technische functie.',
    readHintEn: 'Read this technical vacancy.',
    passageNl:
      'Monteur installatietechniek: MBO niveau 2 of ervaring als leerling. Bedrijfsbus en gereedschap van de zaak. On-call dienst één weekend per maand (+€75 toeslag). Solliciteren met diploma en VCA-basis via het formulier op installpro.nl/vacatures.',
    passageEn:
      'Installation technician: MBO level 2 or experience as apprentice. Company van and tools provided. On-call duty one weekend per month (+€75 allowance). Apply with diploma and VCA basic via the form on installpro.nl/vacatures.',
    questionNl: 'Wat krijgt u extra bij on-call weekend?',
    questionEn: 'What extra do you get for on-call weekend?',
    options: [
      { id: 'a', label: 'Geen toeslag; het is vrijwillig.' },
      { id: 'b', label: 'De advertentie noemt geen vergoeding.' },
      { id: 'c', label: '€75 toeslag per on-call weekend.' },
      { id: 'd', label: 'Gratis lunch de hele maand.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze vacature voor een callcenter.',
    readHintEn: 'Read this call centre vacancy.',
    passageNl:
      'Klantenservice medewerker (thuiswerk mogelijk): Nederlands en Engels vloeiend. Dienst ma-vr 09:00-17:30. Proeftijd twee maanden. Laptop van het bedrijf na 3 maanden. Gesprekken op locatie Eindhoven; reiskosten vergoed vanaf 10 km.',
    passageEn:
      'Customer service agent (remote work possible): fluent Dutch and English. Shift Mon–Fri 9:00 a.m.–5:30 p.m. Probation two months. Company laptop after 3 months. Meetings on site in Eindhoven; travel costs reimbursed from 10 km.',
    questionNl: 'Waar vinden de gesprekken plaats?',
    questionEn: 'Where do the meetings take place?',
    options: [
      { id: 'a', label: 'De locatie wordt niet genoemd.' },
      { id: 'b', label: 'Alleen online zonder locatie.' },
      { id: 'c', label: 'Op locatie in Eindhoven.' },
      { id: 'd', label: 'In Amsterdam bij het hoofdkantoor.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze vacature voor onderwijsondersteuning.',
    readHintEn: 'Read this education support vacancy.',
    passageNl:
      'Basisschool De Rank: overblijfmoeder/-vader gezocht op dinsdag en donderdag 11:30-13:30. VOG kinderopvang verplicht. Vergoeding €14 per uur. Aanmelden via de schoolwebsite met motivatie en twee referenties van eerdere vrijwilligerswerk.',
    passageEn:
      'Primary school De Rank: lunchtime supervisor wanted on Tuesday and Thursday 11:30 a.m.–1:30 p.m. Childcare VOG required. Pay €14 per hour. Register via the school website with motivation and two references from previous volunteer work.',
    questionNl: 'Welke documenten heeft u nodig?',
    questionEn: 'Which documents do you need?',
    options: [
      { id: 'a', label: 'Alleen een rijbewijs.' },
      { id: 'b', label: 'VOG kinderopvang en twee referenties.' },
      { id: 'c', label: 'Een universitair diploma.' },
      { id: 'd', label: 'Geen documenten; iedereen kan starten.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze vacature voor een startersfunctie.',
    readHintEn: 'Read this starter position vacancy.',
    passageNl:
      'Junior marketingassistent: HBO-opleiding communicatie of vergelijkbaar afgerond. Eerste werkervaring mag in stage zijn. Salaris €2.350 plus 8% vakantiegeld. Reageren met cv en link naar portfolio vóór 20 mei; geen open sollicitaties.',
    passageEn:
      'Junior marketing assistant: HBO degree in communication or similar completed. First work experience may be from internship. Salary €2,350 plus 8% holiday pay. Respond with CV and link to portfolio before 20 May; no open applications.',
    questionNl: 'Wat is niet toegestaan volgens de advertentie?',
    questionEn: 'What is not allowed according to the ad?',
    options: [
      { id: 'a', label: 'Open sollicitaties zonder vacature.' },
      { id: 'b', label: 'Stage als eerste ervaring noemen.' },
      { id: 'c', label: 'Reageren vóór 20 mei.' },
      { id: 'd', label: 'Reageren met cv en portfolio-link.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Gemeente (14) ───
  {
    introNl: 'Lees deze brief van de gemeente.',
    readHintEn: 'Read this letter from the municipality.',
    passageNl:
      'Geachte mevrouw Öztürk, uw aanvraag parkeervergunning bewoners is goedgekeurd. De vergunning is geldig vanaf 1 april tot 31 maart volgend jaar. U ontvangt binnen tien werkdagen twee blauwe kaarten per post. Betaal het restbedrag van €42 via iDEAL op gemeente.nl/parkeer.',
    passageEn:
      'Dear Ms Öztürk, your resident parking permit application has been approved. The permit is valid from 1 April to 31 March next year. You will receive two blue cards by post within ten working days. Pay the remaining €42 via iDEAL at gemeente.nl/parkeer.',
    questionNl: 'Hoe betaalt u het restbedrag?',
    questionEn: 'How do you pay the remaining amount?',
    options: [
      { id: 'a', label: 'Automatisch van uw rekening zonder actie.' },
      { id: 'b', label: 'Het restbedrag hoeft niet betaald te worden.' },
      { id: 'c', label: 'Contant aan de balie zonder afspraak.' },
      { id: 'd', label: 'Via iDEAL op gemeente.nl/parkeer.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit gemeentelijk bericht.',
    readHintEn: 'Read this municipal notice.',
    passageNl:
      'Afvalkalender wijziging: GFT wordt vanaf 3 juni op woensdag opgehaald in plaats van dinsdag. Restafval blijft om de twee weken op maandag. Gooi geen piekafval in de GFT-bak; breng klein chemisch afval naar het milieupark op zaterdag 09:00-13:00.',
    passageEn:
      'Waste calendar change: organic waste (GFT) will be collected on Wednesday from 3 June instead of Tuesday. Residual waste remains every two weeks on Monday. Do not put bulky waste in the GFT bin; bring small chemical waste to the recycling centre on Saturday 9:00 a.m.–1:00 p.m.',
    questionNl: 'Op welke dag wordt GFT vanaf 3 juni opgehaald?',
    questionEn: 'On which day is GFT collected from 3 June?',
    options: [
      { id: 'a', label: 'GFT wordt niet meer opgehaald.' },
      { id: 'b', label: 'Op dinsdag zoals voorheen.' },
      { id: 'c', label: 'Op woensdag.' },
      { id: 'd', label: 'Elke dag van de week.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze brief over inburgering.',
    readHintEn: 'Read this letter about civic integration.',
    passageNl:
      'Uw inburgeringsplicht loopt tot 1 september 2027. U bent uitgenodigd voor een gesprek op 14 mei om 10:30 in het stadskantoor, kamer 2.12. Neem uw verblijfsdocument en DigiD mee. Bij verhindering: bel 14 040 binnen twee werkdagen om te verzetten.',
    passageEn:
      'Your civic integration obligation runs until 1 September 2027. You are invited for a meeting on 14 May at 10:30 a.m. at the town office, room 2.12. Bring your residence document and DigiD. If unable to attend: call 14 040 within two working days to reschedule.',
    questionNl: 'Wat moet u meenemen naar het gesprek?',
    questionEn: 'What must you bring to the meeting?',
    options: [
      { id: 'a', label: 'Alleen een kopie van uw salarisstrook.' },
      { id: 'b', label: 'Verblijfsdocument en DigiD.' },
      { id: 'c', label: 'Een brief van uw werkgever.' },
      { id: 'd', label: 'Niets; alles staat al in het systeem.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze brief over rijbewijs.',
    readHintEn: 'Read this letter about your driving licence.',
    passageNl:
      'Uw rijbewijs verloopt op 30 november. Vervangen kan online met DigiD als u gezondheidsverklaring niet nodig heeft. Foto uploaden volgens eisen op rijbewijs.nl. Kosten €52,10. Zonder internet: maak een afspraak bij het gemeentehuis, balie verkeer.',
    passageEn:
      'Your driving licence expires on 30 November. Renewal is possible online with DigiD if you do not need a medical certificate. Upload photo according to requirements on rijbewijs.nl. Cost €52.10. Without internet: make an appointment at the town hall, traffic desk.',
    questionNl: 'Hoeveel kost vervangen volgens de brief?',
    questionEn: 'How much does renewal cost according to the letter?',
    options: [
      { id: 'a', label: '€52,10.' },
      { id: 'b', label: '€120 alleen bij het CBR.' },
      { id: 'c', label: 'De kosten staan niet in de brief.' },
      { id: 'd', label: 'Gratis voor inwoners onder 25 jaar.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over bouwvergunning.',
    readHintEn: 'Read this message about a building permit.',
    passageNl:
      'Uw aanvraag dakkapel is in behandeling. Buren hebben tot 18 juni bezwaar kunnen maken; wij hebben twee reacties ontvangen. U hoort uiterlijk 8 juli of de vergunning wordt verleend. Vragen? Mail bouw@gemeente-veenendaal.nl met zaaknummer B2024-118.',
    passageEn:
      'Your dormer window application is being processed. Neighbours could object until 18 June; we received two responses. You will hear by 8 July at the latest whether the permit is granted. Questions? Email bouw@gemeente-veenendaal.nl with case number B2024-118.',
    questionNl: 'Wanneer hoort u het definitieve besluit uiterlijk?',
    questionEn: 'When will you hear the final decision at the latest?',
    options: [
      { id: 'a', label: 'Direct na indienen van de aanvraag.' },
      { id: 'b', label: 'Er is geen uiterste datum genoemd.' },
      { id: 'c', label: 'Op 18 juni na bezwaren van buren.' },
      { id: 'd', label: 'Uiterlijk 8 juli.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze brief over waterschapsbelasting.',
    readHintEn: 'Read this letter about water board tax.',
    passageNl:
      'Aanslag waterschap 2025: €187,40 verschuldigd vóór 31 mei. Automatische incasso op 28 mei als u dat heeft aangevraagd. Bij betalingsproblemen kunt u een betalingsregeling aanvragen via het contactformulier. Bezwaar maken kan tot zes weken na dagtekening.',
    passageEn:
      'Water board assessment 2025: €187.40 due before 31 May. Direct debit on 28 May if you have requested it. For payment problems you can apply for a payment plan via the contact form. Objections can be filed up to six weeks after the date on the letter.',
    questionNl: 'Tot wanneer moet u betalen zonder regeling?',
    questionEn: 'Until when must you pay without a payment plan?',
    options: [
      { id: 'a', label: 'De datum staat niet in de brief.' },
      { id: 'b', label: 'Vóór 31 mei.' },
      { id: 'c', label: 'Vóór 1 januari 2026.' },
      { id: 'd', label: 'Betaling is optioneel dit jaar.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over verkiezingen.',
    readHintEn: 'Read this message about elections.',
    passageNl:
      'Tweede Kamerverkiezingen: stemmen op 22 november in uw stemlokaal Gymzaal De Vliet, Meidoornstraat 8. Opening 07:30-21:00. Neem stempas en identiteitsbewijs mee. Kunt u niet komen? Machtig iemand schriftelijk vóór 17 november.',
    passageEn:
      'House of Representatives elections: vote on 22 November at your polling station Gymzaal De Vliet, Meidoornstraat 8. Open 7:30 a.m.–9:00 p.m. Bring poll card and ID. Cannot come? Authorise someone in writing before 17 November.',
    questionNl: 'Waar stemt u volgens de brief?',
    questionEn: 'Where do you vote according to the letter?',
    options: [
      { id: 'a', label: 'In het gemeentehuis zonder adres.' },
      { id: 'b', label: 'Gymzaal De Vliet, Meidoornstraat 8.' },
      { id: 'c', label: 'Alleen per post vanaf thuis.' },
      { id: 'd', label: 'Het stemlokaal staat niet in de tekst.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze brief over leerlingenvervoer.',
    readHintEn: 'Read this letter about school transport.',
    passageNl:
      'Aanvraag leerlingenvervoer voor uw zoon is afgewezen omdat de afstand naar school 4,2 km is (drempel 6 km). U kunt binnen zes weken bezwaar maken met een medische onderbouwing. Formulier op gemeente.nl/onderwijs, tab vervoer.',
    passageEn:
      'School transport application for your son has been rejected because the distance to school is 4.2 km (threshold 6 km). You can object within six weeks with medical justification. Form at gemeente.nl/onderwijs, transport tab.',
    questionNl: 'Waarom is de aanvraag afgewezen?',
    questionEn: 'Why was the application rejected?',
    options: [
      { id: 'a', label: 'Omdat de afstand 4,2 km is, onder de drempel.' },
      { id: 'b', label: 'Omdat er geen medische onderbouning was.' },
      { id: 'c', label: 'De brief geeft geen reden.' },
      { id: 'd', label: 'Omdat de school te ver weg is boven 6 km.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over grofvuil.',
    readHintEn: 'Read this bulky waste notice.',
    passageNl:
      'Gratis grofvuil inzamelen: bel 0800-1234 voor een afspraak. Zet afval uiterlijk 07:00 op de dag van ophaal aan de straatkant. Maximaal 2 m3 per adres per maand. Geen bouwafval of asbest; dat brengt u naar het milieupark.',
    passageEn:
      'Free bulky waste collection: call 0800-1234 for an appointment. Put waste out by 7:00 a.m. on collection day at the kerb. Maximum 2 m³ per address per month. No construction waste or asbestos; take that to the recycling centre.',
    questionNl: 'Hoe laat moet het afval klaarstaan?',
    questionEn: 'By what time must the waste be ready?',
    options: [
      { id: 'a', label: 'Elke tijd is goed op de ophaaldag.' },
      { id: 'b', label: 'De tijd wordt niet genoemd.' },
      { id: 'c', label: 'Uiterlijk 07:00 op de ophaaldag.' },
      { id: 'd', label: 'Na 18:00 de avond ervoor.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze brief over WOZ-waarde.',
    readHintEn: 'Read this letter about property value (WOZ).',
    passageNl:
      'Uw WOZ-waarde 2025 is vastgesteld op €318.000. Dit bedrag geldt voor gemeentelijke belastingen. Bezwaar indienen kan tot 1 maart 2026 via MijnOverheid of schriftelijk naar afdeling Belastingen. Bij vragen: bel 14 053 op werkdagen 09:00-17:00.',
    passageEn:
      'Your 2025 WOZ value has been set at €318,000. This amount applies to municipal taxes. You can object until 1 March 2026 via MijnOverheid or in writing to the Tax department. Questions: call 14 053 on weekdays 9:00 a.m.–5:00 p.m.',
    questionNl: 'Tot wanneer kunt u bezwaar maken?',
    questionEn: 'Until when can you file an objection?',
    options: [
      { id: 'a', label: 'De termijn staat niet in de tekst.' },
      { id: 'b', label: 'Tot 1 maart 2026.' },
      { id: 'c', label: 'Binnen één week na ontvangst.' },
      { id: 'd', label: 'Bezwaar is niet mogelijk volgens de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over evenementenvergunning.',
    readHintEn: 'Read this event permit message.',
    passageNl:
      'Uw straatfeest op 20 juli is goedgekeurd onder voorwaarden: muziek tot 22:00, geen verkoop van alcohol zonder aparte vergunning. Na afloop moet u het plein schoonmaken vóór 08:00 de volgende dag. Contactpersoon evenementen: mevrouw De Vries, 06-77889900.',
    passageEn:
      'Your street party on 20 July is approved subject to conditions: music until 10:00 p.m., no sale of alcohol without a separate permit. Afterwards you must clean the square before 8:00 a.m. the next day. Events contact: Ms De Vries, 06-77889900.',
    questionNl: 'Wat moet u na het feest doen?',
    questionEn: 'What must you do after the party?',
    options: [
      { id: 'a', label: 'Het plein schoonmaken vóór 08:00 de volgende dag.' },
      { id: 'b', label: 'Alcohol verkopen tot middernacht.' },
      { id: 'c', label: 'Muziek laten spelen tot 02:00.' },
      { id: 'd', label: 'Niets; de gemeente ruimt alles op.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze brief over uitkering.',
    readHintEn: 'Read this letter about benefits.',
    passageNl:
      'Uw bijstandsuitkering wordt per 1 juli geïndexeerd naar €1.215 netto per maand. Wijzigingen in inkomen of samenwoning moet u binnen één week doorgeven. Formulier Wijzigingen staat op werk.nl/svb. Zonder melding kan terugvordering volgen.',
    passageEn:
      'Your social assistance benefit will be indexed to €1,215 net per month from 1 July. Changes in income or cohabitation must be reported within one week. Form Changes is on werk.nl/svb. Failure to report may lead to recovery of payments.',
    questionNl: 'Binnen hoeveel tijd moet u wijzigingen doorgeven?',
    questionEn: 'Within how much time must you report changes?',
    options: [
      { id: 'a', label: 'Binnen zes maanden.' },
      { id: 'b', label: 'Alleen bij einde van het jaar.' },
      { id: 'c', label: 'Doorgeven is niet nodig volgens de brief.' },
      { id: 'd', label: 'Binnen één week.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht over openbare ruimte.',
    readHintEn: 'Read this public space notice.',
    passageNl:
      'Wegafsluiting Kerkstraat 4-18 van 10 t/m 14 juni voor rioolvervanging. Bewoners kunnen met auto tot halte 12 rijden via Zijstraat. Parkeren op eigen terrein blijft mogelijk. Hulpdiensten hebben altijd toegang via de noodroute.',
    passageEn:
      'Road closure Kerkstraat 4–18 from 10–14 June for sewer replacement. Residents can drive to number 12 via Side street. Parking on private property remains possible. Emergency services always have access via the emergency route.',
    questionNl: 'Hoe lang duurt de afsluiting?',
    questionEn: 'How long does the closure last?',
    options: [
      { id: 'a', label: 'De hele maand juni zonder uitzondering.' },
      { id: 'b', label: 'De duur wordt niet genoemd.' },
      { id: 'c', label: 'Eén dag op 10 juni.' },
      { id: 'd', label: 'Van 10 tot en met 14 juni.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze brief over paspoort.',
    readHintEn: 'Read this passport letter.',
    passageNl:
      'Uw afspraak voor een paspoort is op donderdag 6 juni om 11:15 bij loket 3. Kom tien minuten eerder. Neem alle oude reisdocumenten en een pasfoto mee die niet ouder is dan zes maanden. Kinderen onder 12 moeten zelf aanwezig zijn.',
    passageEn:
      'Your passport appointment is on Thursday 6 June at 11:15 a.m. at desk 3. Come ten minutes early. Bring all old travel documents and a passport photo not older than six months. Children under 12 must be present in person.',
    questionNl: 'Wie moet aanwezig zijn bij de afspraak voor een kind onder 12?',
    questionEn: 'Who must be present at the appointment for a child under 12?',
    options: [
      { id: 'a', label: 'De brief noemt geen regels voor kinderen.' },
      { id: 'b', label: 'Alleen een ouder; het kind hoeft niet.' },
      { id: 'c', label: 'Het kind zelf moet aanwezig zijn.' },
      { id: 'd', label: 'Alleen de gemachtigde volwassene.' },
    ],
    correctOptionIds: ['c'],
  },
  // ─── School (14) ───
  {
    introNl: 'Lees deze schoolbrief.',
    readHintEn: 'Read this school letter.',
    passageNl:
      'Beste ouders van groep 6, op woensdag 19 maart is er een excursie naar het Rijksmuseum. De bus vertrekt om 08:45 van school; terugkomst rond 15:30. Geef toestemming via Parro vóór maandag. Neem een lunchpakket en OV-chipkaart mee; museumkaart is geregeld door school.',
    passageEn:
      'Dear parents of group 6, on Wednesday 19 March there is an excursion to the Rijksmuseum. The bus leaves at 8:45 a.m. from school; return around 3:30 p.m. Give permission via Parro before Monday. Bring a packed lunch and OV-chip card; museum entry is arranged by the school.',
    questionNl: 'Wat moeten ouders vóór maandag doen?',
    questionEn: 'What must parents do before Monday?',
    options: [
      { id: 'a', label: 'Toestemming geven via Parro.' },
      { id: 'b', label: 'Zelf museumkaarten kopen.' },
      { id: 'c', label: 'De bus om 15:30 ophalen bij het museum.' },
      { id: 'd', label: 'Niets; de excursie is vrijwillig zonder aanmelding.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit briefje in de agenda van de leerling.',
    readHintEn: 'Read this note in the pupil agenda.',
    passageNl:
      'Toetsweek 20-24 mei: maandag rekenen, dinsdag Nederlands, woensdag Engels luisteren. Bij ziekte binnen twee dagen een doktersbriefje inleveren bij mentor Jansen. Spijbelen tijdens toetsen leidt tot een gesprek met de decaan.',
    passageEn:
      'Test week 20–24 May: Monday maths, Tuesday Dutch, Wednesday English listening. If ill, hand in a doctor note to mentor Jansen within two days. Truancy during tests leads to a meeting with the dean.',
    questionNl: 'Wanneer is de toets Engels luisteren?',
    questionEn: 'When is the English listening test?',
    options: [
      { id: 'a', label: 'Op woensdag.' },
      { id: 'b', label: 'Op vrijdag zonder schema.' },
      { id: 'c', label: 'De dag staat niet in het briefje.' },
      { id: 'd', label: 'Op maandag samen met rekenen.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling op het schoolbord.',
    readHintEn: 'Read the notice on the school board.',
    passageNl:
      'MBO College West: open dag zaterdag 8 februari 10:00-14:00. Workshops over zorg, techniek en handel. Aanmelden is niet verplicht maar helpt voor het lunchbuffet. Ingang via hoofdingang; fietsen stallen bij fietsenstalling B.',
    passageEn:
      'MBO College West: open day Saturday 8 February 10:00 a.m.–2:00 p.m. Workshops on care, technology and trade. Registration is not required but helps for the lunch buffet. Entrance via main entrance; park bikes at bike shed B.',
    questionNl: 'Is aanmelden verplicht voor de open dag?',
    questionEn: 'Is registration required for the open day?',
    options: [
      { id: 'a', label: 'Alleen voor de workshop techniek.' },
      { id: 'b', label: 'De tekst zegt niets over aanmelden.' },
      { id: 'c', label: 'Ja, anders mag u niet binnen.' },
      { id: 'd', label: 'Nee, maar het helpt voor het lunchbuffet.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht van de mentor.',
    readHintEn: 'Read this message from the mentor.',
    passageNl:
      'Leerlingen 2B: inleveren profielwerkstuk uiterlijk 3 april als PDF via Magister. Maximaal 25 paginas exclusief bijlagen. Te laat inleveren betekent een punt aftrek per dag. Spreekuur mentor op dinsdag 15:30-16:00 in lokaal 1.08.',
    passageEn:
      'Students 2B: submit profile project by 3 April at the latest as PDF via Magister. Maximum 25 pages excluding appendices. Late submission means one point deduction per day. Mentor office hour Tuesday 3:30–4:00 p.m. in room 1.08.',
    questionNl: 'Wat gebeurt er bij te laat inleveren?',
    questionEn: 'What happens if you submit late?',
    options: [
      { id: 'a', label: 'Er is geen sanctie genoemd.' },
      { id: 'b', label: 'Het werk wordt niet beoordeeld.' },
      { id: 'c', label: 'Één punt aftrek per dag.' },
      { id: 'd', label: 'U krijgt automatisch een 10.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de nieuwsbrief van de basisschool.',
    readHintEn: 'Read the primary school newsletter.',
    passageNl:
      'Oudercommissie zoekt vrijwilligers voor het schoolfeest op 21 juni. Opbouw vanaf 16:00, feest 18:00-21:00. Meld u aan bij mevrouw Peeters via info@basisschooldester.nl. Kinderen mogen in themakleding komen; geen glaswerk mee van huis.',
    passageEn:
      'Parent committee is looking for volunteers for the school party on 21 June. Setup from 4:00 p.m., party 6:00–9:00 p.m. Sign up with Ms Peeters via info@basisschooldester.nl. Children may wear theme clothes; no glassware from home.',
    questionNl: 'Wanneer begint het feest voor bezoekers?',
    questionEn: 'When does the party start for visitors?',
    options: [
      { id: 'a', label: 'Om 16:00 bij de opbouw.' },
      { id: 'b', label: 'Om 18:00 uur.' },
      { id: 'c', label: 'Om 21:00 na afsluiting.' },
      { id: 'd', label: 'De tijd staat niet in de nieuwsbrief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over gymles.',
    readHintEn: 'Read this message about PE.',
    passageNl:
      'Gymles verplaatst naar sporthal De Veste op donderdag. Vertrek van school om 13:15 met de mentor. Neem gymkleding, witte schoenen en een waterfles mee. Sieraden en horloges afleggen; de school is niet verantwoordelijk bij verlies.',
    passageEn:
      'PE moved to De Veste sports hall on Thursday. Leave school at 1:15 p.m. with the mentor. Bring gym clothes, white shoes and a water bottle. Remove jewellery and watches; the school is not responsible if lost.',
    questionNl: 'Wat moet u meenemen naar de gymles?',
    questionEn: 'What must you bring to PE?',
    options: [
      { id: 'a', label: 'Gymkleding, witte schoenen en waterfles.' },
      { id: 'b', label: 'Sieraden voor tijdens de warming-up.' },
      { id: 'c', label: 'Niets; alles wordt door school geleverd.' },
      { id: 'd', label: 'Alleen zwemkleding en een handdoek.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling over studiedag.',
    readHintEn: 'Read the notice about a training day.',
    passageNl:
      'Geen les voor leerlingen op vrijdag 11 oktober: studiedag voor docenten. Naschoolse opvang is gesloten. Maandag 14 oktober normaal rooster. Huiswerk voor groep 7 staat op het digitale platform; inloggen met schoolaccount.',
    passageEn:
      'No lessons for pupils on Friday 11 October: training day for teachers. After-school care is closed. Monday 14 October normal timetable. Homework for group 7 is on the digital platform; log in with school account.',
    questionNl: 'Wanneer is er weer normaal les voor leerlingen?',
    questionEn: 'When are there normal lessons for pupils again?',
    options: [
      { id: 'a', label: 'Pas na de kerstvakantie.' },
      { id: 'b', label: 'De tekst noemt geen datum voor normaal les.' },
      { id: 'c', label: 'Op vrijdag 11 oktober in de middag.' },
      { id: 'd', label: 'Maandag 14 oktober.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht over vervoer naar school.',
    readHintEn: 'Read this message about transport to school.',
    passageNl:
      'Buslijn 204 (schoolbus) rijdt vanaf september een kwartier eerder: vertrek Halte Park om 07:35. Kaartje is niet nodig met schoolabonnement; zonder abonnement betaalt u €2,40 per rit. Vragen bij de conciërge of op daluren.nl.',
    passageEn:
      'Bus line 204 (school bus) runs a quarter of an hour earlier from September: departure Park stop 7:35 a.m. No ticket needed with school subscription; without subscription you pay €2.40 per trip. Questions at the caretaker or on daluren.nl.',
    questionNl: 'Hoe laat vertrekt de schoolbus vanaf september?',
    questionEn: 'What time does the school bus leave from September?',
    options: [
      { id: 'a', label: 'Het vertrektijdstip staat niet in de tekst.' },
      { id: 'b', label: 'Om 07:35 vanaf Halte Park.' },
      { id: 'c', label: 'Om 08:00 zonder wijziging.' },
      { id: 'd', label: 'Om 07:00 alleen in de vakantie.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over schoolfoto\'s.',
    readHintEn: 'Read the letter about school photos.',
    passageNl:
      'Schoolfoto\'s worden op 2 oktober gemaakt. Kinderen graag in nette kleding; geen grote logo\'s. Bestellen kan tot 16 oktober via de link op het briefje. Zonder bestelling ontvangt u alleen een gratis klassenfoto. Retourneren is niet mogelijk.',
    passageEn:
      'School photos will be taken on 2 October. Children in neat clothes please; no large logos. Order until 16 October via the link on the letter. Without ordering you only receive a free class photo. Returns are not possible.',
    questionNl: 'Tot wanneer kunt u foto\'s bestellen?',
    questionEn: 'Until when can you order photos?',
    options: [
      { id: 'a', label: 'Tot 2 oktober vóór de opname.' },
      { id: 'b', label: 'Tot 16 oktober via de link.' },
      { id: 'c', label: 'Het hele schooljaar zonder deadline.' },
      { id: 'd', label: 'Bestellen is niet mogelijk volgens de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bericht over een leerlingenraad.',
    readHintEn: 'Read the student council message.',
    passageNl:
      'Verkiezing leerlingenraad: stemmen op 12 en 13 november tijdens pauze in de aula. Kandidaten stellen zich voor op maandag in de pauze. Resultaat bekend op donderdag via het schoolscherm. Elke leerling mag één keer stemmen; anoniem.',
    passageEn:
      'Student council election: vote on 12 and 13 November during break in the hall. Candidates present themselves on Monday during break. Result on Thursday via the school screen. Each student may vote once; anonymously.',
    questionNl: 'Wanneer is het resultaat bekend?',
    questionEn: 'When is the result known?',
    options: [
      { id: 'a', label: 'Op donderdag via het schoolscherm.' },
      { id: 'b', label: 'Direct na elke stem in de aula.' },
      { id: 'c', label: 'De tekst noemt geen datum voor het resultaat.' },
      { id: 'd', label: 'Op maandag tijdens de pauze.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling over huiswerkbegeleiding.',
    readHintEn: 'Read the homework support notice.',
    passageNl:
      'Huiswerkbegeleiding start op 3 september elke dinsdag en donderdag 15:00-16:00 in lokaal 0.12. Maximaal 15 leerlingen per dag; aanmelden bij mevrouw Ali. Gratis voor leerlingen met een toelaag van school; anderen betalen €3 per uur.',
    passageEn:
      'Homework support starts 3 September every Tuesday and Thursday 3:00–4:00 p.m. in room 0.12. Maximum 15 students per day; register with Ms Ali. Free for students with a school allowance; others pay €3 per hour.',
    questionNl: 'Wie betaalt €3 per uur?',
    questionEn: 'Who pays €3 per hour?',
    options: [
      { id: 'a', label: 'Alleen leerlingen in groep 8.' },
      { id: 'b', label: 'Niemand; het is altijd gratis.' },
      { id: 'c', label: 'Alle leerlingen zonder uitzondering.' },
      { id: 'd', label: 'Leerlingen zonder schooltoelaag.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het bericht over griepprotocol.',
    readHintEn: 'Read the flu protocol message.',
    passageNl:
      'Bij koorts boven 38 graden: kind thuishouden tot 24 uur koortsvrij. Meld afwezigheid vóór 08:30 via de app SchoolGate. Bij drie dagen ziekte bellen wij ouders voor een update. Geen medicijnen door schoolpersoneel geven zonder schriftelijke toestemming.',
    passageEn:
      'With fever above 38°C: keep child at home until fever-free for 24 hours. Report absence before 8:30 a.m. via SchoolGate app. After three days of illness we call parents for an update. No medication given by school staff without written permission.',
    questionNl: 'Hoe meldt u afwezigheid?',
    questionEn: 'How do you report absence?',
    options: [
      { id: 'a', label: 'Afwezigheid melden is niet nodig.' },
      { id: 'b', label: 'Vóór 08:30 via de app SchoolGate.' },
      { id: 'c', label: 'Alleen na drie dagen per telefoon.' },
      { id: 'd', label: 'Door medicijnen mee te geven aan de juf.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over een taaltoets.',
    readHintEn: 'Read the letter about a language test.',
    passageNl:
      'NT2-toets op 5 december in de computerzaal. Neem koptelefoon mee als u die heeft; anders leent u er een. Duur maximaal 90 minuten. Uitslag binnen drie weken per post. Bij verhindering: meld dit uiterlijk twee werkdagen van tevoren bij de administratie.',
    passageEn:
      'NT2 test on 5 December in the computer room. Bring headphones if you have them; otherwise borrow one. Duration maximum 90 minutes. Results within three weeks by post. If unable to attend: notify administration at least two working days in advance.',
    questionNl: 'Wanneer moet u verhindering doorgeven?',
    questionEn: 'When must you report if you cannot attend?',
    options: [
      { id: 'a', label: 'Op de dag zelf om 08:00 uur.' },
      { id: 'b', label: 'Uiterlijk twee werkdagen van tevoren.' },
      { id: 'c', label: 'Na de toets binnen drie weken.' },
      { id: 'd', label: 'Doorgeven is niet mogelijk volgens de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bericht over de bibliotheek op school.',
    readHintEn: 'Read the message about the school library.',
    passageNl:
      'Schoolbibliotheek: maximaal drie boeken tegelijk, lenen voor twee weken. Verlengen via de QR-code op het boek. Te laat: €0,10 per boek per dag. Verloren boek: vervangingskosten volgens sticker in het boek. Open ma-do 08:00-15:30.',
    passageEn:
      'School library: maximum three books at a time, loan for two weeks. Renew via QR code on the book. Late: €0.10 per book per day. Lost book: replacement cost according to sticker in book. Open Mon–Thu 8:00 a.m.–3:30 p.m.',
    questionNl: 'Hoeveel kost een dag te laat per boek?',
    questionEn: 'How much does one day late cost per book?',
    options: [
      { id: 'a', label: '€5,00 ongeacht het aantal dagen.' },
      { id: 'b', label: 'Niets; te laat is altijd gratis.' },
      { id: 'c', label: 'De boete staat niet in de tekst.' },
      { id: 'd', label: '€0,10 per boek per dag.' },
    ],
    correctOptionIds: ['d'],
  },
  // ─── Wonen (12) ───
  {
    introNl: 'Lees deze brief van de verhuurder.',
    readHintEn: 'Read this letter from the landlord.',
    passageNl:
      'Geachte huurder, de jaarlijkse servicekosten 2024 zijn vastgesteld op € 412. U ontvangt € 38 terug; dit storten wij in juni op uw rekening. Vragen over de specificatie? Mail administratie@woningbouw.nl met uw huurnummer. Betalingsachterstand moet eerst worden ingelost.',
    passageEn:
      'Dear tenant, the 2024 annual service charge has been set at €412. You receive a refund of €38; we will transfer this in June to your account. Questions about the breakdown? Email administratie@woningbouw.nl with your rent number. Payment arrears must be cleared first.',
    questionNl: 'Wat gebeurt er met het teveel betaalde bedrag?',
    questionEn: 'What happens to the overpaid amount?',
    options: [
      { id: 'a', label: 'Het bedrag vervalt zonder terugbetaling.' },
      { id: 'b', label: 'De brief noemt geen terugbetaling.' },
      { id: 'c', label: 'U moet € 38 bijbetalen in juli.' },
      { id: 'd', label: '€ 38 wordt in juni teruggestort.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht in de flat.',
    readHintEn: 'Read this notice in the flat building.',
    passageNl:
      'Liftonderhoud op 9 en 10 april: lift A is buiten gebruik. Gebruik lift B of de trap. Bewoners op verdieping 4 en hoger kunnen hulp vragen bij de huismeester op maandag tussen 10:00 en 12:00. Excuses voor het ongemak.',
    passageEn:
      'Lift maintenance on 9 and 10 April: lift A is out of use. Use lift B or the stairs. Residents on floor 4 and above can ask the caretaker for help on Monday between 10:00 a.m. and 12:00 noon. Sorry for the inconvenience.',
    questionNl: 'Welke lift kunt u gebruiken?',
    questionEn: 'Which lift can you use?',
    options: [
      { id: 'a', label: 'De tekst noemt geen alternatief.' },
      { id: 'b', label: 'Alleen lift A zonder beperking.' },
      { id: 'c', label: 'Lift B of de trap.' },
      { id: 'd', label: 'Geen lift; alleen de nooduitgang.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over huurverhoging.',
    readHintEn: 'Read the rent increase letter.',
    passageNl:
      'Per 1 juli verhoogt uw kale huur met 3,5% naar € 892 per maand. U heeft zes weken om te reageren als u het niet eens bent. Stuur een brief naar Vestia met uw argumenten en kopie van uw inkomensgegevens. Zonder reactie gaat de verhoging automatisch in.',
    passageEn:
      'From 1 July your basic rent increases by 3.5% to €892 per month. You have six weeks to respond if you disagree. Send a letter to Vestia with your arguments and a copy of your income details. Without a response the increase takes effect automatically.',
    questionNl: 'Wat gebeurt er als u niet reageert?',
    questionEn: 'What happens if you do not respond?',
    options: [
      { id: 'a', label: 'De huur blijft hetzelfde.' },
      { id: 'b', label: 'De verhoging gaat automatisch in.' },
      { id: 'c', label: 'U krijgt automatisch huurtoeslag.' },
      { id: 'd', label: 'Het contract wordt beëindigd.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht van de VvE.',
    readHintEn: 'Read this message from the owners association.',
    passageNl:
      'VvE-vergadering 20 mei 19:30 in de gemeenschappelijke ruimte. Agenda: dakrenovatie en nieuwe regels voor de parkeergarage. Niet-bewoners mogen niet parkeren na 22:00. Aanwezigheid is belangrijk; bij geen quorum schuift de vergadering een week op.',
    passageEn:
      'Owners association meeting 20 May 7:30 p.m. in the communal room. Agenda: roof renovation and new rules for the car park. Non-residents may not park after 10:00 p.m. Attendance is important; without a quorum the meeting is postponed by one week.',
    questionNl: 'Wat is niet toegestaan in de parkeergarage?',
    questionEn: 'What is not allowed in the car park?',
    options: [
      { id: 'a', label: 'Parkeren door niet-bewoners na 22:00.' },
      { id: 'b', label: 'Deelnemen aan de vergadering.' },
      { id: 'c', label: 'Praten over dakrenovatie.' },
      { id: 'd', label: 'Parkeren door bewoners na 22:00.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de brief over energielabel.',
    readHintEn: 'Read the letter about the energy label.',
    passageNl:
      'Uw woning krijgt isolatieglas in september. De aannemer belt een week van tevoren voor een afspraak. U moet toegang geven tot alle ramen aan de straatkant. Tijdelijke overlast maximaal één dag per kamer. Bij vragen: bel de projectlijn 088-9001234.',
    passageEn:
      'Your home will get double glazing in September. The contractor will call one week in advance for an appointment. You must provide access to all street-facing windows. Temporary disruption maximum one day per room. Questions: call the project line 088-9001234.',
    questionNl: 'Wanneer belt de aannemer voor de afspraak?',
    questionEn: 'When does the contractor call for the appointment?',
    options: [
      { id: 'a', label: 'Pas na afloop van het werk in oktober.' },
      { id: 'b', label: 'De aannemer belt niet; u moet zelf bellen.' },
      { id: 'c', label: 'Op de dag zelf zonder voorafgaand bericht.' },
      { id: 'd', label: 'Een week van tevoren.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht over onderhoud in de keuken.',
    readHintEn: 'Read this message about kitchen maintenance.',
    passageNl:
      'Lekkage keuken gemeld: monteur komt donderdag tussen 13:00 en 17:00. Zet spullen droog en maak ruimte onder de gootsteen. Als u niet thuis bent, laat een sleutel bij de receptie van het complex. Zonder sleutel wordt de afspraak verplaatst.',
    passageEn:
      'Kitchen leak reported: engineer comes Thursday between 1:00 p.m. and 5:00 p.m. Dry your belongings and clear space under the sink. If you are not home, leave a key at the complex reception. Without a key the appointment is rescheduled.',
    questionNl: 'Wat moet u doen als u niet thuis bent?',
    questionEn: 'What must you do if you are not home?',
    options: [
      { id: 'a', label: 'De lekkage zelf repareren.' },
      { id: 'b', label: 'De monteur annuleren per e-mail.' },
      { id: 'c', label: 'Een sleutel bij de receptie achterlaten.' },
      { id: 'd', label: 'Niets; de monteur forceert de deur.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over woningruil.',
    readHintEn: 'Read the letter about home exchange.',
    passageNl:
      'Uw aanvraag woningruil met gezins Brouwer is in behandeling. Beide partijen moeten binnen 14 dagen een formulier tekenen. De wijkagent plant een gesprek. Ruilt u naar een grotere woning? Dan kan een inkomenstoets volgen. Status volgt per post.',
    passageEn:
      'Your home exchange request with the Brouwer family is being processed. Both parties must sign a form within 14 days. The district officer will schedule a meeting. Exchanging for a larger home? An income test may follow. Status will follow by post.',
    questionNl: 'Wat moeten beide partijen binnen 14 dagen doen?',
    questionEn: 'What must both parties do within 14 days?',
    options: [
      { id: 'a', label: 'Een formulier tekenen.' },
      { id: 'b', label: 'Direct verhuizen zonder papieren.' },
      { id: 'c', label: 'De wijkagent ontslaan.' },
      { id: 'd', label: 'Niets; de ruil is al afgerond.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over schoonmaak in het trappenhuis.',
    readHintEn: 'Read this stairwell cleaning notice.',
    passageNl:
      'Schoonmaak trappenhuis op dinsdag 8:00-12:00. Zet geen dozen of fietsen in het portiek die dag. Natte trappen: loop voorzichtig. Bij klachten over hygiëne: meld het via het bewonersportaal onder tab Schoonmaak.',
    passageEn:
      'Stairwell cleaning on Tuesday 8:00 a.m.–12:00 noon. Do not leave boxes or bikes in the entrance that day. Wet stairs: walk carefully. Complaints about hygiene: report via the residents portal under Cleaning tab.',
    questionNl: 'Wat mag niet in het portiek op dinsdag?',
    questionEn: 'What may not be in the entrance on Tuesday?',
    options: [
      { id: 'a', label: 'Schoonmaakmiddelen van de beheerder.' },
      { id: 'b', label: 'Bewoners die voorzichtig lopen.' },
      { id: 'c', label: 'Meldingen via het portaal.' },
      { id: 'd', label: 'Dozen of fietsen.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees de brief over waarborgsom.',
    readHintEn: 'Read the deposit letter.',
    passageNl:
      'U verhuist op 30 juni. De waarborgsom van € 1.200 wordt binnen 14 dagen na oplevering terugbetaald als er geen schade is. Stuur een doorgeefbaar rekeningnummer naar verhuur@huurmax.nl. Schade? Dan ontvangt u een specificatie met foto\'s.',
    passageEn:
      'You are moving out on 30 June. The deposit of €1,200 will be refunded within 14 days after handover if there is no damage. Send a bank account number to verhuur@huurmax.nl. Damage? Then you will receive a breakdown with photos.',
    questionNl: 'Wanneer krijgt u de waarborgsom terug bij geen schade?',
    questionEn: 'When do you get the deposit back if there is no damage?',
    options: [
      { id: 'a', label: 'Pas na een jaar zonder rekeningnummer.' },
      { id: 'b', label: 'De waarborgsom wordt nooit terugbetaald.' },
      { id: 'c', label: 'Op de verhuisdag zelf contant.' },
      { id: 'd', label: 'Binnen 14 dagen na oplevering.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht over ongedierte.',
    readHintEn: 'Read this pest control notice.',
    passageNl:
      'Bestrijding muizen in blok C op 15 mei. Zet voedsel in dichte bakken en maak kruipruimtes vrij. Bewoners met huisdieren: meld dit vóór 12 mei bij de beheerder. Tijdens behandeling ventileren; kinderen niet in kruipruimte laten.',
    passageEn:
      'Mouse control in block C on 15 May. Store food in sealed containers and clear crawl spaces. Residents with pets: report this before 12 May to the manager. Ventilate during treatment; do not let children in the crawl space.',
    questionNl: 'Wat moeten bewoners met huisdieren doen?',
    questionEn: 'What must residents with pets do?',
    options: [
      { id: 'a', label: 'Voedsel open laten staan.' },
      { id: 'b', label: 'Huisdieren vrij laten in de kruipruimte.' },
      { id: 'c', label: 'Melden vóór 12 mei bij de beheerder.' },
      { id: 'd', label: 'Niets; behandeling geldt niet voor blok C.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over huisvesting statushouders.',
    readHintEn: 'Read the letter about housing for status holders.',
    passageNl:
      'U bent toegewezen aan woning Oranjelaan 44. Bezichtiging op 5 augustus om 14:00 met begeleider van het COA. Tekenen huurcontract kan op 7 augustus; eerste maand huur via automatische incasso. Meubels: vraag het starterspakket aan bij WelkomNL.',
    passageEn:
      'You have been assigned housing at Oranjelaan 44. Viewing on 5 August at 2:00 p.m. with COA supervisor. Signing the lease is possible on 7 August; first month rent by direct debit. Furniture: apply for the starter package at WelkomNL.',
    questionNl: 'Wanneer is de bezichtiging?',
    questionEn: 'When is the viewing?',
    options: [
      { id: 'a', label: 'Op 5 augustus om 14:00 uur.' },
      { id: 'b', label: 'Op 7 augustus bij het tekenen.' },
      { id: 'c', label: 'Er is geen bezichtiging mogelijk.' },
      { id: 'd', label: 'De datum staat niet in de brief.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over ramen wassen.',
    readHintEn: 'Read this window cleaning notice.',
    passageNl:
      'Glasbewassing buitenkant op 22 en 23 april. Sluit ramen en zet geen planten op de vensterbank die dag. De glazenwasser gebruikt laddersteigers; parkeer niet onder de gevelkant. Bij schade: meld binnen 48 uur bij beheer@flat.nl.',
    passageEn:
      'External window cleaning on 22 and 23 April. Close windows and do not put plants on the windowsill that day. The window cleaner uses ladder scaffolding; do not park under the facade side. Damage: report within 48 hours to beheer@flat.nl.',
    questionNl: 'Wat moet u doen op 22 en 23 april?',
    questionEn: 'What must you do on 22 and 23 April?',
    options: [
      { id: 'a', label: 'Ramen sluiten en geen planten op de vensterbank.' },
      { id: 'b', label: 'Onder de gevel parkeren voor toezicht.' },
      { id: 'c', label: 'Schade melden na twee weken.' },
      { id: 'd', label: 'Ramen openzetten voor ventilatie.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Gezondheidszorg (12) ───
  {
    introNl: 'Lees deze brief van het ziekenhuis.',
    readHintEn: 'Read this hospital letter.',
    passageNl:
      'Uw afspraak bij de polikliniek oog is verplaatst naar 18 oktober om 09:15, ingang B verdieping 3. Kom vijftien minuten eerder voor het meten van uw oogdruk. Neem uw medicatielijst en zorgpas mee. Parkeren kan in garage P2; eerste 30 minuten gratis met validatie bij de balie.',
    passageEn:
      'Your ophthalmology outpatient appointment has been moved to 18 October at 9:15 a.m., entrance B floor 3. Come fifteen minutes early for eye pressure measurement. Bring your medication list and health insurance card. Parking in garage P2; first 30 minutes free with validation at the desk.',
    questionNl: 'Waar moet u zijn voor de afspraak?',
    questionEn: 'Where must you be for the appointment?',
    options: [
      { id: 'a', label: 'Alleen in garage P2 zonder polikliniek.' },
      { id: 'b', label: 'De locatie staat niet in de brief.' },
      { id: 'c', label: 'Ingang A op de begane grond.' },
      { id: 'd', label: 'Ingang B, verdieping 3.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het bericht van de tandarts.',
    readHintEn: 'Read the dentist message.',
    passageNl:
      'Controle-afspraak 12 maart om 11:00 bij tandartspraktijk Smile. Bij annuleren binnen 24 uur worden kosten in rekening gebracht. Nieuwe patiënten: vul het formulier op de website in vóór het bezoek. Geen pin? Betaal contant aan de balie.',
    passageEn:
      'Check-up appointment 12 March at 11:00 a.m. at Smile dental practice. Cancellation within 24 hours incurs a charge. New patients: complete the form on the website before the visit. No debit card? Pay cash at the desk.',
    questionNl: 'Wanneer krijgt u kosten bij annuleren?',
    questionEn: 'When do you incur costs if you cancel?',
    options: [
      { id: 'a', label: 'Alleen als u contant betaalt.' },
      { id: 'b', label: 'Als u een week van tevoren annuleert.' },
      { id: 'c', label: 'Binnen 24 uur voor de afspraak.' },
      { id: 'd', label: 'Annuleren is altijd gratis.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over vaccinatie.',
    readHintEn: 'Read the vaccination letter.',
    passageNl:
      'U bent uitgenodigd voor de griepprik op 9 oktober tussen 13:00 en 16:00 in wijkcentrum De Brug. Neem uw zorgpas mee. Zonder afspraak is wachten mogelijk maar niet gegarandeerd. Na de prik blijft u vijftien minuten ter observatie.',
    passageEn:
      'You are invited for the flu jab on 9 October between 1:00 p.m. and 4:00 p.m. at community centre De Brug. Bring your health insurance card. Without appointment waiting is possible but not guaranteed. After the jab stay fifteen minutes for observation.',
    questionNl: 'Hoe lang blijft u na de prik ter observatie?',
    questionEn: 'How long do you stay for observation after the jab?',
    options: [
      { id: 'a', label: 'Vijftien minuten.' },
      { id: 'b', label: 'Een uur verplicht in het ziekenhuis.' },
      { id: 'c', label: 'U mag direct vertrekken zonder wachten.' },
      { id: 'd', label: 'De tijd wordt niet genoemd.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht van de fysiotherapeut.',
    readHintEn: 'Read this physiotherapist message.',
    passageNl:
      'Uw verwijzing is 6 behandelingen. Eerste afspraak dinsdag 10:00; kom in sportkleding. Niet komen zonder afzeggen? Dan vervalt het tijdslot. Eigen risico kan van toepassing zijn; check uw polis bij de zorgverzekeraar. Parkeerplaats achter de praktijk is gratis.',
    passageEn:
      'Your referral is for 6 treatments. First appointment Tuesday 10:00 a.m.; come in sports clothes. No-show without cancelling? The slot is forfeited. Own risk may apply; check your policy with your insurer. Parking behind the practice is free.',
    questionNl: 'Wat gebeurt er als u niet komt zonder af te zeggen?',
    questionEn: 'What happens if you do not come without cancelling?',
    options: [
      { id: 'a', label: 'Het tijdslot vervalt.' },
      { id: 'b', label: 'De behandeling wordt gratis verlengd.' },
      { id: 'c', label: 'Er is geen regel over afzeggen.' },
      { id: 'd', label: 'U krijgt automatisch een nieuw tijdslot.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de brief over eigen risico.',
    readHintEn: 'Read the letter about the deductible.',
    passageNl:
      'Zorgverzekeraar: uw eigen risico 2025 is nog € 186 openstaand. Betalen kan via de app of in twee termijnen zonder rente. Bij niet betalen kan verrekening met uw salaris volgen via een incassobureau. Vragen? Bel 0800-9998888 op werkdagen.',
    passageEn:
      'Health insurer: your 2025 deductible still has €186 outstanding. Pay via the app or in two instalments without interest. Non-payment may lead to recovery from your salary via a collection agency. Questions? Call 0800-9998888 on weekdays.',
    questionNl: 'Hoe kunt u betalen zonder rente?',
    questionEn: 'How can you pay without interest?',
    options: [
      { id: 'a', label: 'Betaling is niet nodig volgens de brief.' },
      { id: 'b', label: 'Alleen via incassobureau met rente.' },
      { id: 'c', label: 'Alleen contant aan de balie in het ziekenhuis.' },
      { id: 'd', label: 'Via de app of in twee termijnen.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het bericht van de huisartsenpost.',
    readHintEn: 'Read the out-of-hours GP message.',
    passageNl:
      'Huisartsenpost: vandaag gevestigd in ziekenhuis Zuid, ingang spoed 2. Bel altijd eerst 088-0030700 voor triage. Kom niet zonder telefonische afspraak. Voor levensbedreigende situaties: bel 112. Wachtkamer open tot 23:00.',
    passageEn:
      'GP post: today located at Zuid hospital, emergency entrance 2. Always call 088-0030700 first for triage. Do not come without a phone appointment. Life-threatening situations: call 112. Waiting room open until 11:00 p.m.',
    questionNl: 'Wat moet u eerst doen volgens het bericht?',
    questionEn: 'What must you do first according to the message?',
    options: [
      { id: 'a', label: 'Online chatten zonder telefoon.' },
      { id: 'b', label: 'Direct naar de wachtkamer zonder bellen.' },
      { id: 'c', label: 'Bellen voor triage op 088-0030700.' },
      { id: 'd', label: '112 bellen bij elke klacht.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over medicijnen.',
    readHintEn: 'Read the letter about medication.',
    passageNl:
      'Uw dosering metformine wijzigt naar 500 mg twee keer per dag na het eten. Start op maandag. Bij misselijkheid: eet eerst en neem daarna de tablet. Over twee weken bloedprikken; u krijgt een aparte uitnodiging. Vragen? Bel de praktijkondersteuner.',
    passageEn:
      'Your metformin dose changes to 500 mg twice daily after meals. Start on Monday. If nauseous: eat first then take the tablet. Blood test in two weeks; you will receive a separate invitation. Questions? Call the practice nurse.',
    questionNl: 'Wanneer start u met de nieuwe dosering?',
    questionEn: 'When do you start the new dose?',
    options: [
      { id: 'a', label: 'Op maandag.' },
      { id: 'b', label: 'Na de bloedprik over twee weken.' },
      { id: 'c', label: 'Alleen als u misselijk bent.' },
      { id: 'd', label: 'De startdatum staat niet in de brief.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht van de GGD.',
    readHintEn: 'Read this public health service message.',
    passageNl:
      'SOA-test op afspraak: uitslag binnen vijf werkdagen via beveiligde mail. Anoniem testen kan op woensdag 16:00-19:00 zonder DigiD. Neem geen medicijnen tegen schimmelinfecties mee op de dag van de test. Partnerbehandeling is mogelijk; vraag bij de balie.',
    passageEn:
      'STI test by appointment: result within five working days via secure email. Anonymous testing on Wednesday 4:00–7:00 p.m. without DigiD. Do not take antifungal medication on the day of the test. Partner treatment is possible; ask at the desk.',
    questionNl: 'Wanneer kunt u anoniem testen?',
    questionEn: 'When can you test anonymously?',
    options: [
      { id: 'a', label: 'Woensdag 16:00-19:00 zonder DigiD.' },
      { id: 'b', label: 'Alleen na uitslag per post.' },
      { id: 'c', label: 'Anoniem testen is niet mogelijk.' },
      { id: 'd', label: 'Elke dag met DigiD.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de brief over ziekenhuisopname.',
    readHintEn: 'Read the hospital admission letter.',
    passageNl:
      'Opname gepland op 4 november om 07:30 op afdeling C3. Nuchter vanaf middernacht; water mag tot twee uur voor opname. Neem nachtkleding, slippers en uw medicijnen in originele verpakking mee. Bezoekuren 14:00-20:00; maximaal twee bezoekers per bed.',
    passageEn:
      'Admission planned 4 November at 7:30 a.m. on ward C3. Fasting from midnight; water allowed until two hours before admission. Bring nightwear, slippers and medication in original packaging. Visiting hours 2:00–8:00 p.m.; maximum two visitors per bed.',
    questionNl: 'Hoeveel bezoekers zijn toegestaan per bed?',
    questionEn: 'How many visitors are allowed per bed?',
    options: [
      { id: 'a', label: 'Geen bezoek op afdeling C3.' },
      { id: 'b', label: 'De tekst noemt geen limiet.' },
      { id: 'c', label: 'Onbeperkt de hele dag.' },
      { id: 'd', label: 'Maximaal twee bezoekers.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het bericht van de kraamzorg.',
    readHintEn: 'Read the maternity care message.',
    passageNl:
      'Kraamzorg start op de dag van thuiskomst na de bevalling. Eerste bezoek tussen 08:00 en 12:00. Zorg dat er een kraampakket en handdoeken klaarliggen. Bij koorts boven 38 bij moeder of baby: bel direct de kraamverzorgende en daarna de huisarts.',
    passageEn:
      'Maternity care starts on the day you come home after birth. First visit between 8:00 a.m. and 12:00 noon. Ensure a maternity kit and towels are ready. Fever above 38 in mother or baby: call the maternity nurse immediately then the GP.',
    questionNl: 'Wat moet u klaarleggen voor het eerste bezoek?',
    questionEn: 'What must you have ready for the first visit?',
    options: [
      { id: 'a', label: 'Een ziekenhuisbed voor thuis.' },
      { id: 'b', label: 'Alleen een autostoeltje.' },
      { id: 'c', label: 'Kraampakket en handdoeken.' },
      { id: 'd', label: 'Niets; de kraamzorg brengt alles.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over geestelijke gezondheidszorg.',
    readHintEn: 'Read the mental health care letter.',
    passageNl:
      'Uw verwijzing naar de GGZ is geaccepteerd. Intake op 21 januari om 15:45 via videobellen; link volgt per mail. Duur 45 minuten. Bij geen gehoor schuift de afspraak niet automatisch op; u moet zelf opnieuw plannen. Crisis? Bel 113 of 0800-0113.',
    passageEn:
      'Your referral to mental health services is accepted. Intake on 21 January at 3:45 p.m. via video call; link follows by email. Duration 45 minutes. If no answer the appointment is not automatically rescheduled; you must plan again yourself. Crisis? Call 113 or 0800-0113.',
    questionNl: 'Hoe vindt de intake plaats?',
    questionEn: 'How does the intake take place?',
    options: [
      { id: 'a', label: 'Fysiek op locatie zonder afspraak.' },
      { id: 'b', label: 'Via videobellen met link per mail.' },
      { id: 'c', label: 'Alleen per brief zonder contact.' },
      { id: 'd', label: 'De wijze staat niet in de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over het gezondheidscentrum.',
    readHintEn: 'Read this health centre message.',
    passageNl:
      'Het lab is verhuisd naar gebouw Oost, begane grond. Bloedafname zonder afspraak ma-do 07:30-10:00. Vasten? Alleen als dat op uw formulier staat. Uitslag binnen drie werkdagen in het patiëntenportaal. Parkeren 1 uur gratis met parkeerschijf bij ingang Oost.',
    passageEn:
      'The lab has moved to East building, ground floor. Blood tests without appointment Mon–Thu 7:30–10:00 a.m. Fasting? Only if stated on your form. Results within three working days in the patient portal. Parking 1 hour free with disc at East entrance.',
    questionNl: 'Wanneer kunt u zonder afspraak bloed laten afnemen?',
    questionEn: 'When can you have blood taken without an appointment?',
    options: [
      { id: 'a', label: 'Elke dag tot 17:00 in gebouw West.' },
      { id: 'b', label: 'Alleen na vasten op vrijdag.' },
      { id: 'c', label: 'Bloedafname vereist altijd een afspraak.' },
      { id: 'd', label: 'Ma-do 07:30-10:00 in gebouw Oost.' },
    ],
    correctOptionIds: ['d'],
  },
  // ─── Werk (12) ───
  {
    introNl: 'Lees deze mededeling op het werk.',
    readHintEn: 'Read this notice at work.',
    passageNl:
      'Teamoverleg verplaatst naar donderdag 09:00 in vergaderzaal Atlas. Agenda: roosters juli en veiligheidsinstructie nieuwe machines. Verzuim melden bij HR vóór 08:30. Werkkleding verplicht in hal B; bezoekers krijgen een oranje vest bij de ingang.',
    passageEn:
      'Team meeting moved to Thursday 9:00 a.m. in Atlas meeting room. Agenda: July schedules and safety briefing for new machines. Report absence to HR before 8:30 a.m. Work clothing required in hall B; visitors get an orange vest at the entrance.',
    questionNl: 'Waar is het teamoverleg?',
    questionEn: 'Where is the team meeting?',
    options: [
      { id: 'a', label: 'In hal B zonder agenda.' },
      { id: 'b', label: 'De locatie staat niet in de mededeling.' },
      { id: 'c', label: 'In de kantine om 08:00.' },
      { id: 'd', label: 'Donderdag 09:00 in vergaderzaal Atlas.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het rooster op het prikbord.',
    readHintEn: 'Read the schedule on the notice board.',
    passageNl:
      'Week 24: ochtendploeg 06:00-14:00 ma-vr. Ahmed werkt dinsdag en woensdag; donderdag vrij. Vrijdag is teamborrel om 15:30 in de kantine; deelname vrijwillig. Overwerk aanmelden via het formulier op het intranet vóór 16:00 de dag ervoor.',
    passageEn:
      'Week 24: morning shift 6:00 a.m.–2:00 p.m. Mon–Fri. Ahmed works Tuesday and Wednesday; Thursday off. Friday team drinks at 3:30 p.m. in the canteen; participation voluntary. Register overtime via the intranet form before 4:00 p.m. the day before.',
    questionNl: 'Wanneer is Ahmed vrij volgens het rooster?',
    questionEn: 'When is Ahmed off according to the schedule?',
    options: [
      { id: 'a', label: 'Het rooster noemt geen vrije dag voor Ahmed.' },
      { id: 'b', label: 'Op dinsdag en woensdag.' },
      { id: 'c', label: 'Op donderdag.' },
      { id: 'd', label: 'De hele week 24.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over arbeidsomstandigheden.',
    readHintEn: 'Read the occupational health letter.',
    passageNl:
      'Jaarlijkse arbocheck op 3 september tussen 10:00 en 11:00 bij bedrijfsarts De Groot. Duur 20 minuten. Neem uw bril en medicatielijst mee. Niet komen? Meld dit bij HR zodat een nieuw tijdslot kan worden gepland. Resultaat is vertrouwelijk.',
    passageEn:
      'Annual occupational health check on 3 September between 10:00 a.m. and 11:00 a.m. with company doctor De Groot. Duration 20 minutes. Bring your glasses and medication list. Not coming? Notify HR so a new slot can be scheduled. Result is confidential.',
    questionNl: 'Wat moet u meenemen naar de arbocheck?',
    questionEn: 'What must you bring to the occupational health check?',
    options: [
      { id: 'a', label: 'Alleen uw contract en loonstrook.' },
      { id: 'b', label: 'Bril en medicatielijst.' },
      { id: 'c', label: 'Werkkleding voor hal B.' },
      { id: 'd', label: 'Niets; de arts heeft alles digitaal.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over veiligheid.',
    readHintEn: 'Read this safety message.',
    passageNl:
      'Nieuwe regel magazijn: looproutes vrijhouden; niets binnen 1 meter van de nooddeur plaatsen. Handschoenen verplicht bij heffen boven 15 kg. Meld bijna-ongevallen binnen 24 uur via het formulier Veilig Werken. Rookverbod geldt op het hele terrein.',
    passageEn:
      'New warehouse rule: keep walkways clear; place nothing within 1 metre of the emergency door. Gloves mandatory when lifting over 15 kg. Report near-misses within 24 hours via the Safe Working form. Smoking ban applies on the entire site.',
    questionNl: 'Wat is niet toegestaan op het terrein?',
    questionEn: 'What is not allowed on the site?',
    options: [
      { id: 'a', label: 'Roken op het hele terrein.' },
      { id: 'b', label: 'Melden van bijna-ongevallen.' },
      { id: 'c', label: 'Vrije looproutes in het magazijn.' },
      { id: 'd', label: 'Handschoenen bij zware lasten.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling over salaris.',
    readHintEn: 'Read the salary notice.',
    passageNl:
      'Uw loonstrook juli staat online in MijnWerk. Uitbetaling op 24 juli. Reiskostenvergoeding wordt deze maand apart gestort. Vragen binnen 10 werkdagen naar salarisadministratie@bedrijf.nl met loonnummer 4421. Zonder reactie beschouwen wij de strook als akkoord.',
    passageEn:
      'Your July payslip is online in MijnWerk. Payment on 24 July. Travel allowance is paid separately this month. Questions within 10 working days to salarisadministratie@bedrijf.nl with payroll number 4421. Without response we consider the slip accepted.',
    questionNl: 'Wanneer wordt het salaris uitbetaald?',
    questionEn: 'When is the salary paid?',
    options: [
      { id: 'a', label: 'Pas na akkoord per post.' },
      { id: 'b', label: 'De datum staat niet in de mededeling.' },
      { id: 'c', label: 'Op 10 juli na vragen.' },
      { id: 'd', label: 'Op 24 juli.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees het bericht over cursus.',
    readHintEn: 'Read the training message.',
    passageNl:
      'Verplichte cursus EHBO op 14 en 15 november, 09:00-16:00. Lunch is verzorgd. Afwezigheid zonder geldige reden wordt gemeld aan uw leidinggevende. Inschrijven vóór 1 november via HR; maximaal 12 plaatsen.',
    passageEn:
      'Mandatory first aid course on 14 and 15 November, 9:00 a.m.–4:00 p.m. Lunch provided. Absence without valid reason is reported to your manager. Register before 1 November via HR; maximum 12 places.',
    questionNl: 'Hoe schrijft u zich in?',
    questionEn: 'How do you register?',
    options: [
      { id: 'a', label: 'Inschrijven is niet nodig; iedereen gaat automatisch.' },
      { id: 'b', label: 'Op de eerste cursusdag zonder aanmelding.' },
      { id: 'c', label: 'Vóór 1 november via HR.' },
      { id: 'd', label: 'Alleen via uw leidinggevende na afwezigheid.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees de brief over werktijden.',
    readHintEn: 'Read the working hours letter.',
    passageNl:
      'Vanaf 1 oktober geldt vroeg dienstrooster: start 07:00, einde 15:30. Pauze 30 minuten tussen 11:00 en 13:00. Thuiswerken op vrijdag blijft mogelijk na goedkeuring. U ontvangt een toeslag van 8% op uren vóór 08:00.',
    passageEn:
      'From 1 October early shift schedule applies: start 7:00 a.m., end 3:30 p.m. Break 30 minutes between 11:00 a.m. and 1:00 p.m. Working from home on Friday remains possible after approval. You receive an 8% allowance on hours before 8:00 a.m.',
    questionNl: 'Welke toeslag krijgt u op vroege uren?',
    questionEn: 'What allowance do you get for early hours?',
    options: [
      { id: 'a', label: '8% op uren vóór 08:00.' },
      { id: 'b', label: '50% op alle uren na 15:30.' },
      { id: 'c', label: 'Geen toeslag volgens de brief.' },
      { id: 'd', label: 'Alleen lunchvergoeding.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over bedrijfskleding.',
    readHintEn: 'Read this work clothing message.',
    passageNl:
      'Nieuwe werkschoenen beschikbaar bij de uitgiftebalie ma-wo 13:00-15:00. Breng oude schoenen mee; zonder inlevering geen nieuw paar. Maat wijzigen kan; meet u op bij de balie. Kosten worden door werkgever vergoed tot € 120 per jaar.',
    passageEn:
      'New work shoes available at the issue desk Mon–Wed 1:00–3:00 p.m. Bring old shoes; no new pair without handing in old ones. Size change possible; get measured at the desk. Costs reimbursed by employer up to €120 per year.',
    questionNl: 'Wat moet u meenemen voor nieuwe schoenen?',
    questionEn: 'What must you bring for new shoes?',
    options: [
      { id: 'a', label: 'Uw oude werkschoenen om in te leveren.' },
      { id: 'b', label: 'Een doktersverklaring voor uw maat.' },
      { id: 'c', label: 'Niets; schoenen zijn vrij te pakken.' },
      { id: 'd', label: 'Alleen contant geld € 120.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling over IT.',
    readHintEn: 'Read the IT notice.',
    passageNl:
      'Systeemonderhoud zaterdag 22:00 tot zondag 06:00: geen toegang tot e-mail en rooster-app. Werk offline voorbereiden. Na onderhoud: nieuw wachtwoord verplicht bij eerste login. Hulp nodig? Bel servicedesk 1234 op werkdagen 08:00-17:00.',
    passageEn:
      'System maintenance Saturday 10:00 p.m. to Sunday 6:00 a.m.: no access to email and schedule app. Prepare to work offline. After maintenance: new password required at first login. Need help? Call servicedesk 1234 on weekdays 8:00 a.m.–5:00 p.m.',
    questionNl: 'Wanneer is er geen toegang tot e-mail?',
    questionEn: 'When is there no access to email?',
    options: [
      { id: 'a', label: 'Alleen op werkdagen tijdens lunch.' },
      { id: 'b', label: 'De tekst noemt geen onderhoudsperiode.' },
      { id: 'c', label: 'Zaterdag 22:00 tot zondag 06:00.' },
      { id: 'd', label: 'Elke avond na 17:00.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees het bericht over vakantie.',
    readHintEn: 'Read the holiday message.',
    passageNl:
      'Vakantieaanvraag juli: minimaal drie weken van tevoren indienen via HR-portaal. In juli is maximaal 20% van het team tegelijk vrij. Goedkeuring binnen vijf werkdagen per mail. Spoed? Overleg met uw teamleider vóór boeken.',
    passageEn:
      'Holiday request July: submit at least three weeks in advance via HR portal. In July maximum 20% of the team may be off at the same time. Approval within five working days by email. Urgent? Consult your team leader before booking.',
    questionNl: 'Hoe ver van tevoren moet u aanvragen?',
    questionEn: 'How far in advance must you apply?',
    options: [
      { id: 'a', label: 'Aanvragen is niet nodig in juli.' },
      { id: 'b', label: 'Minimaal drie weken van tevoren.' },
      { id: 'c', label: 'Op de dag van vertrek.' },
      { id: 'd', label: 'Een jaar van tevoren verplicht.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over functioneringsgesprek.',
    readHintEn: 'Read the performance review letter.',
    passageNl:
      'Uw functioneringsgesprek is op 8 mei om 13:00 met mevrouw Jansen. Vul het zelfbeoordelingsformulier in vóór 5 mei. Het gesprek duurt ongeveer 45 minuten in kamer 2.04. Doel: doelen voor het komende jaar en opleidingswensen bespreken.',
    passageEn:
      'Your performance review is on 8 May at 1:00 p.m. with Ms Jansen. Complete the self-assessment form before 5 May. The meeting lasts about 45 minutes in room 2.04. Aim: discuss goals for the coming year and training wishes.',
    questionNl: 'Wat moet u vóór 5 mei doen?',
    questionEn: 'What must you do before 5 May?',
    options: [
      { id: 'a', label: 'Het zelfbeoordelingsformulier invullen.' },
      { id: 'b', label: 'Direct uw ontslag indienen.' },
      { id: 'c', label: 'Een opleiding boeken zonder overleg.' },
      { id: 'd', label: 'Niets; het formulier is optioneel.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over de bedrijfsfeest.',
    readHintEn: 'Read this company party message.',
    passageNl:
      'Bedrijfsfeest 14 december in restaurant De Haven, 18:30-23:00. Partner uitgenodigd; meld dit bij aanmelden. Dresscode smart casual. Gratis drankjes tot 22:00; daarna eigen rekening. Taxi-kaart beschikbaar bij de receptie na 23:00.',
    passageEn:
      'Company party 14 December at restaurant De Haven, 6:30–11:00 p.m. Partner invited; mention when registering. Dress code smart casual. Free drinks until 10:00 p.m.; after that own bill. Taxi voucher available at reception after 11:00 p.m.',
    questionNl: 'Tot hoe laat zijn drankjes gratis?',
    questionEn: 'Until what time are drinks free?',
    options: [
      { id: 'a', label: 'Tot 22:00 uur.' },
      { id: 'b', label: 'De hele avond inclusief na 23:00.' },
      { id: 'c', label: 'Er zijn geen gratis drankjes.' },
      { id: 'd', label: 'Tot 18:30 bij aankomst.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Nieuws (10) ───
  {
    introNl: 'Lees dit korte nieuwsbericht.',
    readHintEn: 'Read this short news item.',
    passageNl:
      'Regio Utrecht: vanavond code geel voor windstoten tot 70 km/u. NS verwacht vertragingen op traject Utrecht-Amsterdam. Reizigers kunnen gratis later reizen met dezelfde kaart bij vertraging boven 30 minuten. Check ns.nl voor actuele tijden.',
    passageEn:
      'Utrecht region: code yellow tonight for gusts up to 70 km/h. NS expects delays on Utrecht–Amsterdam route. Passengers can travel free later with the same card if delay over 30 minutes. Check ns.nl for current times.',
    questionNl: 'Wanneer kunnen reizigers gratis later reizen?',
    questionEn: 'When can passengers travel free later?',
    options: [
      { id: 'a', label: 'Alleen met code rood voor wind.' },
      { id: 'b', label: 'Gratis reizen is niet mogelijk volgens het bericht.' },
      { id: 'c', label: 'Bij elke vertraging van vijf minuten.' },
      { id: 'd', label: 'Bij vertraging boven 30 minuten.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit nieuws over het weer.',
    readHintEn: 'Read this weather news.',
    passageNl:
      'KNMI: morgenochtend lokale mist, temperatuur 4-9 graden. Middag opklaringen en zwakke wind. Waarschuwing voor gladheid op bruggen en viaducten in het oosten. Rijkswaterstaat strooit vanaf 05:00 op A12 en A50.',
    passageEn:
      'KNMI: local fog tomorrow morning, temperature 4–9°C. Clearing and light wind in the afternoon. Warning for slippery bridges and viaducts in the east. Rijkswaterstaat will grit from 5:00 a.m. on A12 and A50.',
    questionNl: 'Waar is waarschuwing voor gladheid?',
    questionEn: 'Where is there a warning for slippery conditions?',
    options: [
      { id: 'a', label: 'Alleen op binnenwegen zonder snelweg.' },
      { id: 'b', label: 'Alleen in het westen bij de kust.' },
      { id: 'c', label: 'Op bruggen en viaducten in het oosten.' },
      { id: 'd', label: 'Nergens; het blijft de hele dag mistig.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit lokale nieuwsbericht.',
    readHintEn: 'Read this local news item.',
    passageNl:
      'Gemeente Haarlem opent nieuw inloopspreekuur voor woningzoekenden elke dinsdag 14:00-16:00 in het stadhuis. Meenemen: identiteitsbewijs en inschrijving DigiD. Wachttijd zonder afspraak kan 45 minuten zijn; online afspraak verkort wachten.',
    passageEn:
      'Haarlem municipality opens new walk-in hour for home seekers every Tuesday 2:00–4:00 p.m. at the town hall. Bring: ID and DigiD registration. Wait without appointment can be 45 minutes; online appointment shortens wait.',
    questionNl: 'Wanneer is het inloopspreekuur?',
    questionEn: 'When is the walk-in hour?',
    options: [
      { id: 'a', label: 'Elke dag van 09:00 tot 17:00.' },
      { id: 'b', label: 'Dinsdag 14:00-16:00.' },
      { id: 'c', label: 'Alleen online zonder fysiek bezoek.' },
      { id: 'd', label: 'De tijden staan niet in het bericht.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit sportnieuws.',
    readHintEn: 'Read this sports news.',
    passageNl:
      'Voetbal: ADO Den Haag speelt zondag om 14:30 thuis tegen Excelsior. Kaarten vanaf € 22 online. Supporters uit Rotterdam krijgen een apart vak; kom uiterlijk 13:45 door de ingang Zuid. Openbaar vervoer: tram 9 of bus 22 naar stadion.',
    passageEn:
      'Football: ADO Den Haag plays Sunday at 2:30 p.m. at home against Excelsior. Tickets from €22 online. Supporters from Rotterdam get a separate section; arrive by 1:45 p.m. via south entrance. Public transport: tram 9 or bus 22 to stadium.',
    questionNl: 'Hoe laat moeten supporters uit Rotterdam binnen zijn?',
    questionEn: 'By what time must supporters from Rotterdam be inside?',
    options: [
      { id: 'a', label: 'Om 14:30 bij aanvang van de wedstrijd.' },
      { id: 'b', label: 'Zij mogen niet naar de wedstrijd.' },
      { id: 'c', label: 'De tekst noemt geen tijd voor supporters.' },
      { id: 'd', label: 'Uiterlijk 13:45 via ingang Zuid.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit economisch nieuws.',
    readHintEn: 'Read this economic news.',
    passageNl:
      'Minimumloon stijgt per 1 januari met 3,1% naar € 14,06 bruto per uur voor 21 jaar en ouder. Jongeren onder 21 krijgen een lager percentage volgens de tabel op rijksoverheid.nl. Werkgevers moeten contracten vóór december aanpassen.',
    passageEn:
      'Minimum wage rises from 1 January by 3.1% to €14.06 gross per hour for age 21 and over. Young people under 21 receive a lower percentage according to the table on rijksoverheid.nl. Employers must adjust contracts before December.',
    questionNl: 'Wat is het nieuwe minimumuurloon voor 21+?',
    questionEn: 'What is the new minimum hourly wage for 21+?',
    options: [
      { id: 'a', label: '€ 18,00 alleen voor jongeren.' },
      { id: 'b', label: 'Het bedrag staat niet in het bericht.' },
      { id: 'c', label: '€ 12,00 zonder verhoging.' },
      { id: 'd', label: '€ 14,06 bruto per uur.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit nieuws over verkeer.',
    readHintEn: 'Read this traffic news.',
    passageNl:
      'A2 richting Amsterdam: file door ongeval bij knooppunt Holendrecht, 8 km, +25 minuten. Rechterrijstrook dicht. Omleiding via A9 mogelijk. Politie vraagt weggebruikers om ruimte te geven bij pechhulp op de vluchtstrook.',
    passageEn:
      'A2 towards Amsterdam: queue due to accident at Holendrecht junction, 8 km, +25 minutes. Right lane closed. Detour via A9 possible. Police ask road users to give space to breakdown assistance on the hard shoulder.',
    questionNl: 'Welke rijstrook is dicht?',
    questionEn: 'Which lane is closed?',
    options: [
      { id: 'a', label: 'De tekst noemt geen gesloten strook.' },
      { id: 'b', label: 'De linkerrijstrook richting Utrecht.' },
      { id: 'c', label: 'De rechterrijstrook.' },
      { id: 'd', label: 'Alle rijstroken zonder omleiding.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit cultuurnieuws.',
    readHintEn: 'Read this culture news.',
    passageNl:
      'Museum Boijmans gratis toegankelijk op eerste zondag van de maand 10:00-17:00. Reserveren online aanbevolen; zonder ticket mogelijk wachten buiten. Tentoonstelling Design Dates loopt tot 31 augustus. Ingang Museumpark, metro Eendrachtsplein.',
    passageEn:
      'Boijmans museum free entry on first Sunday of the month 10:00 a.m.–5:00 p.m. Online booking recommended; without ticket possible wait outside. Exhibition Design Dates runs until 31 August. Entrance Museumpark, metro Eendrachtsplein.',
    questionNl: 'Wanneer is het museum gratis toegankelijk?',
    questionEn: 'When is the museum free to enter?',
    options: [
      { id: 'a', label: 'Elke dag tot 31 augustus.' },
      { id: 'b', label: 'Eerste zondag van de maand 10:00-17:00.' },
      { id: 'c', label: 'Alleen na online ticket elke werkdag.' },
      { id: 'd', label: 'Gratis toegang is niet mogelijk.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit nieuws over gezondheid.',
    readHintEn: 'Read this health news.',
    passageNl:
      'RIVM: meer mazelen in regio Rotterdam-Rijnmond. Controleer uw vaccinatie; kinderen kunnen gratis inhalen bij de GGD. Bij koorts en vlekjes: bel de huisarts en blijf thuis. School De Horizon heeft één klas thuisles tot vrijdag.',
    passageEn:
      'RIVM: more measles in Rotterdam-Rijnmond region. Check your vaccination; children can get a free catch-up jab at the GGD. With fever and spots: call the GP and stay home. School De Horizon has one class on home lessons until Friday.',
    questionNl: 'Wat moet u doen bij koorts en vlekjes?',
    questionEn: 'What must you do with fever and spots?',
    options: [
      { id: 'a', label: 'Huisarts bellen en thuisblijven.' },
      { id: 'b', label: 'Direct naar het ziekenhuis zonder bellen.' },
      { id: 'c', label: 'Niets; mazelen zijn niet besmettelijk.' },
      { id: 'd', label: 'Naar school gaan voor thuisles.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit nieuws over woningbouw.',
    readHintEn: 'Read this housing construction news.',
    passageNl:
      'Start bouw 120 sociale huurwoningen aan de Havenkade in maart 2026. Eerste oplevering eind 2027. Bewoners uit de wijk kunnen op 12 februari informatieavond bijwonen in wijkcentrum De Anker. Aanmelden via gemeente.nl/havenkade.',
    passageEn:
      'Start of construction of 120 social rental homes at Havenkade in March 2026. First completion end of 2027. Local residents can attend information evening on 12 February at community centre De Anker. Register via gemeente.nl/havenkade.',
    questionNl: 'Wanneer is de informatieavond?',
    questionEn: 'When is the information evening?',
    options: [
      { id: 'a', label: 'Eind 2027 bij oplevering.' },
      { id: 'b', label: 'Er is geen avond gepland.' },
      { id: 'c', label: 'Op 12 februari in wijkcentrum De Anker.' },
      { id: 'd', label: 'In maart 2026 bij start bouw.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit nieuws over stookverbod.',
    readHintEn: 'Read this wood-burning ban news.',
    passageNl:
      'Rijksinstituut voor Volksgezondheid: stookverbod vandaag in heel Noord-Holland vanwege luchtvervuiling. Geen houtkachels en tuinvuren. Wel mag u barbecueen op gas. Bij overtreding risico op boete tot € 4000. Verwachting: morgen mogelijk weer toegestaan.',
    passageEn:
      'National institute for public health: burning ban today throughout Noord-Holland due to air pollution. No wood stoves or garden fires. Gas barbecues are allowed. Violation may lead to fine up to €4000. Expectation: possibly allowed again tomorrow.',
    questionNl: 'Wat is vandaag nog wel toegestaan?',
    questionEn: 'What is still allowed today?',
    options: [
      { id: 'a', label: 'Alles is verboden inclusief gas.' },
      { id: 'b', label: 'Houtkachel stoken de hele dag.' },
      { id: 'c', label: 'Barbecueen op gas.' },
      { id: 'd', label: 'Tuinvuren met snoeiafval.' },
    ],
    correctOptionIds: ['c'],
  },
  // ─── Webpagina's (10) ───
  {
    introNl: 'Lees deze webpagina over DigiD.',
    readHintEn: 'Read this web page about DigiD.',
    passageNl:
      'DigiD aanvragen duurt ongeveer vijf minuten. U heeft een e-mailadres en Nederlands mobiel nummer nodig. Na de aanvraag ontvangt u binnen drie werkdagen een brief met activatiecode. Activeer binnen 20 dagen, anders vervalt de code.',
    passageEn:
      'Applying for DigiD takes about five minutes. You need an email address and a Dutch mobile number. After applying you receive a letter with activation code within three working days. Activate within 20 days, otherwise the code expires.',
    questionNl: 'Binnen hoeveel dagen moet u de code activeren?',
    questionEn: 'Within how many days must you activate the code?',
    options: [
      { id: 'a', label: 'Binnen 3 werkdagen na de brief.' },
      { id: 'b', label: 'Binnen 20 dagen na ontvangst.' },
      { id: 'c', label: 'Binnen één jaar zonder limiet.' },
      { id: 'd', label: 'Activeren is niet nodig volgens de pagina.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze pagina over huurtoeslag.',
    readHintEn: 'Read this page about rent allowance.',
    passageNl:
      'Huurtoeslag 2025: maximale kale huur voor alleenstaanden € 900,12. Uw inkomen bepaalt het bedrag. Aanvragen kan met DigiD op toeslagen.nl. Wijzigingen in huur of inkomen binnen vier weken doorgeven. Te laat melden kan terugvordering geven.',
    passageEn:
      'Rent allowance 2025: maximum basic rent for single people €900.12. Your income determines the amount. Apply with DigiD at toeslagen.nl. Report changes in rent or income within four weeks. Late reporting may lead to recovery of payments.',
    questionNl: 'Binnen hoeveel tijd moet u wijzigingen doorgeven?',
    questionEn: 'Within how much time must you report changes?',
    options: [
      { id: 'a', label: 'Binnen één week na jaarwisseling.' },
      { id: 'b', label: 'Alleen bij verhuizing na een jaar.' },
      { id: 'c', label: 'Doorgeven is niet nodig volgens de pagina.' },
      { id: 'd', label: 'Binnen vier weken.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze pagina van de IND.',
    readHintEn: 'Read this IND page.',
    passageNl:
      'Verlengen verblijfsvergunning: dien uw aanvraag in vóór de vervaldatum. Kosten € 207 voor gezinsleden, tarief 2025. Biometrie-afspraak is verplicht; u krijgt een uitnodiging per mail. Zonder geldige vergunning mag u niet werken.',
    passageEn:
      'Renew residence permit: submit your application before the expiry date. Cost €207 for family members, 2025 rate. Biometrics appointment is mandatory; you receive an invitation by email. Without a valid permit you may not work.',
    questionNl: 'Wanneer moet u de aanvraag indienen?',
    questionEn: 'When must you submit the application?',
    options: [
      { id: 'a', label: 'Alleen na de biometrie zonder deadline.' },
      { id: 'b', label: 'De pagina noemt geen termijn.' },
      { id: 'c', label: 'Na de vervaldatum binnen een maand.' },
      { id: 'd', label: 'Vóór de vervaldatum van de vergunning.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze pagina over zorgverzekering.',
    readHintEn: 'Read this health insurance page.',
    passageNl:
      'Overstappen naar een andere zorgverzekeraar kan tot 1 februari. Nieuwe polis gaat in op 1 januari als u vóór 31 december overstapt. Vergelijk polissen op zorgwijzer.nl. Let op eigen risico en aanvullende verzekering voor tandarts.',
    passageEn:
      'Switching to another health insurer is possible until 1 February. New policy starts 1 January if you switch before 31 December. Compare policies on zorgwijzer.nl. Note deductible and supplementary insurance for dental care.',
    questionNl: 'Tot wanneer kunt u overstappen?',
    questionEn: 'Until when can you switch?',
    options: [
      { id: 'a', label: 'Overstappen is niet mogelijk volgens de pagina.' },
      { id: 'b', label: 'Tot 1 februari.' },
      { id: 'c', label: 'Tot 31 december van elk jaar zonder uitzondering.' },
      { id: 'd', label: 'Alleen in de zomerperiode.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze pagina over rijexamen.',
    readHintEn: 'Read this driving test page.',
    passageNl:
      'Praktijkexamen auto reserveren via het CBR: inloggen met DigiD. Annuleren kost € 32,50 als u binnen vijf werkdagen afzegt. Neem op de examendag geldig identiteitsbewijs en een veilige auto mee. Begeleider mag meerijden maar blijft stil.',
    passageEn:
      'Book practical car test via CBR: log in with DigiD. Cancellation costs €32.50 if you cancel within five working days. On exam day bring valid ID and a safe car. Supervisor may come along but stays quiet.',
    questionNl: 'Wanneer betaalt u annuleringskosten?',
    questionEn: 'When do you pay cancellation costs?',
    options: [
      { id: 'a', label: 'Als u een maand van tevoren afzegt.' },
      { id: 'b', label: 'Bij afzeggen binnen vijf werkdagen.' },
      { id: 'c', label: 'Annuleren is altijd gratis.' },
      { id: 'd', label: 'Alleen als u geen DigiD heeft.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze pagina over studiefinanciering.',
    readHintEn: 'Read this student finance page.',
    passageNl:
      'DUO: leenbedrag 2025 voor wo-studenten buiten huis maximaal € 1.164,70 per maand. Aanvullende beurs afhankelijk van ouderinkomen. Stopzetten bij einde studie binnen een maand melden, anders moet u terugbetalen met rente.',
    passageEn:
      'DUO: 2025 loan amount for university students living away from home maximum €1,164.70 per month. Supplementary grant depends on parental income. Report end of study within one month, otherwise you must repay with interest.',
    questionNl: 'Wat moet u doen bij einde van uw studie?',
    questionEn: 'What must you do when your study ends?',
    options: [
      { id: 'a', label: 'Niets; de lening vervalt automatisch.' },
      { id: 'b', label: 'Direct het maximale bedrag verhogen.' },
      { id: 'c', label: 'Ouderinkomen opnieuw laten keuren.' },
      { id: 'd', label: 'Binnen een maand stopzetten melden bij DUO.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze pagina over afval.',
    readHintEn: 'Read this waste page.',
    passageNl:
      'Milieustraat gemeente Amersfoort: open di-zo 10:00-17:00. Gratis voor inwoners met pas of rijbewijs + energierekening. Maximaal 1 m3 bouwafval per maand. Asbest alleen op afspraak; bellen 033-1234567.',
    passageEn:
      'Recycling centre Amersfoort: open Tue–Sun 10:00 a.m.–5:00 p.m. Free for residents with pass or driving licence + energy bill. Maximum 1 m³ construction waste per month. Asbestos by appointment only; call 033-1234567.',
    questionNl: 'Wanneer is de milieustraat open?',
    questionEn: 'When is the recycling centre open?',
    options: [
      { id: 'a', label: 'Alleen op afspraak voor asbest.' },
      { id: 'b', label: '24 uur per dag voor inwoners.' },
      { id: 'c', label: 'Maandag de hele dag.' },
      { id: 'd', label: 'Di-zo 10:00-17:00.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze pagina over klachten.',
    readHintEn: 'Read this complaints page.',
    passageNl:
      'Klacht indienen bij de gemeente: beschrijf uw probleem en datum. Upload foto\'s indien mogelijk. Reactie binnen zes weken. Niet tevreden? Bezwaar bij de commissie Binnenlands Bestuur binnen zes weken na ons antwoord. Hulp nodig? Bel 14 040.',
    passageEn:
      'File a complaint with the municipality: describe your problem and date. Upload photos if possible. Response within six weeks. Not satisfied? Object to the Domestic Administration committee within six weeks of our answer. Need help? Call 14 040.',
    questionNl: 'Binnen welke termijn krijgt u een reactie?',
    questionEn: 'Within what period do you receive a response?',
    options: [
      { id: 'a', label: 'Er is geen reactietermijn genoemd.' },
      { id: 'b', label: 'Binnen zes weken.' },
      { id: 'c', label: 'Binnen twee werkdagen.' },
      { id: 'd', label: 'Binnen zes maanden na bezwaar.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze pagina over solliciteren bij de overheid.',
    readHintEn: 'Read this government job application page.',
    passageNl:
      'Werken voor Nederland: vacatures op werkenvoornederland.nl. Sollicitatie in het Nederlands; motivatie maximaal 400 woorden. Selectie: cv-screening, online test, gesprek. Accommodatie bij dyslexie aanvragen vóór de test via het contactformulier.',
    passageEn:
      'Working for the Netherlands: vacancies on werkenvoornederland.nl. Application in Dutch; motivation maximum 400 words. Selection: CV screening, online test, interview. Accommodation for dyslexia request before the test via the contact form.',
    questionNl: 'In welke taal moet de motivatie zijn?',
    questionEn: 'In which language must the motivation be?',
    options: [
      { id: 'a', label: 'In het Engels alleen.' },
      { id: 'b', label: 'In het Nederlands.' },
      { id: 'c', label: 'In elke EU-taal zonder limiet.' },
      { id: 'd', label: 'Motivatie is niet nodig volgens de pagina.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze pagina over 112.',
    readHintEn: 'Read this page about 112.',
    passageNl:
      'Bel 112 bij levensgevaar, groot brand of geweld. U kunt ook 112 sms\'en als bellen niet kan; registreer eerst op 112.nl/sms. Geef locatie, wat er aan de hand is en hoeveel slachtoffers. Geen spoed? Bel de huisartsenpost of 0900-8844.',
    passageEn:
      'Call 112 for life-threatening situations, major fire or violence. You can also text 112 if calling is not possible; register first at 112.nl/sms. Give location, what is happening and how many victims. Not urgent? Call the GP post or 0900-8844.',
    questionNl: 'Wat moet u eerst doen om 112 te sms\'en?',
    questionEn: 'What must you do first to text 112?',
    options: [
      { id: 'a', label: 'De huisartsenpost bellen.' },
      { id: 'b', label: 'Niets; sms werkt altijd zonder registratie.' },
      { id: 'c', label: 'Een e-mail sturen naar de politie.' },
      { id: 'd', label: 'Registreren op 112.nl/sms.' },
    ],
    correctOptionIds: ['d'],
  },
  // ─── Buurt (8) ───
  {
    introNl: 'Lees dit briefje van de buren.',
    readHintEn: 'Read this note from the neighbours.',
    passageNl:
      'Beste buren, zaterdag hebben wij een verjaardagsfeest in de tuin tot ongeveer 23:00. Muziek niet harder dan normaal na 22:00. Bij overlast: bel ons op 06-11223344. Excuses voor het geluid en bedankt voor uw begrip.',
    passageEn:
      'Dear neighbours, on Saturday we have a birthday party in the garden until about 11:00 p.m. Music not louder than normal after 10:00 p.m. If it is a nuisance: call us on 06-11223344. Sorry for the noise and thanks for your understanding.',
    questionNl: 'Tot hoe laat verwachten de buren het feest?',
    questionEn: 'Until what time do the neighbours expect the party?',
    options: [
      { id: 'a', label: 'Alleen tot 18:00 zonder muziek.' },
      { id: 'b', label: 'De tijd staat niet in het briefje.' },
      { id: 'c', label: 'Tot ongeveer 23:00 uur.' },
      { id: 'd', label: 'Tot 06:00 de volgende ochtend.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze mededeling in het trappenhuis.',
    readHintEn: 'Read this notice in the stairwell.',
    passageNl:
      'Geachte bewoners, woensdag 9:00-12:00 controleert de brandweer de rookmelders. Zorg dat wij in elke woning kunnen; hang een briefje op de deur als u niet thuis bent met telefoonnummer. Valse meldingen? Druk reset in, bel niet 112.',
    passageEn:
      'Dear residents, Wednesday 9:00 a.m.–12:00 noon the fire brigade checks smoke detectors. Ensure we can enter every home; put a note on the door if you are not home with phone number. False alarms? Press reset, do not call 112.',
    questionNl: 'Wat moet u doen als u niet thuis bent?',
    questionEn: 'What must you do if you are not home?',
    options: [
      { id: 'a', label: 'Niets; de brandweer komt niet binnen.' },
      { id: 'b', label: 'De deur open laten zonder briefje.' },
      { id: 'c', label: 'Briefje met telefoonnummer op de deur hangen.' },
      { id: 'd', label: '112 bellen bij rookmelder.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit bericht over een garageverkoop.',
    readHintEn: 'Read this garage sale message.',
    passageNl:
      'Garageverkoop zaterdag 10:00-14:00, Molenstraat 8. Parkeer op eigen terrein of aan de overkant; niet voor nr. 6-10. Contant en pin via Tikkie. Bij regen verplaatsen wij spullen naar de carport; kijk naar het bord.',
    passageEn:
      'Garage sale Saturday 10:00 a.m.–2:00 p.m., Molenstraat 8. Park on own property or opposite; not in front of nos. 6–10. Cash and debit via Tikkie. In rain we move items to the carport; check the sign.',
    questionNl: 'Waar mag u niet parkeren?',
    questionEn: 'Where may you not park?',
    options: [
      { id: 'a', label: 'Op eigen terrein van nr. 8.' },
      { id: 'b', label: 'Voor de nummers 6-10.' },
      { id: 'c', label: 'Aan de overkant van de straat.' },
      { id: 'd', label: 'Parkeren is overal verboden.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit briefje over een lekkage.',
    readHintEn: 'Read this note about a leak.',
    passageNl:
      'Buren uit 12b: er lekt water via uw plafond bij ons. Kunt u dinsdag tussen 19:00 en 20:00 de badkamerdeur openen voor de loodgieter? Als het niet uitkomt, bel 06-99887766. Wij betalen het onderzoek als de leiding bij ons ligt.',
    passageEn:
      'Neighbours from 12b: water is leaking through your ceiling at our place. Can you open the bathroom door on Tuesday between 7:00 and 8:00 p.m. for the plumber? If not possible, call 06-99887766. We pay for the investigation if the pipe is on our side.',
    questionNl: 'Wanneer kan de loodgieter bij u binnen?',
    questionEn: 'When can the plumber enter your home?',
    options: [
      { id: 'a', label: 'Woensdagochtend zonder afspraak.' },
      { id: 'b', label: 'Alleen na betaling door u van tevoren.' },
      { id: 'c', label: 'De loodgieter komt niet in de woning.' },
      { id: 'd', label: 'Dinsdag tussen 19:00 en 20:00.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze uitnodiging van de straatcommissie.',
    readHintEn: 'Read this invitation from the street committee.',
    passageNl:
      'Buurt BBQ op 6 juli 17:00 op het grasveld achter blok C. Neem uw eigen bord en bestek mee; vlees en vegetarisch wordt geregeld. Aanmelden vóór 1 juli bij Jan (jan@straat.nl) voor telling. Honden aan de lijn; geen vuurwerk.',
    passageEn:
      'Neighbourhood BBQ on 6 July 5:00 p.m. on the grass behind block C. Bring your own plate and cutlery; meat and vegetarian provided. Register before 1 July with Jan (jan@straat.nl) for numbers. Dogs on a lead; no fireworks.',
    questionNl: 'Wat moet u zelf meenemen?',
    questionEn: 'What must you bring yourself?',
    options: [
      { id: 'a', label: 'Alle drankjes en vlees.' },
      { id: 'b', label: 'Niets; alles wordt verzorgd.' },
      { id: 'c', label: 'Alleen vuurwerk voor het slot.' },
      { id: 'd', label: 'Eigen bord en bestek.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit briefje over snoeiwerk.',
    readHintEn: 'Read this pruning notice.',
    passageNl:
      'Wij snoeien de haag aan uw zijde op donderdag 8:00-10:00. Graag auto\'s even verplaatsen. Takken leggen wij bij de groencontainer; u mag ze ook zelf weghalen binnen twee dagen. Vragen? App naar 06-55443322 (Fam. De Vries).',
    passageEn:
      'We are pruning the hedge on your side on Thursday 8:00–10:00 a.m. Please move cars briefly. We put branches at the green bin; you may remove them yourself within two days. Questions? Message 06-55443322 (De Vries family).',
    questionNl: 'Wat vragen de buren u te doen op donderdagochtend?',
    questionEn: 'What do the neighbours ask you to do on Thursday morning?',
    options: [
      { id: 'a', label: 'Twee dagen wachten met weghalen takken.' },
      { id: 'b', label: 'De haag zelf snoeien zonder hulp.' },
      { id: 'c', label: 'Auto\'s even verplaatsen.' },
      { id: 'd', label: 'Groencontainer binnenbrengen.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze mededeling over een lift.',
    readHintEn: 'Read this lift notice.',
    passageNl:
      'Lift defect in portiek 2: monteur komt vrijdag. Gebruik de trap of portiek 1. Bewoners die niet trap kunnen lopen: bel beheer 088-7654321 voor hulp op vrijdag 09:00-12:00. Niet in de lift blijven hangen bij storing; gebruik de intercom.',
    passageEn:
      'Lift faulty in entrance 2: engineer comes Friday. Use stairs or entrance 1. Residents who cannot use stairs: call management 088-7654321 for help on Friday 9:00 a.m.–12:00 noon. Do not get stuck in lift during fault; use intercom.',
    questionNl: 'Wanneer kan beheer hulp bieden voor wie niet kan traplopen?',
    questionEn: 'When can management offer help for those who cannot use stairs?',
    options: [
      { id: 'a', label: 'Vrijdag 09:00-12:00 na bellen.' },
      { id: 'b', label: 'Elke avond zonder afspraak.' },
      { id: 'c', label: 'Alleen in portiek 2 met intercom.' },
      { id: 'd', label: 'Hulp is niet mogelijk volgens de mededeling.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit briefje over kattenvoer.',
    readHintEn: 'Read this note about cat food.',
    passageNl:
      'Beste buurman/buurvrouw, onze kat krijgt soms eten uit uw vensterbank. Graag geen melk of brood meer geven; alleen kattenvoer of niets. Bij vragen over onze kat Luna: bel 06-22110099. Dank u wel, familie Bakker 14a.',
    passageEn:
      'Dear neighbour, our cat sometimes gets food from your windowsill. Please do not give milk or bread anymore; only cat food or nothing. Questions about our cat Luna: call 06-22110099. Thank you, Bakker family 14a.',
    questionNl: 'Wat vragen de buren u niet meer te geven?',
    questionEn: 'What do the neighbours ask you not to give anymore?',
    options: [
      { id: 'a', label: 'Melk of brood.' },
      { id: 'b', label: 'Water op hete dagen.' },
      { id: 'c', label: 'Niets; de kat mag niets meer.' },
      { id: 'd', label: 'Alleen kattenvoer.' },
    ],
    correctOptionIds: ['a'],
  },
  // ─── Verzekering en bank (10) ───
  {
    introNl: 'Lees deze brief van de bank.',
    readHintEn: 'Read this letter from the bank.',
    passageNl:
      'Uw nieuwe betaalpas wordt binnen vijf werkdagen per post bezorgd. Activeer de pas via de app vóór eerste gebruik. Oude pas blijft tot activering geldig. Verlies of diefstal? Blokkeer direct via de app of bel 0800-BLOCK (24 uur).',
    passageEn:
      'Your new debit card will be delivered by post within five working days. Activate the card via the app before first use. Old card remains valid until activation. Loss or theft? Block immediately via the app or call 0800-BLOCK (24 hours).',
    questionNl: 'Wat moet u doen vóór u de nieuwe pas gebruikt?',
    questionEn: 'What must you do before using the new card?',
    options: [
      { id: 'a', label: 'Naar het filiaal met contant geld.' },
      { id: 'b', label: 'Niets; de pas werkt automatisch.' },
      { id: 'c', label: 'De oude pas direct vernietigen.' },
      { id: 'd', label: 'De pas activeren via de app.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht van uw verzekeraar.',
    readHintEn: 'Read this message from your insurer.',
    passageNl:
      'Autoverzekering: uw premie wijzigt per 1 maart naar € 78 per maand door schadevrije jaren. Schade melden binnen 48 uur via MijnVerzekering. Ruitschade zonder eigen risico bij erkende hersteller; lijst op de site onder Autoschade.',
    passageEn:
      'Car insurance: your premium changes from 1 March to €78 per month due to no-claims years. Report damage within 48 hours via MijnVerzekering. Windscreen damage without deductible at approved repairer; list on the site under Car damage.',
    questionNl: 'Binnen hoeveel tijd moet u schade melden?',
    questionEn: 'Within how much time must you report damage?',
    options: [
      { id: 'a', label: 'Melden is niet nodig volgens het bericht.' },
      { id: 'b', label: 'Binnen 48 uur.' },
      { id: 'c', label: 'Binnen zes maanden.' },
      { id: 'd', label: 'Alleen bij ruitschade direct.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze brief over inboedelverzekering.',
    readHintEn: 'Read this home contents insurance letter.',
    passageNl:
      'Uw inboedelverzekering dekt waterschade door leidingen, niet overstroming door rivier. Bij schade: foto\'s maken en inventarislijst sturen. Eigen risico € 150 per gebeurtenis. Nieuwe waarde tot € 25.000 voor elektronica; hoger bedrag apart verzekeren.',
    passageEn:
      'Your home contents insurance covers water damage from pipes, not river flooding. In case of damage: take photos and send inventory list. Deductible €150 per event. New-for-old up to €25,000 for electronics; higher amount insure separately.',
    questionNl: 'Wat is niet gedekt volgens de brief?',
    questionEn: 'What is not covered according to the letter?',
    options: [
      { id: 'a', label: 'Waterschade door leidingen.' },
      { id: 'b', label: 'Overstroming door rivier.' },
      { id: 'c', label: 'Schade aan elektronica tot € 25.000.' },
      { id: 'd', label: 'Foto\'s maken bij schade.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bankafschriftbericht.',
    readHintEn: 'Read this bank statement message.',
    passageNl:
      'Uw rekening is geblokkeerd wegens verdachte login uit het buitenland. Bevestig uw identiteit via de app met iDIN. Zonder actie binnen 7 dagen sluiten wij de rekening tijdelijk. Heeft u dit niet zelf gedaan? Bel fraudehelpdesk 088-0001111.',
    passageEn:
      'Your account is blocked due to suspicious login from abroad. Confirm your identity via the app with iDIN. Without action within 7 days we will temporarily close the account. Did you not do this yourself? Call fraud helpline 088-0001111.',
    questionNl: 'Wat moet u doen om de rekening te deblokkeren?',
    questionEn: 'What must you do to unblock the account?',
    options: [
      { id: 'a', label: 'Niets; de blokkade vervalt na 7 dagen.' },
      { id: 'b', label: 'Contant geld storten bij de automaat.' },
      { id: 'c', label: 'Een nieuwe rekening openen zonder controle.' },
      { id: 'd', label: 'Identiteit bevestigen via app met iDIN.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze brief over aansprakelijkheidsverzekering.',
    readHintEn: 'Read this liability insurance letter.',
    passageNl:
      'Claim fietsongeval: wij hebben uw melding ontvangen. Stuur binnen 14 dagen het schadeformulier en foto\'s van beide voertuigen. Tegenpartij is nog niet akkoord; wij bellen u na onderzoek. Tijdelijke vervangfiets zit niet in uw polis.',
    passageEn:
      'Bicycle accident claim: we have received your report. Send the claim form and photos of both vehicles within 14 days. Other party has not agreed yet; we will call you after investigation. Temporary replacement bike is not in your policy.',
    questionNl: 'Wat zit niet in uw polis volgens de brief?',
    questionEn: 'What is not in your policy according to the letter?',
    options: [
      { id: 'a', label: 'Foto\'s van beide voertuigen.' },
      { id: 'b', label: 'Onderzoek door de verzekeraar.' },
      { id: 'c', label: 'Schadeformulier indienen.' },
      { id: 'd', label: 'Tijdelijke vervangfiets.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht over spaarrente.',
    readHintEn: 'Read this savings interest message.',
    passageNl:
      'Spaarrente wijzigt per 1 april naar 1,25% op uw PlusSpaarrekening. Opnames blijven gratis. Minimaal saldo € 500 om rente te ontvangen. Vragen? Chat in de app of bel uw adviseur op werkdagen 09:00-17:00.',
    passageEn:
      'Savings rate changes from 1 April to 1.25% on your Plus savings account. Withdrawals remain free. Minimum balance €500 to receive interest. Questions? Chat in the app or call your adviser on weekdays 9:00 a.m.–5:00 p.m.',
    questionNl: 'Wat is het minimale saldo voor rente?',
    questionEn: 'What is the minimum balance for interest?',
    options: [
      { id: 'a', label: 'Het minimum staat niet in het bericht.' },
      { id: 'b', label: '€ 0 zonder minimum.' },
      { id: 'c', label: '€ 500.' },
      { id: 'd', label: '€ 10.000 alleen op werkdagen.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees deze brief over rechtsbijstand.',
    readHintEn: 'Read this legal assistance letter.',
    passageNl:
      'Uw rechtsbijstandverzekering dekt arbeidsconflicten na wachttijd van drie maanden. Gratis intake met jurist via 0900-LEGAL (€ 0,10/min). Let op: geschillen vóór afsluiten zijn uitgesloten. Polis verlengt automatisch tenzij u opzegt vóór 1 december.',
    passageEn:
      'Your legal assistance insurance covers employment disputes after a three-month waiting period. Free intake with lawyer via 0900-LEGAL (€0.10/min). Note: disputes before taking out the policy are excluded. Policy renews automatically unless you cancel before 1 December.',
    questionNl: 'Tot wanneer kunt u opzeggen om automatische verlenging te stoppen?',
    questionEn: 'Until when can you cancel to stop automatic renewal?',
    options: [
      { id: 'a', label: 'Vóór 1 december.' },
      { id: 'b', label: 'Na drie maanden wachttijd.' },
      { id: 'c', label: 'Opzeggen is niet mogelijk.' },
      { id: 'd', label: 'Alleen bij arbeidsconflict.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over hypotheek.',
    readHintEn: 'Read this mortgage message.',
    passageNl:
      'Rentevast periode eindigt op 1 september. U ontvangt een aanbod voor verlenging zes maanden van tevoren. Vergelijk ook andere aanbieders; overstappen kan met behoud van Nationale Hypotheek Garantie onder voorwaarden. Adviesgesprek gratis in filiaal; plan online.',
    passageEn:
      'Fixed-rate period ends on 1 September. You receive a renewal offer six months in advance. Also compare other offers; switching may keep National Mortgage Guarantee under conditions. Advice meeting free at branch; book online.',
    questionNl: 'Wanneer krijgt u een aanbod voor verlenging?',
    questionEn: 'When do you receive a renewal offer?',
    options: [
      { id: 'a', label: 'Op de laatste dag van de rentevast periode.' },
      { id: 'b', label: 'Pas na overstappen naar andere bank.' },
      { id: 'c', label: 'Er komt geen aanbod volgens het bericht.' },
      { id: 'd', label: 'Zes maanden van tevoren.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze brief over zorgverzekering aanvullend.',
    readHintEn: 'Read this supplementary health insurance letter.',
    passageNl:
      'Tandarts dekking 75% tot € 250 per jaar; orthodontie voor kinderen tot 18 jaar tot € 1.500. Declaratie binnen 90 dagen uploaden in de app. Geen declaratie? Dan geen vergoeding. Premie € 28,50 per maand, per maand opzegbaar met een maand opzegtermijn.',
    passageEn:
      'Dental cover 75% up to €250 per year; orthodontics for children until 18 up to €1,500. Submit claim within 90 days in the app. No claim? Then no reimbursement. Premium €28.50 per month, cancellable monthly with one month notice.',
    questionNl: 'Binnen hoeveel dagen moet u declareren?',
    questionEn: 'Within how many days must you submit a claim?',
    options: [
      { id: 'a', label: 'Declareren is niet nodig voor 75% dekking.' },
      { id: 'b', label: 'Alleen voor orthodontie binnen 30 dagen.' },
      { id: 'c', label: 'Binnen 90 dagen.' },
      { id: 'd', label: 'Binnen één jaar na behandeling.' },
    ],
    correctOptionIds: ['c'],
  },
  {
    introNl: 'Lees dit fraudewaarschuwingbericht van de bank.',
    readHintEn: 'Read this fraud warning from the bank.',
    passageNl:
      'Let op: criminelen bellen soms alsof zij van de bank zijn en vragen om uw pincode. Wij vragen nooit uw pin, wachtwoord of inlogcodes. Twijfel? Leg op en bel het nummer op uw pas. Deel nooit schermen via WhatsApp met onbekenden.',
    passageEn:
      'Warning: criminals sometimes call pretending to be the bank and ask for your PIN. We never ask for your PIN, password or login codes. In doubt? Hang up and call the number on your card. Never share screens via WhatsApp with strangers.',
    questionNl: 'Wat vraagt de bank nooit volgens het bericht?',
    questionEn: 'What does the bank never ask for according to the message?',
    options: [
      { id: 'a', label: 'Om WhatsApp te gebruiken met onbekenden.' },
      { id: 'b', label: 'Om terug te bellen via het nummer op uw pas.' },
      { id: 'c', label: 'Uw pincode of inlogcodes.' },
      { id: 'd', label: 'Om op te hangen bij twijfel.' },
    ],
    correctOptionIds: ['c'],
  },
  // ─── Overig (9) ───
  {
    introNl: 'Lees deze mededeling van de bibliotheek.',
    readHintEn: 'Read this library notice.',
    passageNl:
      'Bibliotheek Centrum: vanaf 1 juli nieuwe openingstijden ma-za 10:00-20:00, zo gesloten. Lidmaatschap gratis voor inwoners; aanmelden met ID. Maximaal 15 boeken, lenen 28 dagen. Reserveringen blijven op de balie afhalen; geen € 0,10 boete meer voor te laat tot september.',
    passageEn:
      'Central library: from 1 July new opening hours Mon–Sat 10:00 a.m.–8:00 p.m., Sun closed. Membership free for residents; register with ID. Maximum 15 books, loan 28 days. Reservations still collected at desk; no €0.10 fine for late until September.',
    questionNl: 'Wanneer is de bibliotheek op zondag open?',
    questionEn: 'When is the library open on Sunday?',
    options: [
      { id: 'a', label: '10:00-20:00 zoals op zaterdag.' },
      { id: 'b', label: 'Gesloten op zondag.' },
      { id: 'c', label: 'Alleen voor het afhalen van reserveringen.' },
      { id: 'd', label: 'De zondagtijden staan niet in de mededeling.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht van de sportschool.',
    readHintEn: 'Read this gym message.',
    passageNl:
      'FitCentrum: nieuwe roosters vanaf september. Yoga maandag 19:00, spinning dinsdag 18:30. Proefles gratis; daarna abonnement vanaf € 24,99 per maand. Handdoek verplicht; fles water alleen in de kleedkamer. Locker € 1 munt of app.',
    passageEn:
      'FitCentrum: new schedules from September. Yoga Monday 7:00 p.m., spinning Tuesday 6:30 p.m. Trial lesson free; then membership from €24.99 per month. Towel required; water bottle only in changing room. Locker €1 coin or app.',
    questionNl: 'Wat kost een abonnement vanaf?',
    questionEn: 'What does membership cost from?',
    options: [
      { id: 'a', label: '€ 1 per les zonder abonnement.' },
      { id: 'b', label: 'Gratis voor altijd na yoga.' },
      { id: 'c', label: 'De prijs staat niet in het bericht.' },
      { id: 'd', label: '€ 24,99 per maand na proefles.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees deze poster van het zwembad.',
    readHintEn: 'Read this swimming pool poster.',
    passageNl:
      'Zwembad De Golf: familiezwemmen zaterdag 14:00-17:00. Duikplank gesloten tijdens familiezwemmen. Kinderen onder 8 begeleiding verplicht. Dagkaart € 6,50; seizoenskaart € 120. Kluisje € 0,50; munt terug bij inleveren.',
    passageEn:
      'De Golf pool: family swim Saturday 2:00–5:00 p.m. Diving board closed during family swim. Children under 8 must be accompanied. Day ticket €6.50; season ticket €120. Locker €0.50; coin returned when handing in key.',
    questionNl: 'Wat is gesloten tijdens familiezwemmen?',
    questionEn: 'What is closed during family swim?',
    options: [
      { id: 'a', label: 'Alleen de kluisjes.' },
      { id: 'b', label: 'Niets; alles is open.' },
      { id: 'c', label: 'De hele hal inclusief kleedkamers.' },
      { id: 'd', label: 'De duikplank.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht van de voetbalclub.',
    readHintEn: 'Read this football club message.',
    passageNl:
      'VV Oranje: training jeugd woensdag verplaatst naar kunstgrasveld 2 om 17:00. Ouderportaal: aanwezigheid doorgeven vóór 12:00 op wednesday. Wedstrijd zondag 10:00; verzamelen 09:30 bij kleedkamer C. Scheidsrechter nog niet bevestigd.',
    passageEn:
      'VV Oranje: youth training Wednesday moved to artificial pitch 2 at 5:00 p.m. Parent portal: report attendance before 12:00 noon on Wednesday. Match Sunday 10:00 a.m.; meet 9:30 a.m. at changing room C. Referee not yet confirmed.',
    questionNl: 'Waar is de training op woensdag?',
    questionEn: 'Where is training on Wednesday?',
    options: [
      { id: 'a', label: 'De locatie wordt niet genoemd.' },
      { id: 'b', label: 'Kunstgrasveld 2 om 17:00.' },
      { id: 'c', label: 'Bij kleedkamer C om 09:30.' },
      { id: 'd', label: 'Op zondag om 10:00 voor de wedstrijd.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze mededeling van het buurthuis.',
    readHintEn: 'Read this community centre notice.',
    passageNl:
      'Buurthuis De Linde: cursus Nederlands A2 start 8 oktober, dinsdag en donderdag 19:00-21:00. Maximaal 14 deelnemers. Inschrijven bij de receptie met ID; kosten € 15 administratie. Proefles gratis op 1 oktober om 19:00.',
    passageEn:
      'Community centre De Linde: Dutch A2 course starts 8 October, Tuesday and Thursday 7:00–9:00 p.m. Maximum 14 participants. Register at reception with ID; cost €15 administration. Free trial lesson 1 October at 7:00 p.m.',
    questionNl: 'Wanneer is de gratis proefles?',
    questionEn: 'When is the free trial lesson?',
    options: [
      { id: 'a', label: 'Op 1 oktober om 19:00.' },
      { id: 'b', label: 'Op 8 oktober bij start van de cursus.' },
      { id: 'c', label: 'Elke dinsdag zonder inschrijving.' },
      { id: 'd', label: 'Er is geen proefles volgens de mededeling.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht van het theater.',
    readHintEn: 'Read this theatre message.',
    passageNl:
      'Voorstelling De Kleine Prins: aanvang 20:00, deuren open 19:30. Late comers worden niet toegelaten na start. Kaarten tonen op telefoon of print. Garderobe € 1; jassen niet in de zaal. Vragen? Kassa open vanaf 18:00.',
    passageEn:
      'Performance The Little Prince: start 8:00 p.m., doors open 7:30 p.m. Latecomers are not admitted after the start. Show tickets on phone or print. Cloakroom €1; no coats in the auditorium. Questions? Box office open from 6:00 p.m.',
    questionNl: 'Wat gebeurt er als u na de start binnenkomt?',
    questionEn: 'What happens if you enter after the start?',
    options: [
      { id: 'a', label: 'U wordt niet toegelaten.' },
      { id: 'b', label: 'U betaalt dubbele prijs aan de kassa.' },
      { id: 'c', label: 'De tekst zegt niets over te laat komen.' },
      { id: 'd', label: 'U mag plaatsnemen in een lege rij.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze poster van het recyclagepark.',
    readHintEn: 'Read this recycling centre poster.',
    passageNl:
      'Recyclagepark: gratis voor inwoners met pas. Niet-inwoners betalen € 12 per bezoek. Open ma-zo 08:00-17:00. Elektronica apart inleveren bij container E. Medewerkers helpen met zware spullen; vraag hulp bij de poort.',
    passageEn:
      'Recycling centre: free for residents with pass. Non-residents pay €12 per visit. Open Mon–Sun 8:00 a.m.–5:00 p.m. Hand in electronics separately at container E. Staff help with heavy items; ask for help at the gate.',
    questionNl: 'Hoeveel betalen niet-inwoners per bezoek?',
    questionEn: 'How much do non-residents pay per visit?',
    options: [
      { id: 'a', label: '€ 12 alleen voor elektronica.' },
      { id: 'b', label: 'Het bedrag staat niet op de poster.' },
      { id: 'c', label: 'Gratis met pas.' },
      { id: 'd', label: '€ 12 per bezoek.' },
    ],
    correctOptionIds: ['d'],
  },
  {
    introNl: 'Lees dit bericht van de kinderopvang.',
    readHintEn: 'Read this childcare message.',
    passageNl:
      'Kinderopvang Zonnetje: extra sluitingsdag vrijdag 24 mei wegens teamdag. Alternatief: opvang bij vestiging West indien plaats vrij; meld vóór 20 mei. Maaltijd op die dag alleen vegetarisch. Bij ziekte kind: bellen vóór 09:00.',
    passageEn:
      'Sunshine childcare: extra closing day Friday 24 May due to team day. Alternative: care at West branch if space available; notify before 20 May. Meal that day vegetarian only. If child is ill: call before 9:00 a.m.',
    questionNl: 'Tot wanneer moet u melden voor opvang bij vestiging West?',
    questionEn: 'Until when must you notify for care at West branch?',
    options: [
      { id: 'a', label: 'Melden is niet nodig voor alternatief.' },
      { id: 'b', label: 'Vóór 20 mei.' },
      { id: 'c', label: 'Op 24 mei om 09:00.' },
      { id: 'd', label: 'Na de teamdag in juni.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze mededeling van het informatiecentrum.',
    readHintEn: 'Read this information centre notice.',
    passageNl:
      'VVV/Informatiecentrum: gratis plattegronden en fietsroutes. Rondleiding stad elke zaterdag 11:00; vertrek bij de kerk. Taal: Nederlands en Engels. Reserveren niet nodig; maximaal 20 personen. Bij regen: aangepaste route via overdekte passages.',
    passageEn:
      'Tourist info: free maps and cycling routes. City tour every Saturday 11:00 a.m.; departure at the church. Language: Dutch and English. Booking not required; maximum 20 people. In rain: adapted route via covered passages.',
    questionNl: 'Waar begint de rondleiding?',
    questionEn: 'Where does the tour start?',
    options: [
      { id: 'a', label: 'Bij de kerk om 11:00 op zaterdag.' },
      { id: 'b', label: 'Bij het station om 09:00.' },
      { id: 'c', label: 'Alleen na online reservering.' },
      { id: 'd', label: 'Het vertrekpunt staat niet in de mededeling.' },
    ],
    correctOptionIds: ['a'],
  },
]
