import type { ScenarioConfig } from '../../models/contracts'
import { buildBookingReservationsSpeakLiveLlmContract } from '../../domain/speakLive/bookingReservationsEvaluationContract'
import { buildStoreServiceIssueSpeakLiveLlmContract } from '../../domain/speakLive/storeServiceIssueEvaluationContract'
import { buildWorkColleagueInteractionSpeakLiveLlmContract } from '../../domain/speakLive/workColleagueInteractionEvaluationContract'
import { buildHousingLandlordSpeakLiveLlmContract } from '../../domain/speakLive/housingLandlordEvaluationContract'
import { buildPhoneCallSpeakLiveLlmContract } from '../../domain/speakLive/phoneCallEvaluationContract'
import { buildSmallTalkSpeakLiveLlmContract } from '../../domain/speakLive/smallTalkEvaluationContract'
import { buildMeetingNewPeopleSpeakLiveLlmContract } from '../../domain/speakLive/meetingNewPeopleEvaluationContract'
import { buildPartySocialSpeakLiveLlmContract } from '../../domain/speakLive/partySocialEvaluationContract'
import { buildExplainingSomethingSpeakLiveLlmContract } from '../../domain/speakLive/explainingSomethingEvaluationContract'
import { buildStorytellingSpeakLiveLlmContract } from '../../domain/speakLive/storytellingEvaluationContract'
import { buildOpinionsDiscussionsSpeakLiveLlmContract } from '../../domain/speakLive/opinionsDiscussionsEvaluationContract'
import { buildDoctorPharmacySpeakLiveLlmContract } from '../../domain/speakLive/doctorPharmacyEvaluationContract'
import { buildPublicTransportSpeakLiveLlmContract } from '../../domain/speakLive/publicTransportEvaluationContract'
import { buildDirectionsSpeakLiveLlmContract } from './directionsSpeakLivePrompt'
import { buildPublicTransportSpeakLiveSceneContract } from '../../domain/speakLive/publicTransportSpeakLivePrompt'

