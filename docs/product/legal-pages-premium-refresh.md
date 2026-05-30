# Legal pages premium refresh

## Goal

Upgrade the public legal and trust layer so `/privacy`, `/terms`, and `/cookies` feel aligned with the product's premium marketing quality while keeping legal meaning conservative and readable.

## Design pattern

All legal pages now use one consistent structure:

1. Intro hero with plain-language heading
2. Quick summary card (short bullets)
3. Scannable section list with anchor links
4. Structured content cards with strong headings
5. Last updated block
6. Contact/help trust block with cross-links

This pattern reuses existing spacing, card, typography, and color tokens from the public marketing experience.

## Tone principles

- Calm, clear, and human
- Founder-led SaaS voice (no legal theater)
- Short paragraphs and compact bullets
- No inflated security or certification promises
- Restraint-first legal language during beta

## Pages updated

- `/privacy`
  - Plain-language privacy intro
  - Data categories, purpose, learning data, analytics, providers, retention, rights, and privacy contact sections
- `/terms`
  - Beta-aware terms, invite-only access details, acceptable use, availability, future billing framing, and liability baseline
- `/cookies`
  - Clear explanation of essential vs analytics cookies, preference management, and support contact path

## Cross-linking and discoverability

- Added footer links for `Privacy`, `Terms`, and `Cookies`
- Added in-page cross-links between all legal pages
- Contact/help path points to the existing support flow used in beta access routes

## Areas for formal legal review before scale

- Jurisdiction-specific privacy rights wording
- Controller/processor details and legal basis statements
- Cookie consent mechanics if non-essential cookies expand
- Final billing/renewal/refund language at paid launch
- Data retention schedule by data category
