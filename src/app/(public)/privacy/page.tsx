import type { Metadata } from 'next'
import { MarketingPrivacyPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function Page() {
  return <MarketingPrivacyPage />
}
