# Post-Launch Stabilization Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **first 30–60 days** operational focus after launch: monitoring, incident response, support, quality, and iteration so that the product stabilizes and the team can transition to Phase E or next priorities.

---

## 2. Scope

- **In scope**: What to watch; how to respond; support and bug triage; performance and cost; iteration on onboarding and conversion; handoff to steady state.
- **Out of scope**: Phase E feature development (separate plan); long-term roadmap.

---

## 3. Assumptions

- Launch is soft or controlled (e.g. waitlist, invite); traffic may grow gradually.
- Same team (or subset) owns stabilization; on-call or escalation path is defined.
- Phase E (reflection, location, exam, optimization) can start in parallel with stabilization or after 30 days.

---

## 4. First 7 Days

| Focus | Actions |
|-------|---------|
| **Monitoring** | Daily review of error rate, latency, and health; fix P0/P1 within SLA (e.g. 24h for P0) |
| **Billing** | Verify every new subscription and webhook; no failed webhooks unhandled; entitlement correct |
| **Support** | Triage all incoming support; document common questions; update FAQ if needed |
| **Incidents** | Any outage or critical bug: post-incident note (what happened, cause, fix, prevention) |
| **Rollback** | If critical regression, use rollback or hotfix process from runbook |
| **No new features** | Avoid deploying non-critical features; only hotfixes and config changes |

---

## 5. First 30 Days

| Focus | Actions |
|-------|---------|
| **Stability** | Error rate and latency trend; fix recurring issues; optimize slow endpoints or queries if needed |
| **Conversion** | Review funnel: signup → onboarding → first lesson → first scenario/voice → trial → payment; identify drop-off and fix or document |
| **Cost** | LLM and speech usage vs budget; adjust caps or caching if over; set up cost alerts if not done |
| **Support** | Categorize tickets (bug, question, feedback); assign owner; close or escalate |
| **Content** | Review any user feedback on lessons or scenarios; fix obvious content errors |
| **Security/Privacy** | Handle any export or deletion requests within SLA; verify no breach or leak reported |
| **Retro** | Team retro: what went well; what to improve; update runbook and checklist |

---

## 6. First 60 Days

| Focus | Actions |
|-------|---------|
| **Steady state** | Error and latency stable; no critical open bugs; support volume manageable |
| **Iteration** | Optional A/B test on onboarding or paywall (if experiment ready); ship small improvements |
| **Phase E** | Decide start date for Phase E (reflection, location, exam, content ops); allocate capacity |
| **Documentation** | Update runbook with any new failure modes; update launch checklist for next release |
| **Handoff** | If on-call or support owner changes, hand off with runbook and escalation path |

---

## 7. Monitoring and Alerting (Reminder)

| Metric | Target | Action if breached |
|--------|--------|---------------------|
| Error rate | < 1% (or agreed) | Investigate; fix or mitigate |
| API latency P95 | < 5s for conversation turn; < 1s for lesson load | Optimize or scale |
| Health check | 200 | Restart or rollback; check dependencies |
| Stripe webhook | No 5xx | Fix handler; replay if needed |
| Support volume | Track trend | Scale support or fix root cause |

---

## 8. Incident Response

| Severity | Definition | Response |
|----------|-------------|----------|
| **P0** | Outage or data loss; billing broken | Immediate; fix or rollback; post-incident within 48h |
| **P1** | Major feature broken; security issue | Within 24h; fix or workaround |
| **P2** | Minor bug; degraded UX | Triage; fix in next sprint or hotfix |
| **P3** | Cosmetic; low impact | Backlog |

On-call or escalation path must be known; document in runbook.

---

## 9. Support Workflow

| Step | Owner |
|------|--------|
| Receive (email or form) | Support owner |
| Triage (bug vs question vs feedback) | Support owner / Product |
| Bug → Engineering | Tech lead assigns |
| Question → FAQ or reply | Support owner |
| Feedback → Product | Product logs for roadmap |
| Escalation (abuse, legal, P0) | Per runbook |

---

## 10. Success Criteria for Stabilization

| Criterion | Target (example) |
|-----------|-------------------|
| No P0 unresolved > 24h | 100% |
| Error rate | Stable or decreasing |
| Support tickets | Categorized and trending; no backlog > 7 days |
| Conversion funnel | Documented; at least one improvement shipped or planned |
| Runbook | Updated with lessons learned |
| Team | Ready for Phase E or steady-state cadence |

---

## 11. When This Becomes Relevant

- **Immediately after launch**: Execute from Day 1.
- **Before launch**: Ensure runbook, on-call, and support owner are in place (launch checklist).
- **Phase E**: Stabilization can run in parallel with Phase E planning; avoid overloading team.

---

## 12. Dependencies

- **Launch checklist**: Must be complete before launch (see launch-checklist.md).
- **Runbook and monitoring**: From devops-and-environment-plan and analytics-and-observability-implementation-plan.
- **Staffing**: Support owner and on-call from staffing-and-operating-model.

---

## 13. Risks

- **Underestimating support volume**: Plan for 2–3x expected volume in first week; have FAQ and templates ready.
- **P0 with no owner**: Always assign on-call or escalation; no "everyone's problem."
- **Skipping retro**: Capture lessons learned so next launch is smoother.
