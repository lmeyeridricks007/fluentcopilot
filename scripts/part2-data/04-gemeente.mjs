export const header = '// ─── Municipal/gemeente letters (14) ────────────────────────────────────────'
export const category = 'gemeente'
export const items = [
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
      { id: 'a', label: 'Contant aan de balie zonder afspraak.' },
      { id: 'b', label: 'Via iDEAL op gemeente.nl/parkeer.' },
      { id: 'c', label: 'Automatisch van uw rekening zonder actie.' },
      { id: 'd', label: 'Het restbedrag hoeft niet betaald te worden.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op dinsdag zoals voorheen.' },
      { id: 'b', label: 'Op woensdag.' },
      { id: 'c', label: 'Elke dag van de week.' },
      { id: 'd', label: 'GFT wordt niet meer opgehaald.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Gratis voor inwoners onder 25 jaar.' },
      { id: 'b', label: '€52,10.' },
      { id: 'c', label: '€120 alleen bij het CBR.' },
      { id: 'd', label: 'De kosten staan niet in de brief.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op 18 juni na bezwaren van buren.' },
      { id: 'b', label: 'Uiterlijk 8 juli.' },
      { id: 'c', label: 'Direct na indienen van de aanvraag.' },
      { id: 'd', label: 'Er is geen uiterste datum genoemd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Vóór 31 mei.' },
      { id: 'b', label: 'Vóór 1 januari 2026.' },
      { id: 'c', label: 'Betaling is optioneel dit jaar.' },
      { id: 'd', label: 'De datum staat niet in de brief.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Omdat de school te ver weg is boven 6 km.' },
      { id: 'b', label: 'Omdat de afstand 4,2 km is, onder de drempel.' },
      { id: 'c', label: 'Omdat er geen medische onderbouning was.' },
      { id: 'd', label: 'De brief geeft geen reden.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Uiterlijk 07:00 op de ophaaldag.' },
      { id: 'b', label: 'Na 18:00 de avond ervoor.' },
      { id: 'c', label: 'Elke tijd is goed op de ophaaldag.' },
      { id: 'd', label: 'De tijd wordt niet genoemd.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Tot 1 maart 2026.' },
      { id: 'b', label: 'Binnen één week na ontvangst.' },
      { id: 'c', label: 'Bezwaar is niet mogelijk volgens de brief.' },
      { id: 'd', label: 'De termijn staat niet in de tekst.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Binnen één week.' },
      { id: 'b', label: 'Binnen zes maanden.' },
      { id: 'c', label: 'Alleen bij einde van het jaar.' },
      { id: 'd', label: 'Doorgeven is niet nodig volgens de brief.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Eén dag op 10 juni.' },
      { id: 'b', label: 'Van 10 tot en met 14 juni.' },
      { id: 'c', label: 'De hele maand juni zonder uitzondering.' },
      { id: 'd', label: 'De duur wordt niet genoemd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen een ouder; het kind hoeft niet.' },
      { id: 'b', label: 'Het kind zelf moet aanwezig zijn.' },
      { id: 'c', label: 'Alleen de gemachtigde volwassene.' },
      { id: 'd', label: 'De brief noemt geen regels voor kinderen.' },
    ],
    correctOptionIds: ['b'],
  },
]
