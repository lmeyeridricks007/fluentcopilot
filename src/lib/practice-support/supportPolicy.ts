import type {
  SupportEntitlementTier,
  SupportToolDefinition,
  SupportToolId,
  SupportToolRuntime,
} from '@/lib/practice-support/types'

const TOOLS: SupportToolDefinition[] = [
  { id: 'hint', label: 'Hint', shortLabel: 'Hint', premiumOnly: false, prominence: 'high' },
  {
    id: 'phrase_suggestions',
    label: 'Phrases',
    shortLabel: 'Phrases',
    premiumOnly: false,
    prominence: 'high',
  },
  {
    id: 'slower_reply',
    label: 'Simpler line',
    shortLabel: 'Simpler',
    premiumOnly: false,
    prominence: 'medium',
  },
  {
    id: 'translate_key_phrase',
    label: 'Key phrase',
    shortLabel: 'Phrase',
    premiumOnly: false,
    prominence: 'medium',
  },
  {
    id: 'what_means',
    label: 'What it means',
    shortLabel: 'Meaning',
    premiumOnly: false,
    prominence: 'medium',
  },
  {
    id: 'say_naturally',
    label: 'Say it naturally',
    shortLabel: 'Natural',
    premiumOnly: true,
    prominence: 'low',
  },
  {
    id: 'restart_turn',
    label: 'Redo last send',
    shortLabel: 'Redo',
    premiumOnly: false,
    prominence: 'medium',
  },
  {
    id: 'easier_mode',
    label: 'Easier for a bit',
    shortLabel: 'Easier',
    premiumOnly: false,
    prominence: 'low',
  },
]

function tierUnlocked(premiumOnly: boolean, tier: SupportEntitlementTier): boolean {
  if (!premiumOnly) return true
  return tier === 'premium' || tier === 'trial'
}

/** Data-driven availability: open / semi-guided conversation surfaces. */
export function getOpenPracticeSupportTools(
  tier: SupportEntitlementTier,
  opts: {
    hasAssistantLine: boolean
    hasUserTurnToRewind: boolean
    atMinDifficulty: boolean
    hasComposerDraft: boolean
  }
): SupportToolRuntime[] {
  return TOOLS.map((def) => {
    const unlocked = tierUnlocked(def.premiumOnly, tier)
    const couldPremiumLock = def.premiumOnly && !unlocked
    let gatedAvailable = true
    let disabledReason: string | undefined

    if (def.id === 'slower_reply' || def.id === 'translate_key_phrase' || def.id === 'what_means') {
      if (!opts.hasAssistantLine) {
        gatedAvailable = false
        disabledReason = 'No assistant line yet'
      }
    }
    if (def.id === 'restart_turn' && !opts.hasUserTurnToRewind) {
      gatedAvailable = false
      disabledReason = 'Nothing to redo yet'
    }
    if (def.id === 'easier_mode' && opts.atMinDifficulty) {
      gatedAvailable = false
      disabledReason = 'Easier mode is already on'
    }
    if (def.id === 'say_naturally' && !opts.hasComposerDraft) {
      gatedAvailable = false
      disabledReason = 'Type something first'
    }

    if (couldPremiumLock && gatedAvailable) {
      return { ...def, available: true, premiumLocked: true, disabledReason: 'Premium' }
    }

    return { ...def, available: gatedAvailable, premiumLocked: false, disabledReason }
  })
}

export function getSupportToolDefinition(id: SupportToolId): SupportToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function guidedSupportProminence(tool: SupportToolId): 'primary' | 'secondary' {
  if (tool === 'hint' || tool === 'phrase_suggestions') return 'primary'
  return 'secondary'
}
