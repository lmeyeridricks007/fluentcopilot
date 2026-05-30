# Content Moderation & Safety Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **content moderation** for AI output safety (IS-017), user-generated content (reflection notes, uploads) (IS-018), and protected categories. Covers provider-native (OpenAI Moderation, Anthropic safety) and optional custom pipeline; abuse detection; child safety boundaries if ever introduced.

---

## 2. Why Needed

- IS-017: AI-generated text and corrections must pass safety/moderation before display. IS-018: User-generated text and uploads subject to moderation and retention. No harmful, hate, adult, or self-harm content; child safety if product extends to underage users.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| AI output moderation | **Required now** |
| User content moderation | **Required now** (text + image) |
| Provider | **Required now** — OpenAI Moderation API + optional image API |
| Custom blocklist | **Optional now** (add high-risk terms) |
| Child safety | **Required if** underage users ever supported |

---

## 4. Architecture

- **AI output**: After every LLM response, call moderation (OpenAI `POST /moderations` or Anthropic safety). If flagged (e.g. hate, violence, sexual), do not return to user; return generic “I couldn’t generate a response for that” or retry with stricter system prompt once.
- **User text** (reflection note, chat): Before sending to LLM or storing, call same moderation. If flagged, reject with “This content isn’t allowed” and do not persist.
- **User image** (reflection photo): Use OpenAI Image Moderation or Azure Content Safety (or similar). If flagged, reject upload and do not store.
- **Escalation**: Log flagged content (hash only, no PII) for review; human review queue optional (Operations doc). Define in Content policy.

---

## 5. Credentials

- **OpenAI Moderation**: Same API key as LLM. **Image**: OpenAI or Azure Content Safety key (backend only).
- **Azure Content Safety**: If used for image: `INTEGRATION_AZURE_CONTENT_SAFETY_KEY`, `INTEGRATION_AZURE_CONTENT_SAFETY_ENDPOINT`. Backend only.

---

## 6. Request/Response (OpenAI Moderation)

**Request**: POST https://api.openai.com/v1/moderations with body `{ "input": "text to check" }`.
**Response**: `{ "results": [{ "flagged": true/false, "categories": {...}, "category_scores": {...} }] }`. If any protected category true, treat as fail.

---

## 7. Failure and Fallback

- Moderation API down: Option A) Block and return “Safety check unavailable; try again.” Option B) Allow with warning (not recommended for high-risk). Prefer A.
- Do not skip moderation for cost/speed; safety is non-negotiable.

---

## 8. Child Safety

- If product allows under-18: Stricter filters; no UGC from minors to other users; parental consent; no targeted ads. Document in policy; implement when scope includes minors.
