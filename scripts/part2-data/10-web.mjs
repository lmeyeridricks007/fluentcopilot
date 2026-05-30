export const header = '// ─── Web pages (10) ─────────────────────────────────────────────────────────'
export const category = 'web_pages'
export const items = [
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
      { id: 'a', label: 'Binnen vier weken.' },
      { id: 'b', label: 'Binnen één week na jaarwisseling.' },
      { id: 'c', label: 'Alleen bij verhuizing na een jaar.' },
      { id: 'd', label: 'Doorgeven is niet nodig volgens de pagina.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Na de vervaldatum binnen een maand.' },
      { id: 'b', label: 'Vóór de vervaldatum van de vergunning.' },
      { id: 'c', label: 'Alleen na de biometrie zonder deadline.' },
      { id: 'd', label: 'De pagina noemt geen termijn.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Tot 1 februari.' },
      { id: 'b', label: 'Tot 31 december van elk jaar zonder uitzondering.' },
      { id: 'c', label: 'Alleen in de zomerperiode.' },
      { id: 'd', label: 'Overstappen is niet mogelijk volgens de pagina.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Binnen een maand stopzetten melden bij DUO.' },
      { id: 'b', label: 'Niets; de lening vervalt automatisch.' },
      { id: 'c', label: 'Direct het maximale bedrag verhogen.' },
      { id: 'd', label: 'Ouderinkomen opnieuw laten keuren.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Maandag de hele dag.' },
      { id: 'b', label: 'Di-zo 10:00-17:00.' },
      { id: 'c', label: 'Alleen op afspraak voor asbest.' },
      { id: 'd', label: '24 uur per dag voor inwoners.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Binnen zes weken.' },
      { id: 'b', label: 'Binnen twee werkdagen.' },
      { id: 'c', label: 'Binnen zes maanden na bezwaar.' },
      { id: 'd', label: 'Er is geen reactietermijn genoemd.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Registreren op 112.nl/sms.' },
      { id: 'b', label: 'De huisartsenpost bellen.' },
      { id: 'c', label: 'Niets; sms werkt altijd zonder registratie.' },
      { id: 'd', label: 'Een e-mail sturen naar de politie.' },
    ],
    correctOptionIds: ['a'],
  },
]
