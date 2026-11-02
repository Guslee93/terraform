/**
 * D35 — M4 persisted-document fixture generator.
 *
 * Run: `npx tsx src/features/scenarios/__fixtures__/generate.ts`
 * Generates all fixture files under this directory from real code.
 * Keep this script for reproducibility — run again to regenerate.
 */

import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../massing/factories'
import { serializeScenario } from '../../massing/serialize'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const DIR = path.dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// 1. Build the stepped scenario with fixed IDs
// ---------------------------------------------------------------------------
const steppedDoc = createScenario({
  id: 'scenario-stepped',
  siteId: 'sloped-edge',
  name: 'Stepped mass',
  volumes: [
    createVolume({
      id: 'volume-main',
      name: 'Block A',
      tiers: [
        createTier({
          id: 'tier-lower',
          name: 'Lower',
          footprint: createRectangleFootprint(20, 10),
          baseElevation: 0,
          storeys: 3,
          storeyHeight: 3.2,
          use: 'residential',
        }),
        createTier({
          id: 'tier-upper',
          name: 'Upper',
          footprint: createRectangleFootprint(10, 8),
          baseElevation: 9.6,
          storeys: 2,
          storeyHeight: 3.2,
          use: 'commercial',
        }),
      ],
    }),
  ],
})

const steppedV1 = serializeScenario(steppedDoc)
const steppedParsed = JSON.parse(steppedV1) as Record<string, unknown>
// ---------------------------------------------------------------------------
// 2. stepped-v1.json — real v1 serialiser output
// ---------------------------------------------------------------------------
fs.writeFileSync(path.join(DIR, 'stepped-v1.json'), steppedV1 + '\n')
console.log('✓ stepped-v1.json')

// ---------------------------------------------------------------------------
// 3. stepped-v0.json — same as v1 minus schemaVersion
// ---------------------------------------------------------------------------
const v0 = { ...steppedParsed }
delete v0.schemaVersion
fs.writeFileSync(path.join(DIR, 'stepped-v0.json'), JSON.stringify(v0, null, 2) + '\n')
console.log('✓ stepped-v0.json')

// ---------------------------------------------------------------------------
// 4. stepped-v2.expected.json — expected migration to v2
// ---------------------------------------------------------------------------
const v2Expected = {
  ...steppedParsed,
  schemaVersion: 2,
  notes: '',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}
delete (v2Expected as Record<string, unknown>).camera
fs.writeFileSync(path.join(DIR, 'stepped-v2.expected.json'), JSON.stringify(v2Expected, null, 2) + '\n')
console.log('✓ stepped-v2.expected.json')
// ---------------------------------------------------------------------------
// 5. corrupt-truncated.json — v1 cut mid-array
// ---------------------------------------------------------------------------
const truncatePoint = steppedV1.indexOf('[')
fs.writeFileSync(
  path.join(DIR, 'corrupt-truncated.json'),
  steppedV1.slice(0, truncatePoint + steppedV1.length / 2) + '\n',
)
console.log('✓ corrupt-truncated.json')

// ---------------------------------------------------------------------------
// 6. corrupt-shape.json — valid JSON but tier missing footprint
// ---------------------------------------------------------------------------
const corruptShape = structuredClone(steppedParsed) as Record<string, unknown>
const volumes = corruptShape.volumes as Record<string, unknown>[]
const tiers = volumes[0]?.tiers as Record<string, unknown>[]
if (tiers?.[0]) {
  delete tiers[0].footprint
}
fs.writeFileSync(path.join(DIR, 'corrupt-shape.json'), JSON.stringify(corruptShape, null, 2) + '\n')
console.log('✓ corrupt-shape.json')

// ---------------------------------------------------------------------------
// 7. invalid-geometry.json — self-intersecting (bow-tie) footprint
// ---------------------------------------------------------------------------
const invalidDoc = createScenario({
  id: 'scenario-invalid',
  siteId: 'compact-infill',
  name: 'Bow-tie',
  volumes: [
    createVolume({
      id: 'volume-bowtie',
      name: 'Self-intersecting',
      tiers: [
        createTier({
          id: 'tier-bowtie',
          name: 'Bow-tie',
          // Self-intersecting quadrilateral: edges (10,0)->(0,10) and (10,10)->(0,0) cross
          footprint: { vertices: [[0, 0], [10, 0], [0, 10], [10, 10]] },
          storeys: 3,
        }),
      ],
    }),
  ],
})
// serializeScenario will throw because the footprint fails isSimpleRing.
// We need the raw JSON anyway.
const invalidRaw = {
  ...JSON.parse(JSON.stringify(invalidDoc)),
  schemaVersion: 1,
}
fs.writeFileSync(path.join(DIR, 'invalid-geometry.json'), JSON.stringify(invalidRaw, null, 2) + '\n')
console.log('✓ invalid-geometry.json')
// ---------------------------------------------------------------------------
// 8. newer-version.json — schemaVersion: 99
// ---------------------------------------------------------------------------
const newerVersion = { ...steppedParsed, schemaVersion: 99 }
fs.writeFileSync(path.join(DIR, 'newer-version.json'), JSON.stringify(newerVersion, null, 2) + '\n')
console.log('✓ newer-version.json')

// ---------------------------------------------------------------------------
// 9. project-index.json — ProjectRecord v2 for compact-infill
// ---------------------------------------------------------------------------
const projectIndex = {
  schemaVersion: 2,
  siteId: 'compact-infill',
  activeScenarioId: 'scenario-concept-a',
  scenarioIds: ['scenario-concept-a', 'scenario-missing-file'],
  updatedAt: '2026-11-02T00:00:00.000Z',
}
fs.writeFileSync(path.join(DIR, 'project-index.json'), JSON.stringify(projectIndex, null, 2) + '\n')
console.log('✓ project-index.json')

// ---------------------------------------------------------------------------
// 10. export-bundle.json — full project export shape
// ---------------------------------------------------------------------------
const conceptA = createScenario({
  id: 'scenario-export-a',
  siteId: 'compact-infill',
  name: 'Concept A',
  volumes: [
    createVolume({
      id: 'volume-export',
      name: 'Export mass',
      tiers: [
        createTier({
          id: 'tier-export',
          name: 'Main block',
          footprint: createRectangleFootprint(20, 10),
          storeys: 3,
        }),
      ],
    }),
  ],
})

const conceptB = createScenario({
  id: 'scenario-export-b',
  siteId: 'compact-infill',
  name: 'Concept B',
  volumes: [],
})

const exportBundle = {
  schemaVersion: 2,
  provenance: {
    siteId: 'compact-infill',
    appVersion: '1.0.0',
    exportedAt: '2026-11-02T00:00:00.000Z',
  },
  project: {
    schemaVersion: 2,
    siteId: 'compact-infill',
    activeScenarioId: 'scenario-export-a',
    scenarioIds: ['scenario-export-a', 'scenario-export-b'],
    updatedAt: '2026-11-02T00:00:00.000Z',
  },
  scenarios: [JSON.parse(serializeScenario(conceptA)), JSON.parse(serializeScenario(conceptB))],
}
fs.writeFileSync(path.join(DIR, 'export-bundle.json'), JSON.stringify(exportBundle, null, 2) + '\n')
console.log('✓ export-bundle.json')

console.log('\nAll fixtures generated.')