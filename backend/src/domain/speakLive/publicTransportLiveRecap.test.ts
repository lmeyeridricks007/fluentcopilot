import { describe, expect, it } from 'vitest'
import { buildPublicTransportScenario } from './publicTransportScenario'
import { structuredSlotSupportsPublicTransportCompletedGoal } from './publicTransportLiveRecap'

describe('structuredSlotSupportsPublicTransportCompletedGoal', () => {
  it('maps ASK_DESTINATION slot to ticket ask goal for buying_ticket', () => {
    const rt = buildPublicTransportScenario({
      level: 'A2',
      subType: 'tram',
      variation: 'buying_ticket',
      destination: 'hotel',
      random: () => 0.1,
    })
    const ticketLabel = rt.goals.find((g) => g.id === 'ASK_FOR_TICKET_CLEARY')!.label
    expect(
      structuredSlotSupportsPublicTransportCompletedGoal('ASK_DESTINATION', ticketLabel, rt.variation, rt.goals)
    ).toBe(true)
  })

  it('maps ASK_DESTINATION slot to destination-clarity goal for route_and_platform', () => {
    const rt = buildPublicTransportScenario({
      level: 'A2',
      subType: 'tram',
      variation: 'route_and_platform',
      destination: 'hotel',
      random: () => 0.1,
    })
    const label = rt.goals.find((g) => g.id === 'IDENTIFY_DESTINATION_OR_LINE_CLEARY')!.label
    expect(structuredSlotSupportsPublicTransportCompletedGoal('ASK_DESTINATION', label, rt.variation, rt.goals)).toBe(
      true
    )
  })
})
