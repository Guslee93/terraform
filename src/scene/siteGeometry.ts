import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from 'three'
import type { ContextBuilding, Road, TerrainData } from '../features/sites/package'
import { sampleTerrainHeight, terrainHeightRange } from '../features/sites/geometry'
import type { ContourSegment } from '../features/sites/contours'

// Near-white ground; elevation tint stays under 4% so separation comes from light, not hue.
const LOW_TERRAIN = new Color('#F7F4EF')
const HIGH_TERRAIN = new Color('#EEEAE3')

export function createTerrainGeometry(terrain: TerrainData): BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const { min, max } = terrainHeightRange(terrain)
  const span = max - min || 1
  const color = new Color()

  for (let row = 0; row < terrain.rows; row += 1) {
    const north = terrain.minY + ((terrain.maxY - terrain.minY) * row) / (terrain.rows - 1)
    for (let col = 0; col < terrain.cols; col += 1) {
      const east = terrain.minX + ((terrain.maxX - terrain.minX) * col) / (terrain.cols - 1)
      const height = terrain.heights[row]?.[col] ?? 0
      positions.push(east, height, -north)
      // u runs east, v runs north, so a plan-view texture (north up) drapes without flipping.
      uvs.push(col / (terrain.cols - 1), row / (terrain.rows - 1))
      color.copy(LOW_TERRAIN).lerp(HIGH_TERRAIN, (height - min) / span)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let row = 0; row < terrain.rows - 1; row += 1) {
    for (let col = 0; col < terrain.cols - 1; col += 1) {
      const a = row * terrain.cols + col
      const b = a + 1
      const c = a + terrain.cols
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function createTerrainGridGeometry(
  terrain: TerrainData,
  offset = 0.08,
): BufferGeometry {
  const positions: number[] = []

  const vertex = (row: number, col: number): [number, number, number] => {
    const east = terrain.minX + ((terrain.maxX - terrain.minX) * col) / (terrain.cols - 1)
    const north = terrain.minY + ((terrain.maxY - terrain.minY) * row) / (terrain.rows - 1)
    const height = terrain.heights[row]?.[col] ?? 0
    return [east, height + offset, -north]
  }

  for (let row = 0; row < terrain.rows; row += 1) {
    for (let col = 0; col < terrain.cols - 1; col += 1) {
      positions.push(...vertex(row, col), ...vertex(row, col + 1))
    }
  }

  for (let col = 0; col < terrain.cols; col += 1) {
    for (let row = 0; row < terrain.rows - 1; row += 1) {
      positions.push(...vertex(row, col), ...vertex(row + 1, col))
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeBoundingSphere()
  return geometry
}

export function createTerrainSkirtGeometry(
  terrain: TerrainData,
  drop = 2.0,
): BufferGeometry {
  const positions: number[] = []
  const minHeight = terrainHeightRange(terrain).min
  const base = minHeight - drop
  const point = (row: number, col: number, bottom: boolean): [number, number, number] => {
    const east = terrain.minX + ((terrain.maxX - terrain.minX) * col) / (terrain.cols - 1)
    const north = terrain.minY + ((terrain.maxY - terrain.minY) * row) / (terrain.rows - 1)
    const height = terrain.heights[row]?.[col] ?? 0
    return [east, bottom ? base : height + 0.02, -north]
  }

  const perimeter: Array<[number, number]> = []
  for (let col = 0; col < terrain.cols; col += 1) perimeter.push([0, col])
  for (let row = 1; row < terrain.rows; row += 1) perimeter.push([row, terrain.cols - 1])
  for (let col = terrain.cols - 2; col >= 0; col -= 1) perimeter.push([terrain.rows - 1, col])
  for (let row = terrain.rows - 2; row > 0; row -= 1) perimeter.push([row, 0])

  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index]
    const next = perimeter[(index + 1) % perimeter.length]
    if (!current || !next) continue
    const [rowA, colA] = current
    const [rowB, colB] = next
    positions.push(
      ...point(rowA, colA, false),
      ...point(rowA, colA, true),
      ...point(rowB, colB, true),
      ...point(rowA, colA, false),
      ...point(rowB, colB, true),
      ...point(rowB, colB, false),
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function signedArea(points: readonly Vector2[]): number {
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    if (!current || !next) continue
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

function pushVertex(positions: number[], east: number, up: number, north: number) {
  positions.push(east, up, -north)
}

export function createContextGeometry(buildings: readonly ContextBuilding[]): BufferGeometry {
  const positions: number[] = []

  for (const building of buildings) {
    if (building.footprint.length < 3) continue
    const base = building.baseElevation
    const top = base + building.height
    const centreX = building.footprint.reduce((sum, point) => sum + point[0], 0) / building.footprint.length
    const centreY = building.footprint.reduce((sum, point) => sum + point[1], 0) / building.footprint.length
    const radius = Math.max(
      ...building.footprint.map(([east, north]) => Math.hypot(east - centreX, north - centreY)),
      1,
    )
    const scale = 1 - Math.min(0.01, 0.15 / radius)
    const contour = building.footprint.map(
      ([east, north]) =>
        new Vector2(
          centreX + (east - centreX) * scale,
          centreY + (north - centreY) * scale,
        ),
    )
    if (signedArea(contour) < 0) contour.reverse()

    for (let index = 0; index < contour.length; index += 1) {
      const a = contour[index]
      const b = contour[(index + 1) % contour.length]
      if (!a || !b) continue
      pushVertex(positions, a.x, base, a.y)
      pushVertex(positions, b.x, base, b.y)
      pushVertex(positions, b.x, top, b.y)

      pushVertex(positions, a.x, base, a.y)
      pushVertex(positions, b.x, top, b.y)
      pushVertex(positions, a.x, top, a.y)
    }

    for (const face of ShapeUtils.triangulateShape(contour, [])) {
      const [indexA, indexB, indexC] = face
      if (indexA === undefined || indexB === undefined || indexC === undefined) continue
      const a = contour[indexA]
      const b = contour[indexB]
      const c = contour[indexC]
      if (!a || !b || !c) continue
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      const second = cross < 0 ? c : b
      const third = cross < 0 ? b : c
      pushVertex(positions, a.x, top, a.y)
      pushVertex(positions, second.x, top, second.y)
      pushVertex(positions, third.x, top, third.y)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** Lift (m) that keeps contour lines just above the terrain surface they lie on. */
const CONTOUR_LIFT = 0.15

export function createContourGeometry(segments: readonly ContourSegment[]): BufferGeometry {
  const positions: number[] = []
  for (const [start, end] of segments) {
    positions.push(start[0], start[2] + CONTOUR_LIFT, -start[1], end[0], end[2] + CONTOUR_LIFT, -end[1])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

/** Road ribbons sit this far (m) above the sampled ground so they never sink into the terrain. */
export const ROAD_LIFT = 0.15
/** Longest ribbon step (m): short enough to follow the terrain between centreline vertices. */
const ROAD_STEP_M = 4

/**
 * Flat road ribbons draped on the terrain. Each centreline segment is extended by half the
 * road width at both ends so bends and junctions overlap instead of leaving wedge gaps.
 */
export function createRoadGeometry(roads: readonly Road[], terrain: TerrainData): BufferGeometry {
  const positions: number[] = []
  const at = (east: number, north: number): [number, number, number] => [
    east,
    sampleTerrainHeight(terrain, east, north) + ROAD_LIFT,
    -north,
  ]

  for (const road of roads) {
    const half = road.width / 2
    for (let index = 0; index < road.centreline.length - 1; index += 1) {
      const a = road.centreline[index]
      const b = road.centreline[index + 1]
      if (!a || !b) continue
      const length = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (length === 0) continue
      const ux = (b[0] - a[0]) / length
      const uy = (b[1] - a[1]) / length
      // Left normal of the direction (east, north) → (−north, east).
      const nx = -uy * half
      const ny = ux * half
      const startX = a[0] - ux * half
      const startY = a[1] - uy * half
      const total = length + road.width
      const steps = Math.max(1, Math.ceil(total / ROAD_STEP_M))
      for (let step = 0; step < steps; step += 1) {
        const t0 = (total * step) / steps
        const t1 = (total * (step + 1)) / steps
        const x0 = startX + ux * t0
        const y0 = startY + uy * t0
        const x1 = startX + ux * t1
        const y1 = startY + uy * t1
        const leftA = at(x0 + nx, y0 + ny)
        const rightA = at(x0 - nx, y0 - ny)
        const leftB = at(x1 + nx, y1 + ny)
        const rightB = at(x1 - nx, y1 - ny)
        // Counter-clockwise seen from above (+y), so the faces point up.
        positions.push(...rightA, ...rightB, ...leftB, ...rightA, ...leftB, ...leftA)
      }
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Renderer-frame points along an open polyline in ENU metres, resampled every `step` metres
 * and lifted `lift` metres above the terrain, so straight edges follow the ground between
 * vertices instead of cutting under a slope.
 */
export function drapePolyline(
  points: readonly (readonly [number, number])[],
  terrain: TerrainData,
  step: number,
  lift: number,
): [number, number, number][] {
  const at = (east: number, north: number): [number, number, number] => [
    east,
    sampleTerrainHeight(terrain, east, north) + lift,
    -north,
  ]
  const draped: [number, number, number][] = []
  points.forEach(([east, north], index) => {
    const next = points[index + 1]
    draped.push(at(east, north))
    if (!next) return
    const steps = Math.ceil(Math.hypot(next[0] - east, next[1] - north) / step)
    for (let sample = 1; sample < steps; sample += 1) {
      const t = sample / steps
      draped.push(at(east + (next[0] - east) * t, north + (next[1] - north) * t))
    }
  })
  return draped
}
