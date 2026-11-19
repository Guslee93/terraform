import { createHistory } from '../../features/editor/history'
import { createEditorState, type EditorState } from '../../features/editor/interaction'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../features/massing/factories'
import { sampleTerrainHeight } from '../../features/sites/geometry'
import type { SitePackage } from '../../features/sites/package'
import { normalizeRing, ringCentroid } from '../../lib/polygon'
import { IDENTITY, NORDIC, type SceneStyle } from '../../scene/style'

/**
 * The Visual Lab's fixed states (TF-VIS-015, 03 §7 / 04 §2). One builder per state; the hooks and
 * domain functions do the work — no computation is copied into the Lab.
 */
export type LabStateId = 'neutral' | 'sun-hours' | 'wind' | 'noise' | 'water' | 'slope' | 'mass'

export type LabState = { readonly id: LabStateId; readonly label: string }

export const LAB_STATES: readonly LabState[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'sun-hours', label: 'Sun hours' },
  { id: 'wind', label: 'Wind (2 m, direction view)' },
  { id: 'noise', label: 'Noise (Lden)' },
  { id: 'water', label: 'Water' },
  { id: 'slope', label: 'Slope' },
  { id: 'mass', label: 'One demo mass' },
]

export type LabStyleOption = { readonly id: string; readonly label: string; readonly style: SceneStyle }

/**
 * The style picker's list. Adding `IDENTITY` (TF-VIS-020) is one new entry here, nothing else.
 */
export const LAB_STYLES: readonly LabStyleOption[] = [
  { id: 'nordic', label: 'NORDIC', style: NORDIC },
  { id: 'identity', label: 'IDENTITY (stage A)', style: IDENTITY },
]

/** An empty editor (no masses): the analysis states show the site without a proposal. */
export function buildEmptyEditor(siteId: string): EditorState {
  return createEditorState(createHistory(createScenario({ siteId, name: 'Lab' })))
}

/** One demo mass seated on the terrain at the study-area centroid. */
export function buildDemoMassEditor(siteId: string, sitePackage: SitePackage): EditorState {
  const centre = ringCentroid(normalizeRing(sitePackage.studyArea.polygon))
  const baseElevation = sampleTerrainHeight(sitePackage.terrain, centre[0], centre[1])
  const volume = createVolume({
    name: 'Demo mass',
    tiers: [createTier({ footprint: createRectangleFootprint(24, 18, centre), baseElevation, storeys: 4 })],
  })
  return createEditorState(createHistory(createScenario({ siteId, name: 'Lab', volumes: [volume] })))
}