export function scenarioContextPartial(s: ScenarioConfig): string {
  const runtime = s.runtimeConfig
  const slugNorm = s.slug.trim().toLowerCase().replace(/-/g, '_')
  const scenarioLine =
    slugNorm === 'ordering_food' ||
    slugNorm === 'supermarket_shop' ||
    slugNorm === 'directions_getting_somewhere' ||
    slugNorm === 'booking_reservations' ||
    slugNorm === 'store_service_issue' ||
    slugNorm === 'doctor_pharmacy' ||
    slugNorm === 'work_colleague_interaction' ||
    slugNorm === 'housing_landlord' ||
    slugNorm === 'phone_call' ||
    slugNorm === 'small_talk' ||
    slugNorm === 'meeting_new_people' ||
    slugNorm === 'party_social' ||
    slugNorm === 'explaining_something' ||
    slugNorm === 'storytelling' ||
    slugNorm === 'opinions_discussions'
      ? `Scenario (Nederlands taalscenario): ${s.title} (${s.slug})`
      : `Scenario: ${s.title} (${s.slug})`
  const learnerRoleLine =
    slugNorm === 'ordering_food'
      ? `Rol van de oefenaar: klant in een horeca-scène (antwoordt in het Nederlands).`
      : slugNorm === 'supermarket_shop'
        ? `Rol van de oefenaar: klant in een winkelscene (antwoordt in het Nederlands).`
        : slugNorm === 'booking_reservations'
          ? `Rol van de oefenaar: klant die reserveert of een afspraak maakt — restaurant, kapsalon of balie (antwoordt in het Nederlands).`
          : slugNorm === 'store_service_issue'
            ? `Rol van de oefenaar: klant met een retour, serviceprobleem of defect product — winkel- of servicebalie (antwoordt in het Nederlands).`
          : slugNorm === 'doctor_pharmacy'
            ? `Rol van de oefenaar: patiënt of bezoeker — arts, apotheek of balie; taalpraktijk, geen echte diagnose (antwoordt in het Nederlands).`
          : slugNorm === 'work_colleague_interaction'
            ? `Rol van de oefenaar: collega in een realistische werkomgeving in Nederland — korte werkpraat, hulp vragen of een taak verduidelijken (antwoordt in het Nederlands).`
          : slugNorm === 'housing_landlord'
            ? `Rol van de oefenaar: huurder of bewoner — meldt een woningprobleem of stelt een praktische vraag over huur, borg of contract (antwoordt in het Nederlands).`
          : slugNorm === 'phone_call'
            ? `Rol van de oefenaar: beller — geen visuele context; alleen stem; moet luisteren, kort antwoorden, en herstellen als iets onduidelijk is (antwoordt in het Nederlands).`
          : slugNorm === 'small_talk'
            ? `Rol van de oefenaar: jezelf in een informeel Nederlands gesprek — small talk, geen checklist; antwoordt in het Nederlands.`
            : slugNorm === 'meeting_new_people'
              ? `Rol van de oefenaar: jezelf bij een eerste kennismaking — voorstellen, korte achtergrond, vervolgvragen; antwoordt in het Nederlands.`
              : slugNorm === 'party_social'
                ? `Rol van de oefenaar: jezelf op een feest of sociale borrel — korte wissels, reageren en vragen; antwoordt in het Nederlands.`
                : slugNorm === 'explaining_something'
                  ? `Rol van de oefenaar: jij legt iets uit in het Nederlands — langere, gestructureerde antwoorden (stappen); de assistent luistert en stelt soms één verduidelijkingsvraag.`
                  : slugNorm === 'storytelling'
                    ? `Rol van de oefenaar: jij vertelt een verhaal in het Nederlands — begin, midden, einde; verleden tijd; de assistent is een geïnteresseerde luisteraar met korte vervolgvragen.`
                    : slugNorm === 'opinions_discussions'
                      ? `Rol van de oefenaar: jezelf — geef je mening, ga eens of oneens in, en leg kort uit waarom; respectvol; de assistent zet een standpunt en vraagt licht door; antwoordt in het Nederlands.`
                      : slugNorm === 'directions_getting_somewhere'
                        ? `Rol van de oefenaar: u opent het gesprek in het Nederlands (geen eerder assistentbericht); vraagt de weg, noemt waar u heen moet, of vat de route samen — daarna reageert de assistent kort in het Nederlands.`
                        : `Learner role: ${s.userRole}`
  return [
    scenarioLine,
    learnerRoleLine,
    `Taalaanduiding (strikt): alle zinnen die de assistent aan de oefenaar toont/spreekt zijn uitsluitend Nederlands — geen Engels, ook niet in begroetingen of tussenzinnen.`,
    `Scenario brief: ${s.description}`,
    `Goals: ${s.goals.join(' | ')}`,
    `Starters (hints only): ${s.starterSuggestions.join(' | ')}`,
    runtime?.context ? `Runtime context: ${runtime.context}` : '',
    runtime?.coreSkills?.length ? `Core skills: ${runtime.coreSkills.join(' | ')}` : '',
    runtime?.assistantBehavior
      ? `Assistant behavior: pace=${runtime.assistantBehavior.pace}; register=${runtime.assistantBehavior.register}; tone=${runtime.assistantBehavior.tone}; style=${runtime.assistantBehavior.responseStyle.join(' | ')}; friction=${runtime.assistantBehavior.frictionStyle.join(' | ')}; recommendation=${runtime.assistantBehavior.recommendationStyle ?? 'natural'}; frictionChance=${runtime.assistantBehavior.frictionChance ?? 'light'}`
      : '',
    runtime?.assistantBehavior?.openingVariants?.length
      ? `Opening variation examples: ${runtime.assistantBehavior.openingVariants.join(' | ')}`
      : '',
    runtime?.assistantBehavior?.guardrails?.length
      ? `Assistant guardrails: ${runtime.assistantBehavior.guardrails.join(' | ')}`
      : '',
    runtime?.difficultyAdjustments
      ? `Level adaptation: ${runtime.difficultyAdjustments.learnerLevel}; pacing=${runtime.difficultyAdjustments.responsePacing}; vocabulary=${runtime.difficultyAdjustments.vocabularyRange}; follow-ups=${runtime.difficultyAdjustments.followUpStyle}; misunderstandings=${runtime.difficultyAdjustments.misunderstandingLevel}`
      : '',
    slugNorm === 'directions_getting_somewhere' && runtime ? buildDirectionsSpeakLiveLlmContract(runtime) : '',
    slugNorm === 'train_station' && runtime?.id === 'public_transport'
      ? [buildPublicTransportSpeakLiveSceneContract(runtime), buildPublicTransportSpeakLiveLlmContract(runtime)].join('\n\n')
      : '',
    slugNorm === 'booking_reservations' && runtime?.id === 'booking_reservations'
      ? buildBookingReservationsSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'store_service_issue' && runtime?.id === 'store_service_issue'
      ? buildStoreServiceIssueSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'doctor_pharmacy' && runtime?.id === 'doctor_pharmacy' ? buildDoctorPharmacySpeakLiveLlmContract(runtime) : '',
    slugNorm === 'work_colleague_interaction' && runtime?.id === 'work_colleague_interaction'
      ? buildWorkColleagueInteractionSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'housing_landlord' && runtime?.id === 'housing_landlord'
      ? buildHousingLandlordSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'phone_call' && runtime?.id === 'phone_call' ? buildPhoneCallSpeakLiveLlmContract(runtime) : '',
    slugNorm === 'small_talk' && runtime?.id === 'small_talk' ? buildSmallTalkSpeakLiveLlmContract(runtime) : '',
    slugNorm === 'meeting_new_people' && runtime?.id === 'meeting_new_people'
      ? buildMeetingNewPeopleSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'party_social' && runtime?.id === 'party_social' ? buildPartySocialSpeakLiveLlmContract(runtime) : '',
    slugNorm === 'explaining_something' && runtime?.id === 'explaining_something'
      ? buildExplainingSomethingSpeakLiveLlmContract(runtime)
      : '',
    slugNorm === 'storytelling' && runtime?.id === 'storytelling' ? buildStorytellingSpeakLiveLlmContract(runtime) : '',
    slugNorm === 'opinions_discussions' && runtime?.id === 'opinions_discussions'
      ? buildOpinionsDiscussionsSpeakLiveLlmContract(runtime)
      : '',
  ].join('\n')
}
