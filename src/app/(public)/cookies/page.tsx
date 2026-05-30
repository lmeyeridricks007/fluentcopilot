import type { Metadata } from 'next'
import { MarketingCookiesPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'Cookie Policy',
}

export default function Page() {
  return <MarketingCookiesPage />
}
