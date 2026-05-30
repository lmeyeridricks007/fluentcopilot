#!/usr/bin/env node
/**
 * Copy generated KNM scene WebPs from Cursor assets into public/images/knm/.
 * Run after batch image generation (assets/*.webp).
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir =
  process.env.KNM_SCENE_ASSETS_DIR ||
  join(process.env.HOME || '', '.cursor/projects/Users-LMeyeridricks-Documents-coding-language-tutor/assets')
const outDir = join(root, 'public/images/knm')

if (!existsSync(assetsDir)) {
  console.error('Assets dir not found:', assetsDir)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
let n = 0
for (const name of readdirSync(assetsDir)) {
  if (!name.endsWith('.webp')) continue
  cpSync(join(assetsDir, name), join(outDir, name), { force: true })
  n++
}
console.log(`Synced ${n} WebP files to ${outDir}`)
