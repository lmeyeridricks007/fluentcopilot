# FD-08 Location-Aware Prompts — UI Review 1

## Scope reviewed

- Feature module: types, mocks, services, store, hooks, components, pages
- Routes and App integration
- Home card and Settings entry
- Permission flow (status, request, denied/unsupported states)
- Feed, detail, settings, intro screens
- Premium gating and analytics scaffolding

## Strengths

- **Types**: Clear `LocationPrompt`, `PhraseSuggestion`, `PromptPreferences`, `VenueType`, permission status.
- **Mocks**: Realistic Dutch phrases per venue (café, train, supermarket, pharmacy, office, school, municipality, restaurant).
- **Services**: Typed contracts and mock implementations with fake latency; permission service uses browser geolocation when available.
- **Permission UX**: Intro explains and requests; feed shows denied/unsupported states; settings show status and re-request.
- **Components**: Reusable card, header, phrase list, permission card/modal, settings panel, empty/loading/denied/unsupported.
- **Integration**: Home "Smart Prompts near you" card, Settings "Location & Smart Prompts" row, detail → practice simulation.

## Findings / refinements

1. **Route order**: Static routes `intro` and `settings` declared before `:promptId` so they match correctly.
2. **TanStack Query**: Replaced deprecated `onSuccess` with `useEffect` + `data` for preferences hydration in settings.
3. **Analytics**: Events added for intro viewed, enable clicked, permission requested/granted/denied, prompt viewed/saved/dismissed, practice clicked, premium CTA.
4. **Simulate demo**: Empty state "Simulate nearby place" navigates to first mock prompt detail for demo flow.
5. **QuickPracticeEntryCard**: `scenarioId` used in `data-scenario-id` for tests/analytics.

## Scorecard (post-refinement)

| Category | Score | Notes |
|----------|-------|--------|
| UI coherence | 9 | Matches learner app patterns, Card/Button/Tailwind |
| Mobile usability | 9 | Touch targets, sticky actions on detail, scrollable feed |
| Practical usefulness | 9 | Real phrases, clear CTAs, practice entry |
| Component reusability | 9 | Shared design system, feature components exported |
| Architecture quality | 9 | Types, contracts, store, hooks, clear separation |
| Accessibility | 8 | Semantic headings, aria-labels, focus; could add more landmarks |
| Implementation completeness | 9 | All primary screens, permission states, premium gate |
| Backend/device readiness | 9 | Contracts and mocks ready for real API/geolocation |

## Next steps

- Optional: use `LocationPermissionModal` in intro before first request for stronger education step.
- Optional: add "Recent" / history list section on feed using `getHistory()`.
- Backend: wire `locationPromptService` and preferences to real APIs; optional place-enrichment and recommendation engine.
