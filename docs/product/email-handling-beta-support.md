# Email handling for beta and support

## Overview

This implementation adds server-side email submission flows for:

- Beta access requests (`/api/beta-request`)
- Public contact/support requests (`/api/contact`)

Both flows collect form data in the UI and submit behind the scenes. No manual email composition is required.

## Server routes

- `POST /api/beta-request`
  - Validates email and optional first name/source metadata
  - Includes honeypot field support (`website`)
  - Sends formatted beta request email through shared email layer
- `POST /api/contact`
  - Validates name/email/topic/message/source metadata
  - Includes honeypot field support (`website`)
  - Sends formatted support email through shared email layer

## Email provider abstraction

Location: `src/lib/email/`

- `emailConfig.ts`
  - Loads provider + destination addresses from environment
- `emailProvider.ts`
  - Provider adapter (`resend` or `console`)
- `emailTemplates.ts`
  - HTML + text templates for beta and support
- `sendBetaRequestEmail.ts`
  - Domain-level send helper for beta requests
- `sendSupportEmail.ts`
  - Domain-level send helper for support requests
- `types.ts`
  - Shared payload and send result types

## Frontend submission clients

- `src/lib/waitlist/submitBetaRequestClient.ts`
- `src/lib/contact/submitSupportRequestClient.ts`

Both return structured success/error results for clean UI states.

## Request payloads

### Beta request

```json
{
  "email": "user@example.com",
  "firstName": "Alex",
  "sourceSurface": "beta_page",
  "route": "/beta",
  "website": ""
}
```

### Support request

```json
{
  "name": "Alex",
  "email": "user@example.com",
  "topic": "Account help",
  "message": "I cannot sign in with my invite email.",
  "sourceSurface": "contact_page_support_form",
  "route": "/contact",
  "website": ""
}
```

## UX states

Both forms support:

- idle
- loading/submitting
- success confirmation
- failure message with retry guidance

## Analytics events

Added support-form events:

- `contact_form_viewed`
- `contact_form_submitted`
- `contact_form_succeeded`
- `contact_form_failed`

Properties include `source_surface`, `route`, and `topic` where relevant.

## Abuse/spam considerations

Current lightweight protections:

- server-side validation
- hidden honeypot field (`website`)
- request metadata capture (IP/user-agent)
- provider failure logging

Recommended next:

- add per-IP rate limiting in middleware or API edge layer
- add provider/webhook retry queue for transient failures

## Required environment variables

- `EMAIL_PROVIDER` (`resend` or `console`)
- `RESEND_API_KEY` (required when `EMAIL_PROVIDER=resend`)
- `FROM_EMAIL` (sender identity)
- `BETA_REQUEST_TO_EMAIL` (destination for beta requests)
- `SUPPORT_TO_EMAIL` (destination for support requests)

Backward compatibility:

- `BETA_REQUEST_NOTIFY_EMAIL` is still read as fallback for beta destination.

## Production checklist

1. Configure all required env vars in deployment platform.
2. Set `EMAIL_PROVIDER=resend`.
3. Verify from-domain setup with provider.
4. Test both forms end-to-end on production URL.
5. Add rate limiting before broad traffic scale.
