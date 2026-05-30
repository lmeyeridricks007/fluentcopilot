export const header = '// ─── Workplace (12) ─────────────────────────────────────────────────────────'
export const category = 'workplace'
export const items = [
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
      { id: 'a', label: 'In de kantine om 08:00.' },
      { id: 'b', label: 'Donderdag 09:00 in vergaderzaal Atlas.' },
      { id: 'c', label: 'In hal B zonder agenda.' },
      { id: 'd', label: 'De locatie staat niet in de mededeling.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op dinsdag en woensdag.' },
      { id: 'b', label: 'Op donderdag.' },
      { id: 'c', label: 'De hele week 24.' },
      { id: 'd', label: 'Het rooster noemt geen vrije dag voor Ahmed.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Handschoenen bij zware lasten.' },
      { id: 'b', label: 'Roken op het hele terrein.' },
      { id: 'c', label: 'Melden van bijna-ongevallen.' },
      { id: 'd', label: 'Vrije looproutes in het magazijn.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op 10 juli na vragen.' },
      { id: 'b', label: 'Op 24 juli.' },
      { id: 'c', label: 'Pas na akkoord per post.' },
      { id: 'd', label: 'De datum staat niet in de mededeling.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Op de eerste cursusdag zonder aanmelding.' },
      { id: 'b', label: 'Vóór 1 november via HR.' },
      { id: 'c', label: 'Alleen via uw leidinggevende na afwezigheid.' },
      { id: 'd', label: 'Inschrijven is niet nodig; iedereen gaat automatisch.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen contant geld € 120.' },
      { id: 'b', label: 'Uw oude werkschoenen om in te leveren.' },
      { id: 'c', label: 'Een doktersverklaring voor uw maat.' },
      { id: 'd', label: 'Niets; schoenen zijn vrij te pakken.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Zaterdag 22:00 tot zondag 06:00.' },
      { id: 'b', label: 'Elke avond na 17:00.' },
      { id: 'c', label: 'Alleen op werkdagen tijdens lunch.' },
      { id: 'd', label: 'De tekst noemt geen onderhoudsperiode.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Minimaal drie weken van tevoren.' },
      { id: 'b', label: 'Op de dag van vertrek.' },
      { id: 'c', label: 'Een jaar van tevoren verplicht.' },
      { id: 'd', label: 'Aanvragen is niet nodig in juli.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Tot 18:30 bij aankomst.' },
      { id: 'b', label: 'Tot 22:00 uur.' },
      { id: 'c', label: 'De hele avond inclusief na 23:00.' },
      { id: 'd', label: 'Er zijn geen gratis drankjes.' },
    ],
    correctOptionIds: ['b'],
  },
]
