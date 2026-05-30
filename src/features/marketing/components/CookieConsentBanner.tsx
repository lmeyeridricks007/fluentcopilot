'use client'

import { useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'alc_cookie_consent_v1'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(COOKIE_CONSENT_KEY)
      setVisible(existing == null)
    } catch {
      setVisible(true)
    }
  }, [])

  function saveChoice(choice: 'accepted' | 'rejected') {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, choice)
    } catch {
      // If storage is blocked, we still hide the banner for this session.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-surface-elevated/95 backdrop-blur-md shadow-elevated">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          We use essential cookies to keep the site working and minimal analytics cookies to improve it. You can read
          more on our cookie page.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex min-h-touch items-center justify-center rounded-lg border border-slate-300 bg-surface-elevated px-3 py-2 text-body-sm font-semibold text-ink-primary transition-colors hover:bg-surface-muted"
            onClick={() => saveChoice('rejected')}
          >
            Reject
          </button>
          <button
            type="button"
            className="inline-flex min-h-touch items-center justify-center rounded-lg border border-primary-700/10 bg-primary-600 px-3 py-2 text-body-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-700"
            onClick={() => saveChoice('accepted')}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
