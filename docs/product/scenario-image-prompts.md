# Scenario image prompts — production packs

**Style (all scenarios):** Premium realistic editorial-style scene illustration, clean composition, slightly desaturated calm palette (soft blue-grey, warm neutrals), modern European / Dutch everyday context, soft daylight, **no visible logos or brands**, **no text in image**, **no cheesy stock grins or dominant faces**, uncluttered, mobile hero / card safe (important detail centre-weighted), premium language-learning app aesthetic.

**Assets:** `public/images/scenarios/{id}.webp`. After generation, **resize to ~1200px width** and recompress (e.g. `cwebp -q 78 -resize 1200 0`) so each file stays roughly **60–200 KB** for mobile (complex skies may land ~100–130 KB).

**Registry:** `src/lib/practice/scenarioImageRegistry.ts`

## Pack v1 — core catalog

| scenarioId        | title (EN chip) | category        |
|-------------------|-----------------|-----------------|
| `cafe`            | Café            | food            |
| `supermarket`     | Supermarket     | food            |
| `doctor`          | Doctor          | health          |
| `municipality`    | Municipality    | municipality    |
| `work`            | Work            | work            |
| `train`           | Train station   | transport       |
| `housing`         | Housing         | housing         |
| `social_plans`    | Social          | social          |
| `problem_solving` | Shop            | problem_solving |

### Prompts v1

**cafe** — Small modern Dutch café interior, counter, espresso machine, pastries, soft daylight, blue-grey neutrals, no logos, no people as focal subject.

**supermarket** — European supermarket aisle, produce, baskets, calm lighting, no readable brand text.

**doctor** — Calm GP reception/waiting, soft clinical-warm light, empty chairs, no faces, no clinic names.

**municipality** — Modern gemeente-style desk, queue area, documents, glass partition, civic calm.

**work** — European office meeting corner, table, laptops without logos, window light, no hero faces.

**train** — Dutch-style platform, blank/illegible departure board, service counter hint, overcast light.

**housing** — Apartment entrance, intercom, brick/stucco, bikes softly blurred, no address text.

**social_plans** — Bright café corner, two chairs, window, cups without logos, no faces.

**problem_solving** — Retail counter, order issue vibe, till, bags without branding.

## Pack v2 — extended situations

| scenarioId          | title (EN chip) | category     |
|---------------------|-----------------|--------------|
| `restaurant`        | Restaurant      | food         |
| `pharmacy`          | Pharmacy        | health       |
| `school_front_desk` | School          | municipality |
| `phone_appointment` | Phone           | health       |
| `package_pickup`    | Parcel          | transport    |
| `bank_office`       | Bank            | municipality |
| `weather_plans`     | Plans           | social       |

### Prompts v2

**restaurant** — Table-service Dutch/European dining room, set tables, linen, soft daylight, no readable menu, no logos.

**pharmacy** — Pharmacy counter, medicine shelves softly blurred, calm clinical light, no readable brand names.

**school_front_desk** — School reception, notice board, calm daylight, no school name, no children’s faces.

**phone_appointment** — Minimal still life: phone handset on desk near calendar, soft light, no readable calendar text, suggests calling for an appointment.

**package_pickup** — Parcel point shelves and counter, European post/locker vibe, neutral interior, no logos.

**bank_office** — Quiet bank counter with privacy screen, modern European interior, no bank names or logos.

**weather_plans** — Park bench, soft cloudy sky, trees, desaturated blues and greens, no people, evokes weather small talk.

## Crop guidance

- **Hero / launch / prep compact:** wide aspect (~2.4∶1 to 16∶9); keep focal mass in **central 70%** vertically.
- **Cards / thumbnails:** v1 uses same file; future add `-thumb.webp` with tighter horizontal crop in registry.
- **Feedback screen:** `ScenarioSceneVisual` `square` variant (~4.5rem) for session + recommended-next continuity.

## Speak Live — Storytelling heroes (`public/speak-live/`)

**Contract:** `storytelling-{daily|travel}-{m|f}-hero.png` — **m/f** must match assistant **TTS gender** (`assistantPresentation`). POV: **learner talking to someone** (listener in frame, facing the user).

| File | Variation | Use |
|------|-----------|-----|
| `storytelling-daily-m-hero.png` / `-f-` | `what_you_did_yesterday` | Everyday / past-day narrative — warm interior or café, listener **man** or **woman**. |
| `storytelling-travel-m-hero.png` / `-f-` | `travel_story` | Trip / memorable experience — slightly richer setting, same facing-listener layout. |

**v1:** Placeholders were copied from the explaining-something photoreal pack so URLs and gender routing work in production. **v2 (recommended):** Regenerate four bespoke PNGs (same filenames) with prompts like:

- **Daily (each gender):** Premium photoreal, Dutch home or quiet café table, **friendly listener** ({man|woman}) **facing camera** as if in conversation with the learner, soft daylight, no logos, no text, editorial calm palette; evokes “tell me what you did yesterday”.
- **Travel (each gender):** Same framing, **travel-day** cues (train window blur, map on table without readable text, or outdoor terrace) — listener {man|woman} **facing you**; evokes “tell me about a trip”.

Export ~1200px wide, compress for mobile; bump cache-bust query in code if filenames stay the same.

## Speak Live — Opinions & discussions heroes (`public/speak-live/`)

**Contract:** `opinions-discussions-{agree|reasons}-{m|f}-hero.webp` — **m/f** must match assistant **TTS gender** (`assistantPresentation`). POV: **learner talking to someone** (partner in frame, facing the camera / learner). **Export:** ~**1200px** wide, **WebP** `cwebp -q 82` (mobile-friendly ~60–95 KB each).

| File | Variation | Use |
|------|-----------|-----|
| `opinions-discussions-agree-m-hero.webp` / `-f-` | `agree_disagree` | Reacting **eens / oneens** — café or home table, partner **man** or **woman**, engaged body language. |
| `opinions-discussions-reasons-m-hero.webp` / `-f-` | `give_reasons` | Same POV; partner listening as if after “**Waarom?**”, ready for your **omdat/want** line. |

**Regeneration prompts (photoreal):** smartphone-quality first-person POV across a table; friendly Dutch {man|woman} opposite you; soft daylight, shallow depth of field, natural skin texture, no text or logos. **Agree** = open reactive stance; **Reasons** = attentive “tell me why” listening stance.

## Future pack ideas

Bike shop, dentist, optician, job interview waiting area, rental car desk, hotel check-in, weekend market stall.
