import { describe, expect, it } from 'vitest'
import { createRectangleFootprint, createScenario, createTier, createVolume } from './factories'
import { parseScenarioDocument, serializeScenario } from './serialize'
import { MassingValidationError } from './validation'

const stepped = createScenario({
  id: 'scenario-1',
  siteId: 'sloped-edge',
  name: 'Stepped',
  volumes: [
    createVolume({
      id: 'v1',
      name: 'Block A',
      tiers: [
        createTier({ id: 't1', footprint: createRectangleFootprint(20, 10), storeys: 3 }),
        createTier({
          id: 't2',
          footprint: createRectangleFootprint(10, 8),
          baseElevation: 9.6,
          storeys: 2,
          use: 'commercial',
        }),
      ],
    }),
  ],
})

function issuePaths(json: string): string[] {
  try {
    parseScenarioDocument(json)
  } catch (error) {
    if (error instanceof MassingValidationError) return error.issues.map((issue) => issue.path)
    throw error
  }
  return []
}

function mutate(edit: (raw: Record<string, unknown>) => void): string {
  const raw = JSON.parse(serializeScenario(stepped)) as Record<string, unknown>
  edit(raw)
  return JSON.stringify(raw)
}

describe('scenario serialization', () => {
  it('round-trips a stepped scenario exactly', () => {
    const json = serializeScenario(stepped)
    expect(parseScenarioDocument(json)).toEqual(stepped)
    expect(serializeScenario(parseScenarioDocument(json))).toBe(json)
  })

  it('refuses to serialize an invalid document', () => {
    expect(() => serializeScenario({ ...stepped, name: '' })).toThrow(MassingValidationError)
  })

  it('rejects malformed JSON', () => {
    expect(issuePaths('{not json')).toEqual(['$'])
  })

  it('rejects an unknown schema version', () => {
    expect(issuePaths(mutate((raw) => (raw.schemaVersion = 3)))).toEqual(['schemaVersion'])
  })

  it('round-trips the v2 fields, including an optional camera bookmark', () => {
    const withCamera = { ...stepped, notes: 'Taller toward the park.', camera: { presetId: 'top' as const, position: [0, 0, 400] as const, target: [0, 0, 0] as const } }
    expect(parseScenarioDocument(serializeScenario(withCamera))).toEqual(withCamera)
  })

  it('rejects bad v2 fields with a path', () => {
    expect(issuePaths(mutate((raw) => (raw.notes = 'x'.repeat(2001))))).toEqual(['notes'])
    expect(issuePaths(mutate((raw) => delete raw.notes))).toEqual(['notes'])
    expect(issuePaths(mutate((raw) => (raw.updatedAt = 'yesterday')))).toEqual(['updatedAt'])
    expect(issuePaths(mutate((raw) => (raw.camera = { presetId: 'aerial', position: [0, 0, 1], target: [0, 0, 0] })))).toEqual(['camera.presetId'])
    expect(issuePaths(mutate((raw) => (raw.camera = { presetId: 'top', position: [0, 0], target: [0, 0, 0] })))).toEqual(['camera.position'])
  })

  it('rejects structurally broken documents with a path', () => {
    const volumes = (raw: Record<string, unknown>) =>
      raw.volumes as { tiers: Record<string, unknown>[] }[]
    expect(issuePaths(mutate((raw) => delete volumes(raw)[0]?.tiers[0]?.footprint))).toEqual([
      'volumes[0].tiers[0].footprint',
    ])
    expect(
      issuePaths(
        mutate((raw) => {
          const tier = volumes(raw)[0]?.tiers[0]
          if (tier) tier.footprint = { vertices: [[0, 0], ['1', 0], [1, 1]] }
        }),
      ),
    ).toEqual(['volumes[0].tiers[0].footprint.vertices[1]'])
    expect(issuePaths(mutate((raw) => (raw.volumes = 'none')))).toEqual(['volumes'])
  })

  it('rejects semantically invalid values after decoding', () => {
    const json = mutate((raw) => {
      const tier = (raw.volumes as { tiers: Record<string, unknown>[] }[])[0]?.tiers[0]
      if (tier) tier.storeys = 0
    })
    expect(issuePaths(json)).toEqual(['volumes[0].tiers[0].storeys'])
  })

  it('drops unknown fields', () => {
    const parsed = parseScenarioDocument(mutate((raw) => (raw.extra = true)))
    expect(parsed).toEqual(stepped)
    expect('extra' in parsed).toBe(false)
  })
})
