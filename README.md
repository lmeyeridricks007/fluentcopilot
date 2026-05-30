# FluentCopilot (language-tutor)

Next.js app for **FluentCopilot** — practical Dutch for life in the Netherlands, with structured paths toward **A2** and **inburgering**, scenario practice, and exam prep (speaking, writing, listening, reading, KNM). Built first for Dutch and designed to scale to more language paths over time.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing site; authenticated product routes live under `/app/*` after sign-in. Primary tabs: **Talk** (`/app/talk`), **Coach** (`/app/coach`), **Exam** (`/app/exam-prep`), **Library** (`/app/library`) — see `docs/product/behavior-driven-app-architecture.md`.

## Closed beta

- **Invite-only** mock auth: see `src/lib/auth/mockUsers.ts` and product docs under `docs/product/`.
- **Beta requests:** the public site submits emails via `POST /api/beta-request`. Configure `RESEND_API_KEY` and `BETA_REQUEST_NOTIFY_EMAIL` (or `BETA_REQUEST_WEBHOOK_URL`) for real notifications — see `docs/product/public-site-conversion-refresh.md`.

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Production build |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |
| `npm run validate-content` | Content validation (see `package.json`) |

## Documentation

Product and UX notes live in **`docs/product/`** (e.g. route guards, onboarding, public-site conversion refresh).
