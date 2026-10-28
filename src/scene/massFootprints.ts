import type { Vec2 } from '../lib/coordinates'
import type { ScenarioDocument } from '../features/massing/types'

/**
 * Footprint vertices of every tier of every visible volume.
 * Hidden volumes are excluded. Returns a copy that may be safely mutated.
 */
export function visibleTierFootprints(document: ScenarioDocument): Vec2[][] {
  return document.volumes
    .filter((volume) => volume.visible)
    .flatMap((volume) => volume.tiers.map((tier) => [...tier.footprint.vertices]))
}