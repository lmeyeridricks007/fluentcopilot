'use client'

import { LegalPageLayout } from '../components/legal/LegalPageLayout'

export function MarketingPrivacyPage() {
  return (
    <LegalPageLayout
      pageTitle="FluentCopilot Privacy Policy"
      heroHeading="Privacy, in plain language"
      intro="This page explains what data we collect, why we collect it, and how we use it to run FluentCopilot."
      summaryBullets={[
        'We collect only what we need to provide the product.',
        'Your learning progress and interactions help personalize your experience.',
        'Beta access and support require contact details.',
        'You can request access, correction, or deletion of personal data.',
      ]}
      sections={[
        {
          id: 'what-we-collect',
          title: 'What we collect',
          bullets: [
            'Email address and account profile details.',
            'Usage data such as learning progress and product interactions.',
            'Optional voice responses or writing submissions used for feedback features.',
            'Basic device and browser information for reliability and security.',
          ],
        },
        {
          id: 'why-we-collect',
          title: 'Why we collect it',
          bullets: [
            'To provide a stable learning experience and account access.',
            'To track progress and personalize recommendations.',
            'To improve product quality and feature performance.',
            'To communicate about beta access and support.',
          ],
        },
        {
          id: 'data-storage',
          title: 'Data storage',
          body: 'Data is stored on secure infrastructure and retained only as long as needed to operate the service, support users, and satisfy legal obligations.',
        },
        {
          id: 'third-parties',
          title: 'Third-party providers',
          bullets: [
            'Hosting and cloud infrastructure providers.',
            'AI processing providers used for product features.',
            'Analytics tools used to understand and improve product usage.',
          ],
        },
        {
          id: 'rights',
          title: 'Your rights',
          bullets: [
            'Request access to your personal data.',
            'Request correction of inaccurate data.',
            'Request deletion where applicable.',
            'Request portability or processing clarification where applicable.',
          ],
        },
        {
          id: 'contact',
          title: 'Contact',
          body: 'For privacy requests, email support@fluentcopilot.com and include the account email linked to your profile.',
        },
      ]}
      lastUpdated="March 2026"
      contactTitle="Need help or have a privacy question?"
      contactBody="We take privacy requests seriously. Reach out through our beta support contact flow and we will respond as quickly as possible."
    />
  )
}
