'use client'

import { LegalPageLayout } from '../components/legal/LegalPageLayout'

export function MarketingCookiesPage() {
  return (
    <LegalPageLayout
      pageTitle="FluentCopilot Cookie Policy"
      heroHeading="How cookies work here"
      intro="We use a small set of cookies and similar storage to keep the site working and improve the experience."
      summaryBullets={[
        'Essential cookies keep the site working.',
        'Analytics cookies help us improve the product.',
        'You can control cookie choices in your browser settings.',
        'We aim to keep this setup minimal and understandable.',
      ]}
      sections={[
        {
          id: 'what-cookies',
          title: 'What cookies are',
          body: 'Cookies are small text files stored in your browser. They help websites remember useful information between visits.',
        },
        {
          id: 'types',
          title: 'Types of cookies we use',
          bullets: [
            'Essential cookies for core product functionality.',
            'Analytics cookies to understand product usage patterns.',
          ],
        },
        {
          id: 'essential',
          title: 'Essential cookies',
          body: 'These are needed for core functions such as sign-in continuity, session handling, and security-related behavior.',
        },
        {
          id: 'analytics',
          title: 'Analytics cookies',
          body: 'These help us measure feature usage and identify quality improvements. We use analytics to improve clarity, performance, and reliability.',
        },
        {
          id: 'preferences',
          title: 'Managing preferences',
          body: 'You can control cookies through browser settings. Disabling some cookies may affect parts of the experience.',
        },
        {
          id: 'consent',
          title: 'Consent',
          body: 'When cookie controls are shown, you can accept or reject non-essential cookies. Essential cookies remain active because they are required for core site functionality.',
        },
        {
          id: 'contact',
          title: 'Contact',
          body: 'For cookie-related questions, contact us through our support path and include details about your browser and device.',
        },
      ]}
      lastUpdated="March 2026"
      contactTitle="Questions about cookies?"
      contactBody="If anything is unclear, contact us and we’ll explain how our cookie setup works in plain language."
    />
  )
}
