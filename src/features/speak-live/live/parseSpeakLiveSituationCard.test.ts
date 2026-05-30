import { describe, expect, it } from 'vitest'
import { parseSpeakLiveSituationCard } from './parseSpeakLiveSituationCard'

describe('parseSpeakLiveSituationCard', () => {
  it('parses work-style summary into role, setting, and bullet details', () => {
    const raw =
      'Je hebt een korte, professionele werkinteractie: status of kleine afstemming. Setting: team — taak en volgende stap. Het gaat om een presentatie of slides die klaar moeten. Je checkt kort waar iemand staat met een stuk werk.'
    const out = parseSpeakLiveSituationCard(raw)
    expect(out.kind).toBe('structured')
    if (out.kind !== 'structured') return
    expect(out.intro).toContain('werkinteractie')
    expect(out.setting).toContain('team')
    expect(out.bullets).toHaveLength(2)
    expect(out.bullets[0]).toMatch(/presentatie|slides/i)
    expect(out.emphasis).toBeUndefined()
  })

  it('parses store summary with Kern van deze run emphasis', () => {
    const raw =
      'Je wilt iets retourneren of ruilen, legt kort uit waarom, en vraagt wat er mogelijk is. Setting: winkel / servicebalie retour. Kern van deze run: je mist de bon maar hebt wel het aankoopbewijs op je telefoon.'
    const out = parseSpeakLiveSituationCard(raw)
    expect(out.kind).toBe('structured')
    if (out.kind !== 'structured') return
    expect(out.intro).toContain('retourneren')
    expect(out.setting).toContain('winkel')
    expect(out.emphasis?.title).toBe('Focus for this session')
    expect(out.emphasis?.body).toContain('bon')
    expect(out.bullets).toHaveLength(0)
  })

  it('parses booking Jouw voorkeur marker', () => {
    const raw =
      'Je wilt reserveren of een afspraak maken en geeft kerngegevens. Setting: restaurant. Jouw voorkeur in deze run: een tafel bij het raam.'
    const out = parseSpeakLiveSituationCard(raw)
    expect(out.kind).toBe('structured')
    if (out.kind !== 'structured') return
    expect(out.emphasis?.title).toBe('Your preference')
    expect(out.emphasis?.body).toContain('raam')
  })

  it('returns plain when there is no Setting delimiter', () => {
    const raw = 'Je bent in een supermarkt en zoekt melk. De medewerker is vriendelijk.'
    const out = parseSpeakLiveSituationCard(raw)
    expect(out.kind).toBe('plain')
    if (out.kind !== 'plain') return
    expect(out.text).toContain('supermarkt')
  })
})
