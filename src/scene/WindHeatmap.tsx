import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, Vector2 } from 'three'
import type { ClimateOverlay } from '../features/analysis/climateView'
import type { Vec2 } from '../lib/coordinates'
import { enuToThreeXyz } from '../lib/coordinates'

export type WindCircle = { readonly centre: Vec2; readonly radius: number }
const noRaycast = () => null

/**
 * Where the surface may grow into sample points that have no value. Samples inside buildings are
 * missing, which used to leave a ragged empty strip along every wall; filling a ring or two there
 * carries the colour under the footprint, and the building itself then cuts it off exactly.
 */
export type HeatmapFill = { readonly rings: number; readonly allow: (x: number, y: number) => boolean }
const NEIGHBOURS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const

/**
 * One draped quad per sample, covering that sample's whole cell, with corner colours averaged from
 * the cells that meet there: a continuous surface with no half-cell inset and no gaps between cells.
 * A missing sample stays a hole unless `fill` allows it (see HeatmapFill).
 */
export function heatmapGeometry(overlay: ClimateOverlay, heightAt: (x: number, y: number) => number, fill?: HeatmapFill): BufferGeometry {
  const cells = overlay.lattice ?? overlay.cells
  const step = overlay.cellM
  const positions: number[] = [], colours: number[] = [], indices: number[] = []
  const geometry = new BufferGeometry()
  const origin = cells[0]
  if (origin && step > 0) {
    type Cell = { i: number; j: number; r: number; g: number; b: number }
    const key = (i: number, j: number) => `${i},${j}`
    const grid = new Map<string, Cell>()
    const colour = new Color()
    for (const c of cells) {
      const i = Math.round((c.x - origin.x) / step), j = Math.round((c.y - origin.y) / step)
      colour.set(c.colour)
      grid.set(key(i, j), { i, j, r: colour.r, g: colour.g, b: colour.b })
    }
    const refused = new Set<string>()
    for (let ring = 0; fill && ring < fill.rings; ring += 1) {
      const added = new Map<string, Cell>()
      for (const cell of grid.values()) {
        for (const [di, dj] of NEIGHBOURS) {
          const i = cell.i + di, j = cell.j + dj, k = key(i, j)
          if (grid.has(k) || added.has(k) || refused.has(k)) continue
          if (!fill.allow(origin.x + i * step, origin.y + j * step)) { refused.add(k); continue }
          // The value under a wall is the mean of the measured cells around it, never of other fills.
          let r = 0, g = 0, b = 0, n = 0
          for (const [ei, ej] of NEIGHBOURS) {
            const near = grid.get(key(i + ei, j + ej))
            if (near) { r += near.r; g += near.g; b += near.b; n += 1 }
          }
          added.set(k, { i, j, r: r / n, g: g / n, b: b / n })
        }
      }
      for (const [k, cell] of added) grid.set(k, cell)
    }
    // Corners are shared between up to four cells; their colour is the mean of those cells.
    const corners = new Map<string, { index: number; r: number; g: number; b: number; n: number }>()
    const corner = (ci: number, cj: number, cell: Cell): number => {
      const k = key(ci, cj)
      let entry = corners.get(k)
      if (!entry) {
        entry = { index: corners.size, r: 0, g: 0, b: 0, n: 0 }
        corners.set(k, entry)
        const x = origin.x + (ci / 2) * step, y = origin.y + (cj / 2) * step
        positions.push(...enuToThreeXyz([x, y, heightAt(x, y) + 0.5]))
      }
      entry.r += cell.r; entry.g += cell.g; entry.b += cell.b; entry.n += 1
      return entry.index
    }
    for (const cell of grid.values()) {
      const a = corner(2 * cell.i - 1, 2 * cell.j - 1, cell), b = corner(2 * cell.i + 1, 2 * cell.j - 1, cell)
      const c = corner(2 * cell.i - 1, 2 * cell.j + 1, cell), d = corner(2 * cell.i + 1, 2 * cell.j + 1, cell)
      indices.push(a, b, c, b, d, c)
    }
    for (const entry of corners.values()) colours.push(entry.r / entry.n, entry.g / entry.n, entry.b / entry.n)
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  geometry.setIndex(indices)
  return geometry
}

/** Wind: any missing sample next to the flow is a building (the circle shader clips the outside). */
const WIND_FILL: HeatmapFill = { rings: 2, allow: () => true }

/** Exact circular fragment clipping, independent of the lattice resolution. */
export function WindSurface({ geometry, circle }: { geometry: BufferGeometry; circle?: WindCircle }) {
  const cx = circle?.centre[0], cy = circle?.centre[1], radius = circle?.radius
  const material = useMemo(() => {
    const mat = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 })
    if (cx !== undefined && cy !== undefined && radius !== undefined) {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.windCentre = { value: new Vector2(cx, -cy) }
        shader.uniforms.windRadius = { value: radius }
        shader.vertexShader = 'varying vec2 windPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nwindPosition = (modelMatrix * vec4(position, 1.0)).xz;')
        shader.fragmentShader = 'varying vec2 windPosition;\nuniform vec2 windCentre;\nuniform float windRadius;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (distance(windPosition, windCentre) > windRadius) discard;')
      }
      mat.customProgramCacheKey = () => 'wind-circle'
    }
    return mat
  }, [cx, cy, radius])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} raycast={noRaycast} renderOrder={2} />
}

export function WindHeatmap({ overlay, heightAt, circle }: { overlay: ClimateOverlay; heightAt: (x: number, y: number) => number; circle: WindCircle }) {
  const geometry = useMemo(() => heatmapGeometry(overlay, heightAt, WIND_FILL), [overlay, heightAt])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <WindSurface geometry={geometry} circle={circle} />
}
