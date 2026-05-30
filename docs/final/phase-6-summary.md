# Phase 6 Summary: UI/UX Architecture

## What Changed

- **v1** was reviewed and audited; no v2 required. All special UI requirements (screen inventory, navigation, component taxonomy, state, permissions, lesson/simulation/audio patterns, accessibility, i18n, PWA, analytics) are covered.

## Major Design Decisions

1. **Stack**: React 18+, Vite, TypeScript, Tailwind CSS; mobile-web-first.
2. **Routes**: Auth (login, signup, onboarding); app (home, learn, practice, exam, profile, settings, reflection); practice includes scenario, voice, listening.
3. **Navigation**: Bottom nav on phone; modals for upsell and permissions.
4. **State**: Auth and entitlement global; route data and forms local or React Query/SWR.
5. **Permissions**: Microphone, location, notifications, photo—each in-context with Settings path; transparency and withdrawable (BFR-009).
6. **Accessibility**: WCAG 2.1 AA, 44px touch targets, reduced motion, audio alternatives per IS-014/IS-015.
7. **Future**: Same API for React Native/native; only view layer differs.
