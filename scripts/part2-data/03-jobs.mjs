export const header = '// ─── Job ads (12) ───────────────────────────────────────────────────────────'
export const category = 'job_ads'
export const items = [
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
      { id: 'a', label: 'Alleen een kopie van uw diploma.' },
      { id: 'b', label: 'Cv en korte motivatie.' },
      { id: 'c', label: 'Een referentie van uw huisarts.' },
      { id: 'd', label: 'Niets; u kunt telefonisch solliciteren zonder cv.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Elke dag tussen 17:00 en sluit.' },
      { id: 'b', label: 'Op dinsdag tussen 14:00 en 16:00.' },
      { id: 'c', label: 'Alleen op zaterdagochtend.' },
      { id: 'd', label: 'Langskomen is niet mogelijk volgens de advertentie.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Naar vacatures@zorgmidden.nl met referentie ZM-882.' },
      { id: 'b', label: 'Per post naar het hoofdkantoor in Amsterdam.' },
      { id: 'c', label: 'Alleen via een uitzendbureau zonder referentie.' },
      { id: 'd', label: 'De advertentie noemt geen e-mailadres.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Vijf dagen, volledig thuis.' },
      { id: 'b', label: 'Maximaal twee dagen per week.' },
      { id: 'c', label: 'Thuiswerken is niet toegestaan.' },
      { id: 'd', label: 'De advertentie noemt geen thuiswerkdagen.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Om 06:00 uur, maandag tot vrijdag.' },
      { id: 'b', label: 'Om 14:00 uur in het weekend.' },
      { id: 'c', label: 'Om 22:00 uur voor nachtdienst.' },
      { id: 'd', label: 'De tijden staan niet in de advertentie.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Alleen werken op doordeweekse ochtenden.' },
      { id: 'b', label: 'Weekendwerk.' },
      { id: 'c', label: 'Een diploma in logistiek.' },
      { id: 'd', label: 'Fulltime 40 uur zonder uitzondering.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: '€75 toeslag per on-call weekend.' },
      { id: 'b', label: 'Gratis lunch de hele maand.' },
      { id: 'c', label: 'Geen toeslag; het is vrijwillig.' },
      { id: 'd', label: 'De advertentie noemt geen vergoeding.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Alleen online zonder locatie.' },
      { id: 'b', label: 'Op locatie in Eindhoven.' },
      { id: 'c', label: 'In Amsterdam bij het hoofdkantoor.' },
      { id: 'd', label: 'De locatie wordt niet genoemd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Reageren met cv en portfolio-link.' },
      { id: 'b', label: 'Open sollicitaties zonder vacature.' },
      { id: 'c', label: 'Stage als eerste ervaring noemen.' },
      { id: 'd', label: 'Reageren vóór 20 mei.' },
    ],
    correctOptionIds: ['b'],
  },
]
