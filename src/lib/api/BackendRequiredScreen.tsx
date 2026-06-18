'use client'

import Link from 'next/link'

type Props = {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function BackendRequiredScreen({
  title = 'Backend API required',
  description = 'This feature needs your FluentCopilot API. Set NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend, then redeploy.',
  backHref = '/app/talk',
  backLabel = 'Back to Talk',
}: Props) {
  return (
    <div className="min-h-[100dvh] bg-surface text-ink-primary flex flex-col items-center justify-center px-6 text-center gap-4">
      <h1 className="text-body font-semibold text-ink-primary">{title}</h1>
      <p className="text-body-sm text-ink-secondary max-w-sm leading-relaxed">{description}</p>
      <Link
        href={backHref}
        className="min-h-touch inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-body-sm font-semibold text-ink-primary hover:bg-slate-50 shadow-card"
      >
        {backLabel}
      </Link>
    </div>
  )
}
