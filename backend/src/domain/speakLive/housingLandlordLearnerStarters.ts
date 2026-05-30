/**
 * Learner-facing Dutch starters for housing / landlord (Speak Live hints).
 * Structured pools: see `housingLandlordVocabularyPools.ts` for flat issue/topic/vocab lists.
 */

import type { HousingLandlordDetailFocus, HousingLandlordLevel, HousingLandlordSubtype, HousingLandlordVariation } from './housingLandlordScenario'
import {
  ASKING_RENT_CONTRACT_STARTER_ANCHORS_BY_LEVEL,
  REPORTING_STARTER_ANCHORS_BY_LEVEL,
} from './housingLandlordVocabularyPools'

const REPORTING_A1: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  heating: ['De verwarming werkt niet.', 'Het is koud in huis.', 'Er is geen warm water.'],
  leak: ['Er is een lek.', 'Er lekt water in de keuken.', 'Er is een waterprobleem.'],
  broken_shower: ['De douche is kapot.', 'Het douchewater wordt niet warm.'],
  electricity_light: ['Het licht doet het niet.', 'De stroom is weg in de kamer.'],
  window_door: ['Het raam sluit niet goed.', 'De deur gaat niet dicht.'],
  washing_machine: ['De wasmachine werkt niet.', 'De wasmachine start niet.'],
  mold_moisture: ['Er is schimmel.', 'Ik zie vocht op de muur.'],
  noise_building_simple: ['Het is erg lawaaierig in het gebouw.', 'De buren maken veel geluid.'],
  internet_simple: ['Het internet werkt niet goed.', 'De wifi valt steeds weg.'],
}

const REPORTING_A2: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  heating: ['De verwarming doet het al een paar dagen niet — kunt u iemand sturen?', 'Het wordt niet warm in de woonkamer.'],
  leak: ['Er is een lek bij de gootsteen — het wordt erger.', 'Er druppelt water uit het plafond.'],
  broken_shower: ['De douche loopt niet goed door.', 'Er komt bijna geen water uit de douche.'],
  electricity_light: ['De lamp in de gang flikkert en doet het soms niet.', 'De groep valt steeds uit.'],
  window_door: ['Het raam laat tocht door — kunt u dat bekijken?', 'Het slot van de voordeur zit moeilijk.'],
  washing_machine: ['De wasmachine maakt een rare brom en stopt.', 'Er komt geen water in de machine.'],
  mold_moisture: ['Er komt schimmel terug in de badkamer.', 'Er is een vieze geur en donkere plekken op het plafond.'],
  noise_building_simple: ['Er is veel geluid van de lift of de gang — kunt u iets doen?', 'Het lawaai komt vooral ’s avonds.'],
  internet_simple: ['De verbinding is heel slecht in mijn flat — kunt u helpen?', 'Ik kan niet goed thuiswerken door de wifi.'],
}

const REPORTING_B1: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  heating: [
    'Ik wil melden dat de verwarming al enkele dagen uitvalt; wat is de procedure om een monteur te krijgen?',
  ],
  leak: ['Er is structureel vocht bij de keukenmuur; kunt u laten kijken of er leidingwerk achter zit?'],
  broken_shower: ['De douche geeft nauwelijks druk; kunt u bevestigen of dit onder uw onderhoud valt?'],
  electricity_light: ['De verlichting in de gang valt uit zodra we de oven aanzetten — klopt het dat dat apart gemeld moet worden?'],
  window_door: ['Het raam in de slaapkamer sluit niet goed; kunt u een afspraak maken voor reparatie?'],
  washing_machine: ['De wasmachine stopt halverwege het programma; mag ik een monteur via u?'],
  mold_moisture: ['Ik maak me zorgen over schimmel in de badkamer; kunt u laten inspecteren wat de oorzaak is?'],
  noise_building_simple: ['Er is aanhoudend geluid van de bovenbuur; wat is de juiste route om dit te melden?'],
  internet_simple: ['De wifi in het gebouw is onstabiel; is er een storing of ligt het aan de woning?'],
}

const CONTRACT_A1: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  rent_due_date: ['Wanneer moet ik de huur betalen?', 'Tot welke dag is de huur te laat?'],
  deposit_borg: ['Wanneer krijg ik mijn borg terug?', 'Hoe hoog is de borg?'],
  notice_period: ['Hoe lang is de opzegtermijn?', 'Hoe werkt de opzegtermijn?'],
  contract_duration: ['Hoe lang is het contract?', 'Is het voor onbepaalde tijd?'],
  utilities_included: ['Wat zit er in de huur inbegrepen?', 'Is gas en licht inclusief?'],
  maintenance_responsibility: ['Wie repareert dit?', 'Is dit voor de verhuurder?'],
  payment_method: ['Hoe moet ik betalen?', 'Mag ik per bank betalen?'],
  rent_change_simple: ['Wordt de huur volgend jaar hoger?', 'Krijg ik een brief over de huur?'],
}

