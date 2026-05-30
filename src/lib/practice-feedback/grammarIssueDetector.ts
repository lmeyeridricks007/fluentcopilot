import type { GrammarIssueVm, SessionPerformanceSignals } from '@/lib/practice-feedback/types'

const MAX = 2

/**
 * Lightweight A2 grammar flags — conservative to avoid nagging.
 */
export function detectGrammarIssues(signals: SessionPerformanceSignals): GrammarIssueVm[] {
  const issues: GrammarIssueVm[] = []

  if (signals.englishTokensDetected) {
    issues.push({
      id: 'register-mix',
      message: 'A few English words slipped in — try Dutch fillers (ja, even, oké) next time.',
      quickFix: 'Swap English bits for short Dutch chunks you already know.',
    })
  }

  const joined = signals.userMessages.join(' ')
  if (/ik\s+wil\s+[^.]{0,15}$/i.test(joined.trim()) && joined.length < 40) {
    issues.push({
      id: 'incomplete-want',
      message: '“Ik wil …” works best with a clear object (what you want).',
      quickFix: 'Ik wil graag … + noun, or Mag ik …?',
    })
  }

  return issues.slice(0, MAX)
}
