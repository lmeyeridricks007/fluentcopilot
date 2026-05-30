# Visual image system — FluentCopilot

Product and implementation guide for **scenario and category imagery**: memory anchors, discovery, and immersion without clutter or stock-photo noise.

## Principles

1. **Support learning** — Images anchor *where* the learner is practising (café, gemeente, station), not decoration.
2. **Same scene, same visual** — One scenario id uses one visual identity across library card → launch → guided prep → (optional) recommendations.
3. **Never compete with the task** — No full-screen backgrounds in active conversation; no imagery in dense typing/listening zones by default.
4. **Premium & calm** — Soft, slightly desaturated, European everyday contexts; avoid grinning stock models, fake call-centre vibes, neon travel posters.
5. **Graceful degradation** — Missing files never break layout; fixed aspect ratios prevent CLS.
6. **Accessible** — Meaningful `alt` for photos; gradient fallbacks use `aria-label` with the same copy.

## Where images ARE used (current)

| Surface | Pattern |
|---------|---------|
| Scenario library cards | 16∶9 thumbnail + scene chip |
| Scenario launch / mode picker | Hero banner + chip, title below |
| Guided prep / phrases intro | Compact strip + one line of copy |
| Practice Explore — category carousel | Category strip + chip |
| Practice hub recommendations | Square thumb when `scenarioId` maps to catalog |

## Where images must NOT dominate

- Guided **chat** thread and **composer** (keep clear; optional tiny header strip only if ever added later).
- Exam **simulation** execution, **feedback** detail blocks, **review** queues, heavy **dashboard** stats.
- Learn path: only **small** accents if a unit theme benefits; never a media wall.

## Style direction (chosen)

**A — Soft editorial photography** (target for real assets):

- Natural light, NL/EU-relevant interiors and public spaces  
- Neutral walls, wood/stone/concrete; subtle blue-grey harmony with UI  
- No readable brand logos; no text inside the frame that carries required content  
- 3∶2 or 16∶9, ~1200px wide master, export **WebP** ~60–85% quality for mobile  

When a scenario has no file in the registry bundle, the app uses **category-tuned gradients + Lucide scene icons** (single coherent non-photo style).

## Technical architecture

| Piece | Path |
|-------|------|
| Registry & copy | `src/lib/practice/scenarioImageRegistry.ts` (re-exported from `src/lib/visual/scenarioVisualRegistry.ts` for backwards compatibility) |
| UI | `src/components/visual/ScenarioSceneVisual.tsx` |
| Asset files | `public/images/scenarios/{scenarioId}.webp` (see folder README) |

**API:**

- `resolveScenarioVisual(entry)` — from `ScenarioCatalogEntry`  
- `resolveCategoryVisual(category, titleShort)` — browse tiles  
- `tryResolveScenarioVisual(scenarioId)` — optional id → visual or null  

Bundled scenarios map to `heroSrc` / `thumbnailSrc` in `SCENARIO_IMAGE_REGISTRY`. Missing or failed images fall back to gradient + icon (no 404 layout break).

`next/image` is used when a non-empty URL resolves; `loading="lazy"` except launch hero (`priority`).

## Aspect variants

| Variant | Use | Approx ratio |
|---------|-----|----------------|
| `thumbnail` | Library cards | 16∶9, max-height cap |
| `hero` | Scenario launch | ~2.4∶1, max ~148px |
| `compact` | Guided prep | ~2.1∶1 |
| `categoryStrip` | Explore categories | ~3.2∶1 |
| `square` | Recommendation row | 1∶1, fixed size via className |

## Performance

- Fixed **aspect-ratio** + **max-height** classes → stable layout without CLS.  
- Lazy load except first-paint hero on launch.  
- No 404s when `imageSrc` is `null`.  
- Keep files **&lt; ~200 KB** per scene where possible after compression.

## Accessibility

- Photos: descriptive `alt` per scenario in registry.  
- Gradient fallback: `role="img"` + `aria-label` = same narrative.  
- Chips are decorative labels; scene is already described on the container.  
- Do not put exam instructions only inside bitmaps.

## Future: more languages / locales

- Registry can gain `locale` or `variant` keys later; default remains scenario id.  
- Art direction stays **European** for NL A2; other markets may add suffix assets (`cafe-de.webp`) if needed.

## Prompt bank (for commissioning photography)

Use these as briefs; keep composition **mobile-safe** (important content centre-weighted).

- **cafe** — *Realistic Dutch or European café interior, daylight from tall windows, clean counter, cups and pastry case softly blurred, no logos, calm neutrals, editorial travel-app style.*  
- **supermarket** — *Aisle perspective toward checkout, soft overhead light, everyday Dutch supermarket feel without readable packaging brands.*  
- **doctor** — *Quiet consultation room, desk and chair, medical neutrality, no identifiable people, soft natural light.*  
- **municipality** — *Modern gemeente reception or desk, forms and queue barrier subtle, formal but welcoming.*  
- **train** — *Platform with digital departure board slightly out of focus, NS-like but unbranded, cool daylight.*  
- **work** — *Small meeting table, laptop closed, coffee glass, no posed “stock smile” people.*  
- **housing** — *Apartment door / intercom / hallway detail suggesting landlord visit, warm neutral tones.*  
- **social_plans** — *Two empty chairs in a bright café corner, implied conversation, not crowded.*  
- **problem_solving** — *Service counter in shop, calm lighting, space for “sorting a mistake” narrative.*

## Acceptance checklist

- [x] Registry-driven, not scattered hardcoded URLs in cards  
- [x] Library + launch + prep + categories + recommendations wired  
- [x] Fallbacks preserve layout  
- [x] Documentation + public folder README for assets  
- [ ] Replace gradients with WebP per scenario when art is ready  
