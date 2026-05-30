# Phase 3 Summary: Product Architecture Overview

## What Changed Across Versions

### v1 → v2

- **Architecture requirements (ARCH-001–004)**: EU deployment, single API consumption, EU data stores, observability (logging, metrics, tracing).
- **Deployment view**: Deployment units (SPA, API, PostgreSQL, Redis, workers); single EU region for launch.
- **Content sourcing**: Lesson Engine clarified as reading from PostgreSQL and/or CMS (see Data doc).
- **Section numbering**: Corrected after adding new sections.

---

## Major Design Decisions

1. **Mobile-web-first**: React + Vite + TypeScript SPA; same API for future native/React Native.
2. **Single API layer**: All client traffic through one API; entitlements and business logic in backend.
3. **EU residency**: Application and data in EU region (ARCH-001, ARCH-003).
4. **Observability**: Required for API and services (ARCH-004); details in Operations.
5. **Core services**: Profile, Lesson Engine, AI Conversation, Speech, Gamification, Notifications, Entitlements.

---

## Remaining Open Questions

- OQ-1: Monolith vs. separate services at launch.
- OQ-2: WebSocket vs. REST for voice streaming.
- OQ-3: CMS vs. DB-only for lesson content.
