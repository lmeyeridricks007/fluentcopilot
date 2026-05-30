export const header = '// ─── OV/transit announcements (14) ──────────────────────────────────────────'
export const category = 'ov_transit'
export const items = [
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
      { id: 'a', label: 'Tot maandagochtend 08:00 uur.' },
      { id: 'b', label: 'Tot vrijdag 18:00 uur.' },
      { id: 'c', label: 'Permanent; er komt geen nieuwe lift.' },
      { id: 'd', label: 'De tekst noemt geen einddatum.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op de oude plek bij Parkweg 12.' },
      { id: 'b', label: 'Bij de hoek Parkweg en Dorpsstraat.' },
      { id: 'c', label: 'Alleen bij het busstation centrum.' },
      { id: 'd', label: 'Lijn 15 rijdt niet meer in de wijk.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Van spoor 4 naar Rotterdam.' },
      { id: 'b', label: 'Van spoor 7a met vertraging.' },
      { id: 'c', label: 'Van spoor 9, de sprinter.' },
      { id: 'd', label: 'De tekst noemt geen spoor voor Den Haag.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Ze krijgen een gratis slot van de beheerder.' },
      { id: 'b', label: 'Ze worden verwijderd.' },
      { id: 'c', label: 'Ze mogen blijven staan met dagkaart.' },
      { id: 'd', label: 'De tekst zegt niets over sloten.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Tot 00:15 uur samen met fietsers.' },
      { id: 'b', label: 'Uiterlijk om 23:30 aan boord.' },
      { id: 'c', label: 'De hele nacht bij gunstig weer.' },
      { id: 'd', label: 'Auto\'s zijn vandaag niet toegestaan.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Bus 15 via de Dorpsstraat.' },
      { id: 'b', label: 'Bus 38 elk kwartier.' },
      { id: 'c', label: 'Geen bus; alleen lopen.' },
      { id: 'd', label: 'Tram 21 via Eendrachtsplein.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Overdag tussen 6 en 10 mei.' },
      { id: 'b', label: 'Van 22:00 tot 05:00 tussen 6 en 10 mei.' },
      { id: 'c', label: 'Alleen in het weekend overdag.' },
      { id: 'd', label: 'De hele week zonder treinen.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Met de sprinter die in Hattem stopt.' },
      { id: 'b', label: 'Uitstappen in Zwolle en bus 203 nemen.' },
      { id: 'c', label: 'Met de taxi bij uitgang West.' },
      { id: 'd', label: 'De trein stopt toch in Hattem.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Bus 22 nemen naar het park.' },
      { id: 'b', label: 'Nachtbus N14 gebruiken.' },
      { id: 'c', label: 'Uitstappen bij Van Hallstraat.' },
      { id: 'd', label: 'Zes minuten lopen naar het park.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Bij rij 2 voor regulier verkeer.' },
      { id: 'b', label: 'Bij rij 1 met uw naam op het bord.' },
      { id: 'c', label: 'Bij de bushalte voor lijn 397.' },
      { id: 'd', label: 'Reserveringen zijn niet mogelijk op Schiphol.' },
    ],
    correctOptionIds: ['b'],
  },
]
