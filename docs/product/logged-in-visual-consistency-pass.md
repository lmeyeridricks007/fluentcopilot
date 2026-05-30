# Logged-in visual consistency pass

Focused **visual hierarchy** and surface cohesion for the private app. **No IA regression**: Exams tab, home launchpad structure, and grouping from the nav/home refresh remain.

## Card tier system (`src/lib/design/cardTiers.ts`)

| Tier | Role | Treatment |
|------|------|-----------|
| **1 — Hero** | Single primary action | Gradient shell, `shadow-xl`, `ring-white/10`, large type, full-width CTA with strong shadow/rings. Implemented in `NextBestActionHero` and `ResumeContinueCard` `variant="hero"`. |
| **2 — Primary destinations** | Exam prep, practical/lesson path, practice hub row | Soft **ring** (not heavy borders), light **shadow** where needed. Exam uses **primary tint + stronger icon block**; practical/lesson use **neutral elevated + softer icon**. |
| **3 — Secondary / utility** | Status band, review taps, more-tools list, latest unlock | **Muted backgrounds**, **light rings**, **no or minimal shadow**; review rows use compact icon wells. |

## Visual hierarchy changes

### Promoted (stronger read)

- **Hero** (next best + resume): deeper shadow, bottom vignette, larger title, `ProgressBar` **`onDark`** variant (bright track on gradient), CTA `font-bold` + ring.
- **Exam prep card**: shortened title **“A2 Exam prep”**, skill list as caption line, **tier-2 exam shell** (gradient + ring), larger icon container with ring.
- **Practice hub** (home): full-width row with **primary icon tile**, chevron, **tier-2b** gradient strip.
- **Bottom nav**: **active** = `font-semibold`, `text-primary-700`, **top accent bar**, slight icon scale; bar gets subtle blur + shadow.

### Demoted (lighter read)

- **Status strip**: **`statusBandClass`** — muted slate wash, thin ring, **no card shadow**, smaller metrics type; readiness in a **divided sub-row**; link label **“Progress”**.
- **Daily review / Fix mistakes**: **Tier 3** shells, **smaller icons**, no `Card` bordered wrapper; copy tightened.
- **More tools**: **Single list** with dividers (`tier3UtilityListShell`), not a 2×2 grid; muted list icons.

## Borders, shadows, backgrounds

- **Default `border` on many home blocks replaced** with **`ring-1` at low opacity** or **border-0** + ring for softer edges.
- **Page flow**: main sections use **`space-y-6`** and nested **`space-y-4`** for rhythm between hero → tier-2 stack → review → tools.
- **Premium upsell**: `border-0` + ring; lighter primary wash.

## Component files touched (implementation)

- `src/lib/design/cardTiers.ts` — tier tokens
- `src/components/ui/ProgressBar.tsx` — `onDark` variant
- `src/features/dashboard/components/NextBestActionHero.tsx`
- `src/features/resume/ResumeContinueCard.tsx` — hero variant alignment
- `src/features/home/components/HomeCompactStatusStrip.tsx`
- `src/features/home/components/HomeExamPrepPromoCard.tsx`
- `src/features/home/components/HomePracticalFocusCard.tsx`
- `src/features/home/components/HomeLessonPathCard.tsx`
- `src/features/home/HomePage.tsx`
- `src/components/retention/RetentionDailyReviewCard.tsx`
- `src/components/retention/RetentionFixMistakesCard.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`

## Practical Dutch vs Exam prep

- **Practical**: `tier2PracticalShell`, smaller mic/book icon, **solid primary CTA** + **text link** “Browse all practice” (no second outline button).
- **Exam**: `tier2ExamShell`, **clipboard on primary-600 tile** with **ring**, **bold “Open exam prep”** CTA, **shorter typographic stack**.

## Future design-system opportunities

- Promote **`cardTiers`** into Storybook / design docs when formalized.
- Add **semantic Card variants** (`hero`, `primary`, `utility`) wrapping these tokens to reduce one-off class strings.
- **Dark mode** tokens if the product adds a theme beyond light surfaces.