const CONTRACT_A2: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  rent_due_date: ['Moet de huur op de eerste staan, of mag het een paar dagen later?', 'Krijg ik een herinnering als ik te laat ben?'],
  deposit_borg: ['Wanneer wordt de borg teruggestort na vertrek?', 'Wordt de borg verrekend met de laatste maand?'],
  notice_period: ['Hoe werkt de opzegtermijn bij dit contract?', 'Moet ik schriftelijk opzeggen?'],
  contract_duration: ['Tot wanneer loopt mijn huurcontract door?', 'Kan ik tussentijds verlengen?'],
  utilities_included: ['Betaal ik servicekosten apart of zit dat in de huur?', 'Is internet bij de VvE-kosten inbegrepen?'],
  maintenance_responsibility: ['Wie betaalt kleine reparaties in de woning?', 'Moet ik eerst melden bij u of bij de beheerder?'],
  payment_method: ['Welk rekeningnummer moet ik gebruiken voor de huur?', 'Kan ik automatische incasso krijgen?'],
  rent_change_simple: ['Hoe vaak mag de huur worden aangepast?', 'Krijg ik vooraf bericht bij een verhoging?'],
}

const CONTRACT_B1: Partial<Record<HousingLandlordDetailFocus, string[]>> = {
  rent_due_date: [
    'Kunt u bevestigen hoe de betaling per maand precies werkt en of er een coulanceperiode is na de eerste?',
  ],
  deposit_borg: ['Wat is de afspraak over terugbetaling van de borg na sleuteloverdracht en inspectie?'],
  notice_period: ['Hoe zit de opzegtermijn wederzijds — wat moet ik schriftelijk regelen?'],
  contract_duration: ['Wat is de contractduur en zijn er opties om tussentijds op te zeggen?'],
  utilities_included: ['Welke nutsvoorzieningen en servicekosten zitten wel of niet in de kale huur?'],
  maintenance_responsibility: ['Welk onderhoud valt onder verhuurder en wat is voor de huurder?'],
  payment_method: ['Welke betaalwijze wordt verwacht en ontvangt u bewijs per mail?'],
  rent_change_simple: ['Hoe wordt een eventuele huuraanpassing gecommuniceerd en op welke termijn?'],
}

function dedupeHints(lines: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const k = l.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(l.trim())
  }
  return out
}

function poolFor(
  variation: HousingLandlordVariation,
  level: HousingLandlordLevel,
  focus: HousingLandlordDetailFocus
): string[] {
  if (variation === 'reporting_issue') {
    if (level === 'A1') return [...(REPORTING_A1[focus] ?? REPORTING_A1.heating ?? [])]
    if (level === 'B1') return [...(REPORTING_B1[focus] ?? REPORTING_A2[focus] ?? REPORTING_A2.heating ?? [])]
    return [...(REPORTING_A2[focus] ?? REPORTING_A2.heating ?? [])]
  }
  if (level === 'A1') return [...(CONTRACT_A1[focus] ?? CONTRACT_A1.rent_due_date ?? [])]
  if (level === 'B1') return [...(CONTRACT_B1[focus] ?? CONTRACT_A2[focus] ?? CONTRACT_A2.rent_due_date ?? [])]
  return [...(CONTRACT_A2[focus] ?? CONTRACT_A2.rent_due_date ?? [])]
}

function levelAnchors(variation: HousingLandlordVariation, level: HousingLandlordLevel): readonly string[] {
  return variation === 'reporting_issue'
    ? REPORTING_STARTER_ANCHORS_BY_LEVEL[level]
    : ASKING_RENT_CONTRACT_STARTER_ANCHORS_BY_LEVEL[level]
}

function anchorIndexForFocus(focus: HousingLandlordDetailFocus, variation: HousingLandlordVariation): number {
  const reportingOrder: HousingLandlordDetailFocus[] = [
    'heating',
    'leak',
    'broken_shower',
    'electricity_light',
    'window_door',
    'washing_machine',
    'mold_moisture',
    'noise_building_simple',
    'internet_simple',
  ]
  const contractOrder: HousingLandlordDetailFocus[] = [
    'rent_due_date',
    'deposit_borg',
    'notice_period',
    'contract_duration',
    'utilities_included',
    'maintenance_responsibility',
    'payment_method',
    'rent_change_simple',
  ]
  const order = variation === 'reporting_issue' ? reportingOrder : contractOrder
  const idx = order.indexOf(focus)
  return idx >= 0 ? idx % 4 : 0
}

function adaptSubtype(subType: HousingLandlordSubtype | undefined, hints: string[]): string[] {
  if (!subType) return hints
  if (subType === 'rental_agency') {
    return hints.map((h) => {
      if (h.startsWith('Wie repareert')) return 'Is dit via de makelaar of de eigenaar?'
      return h
    })
  }
  if (subType === 'building_manager') {
    return hints.map((h) => {
      if (/huur|borg|contract/i.test(h) && /lek|douche|verwarming|schimmel|wasmachine/i.test(h) === false) {
        return h.replace(/^Wanneer krijg ik mijn borg/, 'Via de verhuurder: wanneer krijg ik de borg')
      }
      return h
    })
  }
  return hints
}

export function getHousingLandlordStarterHintsForRuntime(
  level: HousingLandlordLevel,
  variation: HousingLandlordVariation | undefined,
  subType: HousingLandlordSubtype | undefined,
  detailFocus?: string
): string[] {
  const v = (variation ?? 'reporting_issue') as HousingLandlordVariation
  const f = (detailFocus ?? (v === 'reporting_issue' ? 'heating' : 'rent_due_date')) as HousingLandlordDetailFocus
  const pool = poolFor(v, level, f)
  const anchors = levelAnchors(v, level)
  const primary = anchors[anchorIndexForFocus(f, v)] ?? anchors[0]!
  const merged = dedupeHints([primary, ...pool])
  return dedupeHints(adaptSubtype(subType, merged)).slice(0, 6)
}
