/**
 * Placement of a ground photo on the terrain (visuals plan V2). Pure; shared by the Lab, which
 * computes the rectangle, and the terrain mesh, which applies the texture transform.
 */

export type Extent = { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number }

/**
 * Texture repeat/offset so a photo covering `rect` lands on the right metres of a terrain whose UVs
 * run u = 0…1 from `terrain.minX` to `maxX` and v = 0…1 from `minY` (south) to `maxY` (north).
 * photoU = (x − rect.minX) / rectWidth with x = terrain.minX + u · terrainWidth.
 */
export function photoTextureTransform(terrain: Extent, rect: Extent): { repeat: [number, number]; offset: [number, number] } {
  const tw = terrain.maxX - terrain.minX
  const th = terrain.maxY - terrain.minY
  const pw = rect.maxX - rect.minX
  const ph = rect.maxY - rect.minY
  return {
    repeat: [tw / pw, th / ph],
    offset: [(terrain.minX - rect.minX) / pw, (terrain.minY - rect.minY) / ph],
  }
}
