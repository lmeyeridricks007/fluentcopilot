import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  deriveScenarioReportGenerationUiStatus,
  getScenarioReportLoadingHeadline,
  isPartialOptimizedScenarioReport,
  isScenarioReportDevDiagnosticsEnabled,
} from '../scenarioReportGenerationState'
import { ScenarioReportGenerationDevPanel } from '../ScenarioReportGenerationDevPanel'

describe('scenario report generation UI state', () => {
  it('shows Building your speaking report while not verifying', () => {
    expect(
      getScenarioReportLoadingHeadline({ verifying: false, evaluationPhase: 'evaluating_speech' }),
    ).toBe('Building your speaking report')
  })

  it('deriveScenarioReportGenerationUiStatus returns complete for finished non-partial report', () => {
    const raw = { scenarioReportScoringDiagnosticsV1: { speechQualityStatus: 'available' } }
    expect(
      deriveScenarioReportGenerationUiStatus(
        { status: 'complete', evaluation: raw as unknown as Record<string, unknown> },
        raw as Record<string, unknown>,
      ),
    ).toBe('complete')
  })

  it('deriveScenarioReportGenerationUiStatus returns partial when merge diagnostics say partial speech', () => {
    const raw = { scenarioReportScoringDiagnosticsV1: { speechQualityStatus: 'partial' } }
    expect(
      deriveScenarioReportGenerationUiStatus(
        { status: 'complete', evaluation: raw as unknown as Record<string, unknown> },
        raw as Record<string, unknown>,
      ),
    ).toBe('partial')
  })

  it('isPartialOptimizedScenarioReport detects partial speech quality', () => {
    expect(isPartialOptimizedScenarioReport({ scenarioReportScoringDiagnosticsV1: { speechQualityStatus: 'partial' } })).toBe(
      true,
    )
    expect(isPartialOptimizedScenarioReport({ scenarioReportScoringDiagnosticsV1: { speechQualityStatus: 'available' } })).toBe(
      false,
    )
  })

  it('isScenarioReportDevDiagnosticsEnabled is false in production without evalDev', () => {
    expect(isScenarioReportDevDiagnosticsEnabled({ nodeEnv: 'production', evalDevQuery: null })).toBe(false)
  })

  it('isScenarioReportDevDiagnosticsEnabled is true when evalDev=1 even in production', () => {
    expect(isScenarioReportDevDiagnosticsEnabled({ nodeEnv: 'production', evalDevQuery: '1' })).toBe(true)
  })
})

describe('ScenarioReportGenerationDevPanel', () => {
  it('renders dev diagnostics markup (panel is dev-gated in the page, not inside the component)', () => {
    const html = renderToStaticMarkup(
      <ScenarioReportGenerationDevPanel
        payload={{
          status: 'running',
          evaluation: null,
          evaluationPhase: 'evaluating_speech',
        }}
        report={null}
      />,
    )
    expect(html).toContain('Scenario report diagnostics')
    expect(html).toContain('structuredLlmMs')
  })
})
