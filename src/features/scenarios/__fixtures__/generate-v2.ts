/**
 * Builds `export-bundle.json` (a true format-2 project export) from `export-bundle-legacy.json`
 * (D35's bundle, whose scenarios are still format 1) by running them through the real migration.
 * Run from the repo root: `npx tsx src/features/scenarios/__fixtures__/generate-v2.ts`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { migrateScenario } from '../migrate'

const NOW = '2026-11-02T00:00:00.000Z'
const dir = new URL('.', import.meta.url)
const legacy = JSON.parse(readFileSync(new URL('export-bundle-legacy.json', dir), 'utf8')) as { provenance: unknown; project: unknown; scenarios: unknown[] }
const bundle = { schemaVersion: 2, provenance: legacy.provenance, project: legacy.project, scenarios: legacy.scenarios.map((raw) => migrateScenario(raw, NOW)) }
writeFileSync(new URL('export-bundle.json', dir), `${JSON.stringify(bundle, null, 2)}\n`)
