# Phase 1: Business Requirements (v1)

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 1 – Business Requirements |
| Version | 1 |
| Status | Draft |

---

## 1. Problem Definition

### 1.1 Business Problem

Expats living in the Netherlands need to learn Dutch for daily life, work, and integration, but existing language learning solutions are misaligned with their needs:

- **Academic vs. practical**: Most apps teach generic vocabulary and grammar (e.g. “The horse eats the apple”) rather than situation-specific communication (ordering food, doctor visits, workplace meetings, government services).
- **One-size-fits-all**: Content is not tailored to the expat’s profile (occupation, family situation, goals, current level).
- **Limited real-world practice**: Few products offer AI-driven conversation simulation, speech analysis, or context-aware prompts tied to the user’s daily life and location.
- **Exam and integration gaps**: Dedicated preparation for Dutch integration exams (A2, B1, KNM) is often separate from daily practice, fragmenting the learning experience.

### 1.2 User Problem

Expats struggle to:

- Communicate confidently in real Dutch situations (restaurants, healthcare, work, administration).
- Get personalized, relevant lessons that match their life context.
- Practice speaking and listening with feedback (pronunciation, fluency).
- Prepare efficiently for official integration exams while building practical skills.

### 1.3 Opportunity

A platform that combines **context-aware learning**, **AI conversation and speech**, **personalization**, and **exam preparation** in one product can capture a distinct position: **Contextual AI Language Learning for Expats**, starting with Dutch in the Netherlands.

---

## 2. Product Vision and Objectives

### 2.1 Vision Statement

**AI Dutch Coach** is the most practical way for expats to learn Dutch by focusing on real-life conversations, contextual learning, personalized lessons, and listening/speaking practice integrated into daily life. The long-term vision is to become a broader platform that helps expats integrate linguistically and culturally into their host country.

### 2.2 Strategic Objectives

| ID | Objective | Success Indicator |
|----|-----------|-------------------|
| OBJ-1 | Establish Dutch (NL) as first market with full feature set | Launch in NL with all core modules live |
| OBJ-2 | Achieve sustainable unit economics per paying user | Cost per active user ≤ €2/month; LTV > 3× CAC |
| OBJ-3 | Drive premium conversion at 5–10% | 5–10% of active users on paid tier |
| OBJ-4 | Retain users beyond initial trial | >30% 30-day retention |
| OBJ-5 | Enable future expansion to other languages/countries | Architecture and content model support multi-language/multi-region |

---

## 3. Target Users and Personas

### 3.1 Primary Audience

Expats living in the Netherlands. Segments include:

- International workers (highly skilled migrants, corporate relocations).
- International students.
- Long-term residents seeking integration.
- Partners of Dutch residents.
- New immigrants preparing for integration exams.

### 3.2 User Attributes (Onboarding)

Collected for personalization and learning path:

| Attribute | Purpose |
|-----------|---------|
| Native language | Content and UI localization; difficulty calibration |
| Known languages | Avoid redundancy; placement |
| Country of origin | Cultural context; scenario relevance |
| Time in Netherlands | Context for scenarios (newcomer vs. settled) |
| Family status (solo, couple, children) | Scenario selection (e.g. school, daycare) |
| Age group | Content tone; exam requirements |
| Occupation / industry | Workplace and professional scenarios |
| Hobbies | Engagement and scenario variety |
| Daily routines | Timing and scenario relevance |
| Current Dutch level (A0–C1) | Placement and difficulty |
| Target level (A2/B1/B2) | Learning path and exam prep |
| Target objective | Integration exam, workplace fluency, social fluency |

### 3.3 Persona Summaries

| Persona | Goals | Key Scenarios |
|---------|--------|----------------|
| **Working Professional** | Workplace Dutch, meetings, emails | Office, client calls, small talk |
| **Student** | Social and academic Dutch | Campus, housing, daily tasks |
| **Parent** | School, daycare, healthcare | School communication, doctor, grocery |
| **Integration Candidate** | Pass A2/B1/KNM exams | Exam prep, civic topics |
| **Partner of Dutch Resident** | Social and family Dutch | Family, in-laws, daily life |

---

## 4. Value Proposition

### 4.1 Core Value

Teach Dutch through **real-world experiences** instead of generic academic content. Differentiators:

- Context-aware learning (scenarios based on user profile and goals).
- AI-driven conversation simulation and voice tutor.
- Speech analysis and pronunciation feedback.
- Daily-life reflection lessons (e.g. “you went to the supermarket” → lesson on supermarket phrases).
- Location-aware prompts (e.g. near a café → suggested phrase).
- Exam preparation integrated with practical skills.

### 4.2 Positioning

**“Dutch learning for expats.”** Sub-positioning: contextual, AI-powered, practical.

---

## 5. Business Model and Revenue

### 5.1 Model

**Freemium**: Free tier with limited access; Premium tier with full features.

### 5.2 Free Tier

- Core vocabulary lessons.
- Basic grammar.
- Limited exercises (e.g. capped sessions or modules per day/week).

### 5.3 Premium Tier

- AI voice conversations.
- Pronunciation analysis.
- Advanced listening training.
- Scenario simulations (unlimited).
- Exam preparation modules.
- Personalized daily lessons (e.g. from daily reflection).
- Unlimited AI practice.

### 5.4 Pricing

- **Target range**: €8–€15 per month (subscription).
- **Conversion target**: 5–10% of active users.

### 5.5 Revenue Example

- 10,000 users × 8% conversion × €10/month ≈ **€8,000/month**.
- At scale, operational costs estimated ~$10,000/month; margins improve with AI optimization.

---

## 6. Scope

### 6.1 In Scope (Full Product)

