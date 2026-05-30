export const header = '// ─── Misc library/sports/other (9) ──────────────────────────────────────────'
export const category = 'misc'
export const items = [
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
      { id: 'a', label: '€ 24,99 per maand na proefles.' },
      { id: 'b', label: '€ 1 per les zonder abonnement.' },
      { id: 'c', label: 'Gratis voor altijd na yoga.' },
      { id: 'd', label: 'De prijs staat niet in het bericht.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'De hele hal inclusief kleedkamers.' },
      { id: 'b', label: 'De duikplank.' },
      { id: 'c', label: 'Alleen de kluisjes.' },
      { id: 'd', label: 'Niets; alles is open.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Kunstgrasveld 2 om 17:00.' },
      { id: 'b', label: 'Bij kleedkamer C om 09:30.' },
      { id: 'c', label: 'Op zondag om 10:00 voor de wedstrijd.' },
      { id: 'd', label: 'De locatie wordt niet genoemd.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'U mag plaatsnemen in een lege rij.' },
      { id: 'b', label: 'U wordt niet toegelaten.' },
      { id: 'c', label: 'U betaalt dubbele prijs aan de kassa.' },
      { id: 'd', label: 'De tekst zegt niets over te laat komen.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Gratis met pas.' },
      { id: 'b', label: '€ 12 per bezoek.' },
      { id: 'c', label: '€ 12 alleen voor elektronica.' },
      { id: 'd', label: 'Het bedrag staat niet op de poster.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Vóór 20 mei.' },
      { id: 'b', label: 'Op 24 mei om 09:00.' },
      { id: 'c', label: 'Na de teamdag in juni.' },
      { id: 'd', label: 'Melden is niet nodig voor alternatief.' },
    ],
    correctOptionIds: ['a'],
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
