export const header = '// ─── Neighbor notices (8) ───────────────────────────────────────────────────'
export const category = 'neighbor_notices'
export const items = [
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
      { id: 'a', label: 'Tot ongeveer 23:00 uur.' },
      { id: 'b', label: 'Tot 06:00 de volgende ochtend.' },
      { id: 'c', label: 'Alleen tot 18:00 zonder muziek.' },
      { id: 'd', label: 'De tijd staat niet in het briefje.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'De deur open laten zonder briefje.' },
      { id: 'b', label: 'Briefje met telefoonnummer op de deur hangen.' },
      { id: 'c', label: '112 bellen bij rookmelder.' },
      { id: 'd', label: 'Niets; de brandweer komt niet binnen.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Dinsdag tussen 19:00 en 20:00.' },
      { id: 'b', label: 'Woensdagochtend zonder afspraak.' },
      { id: 'c', label: 'Alleen na betaling door u van tevoren.' },
      { id: 'd', label: 'De loodgieter komt niet in de woning.' },
    ],
    correctOptionIds: ['a'],
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
      { id: 'a', label: 'Alleen vuurwerk voor het slot.' },
      { id: 'b', label: 'Eigen bord en bestek.' },
      { id: 'c', label: 'Alle drankjes en vlees.' },
      { id: 'd', label: 'Niets; alles wordt verzorgd.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'De haag zelf snoeien zonder hulp.' },
      { id: 'b', label: 'Auto\'s even verplaatsen.' },
      { id: 'c', label: 'Groencontainer binnenbrengen.' },
      { id: 'd', label: 'Twee dagen wachten met weghalen takken.' },
    ],
    correctOptionIds: ['b'],
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
      { id: 'a', label: 'Alleen kattenvoer.' },
      { id: 'b', label: 'Melk of brood.' },
      { id: 'c', label: 'Water op hete dagen.' },
      { id: 'd', label: 'Niets; de kat mag niets meer.' },
    ],
    correctOptionIds: ['b'],
  },
]
