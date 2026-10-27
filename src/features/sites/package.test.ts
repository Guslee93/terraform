import { describe, expect, it } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import slopedBuildings from '../../../public/sites/sloped-edge/buildings.json'
import slopedManifest from '../../../public/sites/sloped-edge/manifest.json'
import slopedStudyArea from '../../../public/sites/sloped-edge/study-area.json'
import slopedTerrain from '../../../public/sites/sloped-edge/terrain.json'
import { SitePackageError, parseSiteManifest } from './manifest'
import { parseBuildings, parseStudyArea, parseTerrain } from './package'

const PACKAGES = [
  {
    id: 'compact-infill',
    manifest: compactManifest,
    terrain: compactTerrain,
    buildings: compactBuildings,
    studyArea: compactStudyArea,
  },
  {
    id: 'sloped-edge',
    manifest: slopedManifest,
    terrain: slopedTerrain,
    buildings: slopedBuildings,
    studyArea: slopedStudyArea,
  },
]

describe.each(PACKAGES)('$id package', ({ id, manifest, terrain, buildings, studyArea }) => {
  it('parses the manifest and all three assets', () => {
    const parsedManifest = parseSiteManifest(manifest)
    const parsedTerrain = parseTerrain(terrain)
    const parsedBuildings = parseBuildings(buildings)
    const parsedStudyArea = parseStudyArea(studyArea)

    expect(parsedManifest.id).toBe(id)
    expect(parsedTerrain.siteId).toBe(id)
    expect(parsedBuildings.siteId).toBe(id)
    expect(parsedStudyArea.siteId).toBe(id)
  })

  it('matches declared statistics', () => {
    const parsedManifest = parseSiteManifest(manifest)
    const parsedTerrain = parseTerrain(terrain)
    const parsedBuildings = parseBuildings(buildings)

    expect(parsedManifest.statistics.buildingCount).toBe(parsedBuildings.buildings.length)
    expect(parsedManifest.statistics.terrainSamples).toBe(
      parsedTerrain.cols * parsedTerrain.rows,
    )
    expect(parsedBuildings.buildings.length).toBeGreaterThan(0)
  })

  it('records both sources and five camera presets', () => {
    const parsed = parseSiteManifest(manifest)
    expect(parsed.sources.map((source) => source.license)).toEqual(
      expect.arrayContaining(['ODbL 1.0', 'CC BY 4.0']),
    )
    expect(Object.keys(parsed.cameraPresets)).toEqual([
      'isometric',
      'top',
      'north',
      'south',
      'eyeLevel',
    ])
  })

  it('uses a closed study boundary that is explicitly not cadastral', () => {
    const parsed = parseStudyArea(studyArea)
    expect(parsed.label).toMatch(/not a cadastral parcel/i)
    expect(parsed.polygon[0]).toEqual(parsed.polygon[parsed.polygon.length - 1])
  })
})

describe('package validation', () => {
  it('rejects unsupported manifest schemas', () => {
    expect(() => parseSiteManifest({ ...compactManifest, schemaVersion: 2 })).toThrow(
      SitePackageError,
    )
  })

  it('rejects a terrain grid with the wrong row count', () => {
    const broken = structuredClone(compactTerrain)
    broken.heights.pop()
    expect(() => parseTerrain(broken)).toThrow(/row count/)
  })

  it('rejects an open study boundary', () => {
    const broken = structuredClone(compactStudyArea)
    broken.polygon.pop()
    expect(() => parseStudyArea(broken)).toThrow(/closed/)
  })
})
