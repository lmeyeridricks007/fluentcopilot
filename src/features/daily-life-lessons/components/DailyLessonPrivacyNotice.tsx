/**
 * FD-09 — privacy notice for daily life lessons.
 */

import { Shield } from 'lucide-react'

export function DailyLessonPrivacyNotice() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex gap-3">
      <Shield className="w-5 h-5 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="text-body-sm font-medium text-ink-primary">Your data stays yours</p>
        <p className="text-caption text-ink-secondary mt-1">
          We use your captured moments only to build your lesson. We don't share this with third parties. You can use manual-only mode, disable the feature, or delete your history anytime.
        </p>
      </div>
    </div>
  )
}
