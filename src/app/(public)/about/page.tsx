import type { Metadata } from 'next'
import { MarketingAboutPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'About',
}

export default function Page() {
  return <MarketingAboutPage />
}
