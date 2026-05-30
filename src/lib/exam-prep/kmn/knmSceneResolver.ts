import { knmSlideDeckIllustrationIdForIndex } from './knmSlideDeckIllustrationCatalog'
import { inferKnmSceneFromQuestionNlStrong } from './knmSceneInference'
import type { KnmA2ExamCategory } from '@/lib/exam-system/a2KnmExamBank'

export { inferKnmSceneFromQuestionNlStrong } from './knmSceneInference'

/** Beelduitwerking pack — unieke ids (niet hergebruiken van vignette-combo ids). */
const BEELD_SCENE: Record<string, string> = {
  beeld_medical_cross: 'hospital_referral',
  beeld_stop_sign: 'traffic_stop_sign',
  beeld_112_number: 'emergency_112_phone',
  beeld_work_document: 'employment_contract',
  beeld_school_books: 'school_classroom',
  beeld_house_wonen: 'rental_contract_signing',
  beeld_id_card: 'passport_application',
  beeld_recycle_symbol: 'waste_bins_sorted',
  beeld_euro_symbol: 'tax_blue_envelope',
}

/** Maps built-in vignette / voorbeeld illustration ids to realistic scene photos. */
const VIGNETTE_SCENE: Record<string, string> = {
  zorg_gezondheid_0: 'child_fever_day',
  zorg_gezondheid_1: 'gp_waiting_room',
  zorg_gezondheid_2: 'hospital_referral',
  zorg_gezondheid_3: 'pharmacy_counter',
  werk_inkomen_0: 'sick_call_employer',
  werk_inkomen_1: 'employment_contract',
  werk_inkomen_2: 'discrimination_help',
  werk_inkomen_3: 'employment_contract',
  onderwijs_opvoeding_0: 'school_classroom',
  onderwijs_opvoeding_1: 'parent_teacher_talk',
  onderwijs_opvoeding_2: 'school_classroom',
  onderwijs_opvoeding_3: 'school_classroom',
  wonen_buurt_0: 'neighbor_loud_music',
  wonen_buurt_1: 'ceiling_water_leak',
  wonen_buurt_2: 'rental_contract_signing',
  wonen_buurt_3: 'moving_boxes',
  overheid_recht_0: 'voting_polling_station',
  overheid_recht_1: 'passport_application',
  overheid_recht_2: 'municipality_desk',
  overheid_recht_3: 'parliament_building',
  integratie_cultuur_0: 'integration_neighborhood',
  integratie_cultuur_1: 'kingsday_orange_street',
  integratie_cultuur_2: 'waste_bins_sorted',
  integratie_cultuur_3: 'sports_club',
  veiligheid_hulp_0: 'traffic_stop_sign',
  veiligheid_hulp_1: 'street_argument_safe',
  veiligheid_hulp_2: 'bike_fall_knee',
  veiligheid_hulp_3: 'baby_fever_night',
  geld_belasting_verzekering_0: 'tax_blue_envelope',
  geld_belasting_verzekering_1: 'car_damage_insurance',
  geld_belasting_verzekering_2: 'payslip_document',
  geld_belasting_verzekering_3: 'health_insurance_letter',
  voorbeeld_delta: 'delta_dam_sea',
  voorbeeld_un: 'un_peace_plaza',
  voorbeeld_amsterdam: 'amsterdam_canal',
  voorbeeld_wilhelmus: 'king_ceremonial',
  voorbeeld_holocaust: 'anne_frank_house',
  voorbeeld_koningsdag: 'kingsday_orange_street',
  voorbeeld_tweede_kamer: 'parliament_building',
  voorbeeld_stembus: 'voting_polling_station',
  voorbeeld_rijksmuseum: 'rijksmuseum_amsterdam',
  voorbeeld_cao: 'employment_contract',
  voorbeeld_huisarts: 'gp_waiting_room',
  voorbeeld_belastingdienst: 'tax_blue_envelope',
}

const ILLUSTRATION_SCENE: Record<string, string> = { ...VIGNETTE_SCENE, ...BEELD_SCENE }

function inferSceneFromQuestionNl(q: string, category?: KnmA2ExamCategory): string {
  const strong = inferKnmSceneFromQuestionNlStrong(q)
  if (strong) return strong

  if (category === 'wonen_buurt') return 'rental_contract_signing'
  if (category === 'werk_inkomen') return 'employment_contract'
  if (category === 'zorg_gezondheid') return 'gp_waiting_room'
  if (category === 'onderwijs_opvoeding') return 'school_classroom'
  if (category === 'overheid_recht') return 'municipality_desk'
  if (category === 'integratie_cultuur') return 'integration_neighborhood'
  if (category === 'veiligheid_hulp') return 'emergency_112_phone'
  if (category === 'geld_belasting_verzekering') return 'tax_blue_envelope'
  return 'municipality_desk'
}

/**
 * Resolve a realistic scene id for a KNM question.
 * @param illustrationId - bank illustration id (vignette, deck_s###, voorbeeld_*)
 * @param questionNl - Dutch question text (used for deck slides and disambiguation)
 */
export function resolveKnmSceneId(
  illustrationId?: string | null,
  questionNl?: string | null,
  category?: KnmA2ExamCategory,
): string {
  const q = questionNl?.trim() ?? ''
  const id = illustrationId?.trim() ?? ''

  if (q) {
    const strong = inferKnmSceneFromQuestionNlStrong(q)
    if (strong) return strong
  }

  if (id && ILLUSTRATION_SCENE[id]) return ILLUSTRATION_SCENE[id]

  if (id.startsWith('deck_s')) {
    const index = Number.parseInt(id.replace('deck_s', ''), 10) - 1
    if (Number.isFinite(index) && index >= 0) {
      void knmSlideDeckIllustrationIdForIndex(index)
    }
    if (q) return inferSceneFromQuestionNl(q, category)
  }

  if (q) return inferSceneFromQuestionNl(q, category)
  if (id.startsWith('zorg_')) return 'gp_waiting_room'
  if (id.startsWith('werk_')) return 'employment_contract'
  if (id.startsWith('wonen_')) return 'rental_contract_signing'
  return 'municipality_desk'
}
