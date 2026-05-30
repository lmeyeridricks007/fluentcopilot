export const header = '// ─── School notices/mail (14) ───────────────────────────────────────────────'
export const category = 'school_notices'
export const items = [
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
      { id: 'a', label: 'Op maandag samen met rekenen.' },
      { id: 'b', label: 'Op woensdag.' },
      { id: 'c', label: 'Op vrijdag zonder schema.' },
      { id: 'd', label: 'De dag staat niet in het briefje.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Ja, anders mag u niet binnen.' },
      { id: 'b', label: 'Nee, maar het helpt voor het lunchbuffet.' },
      { id: 'c', label: 'Alleen voor de workshop techniek.' },
      { id: 'd', label: 'De tekst zegt niets over aanmelden.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Het werk wordt niet beoordeeld.' },
      { id: 'b', label: 'Één punt aftrek per dag.' },
      { id: 'c', label: 'U krijgt automatisch een 10.' },
      { id: 'd', label: 'Er is geen sanctie genoemd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen zwemkleding en een handdoek.' },
      { id: 'b', label: 'Gymkleding, witte schoenen en waterfles.' },
      { id: 'c', label: 'Sieraden voor tijdens de warming-up.' },
      { id: 'd', label: 'Niets; alles wordt door school geleverd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op vrijdag 11 oktober in de middag.' },
      { id: 'b', label: 'Maandag 14 oktober.' },
      { id: 'c', label: 'Pas na de kerstvakantie.' },
      { id: 'd', label: 'De tekst noemt geen datum voor normaal les.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Om 07:35 vanaf Halte Park.' },
      { id: 'b', label: 'Om 08:00 zonder wijziging.' },
      { id: 'c', label: 'Om 07:00 alleen in de vakantie.' },
      { id: 'd', label: 'Het vertrektijdstip staat niet in de tekst.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Op maandag tijdens de pauze.' },
      { id: 'b', label: 'Op donderdag via het schoolscherm.' },
      { id: 'c', label: 'Direct na elke stem in de aula.' },
      { id: 'd', label: 'De tekst noemt geen datum voor het resultaat.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alle leerlingen zonder uitzondering.' },
      { id: 'b', label: 'Leerlingen zonder schooltoelaag.' },
      { id: 'c', label: 'Alleen leerlingen in groep 8.' },
      { id: 'd', label: 'Niemand; het is altijd gratis.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Vóór 08:30 via de app SchoolGate.' },
      { id: 'b', label: 'Alleen na drie dagen per telefoon.' },
      { id: 'c', label: 'Door medicijnen mee te geven aan de juf.' },
      { id: 'd', label: 'Afwezigheid melden is niet nodig.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: '€0,10 per boek per dag.' },
      { id: 'b', label: '€5,00 ongeacht het aantal dagen.' },
      { id: 'c', label: 'Niets; te laat is altijd gratis.' },
      { id: 'd', label: 'De boete staat niet in de tekst.' },
    ],
    correctOptionIds: ['a'],
  },
]
