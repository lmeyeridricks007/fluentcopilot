import type { Metadata } from 'next'
import { MarketingTermsPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

export default function Page() {
  return <MarketingTermsPage />
}