- Personalized learning engine and learning path.
- Core language modules (vocabulary, grammar, listening, speaking, reading, quizzes, flashcards).
- Real-life scenario simulations (AI conversation partner).
- AI voice conversation tutor (premium).
- Listening training (including situational audio).
- Pronunciation analysis and feedback (premium).
- Daily life reflection module (photo/location/notes → generated lesson).
- Location-aware learning prompts (optional; permissions-based).
- Dutch exam preparation (A2, B1, KNM).
- Gamification (XP, streaks, achievements, daily challenges, leaderboards).
- AI tutor feedback (grammar, vocabulary, pronunciation, fluency, listening).
- User profile and onboarding.
- Premium subscription and entitlement enforcement.
- Multi-language and multi-region readiness in architecture and data (Dutch first).

### 6.2 Out of Scope (Initial Release)

- Native iOS/Android apps (architecture must allow future addition).
- Community features (language partners, conversation groups) — future enhancement.
- Corporate/enterprise tier — future.
- Offline-first full lesson delivery (degraded mode only as per UI spec).
- Teaching languages other than Dutch at launch (architecture supports adding them).

---

## 7. Business Rules

| ID | Rule | Applies To |
|----|------|------------|
| BR-1 | Premium features are gated by subscription status | Entitlements, feature access |
| BR-2 | User level (A0–C1) drives content difficulty and recommendations | Lesson engine, scenarios |
| BR-3 | Location prompts require explicit user consent and can be disabled | Location-aware feature |
| BR-4 | Audio and photo data require consent and are subject to retention limits | Privacy, data |
| BR-5 | Minors (if ever supported) require additional safety and consent rules | Compliance, future |
| BR-6 | Exam preparation modules align with official exam structures (A2, B1, KNM) | Content, assessment |
| BR-7 | Gamification points and streaks follow defined rules (e.g. streak freeze, XP caps) | Gamification engine |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users (DAU) | Growth over time | Analytics |
| Lesson completion rate | Track per module type | Analytics |
| Conversation session length | Average duration | Analytics |
| Speech practice usage | Sessions per user/week | Analytics |
| Exam pass rate improvement | Self-reported or linked if feasible | Surveys / integration |
| Premium conversion rate | 5–10% | Subscription funnel |
| 30-day retention | >30% | Cohort analysis |
| 90-day retention | Track and optimize | Cohort analysis |
| Cost per active user | ≤ ~$2/month | Finance / ops |
| LTV/CAC | LTV > 3× CAC | Finance |

---

## 9. Assumptions

| ID | Assumption |
|----|------------|
| A-1 | Expats are willing to pay €8–15/month for a focused, practical Dutch product. |
| A-2 | AI (LLM + speech) quality and latency are sufficient for conversation and feedback. |
| A-3 | Mobile web is an acceptable first channel; PWA and responsive design meet initial needs. |
| A-4 | User-provided profile and context data are accurate enough for personalization. |
| A-5 | Regulatory environment (GDPR, AI) allows collection and processing of voice, location, and profile data with consent. |
| A-6 | Dutch exam structures (A2, B1, KNM) remain stable for content design. |
| A-7 | Expansion to other languages/countries will use the same product and architecture patterns. |

---

## 10. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-1 | AI cost per user erodes margins | Usage caps, caching, model optimization, tiered limits |
| R-2 | Low conversion to premium | Strong free value, clear upsell, trial period |
| R-3 | Churn after exam (e.g. after passing integration) | Ongoing goals, social fluency, B2 content, community features later |
| R-4 | Privacy/consent concerns (voice, location) | Clear consent flows, retention, deletion, transparency |
| R-5 | Competition from incumbents (Duolingo, Babbel, etc.) | Differentiation on context and expat focus; niche positioning |
| R-6 | Dependency on third-party AI/speech APIs | Fallbacks, multi-provider strategy, SLAs |

---

## 11. Compliance and Trust

### 11.1 GDPR / Privacy

- **Lawful basis**: Consent for optional data (location, audio, photos); contract/legitimate interest where appropriate.
- **Rights**: Access, rectification, erasure, portability, restriction, objection.
- **Retention**: Defined per data type (see Data doc); audio and location subject to short retention where possible.
- **Data export and deletion**: Full export and account deletion supported.

### 11.2 Consent

- Explicit consent for: microphone, location, notifications, photo upload, AI processing of personal context.
- Consent withdrawable; features degrade or disable when consent is withdrawn.

### 11.3 AI and Safety

- AI content and corrections moderated; no harmful or inappropriate outputs.
- Transparency: users informed when they interact with AI.
- Child safety: if underage users are ever supported, additional guardrails and consent.

### 11.4 Premium and Payments

- Secure handling of payment and subscription data (PCI considerations via payment provider).
- Clear communication of subscription terms, renewal, cancellation.

---

## 12. Dependencies

- **External**: AI/LLM APIs, speech (STT/TTS), pronunciation analysis, payment provider, cloud infrastructure.
- **Internal**: User profile service, lesson engine, content pipeline, gamification, notifications.

---

## 13. Open Questions

| ID | Question | Owner |
|----|----------|--------|
| OQ-1 | Exact pricing (€8 vs €10 vs €15) and trial length | Product / Business |
| OQ-2 | Whether to support annual subscription and discount | Product |
| OQ-3 | Partnership with language schools or relocation agencies at launch | GTM |
| OQ-4 | Minimum age for users (e.g. 16+) for initial release | Legal / Product |

---

## 14. Recommended Decisions

- **Recommend** defining a 7- or 14-day premium trial to support conversion.
- **Recommend** storing all user-sensitive data in EU for GDPR and latency.
- **Recommend** documenting retention periods per data category in the Data specification.
- **Recommend** treating location and audio as opt-in only, with clear in-app explanations.
