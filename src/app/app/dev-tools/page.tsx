'use client'

import Link from 'next/link'
import { isDevToolsRouteEnabled } from '@/lib/dev-tools'
import { DevToolsScreen } from '@/features/dev-tools/DevToolsScreen'

export default function DevToolsPage() {
  if (!isDevToolsRouteEnabled()) {
    return (
      <div className="px-4 py-12 max-w-md mx-auto space-y-4 text-center">
        <h1 className="text-title font-bold text-ink-primary">Not available</h1>
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          Internal tools are disabled in this build. Run the app in development or set{' '}
          <code className="text-xs bg-surface-muted px-1 rounded">NEXT_PUBLIC_DEV_TOOLS=true</code>.
        </p>
        <Link href="/app/talk" className="text-body-sm font-semibold text-primary-700 hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  return <DevToolsScreen />
}
