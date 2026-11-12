import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon } from '../../lib/polygon'
import type { LandCoverArea } from './package'

/**
 * Trees that stand on water, removed (ADR-0024).
 *
 * A tree stands on ground. The studio paints water from the land-cover polygons the package
 * holds, so a tree may not stand inside one of them: the ground under it is drawn as water.
 *
 * The rule is the same on both data paths, and it exists because the two polygons that decide
 * it come from different sources and are simplified independently:
 *
 * - The import path fills a mapped park, wood, garden or cemetery polygon with a grid of
 *   trees. The tile's park polygon and the tile's water polygon are simplified separately, so
 *   their edges do not agree: a park that runs into a lake or a harbour keeps its grid over
 *   the water.
 * - The curated path places mapped trees from the OSM extract. A tree row along a quay can
 *   fall inside the river polygon.
 *
 * Dropping the tree is the honest fix. Moving it would invent a position the data does not
 * have, and the studio already says where its trees come from.
 */
export function dropTreesOnWater<T extends Vec2>(trees: readonly T[], areas: readonly LandCoverArea[]): T[] {
  const water = areas.filter((area) => area.kind === 'water')
  if (!water.length) return [...trees]
  // A bounding-box test first: a harbour ring can carry hundreds of vertices and most trees
  // are nowhere near the water.
  const boxes = water.map((area) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [east, north] of area.ring) {
      if (east < minX) minX = east
      if (east > maxX) maxX = east
      if (north < minY) minY = north
      if (north > maxY) maxY = north
    }
    return { ring: area.ring, box: [minX, minY, maxX, maxY] as const }
  })
  return trees.filter((tree) => !boxes.some(({ ring, box }) =>
    tree[0] >= box[0] && tree[0] <= box[2] && tree[1] >= box[1] && tree[1] <= box[3]
    && pointInPolygon(tree, ring)))
}
