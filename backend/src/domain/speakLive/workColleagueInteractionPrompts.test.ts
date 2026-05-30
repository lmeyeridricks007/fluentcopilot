import { describe, expect, it } from 'vitest'
import { buildWorkColleagueInteractionRuntimeContext } from './workColleagueInteractionPrompts'

describe('buildWorkColleagueInteractionRuntimeContext', () => {
  const base = {
    taskLine: 'Het gaat om een document.',
    situationLine: 'Je bent op kantoor.',
    frictionLine: 'vraag kort welk document',
    frictionEnabled: true,
  }

  it('assembles the shared section structure [1]–[R]', () => {
    const ctx = buildWorkColleagueInteractionRuntimeContext({
      ...base,
      subType: 'team_task',
      variation: 'asking_for_help',
      level: 'A2',
      taskFocus: 'email',
      vocabularyRng: () => 0.42,
    })
    expect(ctx).toMatch(/\[1\] Systeemrol/)
    expect(ctx).toMatch(/\[2\] Algemene regels/)
    expect(ctx).toMatch(/\[3\] Subtype: TEAM_TASK/)
    expect(ctx).toMatch(/\[4\] Variatie: asking_for_help/)
    expect(ctx).toMatch(/\[L\] Niveau: A2/)
    expect(ctx).toMatch(/\[F\] Lichte wrijving/)
    expect(ctx).toMatch(/\[R\] Wrijvingsinstructie/)
    expect(ctx).toMatch(/\[V\] Taalpool bij dit onderwerp/)
    expect(ctx).toMatch(/Taakonderwerp \(email\)/)
  })

  it('includes variation-specific example lines', () => {
    const simple = buildWorkColleagueInteractionRuntimeContext({
      ...base,
      subType: 'colleague_chat',
      variation: 'simple_workplace_conversation',
      level: 'B1',
    })
    expect(simple).toContain('Hoe gaat het met dat document?')

    const help = buildWorkColleagueInteractionRuntimeContext({
      ...base,
      subType: 'colleague_chat',
      variation: 'asking_for_help',
      level: 'A1',
    })
    expect(help).toContain('Welk bestand bedoel je?')

    const clarify = buildWorkColleagueInteractionRuntimeContext({
      ...base,
      subType: 'manager_or_lead_request',
      variation: 'clarifying_tasks',
      level: 'A2',
    })
    expect(clarify).toContain('Dat moet vandaag klaar zijn.')
  })
})
