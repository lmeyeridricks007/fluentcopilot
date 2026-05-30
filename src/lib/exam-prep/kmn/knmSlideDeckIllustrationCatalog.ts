import type { KnmSlideDeckIllustrationId, SlideDeckVisualConfig, SlideDeckVisualTopic } from './knmSlideDeckIllustrationTypes'

type DeckRowLike = { category: SlideDeckVisualConfig['category']; questionNl: string }

const TOPIC_LABELS: Record<SlideDeckVisualTopic, string> = {
  house: 'Wonen',
  contract: 'Huurcontract',
  moving: 'Verhuizing',
  neighbors: 'Buren',
  leak: 'Lekkage',
  housing_corp: 'Woningcorp.',
  mortgage: 'Hypotheek',
  service_costs: 'Servicekosten',
  energy: 'Energielabel',
  woz: 'WOZ',
  antikraak: 'Anti-kraak',
  waste: 'Afval',
  rent_commission: 'Huurcommissie',
  delta: 'Deltawerken',
  job: 'Nieuwe baan',
  wage: 'Minimumloon',
  sick: 'Ziek melden',
  probation: 'Proeftijd',
  dismissal: 'Ontslag',
  uwv: 'UWV',
  cao: 'CAO',
  apply: 'Solliciteren',
  maternity: 'Zwangerschap',
  discrimination: 'Discriminatie',
  payslip: 'Loonstrook',
  reintegration: 'Re-integratie',
  internship: 'Stage',
  equality: 'Gelijke behandeling',
  direct: 'Direct praten',
  kingsday: 'Koningsdag',
  remembrance: '4 mei',
  liberation: '5 mei',
  sinterklaas: 'Sinterklaas',
  volunteer: 'Vrijwilliger',
  friends: 'Meedoen',
  handshake: 'Hand geven',
  conflict: 'Conflict',
  anthem: 'Wilhelmus',
  respect: 'Respect',
  language: 'Nederlands',
  school: 'Leerplicht',
  absence: 'Verzuim',
  parent_talk: 'Oudergesprek',
  integration: 'Inburgering',
  primary: 'Basisschool',
  duo: 'DUO',
  enroll: 'Inschrijving',
  mbo: 'Mbo / hbo',
  homework: 'Huiswerk',
  bullying: 'Pesten',
  diploma: 'Diploma',
  transfer: 'Schoolwissel',
  gp: 'Huisarts',
  hap: 'Huisartsenpost',
  emergency: '112',
  ggd: 'GGD',
  insurance: 'Zorgverzekering',
  deductible: 'Eigen risico',
  pharmacy: 'Apotheek',
  midwife: 'Verloskundige',
  dentist: 'Tandarts',
  referral: 'Verwijzing',
  vaccine: 'Vaccinatie',
  mental: 'Crisis hulp',
  municipality: 'Gemeente',
  digid: 'DigiD',
  council: 'Gemeenteraad',
  passport: 'Paspoort',
  police_report: 'Aangifte',
  police: 'Politie',
  domestic: 'Huiselijk geweld',
  tax: 'Belastingdienst',
  tax_return: 'Aangifte belasting',
  allowance: 'Toeslagen',
  tax_letter: 'Aanslag',
  judge: 'Rechter',
  legal: 'Juridische hulp',
  constitution: 'Grondwet',
  bank: 'Bankrekening',
  stolen_card: 'Pinpas',
  savings: 'Sparen',
  liability: 'WA-verzekering',
  car_ins: 'Autoverzekering',
  contents: 'Inboedel',
  tweede_kamer: 'Tweede Kamer',
  eerste_kamer: 'Eerste Kamer',
  cabinet: 'Kabinet',
  king: 'Koning',
  vote_age: 'Stemrecht 18+',
  democracy: 'Democratie',
  provinces: 'Provincies',
  eu: 'Europese Unie',
  polling: 'Stembureau',
  pm: 'Minister-president',
  speech: 'Vrijheid meningsuiting',
  referendum: 'Referendum',
  ww2: 'WO II',
  anne: 'Anne Frank',
  flevoland: 'Flevoland',
  capital: 'Amsterdam',
  randstad: 'Randstad',
  borders: 'Grenzen',
  polder: 'Polder',
  flood: 'Watersnood 1953',
  dutch: 'Nederlands',
  windmill: 'Windmolen',
  voc: 'VOC',
  limburg: 'Limburg',
  museum: 'Museum',
  generic: 'KNM',
}

