import type { Metadata } from 'next'
import { MarketingContactPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'Contact',
}

export default function Page() {
  return <MarketingContactPage />
}
