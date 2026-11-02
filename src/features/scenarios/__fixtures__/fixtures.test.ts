/**
 * D35 — M4 persisted-document fixture validation.
 *
 * These tests run against the pre-M4 code (v1 serialiser) and verify that the
 * fixture files are correctly formed. When Claude merges this branch, the v1
 * parsing checks will be moved onto the new migration function; the fixture
 * files themselves stay unchanged.
 */

import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

import { parseScenarioDocument, serializeScenario } from '../../massing/serialize'
import { MassingValidationError } from '../../massing/validation'

function load(name: string): string {
  return fs.readFileSync(path.join(__dirname, name), 'utf-8')
}

function issuePaths(json: string): string[] {
  try {
    parseScenarioDocument(json)
  } catch (error) {
    if (error instanceof MassingValidationError) return error.issues.map((issue) => issue.path)
    throw error
  }
  return []
}

describe('M4 persistence fixtures', () => {
  describe('stepped-v1.json', () => {
    it('parses with parseScenarioDocument', () => {
      const doc = parseScenarioDocument(load('stepped-v1.json'))
      expect(doc.schemaVersion).toBe(1)
      expect(doc.id).toBe('scenario-stepped')
      expect(doc.siteId).toBe('sloped-edge')
      expect(doc.name).toBe('Stepped mass')
    })

    it('round-trips through serializeScenario', () => {
      const json = load('stepped-v1.json')
      const doc = parseScenarioDocument(json)
      expect(serializeScenario(doc)).toBe(json.trim())
    })

    it('has the expected stepped geometry', () => {
      const doc = parseScenarioDocument(load('stepped-v1.json'))
      expect(doc.volumes).toHaveLength(1)
      const volume = doc.volumes[0]!
      const tiers = volume.tiers
      expect(tiers).toHaveLength(2)
      // Lower tier: 20 x 10 m, 3 storeys at 3.2 m
      expect(tiers[0]!.storeys).toBe(3)
      expect(tiers[0]!.storeyHeight).toBe(3.2)
      expect(tiers[0]!.baseElevation).toBe(0)
      // Upper tier: 10 x 8 m, 2 storeys at 3.2 m, sitting on lower tier
      expect(tiers[1]!.storeys).toBe(2)
      expect(tiers[1]!.storeyHeight).toBe(3.2)
      expect(tiers[1]!.baseElevation).toBe(9.6)
    })
  })

  describe('stepped-v0.json (unversioned)', () => {
    it('is v1 minus schemaVersion, and nothing else differs', () => {
      const v0 = JSON.parse(load('stepped-v0.json')) as Record<string, unknown>
      const v1 = JSON.parse(load('stepped-v1.json')) as Record<string, unknown>
      expect(v0).not.toHaveProperty('schemaVersion')
      expect(v1).toHaveProperty('schemaVersion')
      const v0WithVersion = { ...v0, schemaVersion: 1 }
      expect(v0WithVersion).toEqual(v1)
    })
  })

  describe('stepped-v2.expected.json (expected migration)', () => {
    it('has schemaVersion 2 and the new fields', () => {
      const doc = JSON.parse(load('stepped-v2.expected.json')) as Record<string, unknown>
      expect(doc.schemaVersion).toBe(2)
      expect(doc).toHaveProperty('notes')
      expect(doc).toHaveProperty('createdAt')
      expect(doc).toHaveProperty('updatedAt')
      expect(doc).not.toHaveProperty('camera')
    })

    it('preserves all v1 fields unchanged', () => {
      const v1 = JSON.parse(load('stepped-v1.json')) as Record<string, unknown>
      const v2 = JSON.parse(load('stepped-v2.expected.json')) as Record<string, unknown>
      for (const key of ['id', 'siteId', 'name', 'assumptions', 'volumes'] as const) {
        expect(v2[key]).toEqual(v1[key])
      }
    })
  })

  describe('corrupt-truncated.json', () => {
    it('is rejected as invalid JSON ($)', () => {
      expect(issuePaths(load('corrupt-truncated.json'))).toEqual(['$'])
    })
  })

  describe('corrupt-shape.json', () => {
    it('is rejected because a tier is missing footprint', () => {
      const paths = issuePaths(load('corrupt-shape.json'))
      expect(paths).toHaveLength(1)
      expect(paths[0]).toMatch(/footprint/)
    })
  })

  describe('invalid-geometry.json', () => {
    it('is rejected due to self-intersecting footprint', () => {
      const paths = issuePaths(load('invalid-geometry.json'))
      const crossingIssues = paths.filter((p) => p.includes('footprint'))
      expect(crossingIssues.length).toBeGreaterThan(0)
    })
  })

  describe('newer-version.json', () => {
    it('is rejected with schemaVersion path', () => {
      expect(issuePaths(load('newer-version.json'))).toContain('schemaVersion')
    })
  })

  describe('project-index.json', () => {
    it('is valid JSON with the expected shape', () => {
      const record = JSON.parse(load('project-index.json')) as Record<string, unknown>
      expect(record.schemaVersion).toBe(2)
      expect(record.siteId).toBe('compact-infill')
      expect(record.scenarioIds).toEqual(['scenario-concept-a', 'scenario-missing-file'])
      expect(record).toHaveProperty('activeScenarioId')
      expect(record).toHaveProperty('updatedAt')
    })
  })

  describe('export-bundle.json', () => {
    it('has the export shape with provenance and two scenarios', () => {
      const bundle = JSON.parse(load('export-bundle.json')) as Record<string, unknown>
      expect(bundle.schemaVersion).toBe(2)
      expect(bundle).toHaveProperty('provenance')
      expect(bundle).toHaveProperty('project')
      expect(bundle).toHaveProperty('scenarios')
      const scenarios = bundle.scenarios as Record<string, unknown>[]
      expect(scenarios).toHaveLength(2)
      expect(scenarios[0]!.name).toBe('Concept A')
      expect(scenarios[1]!.name).toBe('Concept B')
      expect(scenarios.every((s) => s.siteId === 'compact-infill')).toBe(true)
    })

    it('has scenarios that parse and serialize', () => {
      const bundle = JSON.parse(load('export-bundle.json')) as Record<string, unknown>
      const scenarios = bundle.scenarios as Record<string, unknown>[]
      for (const raw of scenarios) {
        const doc = parseScenarioDocument(JSON.stringify(raw))
        expect(serializeScenario(doc)).toBe(JSON.stringify(raw))
      }
    })
  })
})