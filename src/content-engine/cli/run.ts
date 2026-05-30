#!/usr/bin/env node
/**
 * Content engine — CLI entrypoint for generation jobs.
 * Usage (when wired): node run.js generate:scenario --scenario=cafe --levels=A1,A2
 *                    node run.js generate:batch --config=batch.json
 *                    node run.js validate:artifacts --ids=id1,id2
 *                    node run.js publish:approved --batch=release-1
 */

import { StubGenerationPipeline } from '../pipelines/orchestrator.js'
import type { GenerationRequest } from '../types/requests.js'
import { generationRequestSchema } from '../schemas/requests.js'

const pipeline = new StubGenerationPipeline()

async function cmdGenerateScenario(args: Record<string, string>): Promise<void> {
  const scenario = args.scenario ?? args.s ?? 'cafe'
  const levels = (args.levels ?? args.l ?? 'A1').split(',')
  const locale = args.locale ?? 'nl'
  for (const level of levels) {
    const request: GenerationRequest = {
      artifact_type: 'Dialogue',
      locale,
      params: { scenario_code: scenario, cefr_level: level, num_turns: 6 },
    }
    const parsed = generationRequestSchema.safeParse(request)
    if (!parsed.success) {
      console.error('Invalid request:', parsed.error.message)
      process.exit(1)
    }
    const result = await pipeline.run(parsed.data)
    console.log(`Scenario ${scenario} level ${level}:`, result.success ? 'OK' : result.errors?.join(', '))
  }
}

async function cmdGenerateBatch(args: Record<string, string>): Promise<void> {
  const configPath = args.config ?? args.c
  if (!configPath) {
    console.error('Usage: generate:batch --config=<path>')
    process.exit(1)
  }
  console.log('Batch config path:', configPath, '(stub: not loading file)')
  console.log('Run batch via BatchRunner with config.')
}

async function cmdValidateArtifacts(args: Record<string, string>): Promise<void> {
  const ids = (args.ids ?? args.i ?? '').split(',').filter(Boolean)
  if (ids.length === 0) {
    console.error('Usage: validate:artifacts --ids=id1,id2')
    process.exit(1)
  }
  console.log('Validate artifacts:', ids.join(', '), '(stub: no repository)')
}

async function cmdPublishApproved(args: Record<string, string>): Promise<void> {
  const batch = args.batch ?? args.b
  console.log('Publish approved batch:', batch ?? '(all)', '(stub: no repository)')
}

const commands: Record<string, (args: Record<string, string>) => Promise<void>> = {
  'generate:scenario': cmdGenerateScenario,
  'generate:batch': cmdGenerateBatch,
  'validate:artifacts': cmdValidateArtifacts,
  'publish:approved': cmdPublishApproved,
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const args: Record<string, string> = {}
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=')
      args[key ?? ''] = val ?? 'true'
    }
  }
  const fn = cmd ? commands[cmd] : null
  if (!fn) {
    console.log('Usage: content-engine-cli <command> [--key=value ...]')
    console.log('Commands:', Object.keys(commands).join(', '))
    process.exit(cmd ? 1 : 0)
  }
  await fn(args)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
