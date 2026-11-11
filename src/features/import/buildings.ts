import type { ImportFrame, Origin } from './frame'
import { frameBounds } from './frame'
import { clipRing, mergeRings, outerRings, repairRing, simplifyRing, toLocal, type Ring } from './geometry'
import type { TileFeature } from './tiles'
/** Limits the package parser enforces; a draft outside them would fail the whole import. */
const MAX_HEIGHT_M = 200
const MAX_FOOTPRINT_VERTICES = 200
/** Coarsen an outline until it fits the parser's vertex limit, rather than rejecting the site. */
function capVertices(ring: Ring): Ring {
  let out = ring
  for (let tolerance = 0.6; out.length > MAX_FOOTPRINT_VERTICES && tolerance <= 40; tolerance *= 2) out = simplifyRing(ring, tolerance)
  return out
}
export type BuildingDraft = { id: string; sourceId: string; footprint: Ring; height: number; minHeight: number }
export function extractBuildings(features: readonly TileFeature[], frame: ImportFrame, origin: Origin = frame): BuildingDraft[] {
  const extent = frameBounds(frame, origin).enu
  const groups = new Map<string, { rings: Ring[]; renderHeight: number; minHeight: number }>()
  for (const [index, feature] of features.entries()) {
    if (feature.layer !== 'building' || [true, 1, 'true', '1'].includes(feature.properties.hide_3d ?? false)) continue
    const rings = outerRings(feature.geometry).map((r) => clipRing(toLocal(r, origin), extent)).filter((r) => r.length >= 3)
    if (!rings.length) continue
    // Missing IDs must never accidentally group unrelated features.
    const sourceId = feature.id === undefined ? `anonymous-${index}` : String(feature.id)
    const renderHeight = feature.properties.render_height, minHeight = feature.properties.render_min_height ?? 0
    if (typeof renderHeight !== 'number' || !Number.isFinite(renderHeight) || typeof minHeight !== 'number' || !Number.isFinite(minHeight)) throw new Error(`Building ${sourceId}: invalid render height`)
    const group = groups.get(sourceId) ?? { rings: [], renderHeight, minHeight }
    if (group.renderHeight !== renderHeight || group.minHeight !== minHeight) throw new Error(`Building ${sourceId}: conflicting heights across fragments`)
    group.rings.push(...rings)
    groups.set(sourceId, group)
  }
  const buildings: BuildingDraft[] = []
  for (const [sourceId, group] of groups) {
    // Repair inputs without an area cutoff so a small seam piece can join its neighbour.
    const inputs = group.rings.flatMap((r) => repairRing(r, 0))
    const rings = mergeRings(inputs).flatMap((r) => repairRing(capVertices(simplifyRing(r))))
    for (const [part, footprint] of rings.entries()) {
      buildings.push({ id: `${sourceId}-${part}`, sourceId, footprint, height: Math.min(MAX_HEIGHT_M, Math.max(2.5, group.renderHeight - group.minHeight)), minHeight: group.minHeight })
    }
  }
  return buildings
}
