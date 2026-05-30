/** Keyword match from question text — no category/default fallback. */
export function inferKnmSceneFromQuestionNlStrong(q: string): string | null {
  const t = q.toLowerCase()
  if (/fiets|fietser|knie.*bloed|bloed.*knie/.test(t)) return 'bike_fall_knee'
  if (/nummer op de (afbeelding|foto)|dit nummer/.test(t) && /\b112\b/.test(t)) return 'emergency_112_phone'
  if (/\b112\b/.test(t) && /levensgevaar|brand|niet ademen|ongeval|nummer/.test(t)) return 'emergency_112_phone'
  if (/verkeersbord|stopbord/.test(t)) return 'traffic_stop_sign'
  if (/symbool bij de ingang|dit symbool/.test(t) && /medisch|ingang/.test(t)) return 'hospital_referral'
  if (/brandlucht|rook.*flat|trappenhuis/.test(t)) return 'fire_smoke_hallway'
  if (/baby.*koorts|koorts.*baby/.test(t)) return 'baby_fever_night'
  if (/huisartsenpost|hap\b|buiten kantooruren/.test(t)) return 'gp_waiting_room'
  if (/huisarts/.test(t)) return 'gp_waiting_room'
  if (/apotheek|medicijn.*recept/.test(t)) return 'pharmacy_counter'
  if (/tandarts/.test(t)) return 'dentist_chair'
  if (/verloskundige|zwanger/.test(t)) return 'midwife_pregnancy'
  if (/ziekenhuis|specialist|verwijz/.test(t)) return 'hospital_referral'
  if (/zorgverzekering|eigen risico|zorgtoeslag/.test(t)) return 'health_insurance_letter'
  if (/belastingdienst|belastingaangifte|toeslag|huurtoeslag/.test(t)) return 'tax_blue_envelope'
  if (/gemeente|inschrijven|verhuizing|paspoort|digid|rijbewijs/.test(t)) return 'municipality_desk'
  if (/politie|aangifte|0900/.test(t)) return 'police_report_desk'
  if (/pinpas|bankrekening/.test(t)) return 'bank_card_blocked'
  if (/verzekering.*auto|autoschade/.test(t)) return 'car_damage_insurance'
  if (/rijksmuseum/.test(t)) return 'rijksmuseum_amsterdam'
  if (/wilhelmus/.test(t)) return 'king_ceremonial'
  if (/\bvn\b|verenigde naties/.test(t)) return 'un_peace_plaza'
  if (/tweede kamer|eerste kamer|kabinet|stemmen|stembureau|grondwet/.test(t)) return 'parliament_building'
  if (/koning|koningsdag|27 april/.test(t)) return 'kingsday_orange_street'
  if (/4 mei|dodenherdenking/.test(t)) return 'remembrance_wreath'
  if (/5 mei|bevrijding/.test(t)) return 'liberation_flag'
  if (/sinterklaas|5 december/.test(t)) return 'sinterklaas_shoes'
  if (/school|leerplicht|cito|vmbo|havo|vwo|verzuim|oudergesprek|boeken en studie/.test(t)) return 'school_classroom'
  if (/kinderopvang|kinderbijslag/.test(t)) return 'child_daycare'
  if (/ww\b|uwv|werkloos|vacature|sollicit|cao|loonstrook|ziek melden|ontslag/.test(t)) return 'sick_call_employer'
  if (/huurcontract|huurtoeslag|sociale huur|woningcorporatie/.test(t)) return 'social_housing_queue'
  if (/hypotheek|kopen.*woning/.test(t)) return 'mortgage_bank_meeting'
  if (/lekkage|schimmel|plafond/.test(t)) return 'ceiling_water_leak'
  if (/buren|lawaaioverlast|22:00|muziek/.test(t)) return 'neighbor_loud_music'
  if (/afval|glasbak|gft|afval scheiden/.test(t)) return 'waste_bins_sorted'
  if (/gas.*lek|gaskraan/.test(t)) return 'gas_smell_valve'
  if (/deltawerken|watersnood|1953/.test(t)) return 'delta_dam_sea'
  if (/flevoland|polder/.test(t)) return 'flevoland_polder'
  if (/anne frank|holocaust/.test(t)) return 'anne_frank_house'
  if (/amsterdam|hoofdstad|randstad/.test(t)) return 'amsterdam_canal'
  if (/windmolen/.test(t)) return 'windmill_polder'
  if (/tweede wereldoorlog|1945/.test(t)) return 'anne_frank_house'
  if (/europese unie|\beu\b/.test(t)) return 'eu_flags'
  if (/stiltecoupé|openbaar vervoer.*ov/.test(t)) return 'train_quiet_zone'
  if (/kraamvisite|geboorte.*baby/.test(t)) return 'midwife_pregnancy'
  if (/trouwen|gemeentehuis.*trouw/.test(t)) return 'wedding_town_hall'
  if (/discriminatie/.test(t)) return 'discrimination_help'
  if (/juridisch/.test(t)) return 'legal_advice_desk'
  if (/loonstrook|bruto.*netto|netto.*loon/.test(t)) return 'payslip_document'
  if (/eigen risico/.test(t)) return 'health_insurance_letter'
  if (/\bbsn\b|burgerservicenummer/.test(t)) return 'passport_application'
  if (/toeslagen|mijn toeslagen/.test(t)) return 'tax_blue_envelope'
  if (/verjaardag/.test(t)) return 'integration_neighborhood'
  if (/legaal.*werken|arbeidscontract|contract.*werk/.test(t)) return 'employment_contract'
  if (/overwerk|40 uur|48 uur/.test(t)) return 'employment_contract'
  if (/levensgevaar|direct gevaar.*leven/.test(t)) return 'emergency_112_phone'
  if (/ziek.*geen spoed|huisartsenpraktijk|medisch advies/.test(t)) return 'gp_waiting_room'
  if (/document op de (foto|afbeelding)|soort document op de foto/.test(t)) return 'employment_contract'
  if (/identiteitsbewijs|dit document op de foto/.test(t)) return 'passport_application'
  if (/symbool op de (afbeelding|foto)/.test(t) && /euro|betalen/.test(t)) return 'tax_blue_envelope'
  if (/dit plaatje|woning|huur\/koop/.test(t)) return 'rental_contract_signing'
  return null
}

export type KnmQuizTopicId = 'work' | 'healthcare' | 'government' | 'culture'

const TOPIC_DEFAULT_SCENE: Record<KnmQuizTopicId, string> = {
  work: 'employment_contract',
  healthcare: 'gp_waiting_room',
  government: 'municipality_desk',
  culture: 'integration_neighborhood',
}

/** Realistic scene for KMN topic quiz / practice-exam questions. */
export function resolveKnmQuizSceneId(question: {
  promptNl: string
  sceneId?: string
  topicId: KnmQuizTopicId
}): string {
  if (question.sceneId?.trim()) return question.sceneId.trim()
  const strong = inferKnmSceneFromQuestionNlStrong(question.promptNl)
  if (strong) return strong
  return TOPIC_DEFAULT_SCENE[question.topicId]
}
