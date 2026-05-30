import { describe, expect, it } from 'vitest'
import {
  inferDirectionsDestinationFromDutchContext,
  inferOrderingFoodVenueFromDutchContext,
  inferSupermarketShopSettingFromDutchContext,
  resolveDirectionsSpeakLiveBackdropSrc,
  resolveOrderingFoodSpeakLiveBackdropSrc,
  resolveOrderingFoodVenueForSession,
  resolveSupermarketShopSpeakLiveBackdropSrc,
} from '../speakLiveScenarios'

describe('ordering food venue ↔ image', () => {
  it('infers takeaway from afhaalbalie context', () => {
    expect(
      inferOrderingFoodVenueFromDutchContext(
        'Je bent aan een afhaalbalie. De bediening klinkt licht gehaast.',
      ),
    ).toBe('takeaway')
  })

  it('prefers URL subType over inferred context', () => {
    expect(
      resolveOrderingFoodVenueForSession({
        subTypeFromUrl: 'cafe',
        scenarioContext: 'Je bent aan een afhaalbalie.',
      }),
    ).toBe('cafe')
  })

  it('resolves backdrop to takeaway PNG when only context hints takeaway', () => {
    const src = resolveOrderingFoodSpeakLiveBackdropSrc({
      scenarioContext: 'Een drukke afhaalbalie in Amsterdam.',
    })
    expect(src).toContain('ordering-food-takeaway')
  })
})

describe('supermarket / shop setting ↔ image', () => {
  it('infers pharmacy-style from apotheek context', () => {
    expect(inferSupermarketShopSettingFromDutchContext('Je bent bij de apotheekbalie.')).toBe('pharmacy_style')
  })

  it('prefers URL subType over inferred context', () => {
    const src = resolveSupermarketShopSpeakLiveBackdropSrc({
      subTypeFromUrl: 'general_retail',
      scenarioContext: 'Je bent in een supermarkt.',
    })
    expect(src).toContain('problem_solving')
  })
})

describe('directions destination ↔ hero', () => {
  it('infers pharmacy when text mentions apotheek even if centrum appears', () => {
    expect(
      inferDirectionsDestinationFromDutchContext(
        'Iemand helpt u de route naar de apotheek na te lopen (op straat in het centrum).',
      ),
    ).toBe('pharmacy')
  })

  it('resolves backdrop to pharmacy woman hero from Dutch context alone', () => {
    const src = resolveDirectionsSpeakLiveBackdropSrc({
      scenarioContext: 'Route naar de apotheek in het centrum.',
    })
    expect(src).toContain('directions-hero-pharmacy-woman')
  })

  it('resolves station cluster to station woman hero', () => {
    const src = resolveDirectionsSpeakLiveBackdropSrc({
      subTypeFromUrl: 'bus_stop',
    })
    expect(src).toContain('directions-hero-station-woman')
  })
})
