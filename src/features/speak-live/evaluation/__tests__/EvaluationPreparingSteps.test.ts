import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EvaluationPreparingSteps } from '../EvaluationPreparingSteps'

describe('EvaluationPreparingSteps', () => {
  it('shows the QA verification step while QA is running', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvaluationPreparingSteps, {
        apiStatus: 'running',
        speakLivePhase: 'verifying',
        qaStatus: 'running',
      }),
    )

    expect(html).toContain('Verifying your feedback')
    expect(html).toContain('Checking that the coaching matches what you actually said and recorded.')
  })
})
