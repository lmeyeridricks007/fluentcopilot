# UI Implementation Notes

## Stack
- React 18, Vite, TypeScript, Tailwind CSS, React Router, Zustand, TanStack Query (for future async), Zod (available), React Hook Form (available), Lucide icons.

## State
- **Zustand**: `authStore` (user, isAuthenticated, hasCompletedOnboarding), `onboardingStore` (step, data). Persisted auth for refresh.
- **Local state**: All screens use useState for UI (e.g. lesson step index, quiz selection, chat messages). No Redux.

## Services / mocks
- `src/services/api.ts` – Base API client (no backend yet).
- `src/mocks/lessons.ts`, `scenarios.ts`, `progress.ts` – Typed mock data for lessons, scenarios, progress.
- Frontend contracts are typed interfaces; swap mocks for API calls when backend exists.

## Design tokens (Tailwind)
- Colors: primary (50–900), surface, ink (primary/secondary/tertiary), success, warning, error.
- Typography: display, title, body-lg, body, body-sm, caption.
- Spacing: 18, 22, safe-bottom; min-h-touch / min-w-touch 44px.
- Border radius: card 12px, sheet 16px.

## Accessibility
- Focus-visible outlines (primary-500), semantic headings, aria-labels on icon buttons, aria-invalid/describedby on inputs, role="progressbar", aria-live on OfflineBanner, keyboard Enter on cards where appropriate.

## Responsive
- Mobile-first; bottom nav fixed; main scrollable. Safe area insets via Tailwind spacing (pb-safe-bottom). No desktop breakpoint-specific layout yet; scales up reasonably.

## Analytics
- `src/lib/analytics.ts` – Event taxonomy and `track()` stub. Key events: onboarding, lesson start/complete, simulation, voice, premium CTA, permissions. Hook up provider later.

## Permissions
- `src/hooks/usePermissions.ts` – useMicrophonePermission, useGeolocationPermission. Used in VoiceTutorPage and PermissionGate.

## Feature flags
- `src/config/featureFlags.ts` – voiceTutor, reflection, examPrep, premiumUpsell. Replace with env/remote when needed.
