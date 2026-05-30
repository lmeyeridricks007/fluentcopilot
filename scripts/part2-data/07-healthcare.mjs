export const header = '// ─── Healthcare (12) ────────────────────────────────────────────────────────'
export const category = 'healthcare'
export const items = [
  {
    introNl: 'Lees deze brief van het ziekenhuis.',
    readHintEn: 'Read this hospital letter.',
    passageNl:
      'Uw afspraak bij de polikliniek oog is verplaatst naar 18 oktober om 09:15, ingang B verdieping 3. Kom vijftien minuten eerder voor het meten van uw oogdruk. Neem uw medicatielijst en zorgpas mee. Parkeren kan in garage P2; eerste 30 minuten gratis met validatie bij de balie.',
    passageEn:
      'Your ophthalmology outpatient appointment has been moved to 18 October at 9:15 a.m., entrance B floor 3. Come fifteen minutes early for eye pressure measurement. Bring your medication list and health insurance card. Parking in garage P2; first 30 minutes free with validation at the desk.',
    questionNl: 'Waar moet u zijn voor de afspraak?',
    questionEn: 'Where must you be for the appointment?',
    options: [
      { id: 'a', label: 'Ingang A op de begane grond.' },
      { id: 'b', label: 'Ingang B, verdieping 3.' },
      { id: 'c', label: 'Alleen in garage P2 zonder polikliniek.' },
      { id: 'd', label: 'De locatie staat niet in de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bericht van de tandarts.',
    readHintEn: 'Read the dentist message.',
    passageNl:
      'Controle-afspraak 12 maart om 11:00 bij tandartspraktijk Smile. Bij annuleren binnen 24 uur worden kosten in rekening gebracht. Nieuwe patiënten: vul het formulier op de website in vóór het bezoek. Geen pin? Betaal contant aan de balie.',
    passageEn:
      'Check-up appointment 12 March at 11:00 a.m. at Smile dental practice. Cancellation within 24 hours incurs a charge. New patients: complete the form on the website before the visit. No debit card? Pay cash at the desk.',
    questionNl: 'Wanneer krijgt u kosten bij annuleren?',
    questionEn: 'When do you incur costs if you cancel?',
    options: [
      { id: 'a', label: 'Als u een week van tevoren annuleert.' },
      { id: 'b', label: 'Binnen 24 uur voor de afspraak.' },
      { id: 'c', label: 'Annuleren is altijd gratis.' },
      { id: 'd', label: 'Alleen als u contant betaalt.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over vaccinatie.',
    readHintEn: 'Read the vaccination letter.',
    passageNl:
      'U bent uitgenodigd voor de griepprik op 9 oktober tussen 13:00 en 16:00 in wijkcentrum De Brug. Neem uw zorgpas mee. Zonder afspraak is wachten mogelijk maar niet gegarandeerd. Na de prik blijft u vijftien minuten ter observatie.',
    passageEn:
      'You are invited for the flu jab on 9 October between 1:00 p.m. and 4:00 p.m. at community centre De Brug. Bring your health insurance card. Without appointment waiting is possible but not guaranteed. After the jab stay fifteen minutes for observation.',
    questionNl: 'Hoe lang blijft u na de prik ter observatie?',
    questionEn: 'How long do you stay for observation after the jab?',
    options: [
      { id: 'a', label: 'Vijftien minuten.' },
      { id: 'b', label: 'Een uur verplicht in het ziekenhuis.' },
      { id: 'c', label: 'U mag direct vertrekken zonder wachten.' },
      { id: 'd', label: 'De tijd wordt niet genoemd.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht van de fysiotherapeut.',
    readHintEn: 'Read this physiotherapist message.',
    passageNl:
      'Uw verwijzing is 6 behandelingen. Eerste afspraak dinsdag 10:00; kom in sportkleding. Niet komen zonder afzeggen? Dan vervalt het tijdslot. Eigen risico kan van toepassing zijn; check uw polis bij de zorgverzekeraar. Parkeerplaats achter de praktijk is gratis.',
    passageEn:
      'Your referral is for 6 treatments. First appointment Tuesday 10:00 a.m.; come in sports clothes. No-show without cancelling? The slot is forfeited. Own risk may apply; check your policy with your insurer. Parking behind the practice is free.',
    questionNl: 'Wat gebeurt er als u niet komt zonder af te zeggen?',
    questionEn: 'What happens if you do not come without cancelling?',
    options: [
      { id: 'a', label: 'U krijgt automatisch een nieuw tijdslot.' },
      { id: 'b', label: 'Het tijdslot vervalt.' },
      { id: 'c', label: 'De behandeling wordt gratis verlengd.' },
      { id: 'd', label: 'Er is geen regel over afzeggen.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over eigen risico.',
    readHintEn: 'Read the letter about the deductible.',
    passageNl:
      'Zorgverzekeraar: uw eigen risico 2025 is nog € 186 openstaand. Betalen kan via de app of in twee termijnen zonder rente. Bij niet betalen kan verrekening met uw salaris volgen via een incassobureau. Vragen? Bel 0800-9998888 op werkdagen.',
    passageEn:
      'Health insurer: your 2025 deductible still has €186 outstanding. Pay via the app or in two instalments without interest. Non-payment may lead to recovery from your salary via a collection agency. Questions? Call 0800-9998888 on weekdays.',
    questionNl: 'Hoe kunt u betalen zonder rente?',
    questionEn: 'How can you pay without interest?',
    options: [
      { id: 'a', label: 'Alleen contant aan de balie in het ziekenhuis.' },
      { id: 'b', label: 'Via de app of in twee termijnen.' },
      { id: 'c', label: 'Betaling is niet nodig volgens de brief.' },
      { id: 'd', label: 'Alleen via incassobureau met rente.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bericht van de huisartsenpost.',
    readHintEn: 'Read the out-of-hours GP message.',
    passageNl:
      'Huisartsenpost: vandaag gevestigd in ziekenhuis Zuid, ingang spoed 2. Bel altijd eerst 088-0030700 voor triage. Kom niet zonder telefonische afspraak. Voor levensbedreigende situaties: bel 112. Wachtkamer open tot 23:00.',
    passageEn:
      'GP post: today located at Zuid hospital, emergency entrance 2. Always call 088-0030700 first for triage. Do not come without a phone appointment. Life-threatening situations: call 112. Waiting room open until 11:00 p.m.',
    questionNl: 'Wat moet u eerst doen volgens het bericht?',
    questionEn: 'What must you do first according to the message?',
    options: [
      { id: 'a', label: 'Direct naar de wachtkamer zonder bellen.' },
      { id: 'b', label: 'Bellen voor triage op 088-0030700.' },
      { id: 'c', label: '112 bellen bij elke klacht.' },
      { id: 'd', label: 'Online chatten zonder telefoon.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over medicijnen.',
    readHintEn: 'Read the letter about medication.',
    passageNl:
      'Uw dosering metformine wijzigt naar 500 mg twee keer per dag na het eten. Start op maandag. Bij misselijkheid: eet eerst en neem daarna de tablet. Over twee weken bloedprikken; u krijgt een aparte uitnodiging. Vragen? Bel de praktijkondersteuner.',
    passageEn:
      'Your metformin dose changes to 500 mg twice daily after meals. Start on Monday. If nauseous: eat first then take the tablet. Blood test in two weeks; you will receive a separate invitation. Questions? Call the practice nurse.',
    questionNl: 'Wanneer start u met de nieuwe dosering?',
    questionEn: 'When do you start the new dose?',
    options: [
      { id: 'a', label: 'Op maandag.' },
      { id: 'b', label: 'Na de bloedprik over twee weken.' },
      { id: 'c', label: 'Alleen als u misselijk bent.' },
      { id: 'd', label: 'De startdatum staat niet in de brief.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht van de GGD.',
    readHintEn: 'Read this public health service message.',
    passageNl:
      'SOA-test op afspraak: uitslag binnen vijf werkdagen via beveiligde mail. Anoniem testen kan op woensdag 16:00-19:00 zonder DigiD. Neem geen medicijnen tegen schimmelinfecties mee op de dag van de test. Partnerbehandeling is mogelijk; vraag bij de balie.',
    passageEn:
      'STI test by appointment: result within five working days via secure email. Anonymous testing on Wednesday 4:00–7:00 p.m. without DigiD. Do not take antifungal medication on the day of the test. Partner treatment is possible; ask at the desk.',
    questionNl: 'Wanneer kunt u anoniem testen?',
    questionEn: 'When can you test anonymously?',
    options: [
      { id: 'a', label: 'Elke dag met DigiD.' },
      { id: 'b', label: 'Woensdag 16:00-19:00 zonder DigiD.' },
      { id: 'c', label: 'Alleen na uitslag per post.' },
      { id: 'd', label: 'Anoniem testen is niet mogelijk.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over ziekenhuisopname.',
    readHintEn: 'Read the hospital admission letter.',
    passageNl:
      'Opname gepland op 4 november om 07:30 op afdeling C3. Nuchter vanaf middernacht; water mag tot twee uur voor opname. Neem nachtkleding, slippers en uw medicijnen in originele verpakking mee. Bezoekuren 14:00-20:00; maximaal twee bezoekers per bed.',
    passageEn:
      'Admission planned 4 November at 7:30 a.m. on ward C3. Fasting from midnight; water allowed until two hours before admission. Bring nightwear, slippers and medication in original packaging. Visiting hours 2:00–8:00 p.m.; maximum two visitors per bed.',
    questionNl: 'Hoeveel bezoekers zijn toegestaan per bed?',
    questionEn: 'How many visitors are allowed per bed?',
    options: [
      { id: 'a', label: 'Onbeperkt de hele dag.' },
      { id: 'b', label: 'Maximaal twee bezoekers.' },
      { id: 'c', label: 'Geen bezoek op afdeling C3.' },
      { id: 'd', label: 'De tekst noemt geen limiet.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bericht van de kraamzorg.',
    readHintEn: 'Read the maternity care message.',
    passageNl:
      'Kraamzorg start op de dag van thuiskomst na de bevalling. Eerste bezoek tussen 08:00 en 12:00. Zorg dat er een kraampakket en handdoeken klaarliggen. Bij koorts boven 38 bij moeder of baby: bel direct de kraamverzorgende en daarna de huisarts.',
    passageEn:
      'Maternity care starts on the day you come home after birth. First visit between 8:00 a.m. and 12:00 noon. Ensure a maternity kit and towels are ready. Fever above 38 in mother or baby: call the maternity nurse immediately then the GP.',
    questionNl: 'Wat moet u klaarleggen voor het eerste bezoek?',
    questionEn: 'What must you have ready for the first visit?',
    options: [
      { id: 'a', label: 'Alleen een autostoeltje.' },
      { id: 'b', label: 'Kraampakket en handdoeken.' },
      { id: 'c', label: 'Niets; de kraamzorg brengt alles.' },
      { id: 'd', label: 'Een ziekenhuisbed voor thuis.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de brief over geestelijke gezondheidszorg.',
    readHintEn: 'Read the mental health care letter.',
    passageNl:
      'Uw verwijzing naar de GGZ is geaccepteerd. Intake op 21 januari om 15:45 via videobellen; link volgt per mail. Duur 45 minuten. Bij geen gehoor schuift de afspraak niet automatisch op; u moet zelf opnieuw plannen. Crisis? Bel 113 of 0800-0113.',
    passageEn:
      'Your referral to mental health services is accepted. Intake on 21 January at 3:45 p.m. via video call; link follows by email. Duration 45 minutes. If no answer the appointment is not automatically rescheduled; you must plan again yourself. Crisis? Call 113 or 0800-0113.',
    questionNl: 'Hoe vindt de intake plaats?',
    questionEn: 'How does the intake take place?',
    options: [
      { id: 'a', label: 'Fysiek op locatie zonder afspraak.' },
      { id: 'b', label: 'Via videobellen met link per mail.' },
      { id: 'c', label: 'Alleen per brief zonder contact.' },
      { id: 'd', label: 'De wijze staat niet in de brief.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over het gezondheidscentrum.',
    readHintEn: 'Read this health centre message.',
    passageNl:
      'Het lab is verhuisd naar gebouw Oost, begane grond. Bloedafname zonder afspraak ma-do 07:30-10:00. Vasten? Alleen als dat op uw formulier staat. Uitslag binnen drie werkdagen in het patiëntenportaal. Parkeren 1 uur gratis met parkeerschijf bij ingang Oost.',
    passageEn:
      'The lab has moved to East building, ground floor. Blood tests without appointment Mon–Thu 7:30–10:00 a.m. Fasting? Only if stated on your form. Results within three working days in the patient portal. Parking 1 hour free with disc at East entrance.',
    questionNl: 'Wanneer kunt u zonder afspraak bloed laten afnemen?',
    questionEn: 'When can you have blood taken without an appointment?',
    options: [
      { id: 'a', label: 'Ma-do 07:30-10:00 in gebouw Oost.' },
      { id: 'b', label: 'Elke dag tot 17:00 in gebouw West.' },
      { id: 'c', label: 'Alleen na vasten op vrijdag.' },
      { id: 'd', label: 'Bloedafname vereist altijd een afspraak.' },
    ],
    correctOptionIds: ['a'],
  },
]