/** Ordered topics — one unique visual per slide-deck question (same order as KNM_SLIDE_DECK_ROWS). */
const SLIDE_DECK_TOPICS_IN_ORDER: SlideDeckVisualTopic[] = [
  'contract',
  'moving',
  'neighbors',
  'leak',
  'housing_corp',
  'mortgage',
  'service_costs',
  'energy',
  'woz',
  'antikraak',
  'waste',
  'rent_commission',
  'delta',
  'job',
  'wage',
  'sick',
  'probation',
  'dismissal',
  'uwv',
  'cao',
  'apply',
  'maternity',
  'discrimination',
  'payslip',
  'reintegration',
  'internship',
  'equality',
  'direct',
  'kingsday',
  'remembrance',
  'liberation',
  'sinterklaas',
  'volunteer',
  'friends',
  'handshake',
  'conflict',
  'anthem',
  'respect',
  'language',
  'school',
  'absence',
  'parent_talk',
  'integration',
  'primary',
  'duo',
  'enroll',
  'mbo',
  'homework',
  'bullying',
  'diploma',
  'transfer',
  'gp',
  'hap',
  'emergency',
  'ggd',
  'insurance',
  'deductible',
  'pharmacy',
  'midwife',
  'dentist',
  'referral',
  'vaccine',
  'mental',
  'municipality',
  'digid',
  'council',
  'passport',
  'police_report',
  'police',
  'domestic',
  'tax',
  'tax_return',
  'allowance',
  'tax_letter',
  'judge',
  'legal',
  'constitution',
  'bank',
  'stolen_card',
  'savings',
  'liability',
  'car_ins',
  'contents',
  'tweede_kamer',
  'eerste_kamer',
  'cabinet',
  'king',
  'vote_age',
  'democracy',
  'provinces',
  'eu',
  'polling',
  'pm',
  'speech',
  'referendum',
  'ww2',
  'anne',
  'flevoland',
  'capital',
  'randstad',
  'borders',
  'polder',
  'flood',
  'dutch',
  'windmill',
  'voc',
  'limburg',
  'liberation',
  'provinces',
  'museum',
]

export function knmSlideDeckIllustrationIdForIndex(index: number): KnmSlideDeckIllustrationId {
  return `deck_s${String(index + 1).padStart(3, '0')}` as KnmSlideDeckIllustrationId
}

export function isKnmSlideDeckIllustrationId(id: string): id is KnmSlideDeckIllustrationId {
  return /^deck_s\d{3}$/.test(id)
}

function inferTopicFromQuestion(row: DeckRowLike, index: number): SlideDeckVisualTopic {
  const ordered = SLIDE_DECK_TOPICS_IN_ORDER[index]
  if (ordered) return ordered
  const q = row.questionNl.toLowerCase()
  if (q.includes('112')) return 'emergency'
  if (q.includes('huurtoeslag') || q.includes('toeslag')) return 'allowance'
  if (q.includes('hypotheek') || q.includes('woningcorporatie') || q.includes('huurcontract')) return 'contract'
  if (q.includes('gemeente') || q.includes('paspoort') || q.includes('digid')) return 'municipality'
  if (q.includes('politie') || q.includes('aangifte')) return 'police'
  if (q.includes('belasting') || q.includes('btw') || q.includes('bsn')) return 'tax'
  if (q.includes('verzekering') || q.includes('bankpas')) return 'insurance'
  if (q.includes('kamer') || q.includes('stem') || q.includes('regering')) return 'tweede_kamer'
  if (q.includes('school') || q.includes('leerplicht') || q.includes('cito')) return 'school'
  if (q.includes('huisarts') || q.includes('zorg')) return 'gp'
  if (q.includes('geschiedenis') || q.includes('oorlog') || q.includes('voc')) return 'ww2'
  if (q.includes('flevoland') || q.includes('randstad') || q.includes('provincie')) return 'provinces'
  const cat = row.category
  if (cat === 'wonen_buurt') return 'house'
  if (cat === 'werk_inkomen') return 'job'
  if (cat === 'integratie_cultuur') return 'kingsday'
  if (cat === 'onderwijs_opvoeding') return 'school'
  if (cat === 'zorg_gezondheid') return 'gp'
  if (cat === 'veiligheid_hulp') return 'police'
  if (cat === 'geld_belasting_verzekering') return 'tax'
  return 'generic'
}

export function buildSlideDeckIllustrationConfig(row: DeckRowLike, index: number): SlideDeckVisualConfig {
  const topic = inferTopicFromQuestion(row, index)
  return {
    topic,
    label: TOPIC_LABELS[topic],
    variant: index % 8,
    category: row.category,
  }
}

let catalogCache: Record<string, SlideDeckVisualConfig> | null = null

export function initSlideDeckIllustrationCatalog(rows: readonly DeckRowLike[]): void {
  catalogCache = {}
  rows.forEach((row, index) => {
    const id = knmSlideDeckIllustrationIdForIndex(index)
    catalogCache![id] = buildSlideDeckIllustrationConfig(row, index)
  })
}

export function getSlideDeckIllustrationConfig(id: string): SlideDeckVisualConfig | null {
  return catalogCache?.[id] ?? null
}

export const SLIDE_DECK_ILLUSTRATION_TOPIC_COUNT = SLIDE_DECK_TOPICS_IN_ORDER.length
