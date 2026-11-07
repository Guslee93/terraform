import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { enuToThreeXyz } from '../lib/coordinates'

const EVERY = 3 // one arrow per third lattice cell each way (12 m on the 4 m lattice)
const CELL_M = 4
const SHAFT_M = 7
const HEAD_M = 2.4
const LIFT_M = 1.2
const noRaycast = () => null

/**
 * Worst-direction arrows (ADR-0015): at a 12 m spacing, an arrow pointing the way the wind
 * blows in the direction that is worst for that spot. Pure geometry; one draw call.
 */
export function worstArrowSegments(cells: Float32Array, worstFrom: readonly number[], every = EVERY, cellM = CELL_M): number[][] {
  const segments: number[][] = []
  for (let i = 0; i < worstFrom.length; i++) {
    const x = cells[2 * i]!
    const y = cells[2 * i + 1]!
    // Consecutive lattice centres differ by cellM, so their rounded indices are consecutive integers.
    const ix = Math.round(x / cellM), iy = Math.round(y / cellM)
    if (((ix % every) + every) % every !== 0 || ((iy % every) + every) % every !== 0) continue
    if (!Number.isFinite(worstFrom[i])) continue // no solved value for this cell
    const b = (worstFrom[i]! * Math.PI) / 180
    const ux = -Math.sin(b) // wind FROM bearing b blows towards -direction
    const uy = -Math.cos(b)
    const tail = [x - (ux * SHAFT_M) / 2, y - (uy * SHAFT_M) / 2]
    const tip = [x + (ux * SHAFT_M) / 2, y + (uy * SHAFT_M) / 2]
    const left = [tip[0]! - ux * HEAD_M - uy * HEAD_M * 0.6, tip[1]! - uy * HEAD_M + ux * HEAD_M * 0.6]
    const right = [tip[0]! - ux * HEAD_M + uy * HEAD_M * 0.6, tip[1]! - uy * HEAD_M - ux * HEAD_M * 0.6]
    segments.push([...tail, ...tip], [...tip, ...left], [...tip, ...right])
  }
  return segments
}

export function WorstArrows({ cells, worstFrom, heightAt }: {
  cells: Float32Array
  /** Per cell, the bearing (deg, wind FROM) of its worst direction. */
  worstFrom: readonly number[]
  heightAt: (east: number, north: number) => number
}) {
  const geometry = useMemo(() => {
    const segs = worstArrowSegments(cells, worstFrom)
    const pos = new Float32Array(segs.length * 6)
    segs.forEach(([x0, y0, x1, y1], k) => {
      const a = enuToThreeXyz([x0!, y0!, heightAt(x0!, y0!) + LIFT_M])
      const b = enuToThreeXyz([x1!, y1!, heightAt(x1!, y1!) + LIFT_M])
      pos.set([...a, ...b], k * 6)
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    return g
  }, [cells, worstFrom, heightAt])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={4}>
      <lineBasicMaterial color="#1F2328" transparent opacity={0.8} depthWrite={false} />
    </lineSegments>
  )
}
