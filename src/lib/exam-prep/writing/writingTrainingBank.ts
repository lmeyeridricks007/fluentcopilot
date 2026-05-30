import { writingTrainingItemSchema, type WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'

const raw: unknown[] = [
  {
    id: 'wt-form-01',
    subtype: 'form',
    titleNl: 'Aanmeldformulier gemeente',
    scenarioNl:
      'U gaat voor het eerst naar het gemeentehuis. De medewerker geeft u een formulier. U moet uw basisgegevens invullen zodat u een afspraak kunt maken.',
    instructionNl: 'Vul het formulier in. Gebruik de juiste velden. Schrijf duidelijk en kort.',
    formFields: [
      { id: 'naam', labelDutch: 'Naam en achternaam', placeholderDutch: 'bijv. Sam Jansen', required: true },
      { id: 'adres', labelDutch: 'Straat en huisnummer', placeholderDutch: 'bijv. Kerkstraat 12', required: true },
      { id: 'postcode_plaats', labelDutch: 'Postcode en woonplaats', placeholderDutch: 'bijv. 1234 AB Utrecht', required: true },
      { id: 'telefoon', labelDutch: 'Telefoonnummer', placeholderDutch: 'bijv. 06 12345678', required: true },
    ],
    requirements: [
      { kind: 'form_field' as const, id: 'rf-naam', fieldId: 'naam', textNl: 'Uw voor- en achternaam' },
      { kind: 'form_field' as const, id: 'rf-adres', fieldId: 'adres', textNl: 'Straat en huisnummer' },
      { kind: 'form_field' as const, id: 'rf-pc', fieldId: 'postcode_plaats', textNl: 'Postcode en plaats' },
      { kind: 'form_field' as const, id: 'rf-tel', fieldId: 'telefoon', textNl: 'Telefoonnummer' },
    ],
    modelAnswerDutch:
      'Naam en achternaam: Sam Jansen\nStraat en huisnummer: Kerkstraat 12\nPostcode en woonplaats: 3511 AB Utrecht\nTelefoonnummer: 06 12 34 56 78',
    modelAnswerNoteEn:
      'Clear labels, Dutch place format, and a plausible mobile number — all fields filled.',
    minWordsHint: 8,
    maxWordsHint: 60,
    metadata: {},
  },
  {
    id: 'wt-form-02',
    subtype: 'form',
    titleNl: 'Formulier sportschool',
    scenarioNl:
      'U wilt lid worden van een sportschool. Op het formulier moeten uw gegevens staan zodat ze u kunnen bellen.',
    instructionNl: 'Vul alle onderdelen in. U mag een fictief voorbeeld gebruiken.',
    formFields: [
      { id: 'naam', labelDutch: 'Volledige naam', required: true },
      { id: 'geboortedatum', labelDutch: 'Geboortedatum (dd-mm-jjjj)', required: true },
      { id: 'email', labelDutch: 'E-mailadres', required: true },
      { id: 'sport', labelDutch: 'Welke sport wilt u doen?', required: true },
    ],
    requirements: [
      { kind: 'form_field' as const, id: 'f2-n', fieldId: 'naam', textNl: 'Naam ingevuld' },
      { kind: 'form_field' as const, id: 'f2-g', fieldId: 'geboortedatum', textNl: 'Geboortedatum ingevuld' },
      { kind: 'form_field' as const, id: 'f2-e', fieldId: 'email', textNl: 'E-mail ingevuld' },
      { kind: 'form_field' as const, id: 'f2-s', fieldId: 'sport', textNl: 'Sportkeuze ingevuld' },
    ],
    modelAnswerDutch:
      'Volledige naam: Lisa de Vries\nGeboortedatum: 14-05-1990\nE-mailadres: lisa.devries@voorbeeld.nl\nWelke sport: zwemmen',
    minWordsHint: 10,
    maxWordsHint: 80,
    metadata: {},
  },
  {
    id: 'wt-message-01',
    subtype: 'message',
    titleNl: 'Bericht aan de docent',
    scenarioNl:
      'U moet woensdag een opdracht inleveren bij uw docent van de cursus Nederlands. Dat lukt u niet omdat u ziek bent geweest.',
    instructionNl: 'Schrijf een kort bericht aan uw docent.',
    requirements: [
      {
        kind: 'content' as const,
        id: 'm1-late',
        textNl: 'dat u de opdracht niet op tijd kunt inleveren',
        matchTerms: ['inlever', 'niet', 'opdracht', 'te laat', 'later'],
      },
      {
        kind: 'content' as const,
        id: 'm1-why',
        textNl: 'waarom (bijvoorbeeld ziek)',
        matchTerms: ['ziek', 'grieperig', 'niet goed', 'gevoeld', 'betere'],
      },
      {
        kind: 'content' as const,
        id: 'm1-when',
        textNl: 'wanneer u de opdracht wél kunt inleveren',
        matchTerms: ['vrijdag', 'maandag', 'volgende week', 'donderdag', 'morgen', 'dag'],
      },
      {
        kind: 'content' as const,
        id: 'm1-sorry',
        textNl: 'excuses of een beleefde afsluiting',
        matchTerms: ['sorry', 'excuses', 'groet', 'met vriendelijke groet', 'hartelijke groet', 'alvast bedankt'],
      },
    ],
    modelAnswerDutch:
      'Beste docent,\n\nWoensdag kan ik mijn opdracht niet inleveren omdat ik ziek ben geweest. Mag ik de opdracht vrijdag bij u inleveren? Sorry voor de overlast.\n\nMet vriendelijke groet,\nSam',
    modelAnswerNoteEn:
      'Covers delay, reason, new date, and polite close — typical A2 exam message.',
    minWordsHint: 35,
    maxWordsHint: 120,
    metadata: {},
  },
  {
    id: 'wt-message-02',
    subtype: 'message',
    titleNl: 'Bericht aan de huisbaas',
    scenarioNl:
      'Uw douche lekt al twee dagen. U wilt dat de huisbaas snel iemand stuurt om het te repareren.',
    instructionNl: 'Schrijf een kort, beleefd bericht aan uw huisbaas.',
    requirements: [
      {
        kind: 'content' as const,
        id: 'm2-problem',
        textNl: 'wat het probleem is',
        matchTerms: ['douche', 'lek', 'water', 'kapot'],
      },
      {
        kind: 'content' as const,
        id: 'm2-time',
        textNl: 'hoe lang het al speelt',
        matchTerms: ['twee dagen', '2 dagen', 'al een paar dagen', 'sinds', 'gisteren'],
      },
      {
        kind: 'content' as const,
        id: 'm2-ask',
        textNl: 'wat u wilt dat er gebeurt',
        matchTerms: ['repareren', 'monteur', 'snel', 'komen', 'mensen', 'helpen'],
      },
      {
        kind: 'content' as const,
        id: 'm2-polite',
        textNl: 'beleefde groet',
        matchTerms: ['groet', 'met vriendelijke groet', 'hartelijke groet', 'alvast bedankt'],
      },
    ],
    modelAnswerDutch:
      'Beste huisbaas,\n\nMijn douche lekt al twee dagen. Kunt u alsjeblieft snel iemand sturen om het te repareren? Alvast bedankt.\n\nMet vriendelijke groet,\nIk',
    minWordsHint: 30,
    maxWordsHint: 100,
    metadata: {},
  },
  {
    id: 'wt-audience-01',
    subtype: 'text_to_audience',
    titleNl: 'Tekst in de wijkkrant',
    scenarioNl:
      'U schrijft een korte tekst in de wijkkrant over uw fiets. De buren lezen het — u schrijft dus voor iedereen.',
    instructionNl: 'Schrijf minimaal drie zinnen in het Nederlands.',
    requirements: [
      {
        kind: 'content' as const,
        id: 'a1-use',
        textNl: 'waarvoor u uw fiets gebruikt',
        matchTerms: ['werk', 'school', 'boodschappen', 'sport', 'fiets', 'naar'],
      },
      {
        kind: 'content' as const,
        id: 'a1-look',
        textNl: 'hoe uw fiets eruitziet (kleur of type)',
        matchTerms: ['rood', 'blauw', 'zwart', 'wit', 'oud', 'nieuw', 'elektrisch', 'klein', 'groot'],
      },
      {
        kind: 'content' as const,
        id: 'a1-who',
        textNl: 'met wie u soms fietst',
        matchTerms: ['kind', 'kinderen', 'partner', 'vriend', 'vriendin', 'familie', 'alleen', 'samen'],
      },
    ],
    modelAnswerDutch:
      'Ik gebruik mijn fiets elke dag om naar mijn werk te gaan. Mijn fiets is blauw en nog vrij nieuw. Soms fietst mijn zoon met mij mee in het weekend.',
    modelAnswerNoteEn:
      'Three short sentences, simple connectors, concrete detail — good A2 “text for everyone”.',
    minWordsHint: 25,
    maxWordsHint: 90,
    metadata: {},
  },
  {
    id: 'wt-audience-02',
    subtype: 'text_to_audience',
    titleNl: 'Mededeling voor de buren',
    scenarioNl:
      'U gaat een week op vakantie. U wilt de buren vragen om één keer op uw planten te letten.',
    instructionNl: 'Schrijf een korte mededeling (minimaal drie zinnen) voor alle buren in het portiek.',
    requirements: [
      {
        kind: 'content' as const,
        id: 'a2-trip',
        textNl: 'dat u op vakantie gaat',
        matchTerms: ['vakantie', 'weg', 'reis', 'week'],
      },
      {
        kind: 'content' as const,
        id: 'a2-plant',
        textNl: 'wat de buren voor u kunnen doen',
        matchTerms: ['plant', 'planten', 'water', 'letten', 'gieten'],
      },
      {
        kind: 'content' as const,
        id: 'a2-thanks',
        textNl: 'bedankt of vriendelijke toon',
        matchTerms: ['bedankt', 'alvast', 'dank', 'groet'],
      },
    ],
    modelAnswerDutch:
      'Beste buren,\n\nIk ga volgende week op vakantie. Zouden jullie één keer naar mijn planten willen kijken en water geven? Alvast heel erg bedankt!\n\nVriendelijke groeten,\nIk',
    minWordsHint: 28,
    maxWordsHint: 100,
    metadata: {},
  },
]

export const WRITING_TRAINING_BANK: WritingTrainingItem[] = raw.map((r) => writingTrainingItemSchema.parse(r))
