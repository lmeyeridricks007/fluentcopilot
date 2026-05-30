'use client'

import { LegalPageLayout } from '../components/legal/LegalPageLayout'

export function MarketingTermsPage() {
  return (
    <LegalPageLayout
      pageTitle="FluentCopilot Terms of Service"
      heroHeading="Simple terms for using FluentCopilot"
      intro="These terms explain the basic rules for using FluentCopilot during closed beta."
      summaryBullets={[
        'The product is currently in beta and provided as-is.',
        'Access is invite-based and personal to your account.',
        'We do not guarantee exam outcomes.',
        'No billing is active during closed beta.',
      ]}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          body: 'By using FluentCopilot, you agree to these terms. They are designed to be clear and practical while the product is in beta and beyond.',
        },
        {
          id: 'usage',
          title: 'Usage',
          body: 'Use FluentCopilot for personal, lawful learning use. Do not abuse, disrupt, or attempt unauthorized access to the service.',
        },
        {
          id: 'accounts',
          title: 'Accounts',
          bullets: [
            'Access is invite-only during closed beta.',
            'You are responsible for your sign-in credentials and account activity.',
            'Do not share access in ways that violate beta terms.',
          ],
        },
        {
          id: 'beta-disclaimer',
          title: 'Beta disclaimer',
          bullets: [
            'Features may change, improve, or be removed over time.',
            'No guarantee of exam success or uninterrupted availability is provided.',
            'The service is provided as-is during beta.',
          ],
        },
        {
          id: 'payments',
          title: 'Pricing and billing (future-facing)',
          body: 'No billing is active during closed beta. Pricing and plan terms may change before public launch and will be shown clearly before any purchase.',
        },
        {
          id: 'liability',
          title: 'Liability',
          body: 'To the extent permitted by law, liability is limited and use is at your own discretion. FluentCopilot does not provide legal or exam certification guarantees.',
        },
        {
          id: 'contact',
          title: 'Contact',
          body: 'If you have questions about these terms, contact us through the beta support route and include your account email when possible.',
        },
      ]}
      lastUpdated="March 2026"
      contactTitle="Questions about these terms?"
      contactBody="We prefer plain language and clear answers. Reach out through our support channel and we’ll help."
    />
  )
}
