import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from 'three'
import type { ContextBuilding, TerrainData } from '../features/sites/package'
import { terrainHeightRange } from '../features/sites/geometry'

// Near-white ground; elevation tint stays under 4% so separation comes from light, not hue.
const LOW_TERRAIN = new Color('#F0EFEC')
const HIGH_TERRAIN = new Color('#E6E5E1')

export function createTerrainGeometry(terrain: TerrainData): BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []
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
