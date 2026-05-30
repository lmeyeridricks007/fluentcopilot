# Gamification — Per-Feature Integration Specification

**Feature**: FD-10 Gamification  
**Source**: docs/final/feature-domain-breakdown.md §12

---

## 1. Purpose

Specifies **integrations used by Gamification**: cache (Redis) for optional XP/streak counters or leaderboard; analytics (xp_awarded, streak_updated, achievement_unlocked). No payment or LLM; receives completion events from other features (Lesson Engine, AI Conversation, etc.).

---

## 2. Feature Reference

- **Domain**: FD-10. **User goal**: See progress (XP, streak, achievements); stay motivated. **Data dependencies**: Gamification service; user progress, events; PostgreSQL, Redis (cache).

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Cache (Redis)** | Optional: streak cache, leaderboard, or rate limiting for award logic | Medium |
| **Analytics** | xp_awarded, streak_updated, achievement_unlocked | High |

---

## 4. Per-Integration Detail

- **Cache**: Optional caching of streak or aggregated XP for performance; or session/request cache. See [cache-session-store.md](../../cache-session-store.md). **Local**: Redis local. Gamification can run without Redis (DB only).
- **Analytics**: Emit gamification events for engagement dashboards. See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock or disable.

---

## 5. Implementation Implications

- **Backend**: Gamification service (award XP, update streak, evaluate achievements); called by Lesson Engine, AI Conversation, etc. **DB**: xp_transactions, streaks, achievements (or equivalent). **UI**: XP, streak, achievements on home and post-activity. **Testing**: Unit award logic; integration with completion events; mock analytics.

---

## 6. Summary

Gamification uses **Redis** (optional) and **analytics**. It is primarily internal (DB + event subscription from other features); integrations are supporting only.
