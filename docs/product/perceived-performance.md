# Perceived performance — conversation flows

FluentCopilot hides backend latency with **immediate chrome**, **honest loading states**, and **calm motion** so users never wonder whether the app is working.

## Principles

1. **Never an empty canvas** — show the thread shell (header, message area, composer placeholder) while the conversation payload loads.
2. **Progress beats silence** — typing dots, coach-pending card, and save-word skeletons communicate *what* is happening.
3. **Motion is informative, not decorative** — short fades and slides (`fc-message-in`, `fc-feedback-hero`) reinforce state change without distraction.
4. **Respect reduced motion** — animations are gated with `motion-safe:` so `prefers-reduced-motion` users get a static but clear UI.

## Scenario / thread open

- **Cold navigation** to `/app/talk/thread/:id` shows `ConversationThreadShell`: sticky header skeleton, shimmer intro lines, `TypingIndicator` (“Assistant is getting ready”), and a composer-shaped placeholder.
- **Copy:** status line can mention syncing messages vs. generic loading.

## Assistant reply

- **Non-streaming:** While `send` is in flight, `TypingIndicator` appears at the bottom of the thread (where the next assistant bubble will land), labeled with the persona name.
- **Streaming:** Until the first token arrives, the same typing indicator shows; once deltas arrive, a provisional bubble shows streamed text with a short enter animation.
- **Send control:** `StickyChatComposer` shows a spinner on the send button and `aria-busy` while the request is pending.

## Coach feedback (per-turn)

- When `feedbackMode === 'after_each'` and enrichment is still running after the assistant message is visible, show **`CoachFeedbackPendingCard`**: “Coach is checking this…” plus a subtle dot rhythm.
- When enrichment completes, the real **`InlineCoachFeedback`** card replaces the placeholder with `fc-feedback-hero` motion.

## Save-word extraction

- If enrichment is pending and the last assistant message has **no** `saveWordCandidates` yet, **`ChatMessageBubble`** shows a compact “Save words” row with two pulsing skeleton chips.
- When candidates hydrate, chips **fade in** (`fc-message-in` on the chip row) so they do not pop in without warning.

## Save success & recap

- Library save toasts use **`fc-message-in`** so success is noticeable but quiet.
- **End conversation** modal sheet uses **`fc-feedback-hero`** on the card for a soft appear.
- **Recap** loading uses `RecapContentShell` (skeleton blocks + “Preparing your recap…”); loaded recap content uses **`fc-message-in`** on the root.

## Frontend reference map

| Concern | Primary UI |
| --- | --- |
| Thread loading | `ConversationThreadShell` |
| Recap loading | `RecapContentShell` |
| Assistant typing | `TypingIndicator` |
| Coach delay | `CoachFeedbackPendingCard` |
| Save chips delay | `ChatMessageBubble` `saveWordsPending` |
| Send in flight | `StickyChatComposer` `sending` + spinner |
| Motion tokens | `tailwind.config.js` — `fc-message-in`, `fc-feedback-hero`, `fc-typing-dot` |

## Acceptance checklist

- [ ] No blank white wait on thread open (shell visible).
- [ ] Typing / streaming states visible at the assistant anchor.
- [ ] Coach pending card visible when per-turn feedback is expected but not yet loaded.
- [ ] Save-word area shows skeleton until chips exist.
- [ ] Toasts, recap, and end modal use subtle enter motion.
