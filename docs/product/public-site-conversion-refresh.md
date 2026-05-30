# Public site conversion refresh

## Goals

- Position FluentCopilot as a **premium, Netherlands-specific** Dutch product (A2 / inburgering, real-life scenarios).
- Improve **conversion** toward closed-beta access and future paid signup without fake flows.
- Add **product visualization** (CSS device mocks) so marketing is not text-only.
- Replace **mailto waitlist** with an **in-browser email capture** that can notify the team server-side.

## CTA hierarchy

| Priority | Action | Surfaces |
|----------|--------|----------|
| Primary | Request early access (`/beta#request` or embedded `BetaRequestForm`) | Hero, nav, pricing cards, exam prep, login, footer |
| Secondary | See exam prep, features, pricing, how beta works | Hero, sections, pricing |
| Tertiary | Sign in (invited users) | Hero, headers, pricing cards, beta page |

Analytics: `public_hero_cta_clicked` (primary/secondary), existing `waitlist_cta_*`, `pricing_cta_clicked`, `sign_in_clicked`, plus **`beta_request_form_viewed`**, **`beta_request_submitted`**, **`beta_request_succeeded`**, **`beta_request_failed`**.

## Waitlist / beta request flow

1. User enters **email** (optional **first name**) in `BetaRequestForm`.
2. Client calls **`POST /api/beta-request`** (`submitBetaRequestClient`).
3. Server validates with Zod and runs **`deliverBetaRequestNotification`** (`src/lib/waitlist/betaRequestDelivery.ts`).

### Email delivery (configure in deployment)

**Option A — Resend (recommended)**

- `RESEND_API_KEY` — API key
- `BETA_REQUEST_NOTIFY_EMAIL` — your inbox
- `BETA_REQUEST_FROM_EMAIL` — optional; default uses Resend’s sandbox sender where allowed

**Option B — Webhook**

- `BETA_REQUEST_WEBHOOK_URL` — receives JSON payload (email, firstName, sourceSurface, route, etc.)

If neither is configured, the API still returns **200** with `delivered: false` and logs a **warning** server-side. Wire a provider before relying on inbox delivery.

Legacy **mailto** helpers were removed; **do not** reintroduce “open your mail client” as the primary path.

## Pricing / value framing

Public marketing uses a **three-rung ladder**:

- **Free** — try the system: limited lessons/scenarios, basic feedback, daily caps, no full exam simulations.
- **Core (most popular)** — planned **€12–15/mo**: full A0→A2 path, full practice, better feedback, light exam prep, progress/missions.
- **Premium** — planned **€29/mo**: full exam stack (all modules, timed simulations, mocks, deep feedback, readiness scoring).

Indicative until checkout exists. During beta, **tier still follows the invite**; no live billing.

## Visual / proof strategy

- **Hero and inner pages** use **CSS device frames** (`MarketingProductVisuals.tsx`) — speaking drill, writing corrections, exam hub, readiness ring.
- Replace with **real screenshots or short video** when assets exist; keep frames for consistent layout.

## Accessibility and contrast

- Dark CTA bands use **primary-700/900** text on light tints or **white** on **slate-900 / primary-700** with sufficient contrast.
- Footer and secondary copy use **`text-ink-secondary`** instead of **`text-ink-tertiary`** where readability suffered.
- Borders and **`shadow-card`** reinforce hierarchy on muted backgrounds.

## Login / auth UX

- **Social login row hidden** on public login (`showSocialRow={false}`) until OAuth is real.
- **Beta request form** embedded on the login page for non-invited users.

## Future enhancements

- Real product screenshots and looping preview video.
- Testimonials, press, or institution cues when available.
- Final launch pricing and Stripe checkout.
- Rate limiting and spam protection on `/api/beta-request`.
- Optional double opt-in for waitlist compliance.

## QA suggestion

Run a focused **conversion/UX QA pass** on the refreshed public site (desktop + mobile): hero clarity, form success/failure, hash navigation to `#request`, pricing comprehension, and contrast in bright lighting.
