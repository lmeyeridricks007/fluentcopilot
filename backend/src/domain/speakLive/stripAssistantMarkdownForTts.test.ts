import { describe, expect, it } from 'vitest'
import { stripAssistantMarkdownForTts } from './stripAssistantMarkdownForTts'

describe('stripAssistantMarkdownForTts', () => {
  it('removes bold markers', () => {
    expect(stripAssistantMarkdownForTts('**Hoi!**')).toBe('Hoi!')
  })

  it('removes stray asterisks', () => {
    expect(stripAssistantMarkdownForTts('Hoi! ** Ik ben je coach')).toBe('Hoi! Ik ben je coach')
  })
})
