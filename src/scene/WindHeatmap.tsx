import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, Vector2 } from 'three'
import type { ClimateOverlay } from '../features/analysis/climateView'
import type { Vec2 } from '../lib/coordinates'
import { enuToThreeXyz } from '../lib/coordinates'

export type WindCircle = { readonly centre: Vec2; readonly radius: number }
const noRaycast = () => null

/** Missing lattice points (solid buildings) never get bridged by a triangle. */
export function heatmapGeometry(overlay: ClimateOverlay, heightAt: (x: number, y: number) => number): BufferGeometry {
  const cells = overlay.lattice ?? overlay.cells
  const positions: number[] = [], colours: number[] = [], indices: number[] = []
  const key = (x: number, y: number) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`
  const lookup = new Map(cells.map((c, i) => [key(c.x, c.y), i]))
  const colour = new Color()
  cells.forEach((c, a) => {
    positions.push(...enuToThreeXyz([c.x, c.y, heightAt(c.x, c.y) + 0.5]))
    colour.set(c.colour); colours.push(colour.r, colour.g, colour.b)
    const b = lookup.get(key(c.x + overlay.cellM, c.y))
    const d = lookup.get(key(c.x, c.y + overlay.cellM))
    const e = lookup.get(key(c.x + overlay.cellM, c.y + overlay.cellM))
    if (b !== undefined && d !== undefined) indices.push(a, b, d)
    if (b !== undefined && d !== undefined && e !== undefined) indices.push(b, e, d)
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  geometry.setIndex(indices)
  return geometry
}

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
  const geometry = useMemo(() => heatmapGeometry(overlay, heightAt), [overlay, heightAt])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <WindSurface geometry={geometry} circle={circle} />
}
