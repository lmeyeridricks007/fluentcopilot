import type { SessionPerformanceSignals } from '@/lib/practice-feedback/types'
import type { PhrasingUpgradeVm } from '@/lib/practice-feedback/types'

const MAX_FREE = 1
const MAX_PREMIUM = 3

/**
 * Deterministic “sounds more Dutch” nudges from user lines + scenario phrases.
 */
export function buildPhrasingUpgrades(
  signals: SessionPerformanceSignals,
  keyPhrases: Array<{ phrase: string; translation?: string }>,
  premiumDepth: boolean
): PhrasingUpgradeVm[] {
  const max = premiumDepth ? MAX_PREMIUM : MAX_FREE
  const out: PhrasingUpgradeVm[] = []

  for (const line of signals.userMessages) {
    const t = line.trim()
    if (t.length < 6) continue

    if (/^ik\s+wil\s+/i.test(t) && !/\bgraag\b/i.test(t)) {
      const nicer = t.replace(/^ik\s+wil\s+/i, 'Ik wil graag ')
      if (nicer !== t) {
        out.push({
          learnerSaid: t,
          betterNl: nicer.charAt(0).toUpperCase() + nicer.slice(1),
          why: '“Graag” softens requests — very natural in service Dutch.',
        })
      }
    }

    if (/\b(mag|kan)\s+ik\b/i.test(t) && !/\balstublieft\b/i.test(t) && t.length < 80) {
      out.push({
        learnerSaid: t,
        betterNl: `${t.replace(/\.*$/, '')}, alstublieft.`,
        why: 'Closing with “alstublieft” matches many A2 service scenes.',
      })
    }
  }

  if (out.length < max && keyPhrases[0] && signals.missedKeyPhrases.length > 0) {
    const target = signals.missedKeyPhrases[0]!
    const model = keyPhrases.find((k) => k.phrase === target.phrase) ?? keyPhrases[0]!
    const shortUser = signals.userMessages[signals.userMessages.length - 1]?.trim() ?? ''
    if (shortUser.length > 5) {
      out.push({
        learnerSaid: shortUser,
        betterNl: model.phrase,
        why: model.translation ? `Closer to: ${model.translation}` : 'Scenario-native chunk you can drop in.',
      })
    }
  }

  const dedup: PhrasingUpgradeVm[] = []
  const seen = new Set<string>()
  for (const p of out) {
    const k = p.learnerSaid.slice(0, 40)
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(p)
    if (dedup.length >= max) break
  }

  return dedup
}
