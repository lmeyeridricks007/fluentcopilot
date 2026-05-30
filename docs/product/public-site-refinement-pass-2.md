# Public Site Refinement Pass 2

## Scope

Refinement-only pass on the existing public marketing experience (no routing or IA changes), focused on:

- visual energy and premium feel
- readability and contrast
- pricing scanability
- customer-friendly language
- mobile comparison usability
- clearer upgrade motivation

## What Changed

- **Homepage polish**
  - Added subtle visual energy in hero (soft accent glows + framed product visual container).
  - Improved section separation around the product showcase with a tinted background and border.
  - Kept existing section order and structure.

- **Dark section readability**
  - Lightened dark gradients in premium showcase blocks (`slate-800/700` range).
  - Increased text contrast (white body text in dark sections).
  - Added visual emphasis around the exam-prep product card.

- **Pricing simplification**
  - Cards now scan faster: clear labels, shorter descriptions, concise “For” lines, and max 5 bullets.
  - Free price display now shows **`FREE`** (not `€0`).
  - Core price simplified to `€12 / month` for faster comprehension.
  - Reduced extra CTA clutter inside plan cards.

- **Mobile comparison redesign**
  - Added mobile-first stacked comparison cards.
  - Kept desktop side-by-side table for larger screens.
  - Each feature now reads clearly as Free / Core / Premium on small screens.

- **Customer wording cleanup**
  - Replaced internal-sounding language with learner-facing terms:
    - “orientation snippets” -> “small practice examples”
    - “controlled try-outs” -> “try before you commit”
    - “core next-step surfaces” -> “clear next steps”
  - Reduced product-builder phrasing on pricing and exam-prep pages.

- **Upgrade motivation**
  - Added subtle, non-pushy progression language:
    - Free helps exploration
    - Core for steady progress
    - Premium for exam pressure and performance
  - Added line on exam-prep CTA block: learners often upgrade when exam prep becomes urgent.

## Files Updated

- `src/features/marketing/pages/MarketingHomePage.tsx`
- `src/features/marketing/pages/MarketingPricingPage.tsx`
- `src/features/marketing/pages/MarketingExamPrepPage.tsx`
- `src/features/marketing/components/pricing/PricingPlanCard.tsx`
- `src/features/marketing/components/pricing/pricingComparisonData.ts`
- `src/features/marketing/components/pricing/PlanComparisonTable.tsx`
- `src/features/marketing/components/PublicShell.tsx`

## Remaining Future Polish (Optional)

- Replace stylized product mocks with final production screenshots/video snippets.
- Add real social proof (learner quotes, outcomes, partner signals).
- Validate final launch pricing copy once billing is live.
