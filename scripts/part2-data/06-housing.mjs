export const header = '// ─── Housing (12) ───────────────────────────────────────────────────────────'
export const category = 'housing'
export const items = [
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
      { id: 'a', label: 'U moet € 38 bijbetalen in juli.' },
      { id: 'b', label: '€ 38 wordt in juni teruggestort.' },
      { id: 'c', label: 'Het bedrag vervalt zonder terugbetaling.' },
      { id: 'd', label: 'De brief noemt geen terugbetaling.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen lift A zonder beperking.' },
      { id: 'b', label: 'Lift B of de trap.' },
      { id: 'c', label: 'Geen lift; alleen de nooduitgang.' },
      { id: 'd', label: 'De tekst noemt geen alternatief.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Parkeren door bewoners na 22:00.' },
      { id: 'b', label: 'Parkeren door niet-bewoners na 22:00.' },
      { id: 'c', label: 'Deelnemen aan de vergadering.' },
      { id: 'd', label: 'Praten over dakrenovatie.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op de dag zelf zonder voorafgaand bericht.' },
      { id: 'b', label: 'Een week van tevoren.' },
      { id: 'c', label: 'Pas na afloop van het werk in oktober.' },
      { id: 'd', label: 'De aannemer belt niet; u moet zelf bellen.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'De monteur annuleren per e-mail.' },
      { id: 'b', label: 'Een sleutel bij de receptie achterlaten.' },
      { id: 'c', label: 'Niets; de monteur forceert de deur.' },
      { id: 'd', label: 'De lekkage zelf repareren.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Dozen of fietsen.' },
      { id: 'b', label: 'Schoonmaakmiddelen van de beheerder.' },
      { id: 'c', label: 'Bewoners die voorzichtig lopen.' },
      { id: 'd', label: 'Meldingen via het portaal.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Op de verhuisdag zelf contant.' },
      { id: 'b', label: 'Binnen 14 dagen na oplevering.' },
      { id: 'c', label: 'Pas na een jaar zonder rekeningnummer.' },
      { id: 'd', label: 'De waarborgsom wordt nooit terugbetaald.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Huisdieren vrij laten in de kruipruimte.' },
      { id: 'b', label: 'Melden vóór 12 mei bij de beheerder.' },
      { id: 'c', label: 'Niets; behandeling geldt niet voor blok C.' },
      { id: 'd', label: 'Voedsel open laten staan.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Ramen openzetten voor ventilatie.' },
      { id: 'b', label: 'Ramen sluiten en geen planten op de vensterbank.' },
      { id: 'c', label: 'Onder de gevel parkeren voor toezicht.' },
      { id: 'd', label: 'Schade melden na twee weken.' },
    ],
    correctOptionIds: ['b'],
  },
]
