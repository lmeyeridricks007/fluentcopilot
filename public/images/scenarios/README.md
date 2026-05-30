# Scenario scene images

Production pack: **WebP** files named by **catalog scenario id** under this folder.

- Path pattern: `/images/scenarios/{scenarioId}.webp`  
- Examples: `cafe.webp`, `train.webp`, `social_plans.webp`  
- **Registry:** `src/lib/practice/scenarioImageRegistry.ts` (`SCENARIO_IMAGE_REGISTRY`) — do not hardcode paths in UI components.

**Guidelines:** `docs/product/scenario-image-prompts.md` and `docs/product/visual-image-system.md` — ~16∶9 masters resized to ~1200px wide, WebP q75–80, NL/EU context, no logos, no in-image text.

If a file is missing or fails to load, `ScenarioSceneVisual` keeps layout and shows **gradient + category icon**.
