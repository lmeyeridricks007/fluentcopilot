# Feature: Authentication (E-01)

**Epic**: E-01 Authentication  
**Source**: docs/features/deep-dives/authentication.md (if present), feature-index

---

## Feature Purpose

Provide sign-up (email/password and OAuth), login, session management (JWT or session cookie), logout, and password reset. Foundation for all authenticated flows; identity and security.

---

## Feature Scope

- **In scope**: Sign-up (email, password, validation); login (email/password or OAuth); session create/validate/refresh; logout (invalidate); forgot password (token-based reset); OAuth redirect and callback (Google, Apple); account linking.
- **Out of scope**: SSO/SAML; multi-factor auth (future).

---

## Dependencies

- None (foundation epic).

---

## Sub-Features (from feature-index)

sign-up, login, session-management, logout, password-reset, oauth-integration.

---

## Feature Completion Checklist

- [ ] UI: SignUpScreen, LoginScreen, Logout action, ForgotPasswordScreen, OAuth buttons.
- [ ] API: POST /auth/signup, POST /auth/login, POST /auth/logout, GET /me (or session validate), POST /auth/forgot-password, POST /auth/reset-password, OAuth callback.
- [ ] Backend: Auth service; session/JWT issue and validation; password hash; OAuth provider integration.
- [ ] Database: users table; sessions or JWT storage; password_reset_tokens (if applicable).
- [ ] Integrations: OAuth providers (Google, Apple); email for verification/reset.
- [ ] Seed/demo: Test user; optional OAuth test credentials.
- [ ] Tests: Signup, login, logout, invalid credentials, token expiry, reset flow, OAuth callback.
