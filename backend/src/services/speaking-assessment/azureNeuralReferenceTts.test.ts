import { describe, expect, it } from 'vitest'
import { buildReferenceSsml } from './azureNeuralReferenceTts'

describe('buildReferenceSsml', () => {
  it('includes mstts express-as role when requested', () => {
    const ssml = buildReferenceSsml({
      text: 'Hallo.',
      voice: 'nl-NL-FennaNeural',
      prosodyRate: '-3%',
      prosodyVolume: 'soft',
      prosodyPitch: '+1st',
      msttsExpressAsRole: 'YoungAdultFemale',
    })
    expect(ssml).toContain('xmlns:mstts="https://www.w3.org/2001/mstts"')
    expect(ssml).toContain('<mstts:express-as role="YoungAdultFemale">')
    expect(ssml).toContain('name="nl-NL-FennaNeural"')
    expect(ssml).toContain('Hallo.')
  })

  it('omits mstts wrapper when role omitted', () => {
    const ssml = buildReferenceSsml({ text: 'Test', voice: 'nl-NL-FennaNeural' })
    expect(ssml).not.toContain('mstts:express-as')
  })
})
