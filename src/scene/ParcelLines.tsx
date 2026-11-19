import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Parcel } from '../features/analysis/parcels'
import type { Vec2 } from '../lib/coordinates'

const noRaycast = () => null
/** Outlines sit this far above the ground (feasibility 09 §1). */
export const PARCEL_LIFT_M = 0.25
/** Longest step along an edge, so a long boundary follows the ground between its corners. */
const STEP_M = 4

type Rings = readonly (readonly Vec2[])[]

/** Line segments for closed rings, draped `lift` metres above the terrain. Positions are three.js x, y, z. */
export function ringLinePositions(rings: Rings, heightAt: (east: number, north: number) => number, lift = PARCEL_LIFT_M): number[] {
  const positions: number[] = []
  for (const ring of rings) {
    ring.forEach((a, index) => {
      const b = ring[(index + 1) % ring.length]
      if (!b) return
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP_M))
      for (let step = 0; step < steps; step += 1) {
        const from = [a[0] + ((b[0] - a[0]) * step) / steps, a[1] + ((b[1] - a[1]) * step) / steps] as const
        const to = [a[0] + ((b[0] - a[0]) * (step + 1)) / steps, a[1] + ((b[1] - a[1]) * (step + 1)) / steps] as const
        positions.push(from[0], heightAt(from[0], from[1]) + lift, -from[1], to[0], heightAt(to[0], to[1]) + lift, -to[1])
      }
    })
  }
  return positions
}

/** Line segments for every ring of `parcels`, draped on the terrain. */
export function parcelLinePositions(parcels: readonly Parcel[], heightAt: (east: number, north: number) => number): number[] {
  return ringLinePositions(parcels.flatMap((parcel) => parcel.rings), heightAt)
}

/** `rings` and `heightAt` must be stable between renders: the geometry is rebuilt when either changes. */
function Lines({ rings, heightAt, lift = PARCEL_LIFT_M, colour, opacity }: { rings: Rings; heightAt: (east: number, north: number) => number; lift?: number; colour: string; opacity: number }) {
  const geometry = useMemo(() => {
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new Float32BufferAttribute(ringLinePositions(rings, heightAt, lift), 3))
    return buffer
  }, [rings, heightAt, lift])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={3}>
      {/* Drawn over the model: in a built-up block the ground lines would be hidden under the buildings they describe. */}
      <lineBasicMaterial color={colour} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}

/** The accent token (--accent), so a selection reads like every other selection in the studio. */
const ACCENT = '#1F3BD6'

/**
 * Parcel outlines from the eiendomskart (ADR-0035): one line geometry for all parcels, and the
 * selected parcel drawn again in the accent colour. Outlines only; a boundary here is a map of the
 * register, not a surveyed line.
 */
export function ParcelLines({ parcels, selected, heightAt }: { parcels: readonly Parcel[]; selected: Parcel | null; heightAt: (east: number, north: number) => number }) {
  const all = useMemo(() => parcels.flatMap((parcel) => parcel.rings), [parcels])
  return (
    <group>
      <Lines rings={all} heightAt={heightAt} colour="#374151" opacity={0.55} />
      {selected && <Lines rings={selected.rings} heightAt={heightAt} lift={PARCEL_LIFT_M + 0.1} colour={ACCENT} opacity={1} />}
    </group>
  )
}

/**
 * The section line of the terrain tools (ADR-0037): the two picked points joined along the ground,
 * drawn over the model like the parcel outlines. One point is shown as a short cross.
 */
export function SectionLine({ points, heightAt }: { points: readonly Vec2[]; heightAt: (east: number, north: number) => number }) {
  const rings = useMemo<Vec2[][]>(() => {
    const [a, b] = points
    if (!a) return []
    // Two points as a ring are the line there and back; one point becomes a 3 m cross.
    return b ? [[a, b]] : [[[a[0] - 1.5, a[1]], [a[0] + 1.5, a[1]]], [[a[0], a[1] - 1.5], [a[0], a[1] + 1.5]]]
  }, [points])
  if (rings.length === 0) return null
  return <Lines rings={rings} heightAt={heightAt} lift={PARCEL_LIFT_M + 0.2} colour={ACCENT} opacity={1} />
}
