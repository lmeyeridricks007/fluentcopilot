import { describe, expect, it } from 'vitest'
import { listeningModeReportHref, listeningModeSessionHref } from '@/lib/routing/appRoutes'

describe('Listening FluentCopilot routes', () => {
  it('listeningModeReportHref encodes sessionId for stable reopen', () => {
    const sid = 'abc/def+123'
    const href = listeningModeReportHref(sid)
    expect(href).toContain(encodeURIComponent(sid))
    expect(href).toMatch(/\/app\/talk\/listening\/report\?/)
    expect(href).toContain('sessionId=')
  })

  it('listeningModeSessionHref carries pack, level, and optional provenance', () => {
    const href = listeningModeSessionHref({
      packId: 'pack-cafe-burst',
      level: 'A2',
      fromTrack: 't1',
      fromScenario: 'train_station',
    })
    expect(href).toContain('pack=pack-cafe-burst')
    expect(href).toContain('level=A2')
    expect(href).toContain('fromTrack=t1')
    expect(href).toContain('fromScenario=train_station')
  })
})
