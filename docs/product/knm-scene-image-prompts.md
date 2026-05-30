# KNM exam scene images

**Style (all scenes):** Premium realistic editorial photograph, Dutch/European everyday context, soft natural daylight, slightly desaturated calm palette, clear subject showing the **situation in the question** (not abstract icons), centre-weighted for mobile 16∶9 crop, **no logos**, **no readable text**, **no stock-photo grins**, uncluttered.

**Assets:** `public/images/knm/{sceneId}.webp` (~1200px wide, WebP q78–80, target 60–200 KB).

**Registry:** `src/lib/exam-prep/kmn/knmSceneImageRegistry.ts`

Sync generated assets into the app:

```bash
node scripts/sync-knm-scene-images.mjs
```

Copies `*.webp` from the Cursor assets folder into `public/images/knm/`. Regenerate missing scenes with the imagegen skill (built-in `image_gen` or CLI `scripts/image_gen.py` from the imagegen skill when `OPENAI_API_KEY` is set); use prompts from `knmSceneImageRegistry.ts`.
