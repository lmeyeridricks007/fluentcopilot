export const header = '// ─── Insurance/bank (10) ────────────────────────────────────────────────────'
export const category = 'insurance_bank'
export const items = [
  {
    introNl: 'Lees deze brief van de bank.',
    readHintEn: 'Read this letter from the bank.',
    passageNl:
      'Uw nieuwe betaalpas wordt binnen vijf werkdagen per post bezorgd. Activeer de pas via de app vóór eerste gebruik. Oude pas blijft tot activering geldig. Verlies of diefstal? Blokkeer direct via de app of bel 0800-BLOCK (24 uur).',
    passageEn:
      'Your new debit card will be delivered by post within five working days. Activate the card via the app before first use. Old card remains valid until activation. Loss or theft? Block immediately via the app or call 0800-BLOCK (24 hours).',
    questionNl: 'Wat moet u doen vóór u de nieuwe pas gebruikt?',
    questionEn: 'What must you do before using the new card?',
    options: [
      { id: 'a', label: 'De oude pas direct vernietigen.' },
      { id: 'b', label: 'De pas activeren via de app.' },
      { id: 'c', label: 'Naar het filiaal met contant geld.' },
      { id: 'd', label: 'Niets; de pas werkt automatisch.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht van uw verzekeraar.',
    readHintEn: 'Read this message from your insurer.',
    passageNl:
      'Autoverzekering: uw premie wijzigt per 1 maart naar € 78 per maand door schadevrije jaren. Schade melden binnen 48 uur via MijnVerzekering. Ruitschade zonder eigen risico bij erkende hersteller; lijst op de site onder Autoschade.',
    passageEn:
      'Car insurance: your premium changes from 1 March to €78 per month due to no-claims years. Report damage within 48 hours via MijnVerzekering. Windscreen damage without deductible at approved repairer; list on the site under Car damage.',
    questionNl: 'Binnen hoeveel tijd moet u schade melden?',
    questionEn: 'Within how much time must you report damage?',
    options: [
      { id: 'a', label: 'Binnen 48 uur.' },
      { id: 'b', label: 'Binnen zes maanden.' },
      { id: 'c', label: 'Alleen bij ruitschade direct.' },
      { id: 'd', label: 'Melden is niet nodig volgens het bericht.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze brief over inboedelverzekering.',
    readHintEn: 'Read this home contents insurance letter.',
    passageNl:
      'Uw inboedelverzekering dekt waterschade door leidingen, niet overstroming door rivier. Bij schade: foto\'s maken en inventarislijst sturen. Eigen risico € 150 per gebeurtenis. Nieuwe waarde tot € 25.000 voor elektronica; hoger bedrag apart verzekeren.',
    passageEn:
      'Your home contents insurance covers water damage from pipes, not river flooding. In case of damage: take photos and send inventory list. Deductible €150 per event. New-for-old up to €25,000 for electronics; higher amount insure separately.',
    questionNl: 'Wat is niet gedekt volgens de brief?',
    questionEn: 'What is not covered according to the letter?',
    options: [
      { id: 'a', label: 'Waterschade door leidingen.' },
      { id: 'b', label: 'Overstroming door rivier.' },
      { id: 'c', label: 'Schade aan elektronica tot € 25.000.' },
      { id: 'd', label: 'Foto\'s maken bij schade.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bankafschriftbericht.',
    readHintEn: 'Read this bank statement message.',
    passageNl:
      'Uw rekening is geblokkeerd wegens verdachte login uit het buitenland. Bevestig uw identiteit via de app met iDIN. Zonder actie binnen 7 dagen sluiten wij de rekening tijdelijk. Heeft u dit niet zelf gedaan? Bel fraudehelpdesk 088-0001111.',
    passageEn:
      'Your account is blocked due to suspicious login from abroad. Confirm your identity via the app with iDIN. Without action within 7 days we will temporarily close the account. Did you not do this yourself? Call fraud helpline 088-0001111.',
    questionNl: 'Wat moet u doen om de rekening te deblokkeren?',
    questionEn: 'What must you do to unblock the account?',
    options: [
      { id: 'a', label: 'Identiteit bevestigen via app met iDIN.' },
      { id: 'b', label: 'Niets; de blokkade vervalt na 7 dagen.' },
      { id: 'c', label: 'Contant geld storten bij de automaat.' },
      { id: 'd', label: 'Een nieuwe rekening openen zonder controle.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze brief over aansprakelijkheidsverzekering.',
    readHintEn: 'Read this liability insurance letter.',
    passageNl:
      'Claim fietsongeval: wij hebben uw melding ontvangen. Stuur binnen 14 dagen het schadeformulier en foto\'s van beide voertuigen. Tegenpartij is nog niet akkoord; wij bellen u na onderzoek. Tijdelijke vervangfiets zit niet in uw polis.',
    passageEn:
      'Bicycle accident claim: we have received your report. Send the claim form and photos of both vehicles within 14 days. Other party has not agreed yet; we will call you after investigation. Temporary replacement bike is not in your policy.',
    questionNl: 'Wat zit niet in uw polis volgens de brief?',
    questionEn: 'What is not in your policy according to the letter?',
    options: [
      { id: 'a', label: 'Schadeformulier indienen.' },
      { id: 'b', label: 'Tijdelijke vervangfiets.' },
      { id: 'c', label: 'Foto\'s van beide voertuigen.' },
      { id: 'd', label: 'Onderzoek door de verzekeraar.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees dit bericht over spaarrente.',
    readHintEn: 'Read this savings interest message.',
    passageNl:
      'Spaarrente wijzigt per 1 april naar 1,25% op uw PlusSpaarrekening. Opnames blijven gratis. Minimaal saldo € 500 om rente te ontvangen. Vragen? Chat in de app of bel uw adviseur op werkdagen 09:00-17:00.',
    passageEn:
      'Savings rate changes from 1 April to 1.25% on your Plus savings account. Withdrawals remain free. Minimum balance €500 to receive interest. Questions? Chat in the app or call your adviser on weekdays 9:00 a.m.–5:00 p.m.',
    questionNl: 'Wat is het minimale saldo voor rente?',
    questionEn: 'What is the minimum balance for interest?',
    options: [
      { id: 'a', label: '€ 0 zonder minimum.' },
      { id: 'b', label: '€ 500.' },
      { id: 'c', label: '€ 10.000 alleen op werkdagen.' },
      { id: 'd', label: 'Het minimum staat niet in het bericht.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees deze brief over rechtsbijstand.',
    readHintEn: 'Read this legal assistance letter.',
    passageNl:
      'Uw rechtsbijstandverzekering dekt arbeidsconflicten na wachttijd van drie maanden. Gratis intake met jurist via 0900-LEGAL (€ 0,10/min). Let op: geschillen vóór afsluiten zijn uitgesloten. Polis verlengt automatisch tenzij u opzegt vóór 1 december.',
    passageEn:
      'Your legal assistance insurance covers employment disputes after a three-month waiting period. Free intake with lawyer via 0900-LEGAL (€0.10/min). Note: disputes before taking out the policy are excluded. Policy renews automatically unless you cancel before 1 December.',
    questionNl: 'Tot wanneer kunt u opzeggen om automatische verlenging te stoppen?',
    questionEn: 'Until when can you cancel to stop automatic renewal?',
    options: [
      { id: 'a', label: 'Vóór 1 december.' },
      { id: 'b', label: 'Na drie maanden wachttijd.' },
      { id: 'c', label: 'Opzeggen is niet mogelijk.' },
      { id: 'd', label: 'Alleen bij arbeidsconflict.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit bericht over hypotheek.',
    readHintEn: 'Read this mortgage message.',
    passageNl:
      'Rentevast periode eindigt op 1 september. U ontvangt een aanbod voor verlenging zes maanden van tevoren. Vergelijk ook andere aanbieders; overstappen kan met behoud van Nationale Hypotheek Garantie onder voorwaarden. Adviesgesprek gratis in filiaal; plan online.',
    passageEn:
      'Fixed-rate period ends on 1 September. You receive a renewal offer six months in advance. Also compare other offers; switching may keep National Mortgage Guarantee under conditions. Advice meeting free at branch; book online.',
    questionNl: 'Wanneer krijgt u een aanbod voor verlenging?',
    questionEn: 'When do you receive a renewal offer?',
    options: [
      { id: 'a', label: 'Zes maanden van tevoren.' },
      { id: 'b', label: 'Op de laatste dag van de rentevast periode.' },
      { id: 'c', label: 'Pas na overstappen naar andere bank.' },
      { id: 'd', label: 'Er komt geen aanbod volgens het bericht.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees deze brief over zorgverzekering aanvullend.',
    readHintEn: 'Read this supplementary health insurance letter.',
    passageNl:
      'Tandarts dekking 75% tot € 250 per jaar; orthodontie voor kinderen tot 18 jaar tot € 1.500. Declaratie binnen 90 dagen uploaden in de app. Geen declaratie? Dan geen vergoeding. Premie € 28,50 per maand, per maand opzegbaar met een maand opzegtermijn.',
    passageEn:
      'Dental cover 75% up to €250 per year; orthodontics for children until 18 up to €1,500. Submit claim within 90 days in the app. No claim? Then no reimbursement. Premium €28.50 per month, cancellable monthly with one month notice.',
    questionNl: 'Binnen hoeveel dagen moet u declareren?',
    questionEn: 'Within how many days must you submit a claim?',
    options: [
      { id: 'a', label: 'Binnen 90 dagen.' },
      { id: 'b', label: 'Binnen één jaar na behandeling.' },
      { id: 'c', label: 'Declareren is niet nodig voor 75% dekking.' },
      { id: 'd', label: 'Alleen voor orthodontie binnen 30 dagen.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit fraudewaarschuwingbericht van de bank.',
    readHintEn: 'Read this fraud warning from the bank.',
    passageNl:
      'Let op: criminelen bellen soms alsof zij van de bank zijn en vragen om uw pincode. Wij vragen nooit uw pin, wachtwoord of inlogcodes. Twijfel? Leg op en bel het nummer op uw pas. Deel nooit schermen via WhatsApp met onbekenden.',
    passageEn:
      'Warning: criminals sometimes call pretending to be the bank and ask for your PIN. We never ask for your PIN, password or login codes. In doubt? Hang up and call the number on your card. Never share screens via WhatsApp with strangers.',
    questionNl: 'Wat vraagt de bank nooit volgens het bericht?',
    questionEn: 'What does the bank never ask for according to the message?',
    options: [
      { id: 'a', label: 'Om terug te bellen via het nummer op uw pas.' },
      { id: 'b', label: 'Uw pincode of inlogcodes.' },
      { id: 'c', label: 'Om op te hangen bij twijfel.' },
      { id: 'd', label: 'Om WhatsApp te gebruiken met onbekenden.' },
    ],
    correctOptionIds: ['b'],
  },
]
