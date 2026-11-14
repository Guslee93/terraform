import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, LinearFilter, SRGBColorSpace, type Texture } from 'three'
import type { AnalysisCircle } from '../features/analysis/circle'
import { SUN_HOURS_RAMP, sunHoursColour, sunHoursRgb, type CircleSunHours } from '../features/analysis/circleSunHours'
import type { FootprintBuilding } from '../features/analysis/grid'
import { enuToThreeXyz } from '../lib/coordinates'
import { roofBase, roofLift, roofTriangles } from './roofGeometry'
import { heatmapGeometry, WindSurface } from './WindHeatmap'

const noRaycast = () => null
type HeightAt = (east: number, north: number) => number

/** Open ground in the circle, draped on the terrain like the wind map and clipped to the circle. */
export function sunGroundGeometry(sun: CircleSunHours, heightAt: HeightAt): BufferGeometry {
  const { minX, minY, cols, rows, cellM, hours, surface } = sun.surface
  const cells: { x: number; y: number; colour: string }[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = row * cols + col
      if (surface[cell] !== -1) continue
      cells.push({ x: minX + (col + 0.5) * cellM, y: minY + (row + 0.5) * cellM, colour: sunHoursColour(hours[cell]!, sun.possibleHours) })
    }
  }
  // Two rings carry the colour under the walls, where the buildings cut it off exactly.
  return heatmapGeometry({ cellM, cells }, heightAt, { rings: 2, allow: () => true })
}

/**
 * The roof cells as a texture laid over the roofs from above. Roof texels spill two texels into the
 * empty ones around them, so the filtered edge of a roof keeps its colour instead of fading out.
 */
export function sunRoofTexture(sun: CircleSunHours): DataTexture {
  const { cols, rows, hours, surface } = sun.surface
  const data = new Uint8Array(cols * rows * 4)
  for (let cell = 0; cell < cols * rows; cell += 1) {
    if ((surface[cell] ?? -2) < 0) continue
    const [r, g, b] = sunHoursRgb(hours[cell]!, sun.possibleHours)
    data.set([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255], cell * 4)
  }
  for (let ring = 0; ring < 2; ring += 1) {
    const filled = data.slice()
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = row * cols + col
        if (data[cell * 4 + 3]) continue
        let r = 0, g = 0, b = 0, n = 0
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
          const x = col + dx, y = row + dy
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue
          const near = (y * cols + x) * 4
          if (!data[near + 3]) continue
          r += data[near]!; g += data[near + 1]!; b += data[near + 2]!; n += 1
        }
        if (n > 0) filled.set([Math.round(r / n), Math.round(g / n), Math.round(b / n), 255], cell * 4)
      }
    }
    data.set(filled)
  }
  const texture = new DataTexture(data, cols, rows)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/** The roofs of the buildings in the circle (flat or gabled), with plan coordinates as texture coordinates. */
export function sunRoofGeometry(sun: CircleSunHours, buildings: readonly FootprintBuilding[], heightAt: HeightAt): BufferGeometry {
  const { minX, minY, cols, rows, cellM } = sun.surface
  const positions: number[] = [], uvs: number[] = []
  for (const index of sun.included) {
    const building = buildings[index]
    if (!building) continue
    const base = roofBase(building, heightAt) + 0.3
    const lift = roofLift(building)
    for (const triangle of roofTriangles(building.footprint, building.roof)) {
      for (const [x, y] of triangle) {
        positions.push(...enuToThreeXyz([x, y, base + lift(x, y)]))
        uvs.push((x - minX) / (cols * cellM), (y - minY) / (rows * cellM))
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}

/** Every wall of the buildings in the circle: the worker's vertex grid, lifted onto each building's base. */
export function sunFacadeGeometry(sun: CircleSunHours, buildings: readonly FootprintBuilding[], heightAt: HeightAt): BufferGeometry {
  const { positions: local, hours, building, triangles } = sun.facades
  const count = hours.length
  const positions = new Float32Array(count * 3), colours = new Float32Array(count * 3)
  const bases = new Map<number, number>()
  const colour = new Color()
  for (let v = 0; v < count; v += 1) {
    const owner = building[v]!
    let base = bases.get(owner)
    if (base === undefined) {
      const footprint = buildings[owner]
      base = footprint ? roofBase(footprint, heightAt) : 0
      bases.set(owner, base)
    }
    positions.set(enuToThreeXyz([local[3 * v]!, local[3 * v + 1]!, base + local[3 * v + 2]!]), v * 3)
    const [r, g, b] = sunHoursRgb(hours[v]!, sun.possibleHours)
    colour.setRGB(r, g, b, SRGBColorSpace)
    colours.set([colour.r, colour.g, colour.b], v * 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  geometry.setIndex(Array.from(triangles))
  return geometry
}

/**
 * Sun hours on the ground, roofs and façades in the analysis circle (ADR-0031). `buildings` must be
 * the array the result was computed for: its indices name the roofs and walls.
 */
export function SunHoursLayer({ sun, buildings, circle, heightAt }: { sun: CircleSunHours; buildings: readonly FootprintBuilding[]; circle: AnalysisCircle; heightAt: HeightAt }) {
  const ground = useMemo(() => sunGroundGeometry(sun, heightAt), [sun, heightAt])
  const roofs = useMemo(() => sunRoofGeometry(sun, buildings, heightAt), [sun, buildings, heightAt])
  const roofTexture = useMemo<Texture>(() => sunRoofTexture(sun), [sun])
  const facades = useMemo(() => sunFacadeGeometry(sun, buildings, heightAt), [sun, buildings, heightAt])
  useEffect(() => () => ground.dispose(), [ground])
  useEffect(() => () => roofs.dispose(), [roofs])
  useEffect(() => () => roofTexture.dispose(), [roofTexture])
  useEffect(() => () => facades.dispose(), [facades])
  return (
    <group name="sun-hours">
      <WindSurface geometry={ground} circle={circle} />
      <mesh geometry={roofs} raycast={noRaycast} renderOrder={2}>
        <meshBasicMaterial map={roofTexture} side={DoubleSide} transparent opacity={0.92} depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
      </mesh>
      <mesh geometry={facades} raycast={noRaycast} renderOrder={2}>
        <meshBasicMaterial vertexColors side={DoubleSide} transparent opacity={0.92} depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The colour scale in the viewport: hours of direct sun, 0 to all the window offers. */
export function SunHoursRampBar({ possibleHours }: { possibleHours: number }) {
  const top = Math.round(possibleHours * 4) / 4
  const ticks = [0, top / 4, top / 2, (3 * top) / 4, top].map((h) => Math.round(h * 10) / 10)
  return (
    <div role="img" aria-label={`Colour scale, 0 to ${top} hours of direct sun`} className="pointer-events-none w-56 max-w-full self-center rounded-chip bg-surface/90 px-3 py-2 text-caption text-ink">
      <div aria-hidden="true" className="h-2 w-full" style={{ background: `linear-gradient(to right, ${SUN_HOURS_RAMP.join(', ')})` }} />
      <div className="mt-1 flex justify-between tabular-nums">{ticks.map((h, i) => <span key={i}>{h}</span>)}</div>
      <div className="text-center">hours of direct sun</div>
    </div>
  )
}
