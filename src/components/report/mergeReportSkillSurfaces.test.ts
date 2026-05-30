import { describe, expect, it } from 'vitest'
import type { ReportLearningMemoryRibbon } from '@/lib/api/apiTypes'
import { mergeReportSkillSurfaces, mergedSkillSurfacesHaveContent } from './mergeReportSkillSurfaces'

describe('mergeReportSkillSurfaces', () => {
  it('caps at three rows: this session first, then next step, then top skill trajectory line', () => {
    const ribbon: ReportLearningMemoryRibbon = {
      lines: [],
      nextStep: { title: 'Best next step', subtitle: 'Try Small talk for 5 minutes.', reason: 'x' },
      skillInsights: [
        'Your pronunciation is improving — keep the momentum with short, steady reps.',
        'Follow-up questions still want more reps — small daily bursts beat long cramming.',
      ],
      surfaces: {
        sessionEcho: 'This session helped your storytelling.',
        currentFocus: null,
        recurringPattern: null,
        improving: null,
      },
    }
    const merged = mergeReportSkillSurfaces(ribbon, 3)
    expect(merged.length).toBe(3)
    expect(merged[0]!.kicker).toBe('This session')
    expect(merged[0]!.body.toLowerCase()).toContain('storytelling')
    expect(merged[1]!.kicker).toContain('Best next')
    expect(merged[1]!.body).toContain('Small talk')
    expect(merged[2]!.body.toLowerCase()).toContain('pronunciation')
    expect(merged.some((m) => m.body.toLowerCase().includes('follow-up'))).toBe(false)
  })

  it('mergedSkillSurfacesHaveContent is true when only nextPractice is set', () => {
    const ribbon: ReportLearningMemoryRibbon = {
      lines: [],
      nextStep: null,
      nextPractice: { kind: 'talk_hub', href: '/app/talk', label: 'Open Talk' },
      skillInsights: [],
    }
    expect(mergedSkillSurfacesHaveContent(ribbon, [])).toBe(true)
  })

  it('dedupes overlapping session echo and skill text', () => {
    const ribbon: ReportLearningMemoryRibbon = {
      lines: [],
      skillInsights: ['Your pronunciation is improving — keep going.'],
      surfaces: {
        sessionEcho: 'Your pronunciation is improving — keep going.',
        currentFocus: null,
        recurringPattern: null,
        improving: null,
      },
    }
    const merged = mergeReportSkillSurfaces(ribbon, 3)
    const pron = merged.filter((m) => m.body.toLowerCase().includes('pronunciation'))
    expect(pron.length).toBeLessThanOrEqual(1)
  })
})
