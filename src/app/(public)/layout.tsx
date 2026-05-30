import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PublicShell } from '@/features/marketing'
import { PublicRouteGuard } from '@/components/routing/PublicRouteGuard'

export const metadata: Metadata = {
  metadataBase: new URL('https://fluentcopilot.com'),
  title: {
    default: 'FluentCopilot — Practical Dutch coach for life in the Netherlands',
    template: '%s — FluentCopilot',
  },
  description:
    'Message and speak in real scenarios, get usable feedback, save your own Dutch, and review what matters — with structured A2 / inburgering prep when you need it.',
  openGraph: {
    title: 'FluentCopilot — Practical Dutch coach for life in the Netherlands',
    description:
      'Message and speak in real scenarios, get usable feedback, save your own Dutch, and review what matters — with structured A2 / inburgering prep when you need it.',
    url: 'https://fluentcopilot.com',
    siteName: 'FluentCopilot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FluentCopilot — Practical Dutch coach for life in the Netherlands',
    description:
      'Message and speak in real scenarios, get usable feedback, save your own Dutch, and review what matters — with structured A2 / inburgering prep when you need it.',
  },
}

export default function PublicMarketingLayout({ children }: { children: ReactNode }) {
  return (
    <PublicRouteGuard>
      <PublicShell>{children}</PublicShell>
    </PublicRouteGuard>
  )
}
