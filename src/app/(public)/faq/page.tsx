import type { Metadata } from 'next'
import { MarketingFaqPage } from '@/features/marketing'

export const metadata: Metadata = {
  title: 'FAQ',
}

export default function Page() {
  return <MarketingFaqPage />
}
