import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Parcel } from '../features/analysis/parcels'

const noRaycast = () => null
/** Outlines sit this far above the ground (feasibility 09 §1). */
export const PARCEL_LIFT_M = 0.25
/** Longest step along an edge, so a long boundary follows the ground between its corners. */
const STEP_M = 4

/** Line segments for every ring of `parcels`, draped on the terrain. Positions are three.js x, y, z. */
export function parcelLinePositions(parcels: readonly Parcel[], heightAt: (east: number, north: number) => number): number[] {
  const positions: number[] = []
  for (const parcel of parcels) {
    for (const ring of parcel.rings) {
      ring.forEach((a, index) => {
        const b = ring[(index + 1) % ring.length]
        if (!b) return
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP_M))
        for (let step = 0; step < steps; step += 1) {
          const from = [a[0] + ((b[0] - a[0]) * step) / steps, a[1] + ((b[1] - a[1]) * step) / steps] as const
          const to = [a[0] + ((b[0] - a[0]) * (step + 1)) / steps, a[1] + ((b[1] - a[1]) * (step + 1)) / steps] as const
          positions.push(from[0], heightAt(from[0], from[1]) + PARCEL_LIFT_M, -from[1], to[0], heightAt(to[0], to[1]) + PARCEL_LIFT_M, -to[1])
        }
      })
    }
  }
  return positions
}

function Lines({ parcels, heightAt, colour, opacity }: { parcels: readonly Parcel[]; heightAt: (east: number, north: number) => number; colour: string; opacity: number }) {
  const geometry = useMemo(() => {
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new Float32BufferAttribute(parcelLinePositions(parcels, heightAt), 3))
    return buffer
  }, [parcels, heightAt])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={3}>
      {/* Drawn over the model: in a built-up block the ground lines would be hidden under the buildings they describe. */}
      <lineBasicMaterial color={colour} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}

/**
 * Parcel outlines from the eiendomskart (ADR-0035): one line geometry for all parcels, and the
 * selected parcel drawn again in the accent colour. Outlines only; a boundary here is a map of the
 * register, not a surveyed line.
 */
export function ParcelLines({ parcels, selected, heightAt }: { parcels: readonly Parcel[]; selected: Parcel | null; heightAt: (east: number, north: number) => number }) {
  const chosen = useMemo(() => (selected ? [selected] : []), [selected])
  return (
    <group>
      <Lines parcels={parcels} heightAt={heightAt} colour="#374151" opacity={0.55} />
      {/* The accent token (--accent), so the selection reads like every other selection in the studio. */}
      {selected && <Lines parcels={chosen} heightAt={(east, north) => heightAt(east, north) + 0.1} colour="#1F3BD6" opacity={1} />}
    </group>
  )
}

/**
 * The section line of the terrain tools (ADR-0037): the two picked points joined along the ground,
 * drawn over the model like the parcel outlines. One point is shown as a short cross.
 */
export function SectionLine({ points, heightAt }: { points: readonly (readonly [number, number])[]; heightAt: (east: number, north: number) => number }) {
  const shape = useMemo<Parcel[]>(() => {
    const [a, b] = points
    if (!a) return []
    // A ring of the two points back and forth is the line itself; one point becomes a 3 m cross.
    const rings = b ? [[a, b]] : [[[a[0] - 1.5, a[1]], [a[0] + 1.5, a[1]]], [[a[0], a[1] - 1.5], [a[0], a[1] + 1.5]]]
    return [{ id: 'section', matrikkel: null, updated: null, rings: rings as Parcel['rings'] }]
  }, [points])
  if (shape.length === 0) return null
  return <Lines parcels={shape} heightAt={(east, north) => heightAt(east, north) + 0.2} colour="#1F3BD6" opacity={1} />
}
