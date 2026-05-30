export const header = '// ─── News (10) ────────────────────────────────────────────────────────────────'
export const category = 'news'
export const items = [
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
      { id: 'a', label: 'Bij elke vertraging van vijf minuten.' },
      { id: 'b', label: 'Bij vertraging boven 30 minuten.' },
      { id: 'c', label: 'Alleen met code rood voor wind.' },
      { id: 'd', label: 'Gratis reizen is niet mogelijk volgens het bericht.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen in het westen bij de kust.' },
      { id: 'b', label: 'Op bruggen en viaducten in het oosten.' },
      { id: 'c', label: 'Nergens; het blijft de hele dag mistig.' },
      { id: 'd', label: 'Alleen op binnenwegen zonder snelweg.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Uiterlijk 13:45 via ingang Zuid.' },
      { id: 'b', label: 'Om 14:30 bij aanvang van de wedstrijd.' },
      { id: 'c', label: 'Zij mogen niet naar de wedstrijd.' },
      { id: 'd', label: 'De tekst noemt geen tijd voor supporters.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: '€ 12,00 zonder verhoging.' },
      { id: 'b', label: '€ 14,06 bruto per uur.' },
      { id: 'c', label: '€ 18,00 alleen voor jongeren.' },
      { id: 'd', label: 'Het bedrag staat niet in het bericht.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'De linkerrijstrook richting Utrecht.' },
      { id: 'b', label: 'De rechterrijstrook.' },
      { id: 'c', label: 'Alle rijstroken zonder omleiding.' },
      { id: 'd', label: 'De tekst noemt geen gesloten strook.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Naar school gaan voor thuisles.' },
      { id: 'b', label: 'Huisarts bellen en thuisblijven.' },
      { id: 'c', label: 'Direct naar het ziekenhuis zonder bellen.' },
      { id: 'd', label: 'Niets; mazelen zijn niet besmettelijk.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op 12 februari in wijkcentrum De Anker.' },
      { id: 'b', label: 'In maart 2026 bij start bouw.' },
      { id: 'c', label: 'Eind 2027 bij oplevering.' },
      { id: 'd', label: 'Er is geen avond gepland.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Houtkachel stoken de hele dag.' },
      { id: 'b', label: 'Barbecueen op gas.' },
      { id: 'c', label: 'Tuinvuren met snoeiafval.' },
      { id: 'd', label: 'Alles is verboden inclusief gas.' },
    ],
    correctOptionIds: ['b'],
  },
]
