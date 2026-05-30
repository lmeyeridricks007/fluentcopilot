# Contact and support flow

## Goal

Create a premium, low-friction support surface that helps users self-route quickly while keeping a clear path to human help.

## Contact page structure (`/contact`)

1. Hero ("Contact & support")
2. Beta access block (request flow separated from support issues)
3. "What do you need help with?" routing cards
4. Support form (simple, category-based)
5. Direct email fallback
6. Response expectations trust note
7. Cross-links to FAQ, Beta, Privacy, and Sign in

## Support routing logic

- **Beta access**: users are guided to the embedded beta access form.
- **Product help**: preselects "Product question" and scrolls to support form.
- **Account support**: preselects "Account help" and scrolls to support form.
- **Privacy/legal**: links directly to privacy/legal pages.

This separation avoids mixing invite requests with existing-user support.

## Support form categories

- Beta access
- Product question
- Account help
- Billing / pricing question
- Privacy / legal
- Other

## Form states

- **Validation**: inline errors for email/topic/message.
- **Submitting**: loading state on submit button.
- **Success**: clear reassurance message after submit.
- **Error handling**: validation-safe and ready for backend integration.

## Where support links are surfaced

- `/contact` (primary support destination)
- `/beta` (support CTA in "What happens next")
- `/login` (support cross-link for invite/sign-in issues)
- Footer legal column includes Contact

## Future enhancements

- Connect support form to backend ticket/email system.
- Add lightweight topic analytics for support triage.
- Add "request status" lookup once invite queue tooling exists.
- Add SLA messaging once response operations are formalized.
