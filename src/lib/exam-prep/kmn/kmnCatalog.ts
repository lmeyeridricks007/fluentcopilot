import type { KmnTopic } from '@/lib/exam-prep/kmn/types'

export const KMN_TOPICS: KmnTopic[] = [
  {
    id: 'work',
    titleNl: 'Werk',
    taglineNl: 'Contract, uren, belasting — wat u moet weten',
    introNl:
      'Praktische kennis voor wie werkt in Nederland: afspraken met uw werkgever, uw rechten en waar u terecht kunt met vragen.',
    subtopics: [
      { id: 'contracts', titleNl: 'Contracten', blurbNl: 'Soorten contracten en proeftijd.' },
      { id: 'hours', titleNl: 'Werktijden', blurbNl: 'Uren, pauze en overwerk.' },
      { id: 'taxes_work', titleNl: 'Belasting van werk', blurbNl: 'Loonheffing en loonstrook.' },
    ],
  },
  {
    id: 'healthcare',
    titleNl: 'Gezondheid',
    taglineNl: 'Huisarts, verzekering, spoed — de juiste stap',
    introNl:
      'Zo navigeert u het Nederlandse zorgsysteem: eerst de huisarts, wanneer spoed, en hoe uw verzekering werkt.',
    subtopics: [
      { id: 'insurance', titleNl: 'Zorgverzekering', blurbNl: 'Basisverzekering en eigen risico.' },
      { id: 'gp', titleNl: 'Huisarts', blurbNl: 'Uw vaste arts en verwijzingen.' },
      { id: 'emergency', titleNl: 'Spoed', blurbNl: 'Huisartsenpost, 112 en spoedlijn.' },
    ],
  },
  {
    id: 'government',
    titleNl: 'Overheid',
    taglineNl: 'Gemeente, BSN, belastingen',
    introNl:
      'Wat u regelt bij de gemeente, wat een BSN is, en waar u terecht voor toeslagen en aangifte.',
    subtopics: [
      { id: 'municipality', titleNl: 'Gemeente', blurbNl: 'Inschrijven en paspoort.' },
      { id: 'bsn', titleNl: 'BSN', blurbNl: 'Citizen service number.' },
      { id: 'taxes_benefits', titleNl: 'Belasting & toeslagen', blurbNl: 'Belastingdienst en toeslagen.' },
    ],
  },
  {
    id: 'culture',
    titleNl: 'Samenleving',
    taglineNl: 'Afspraken, directheid, feestdagen',
    introNl:
      'Handige sociale en culturele kennis: hoe Nederlanders vaak communiceren, afspraken maken en omgaan met buren en werk.',
    subtopics: [
      { id: 'directness', titleNl: 'Direct communiceren', blurbNl: 'Geen grof bedoeld, vaak eerlijk en kort.' },
      { id: 'appointments', titleNl: 'Afspraken', blurbNl: 'Op tijd komen en afzeggen.' },
      { id: 'social', titleNl: 'Bezoek & feest', blurbNl: 'Verjaardagen en buren.' },
    ],
  },
]

export function getKmnTopic(id: string): KmnTopic | undefined {
  return KMN_TOPICS.find((t) => t.id === id)
}
