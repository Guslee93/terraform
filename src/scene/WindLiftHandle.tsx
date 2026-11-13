import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { windDrawLift } from '../features/analysis/climateView'
import { clampLift, heightText, liftAnchor, nearestHeight, stepHeight } from '../features/analysis/windLift'
import { enuToThreeXyz, type ThreeVec3, type Vec2 } from '../lib/coordinates'
import type { OrbitControlsHandle } from './CameraRig'

type Props = {
  readonly centre: Vec2
  readonly radius: number
  readonly heightAt: (east: number, north: number) => number
  /** Solved heights, ascending. */
  readonly heights: readonly number[]
  /** The committed height (a solved one). */
  readonly heightM: number
  /** The height being dragged through (continuous), or null when not dragging. */
  readonly dragM: number | null
  readonly onDrag: (z: number | null) => void
  readonly onChange: (heightM: number) => void
  readonly controlsRef: RefObject<OrbitControlsHandle | null>
}

/**
 * The red lift handle on the analysis circle (ADR-0028 phase 3). Drag it up or down: the disc
 * follows the pointer, the map shows the nearest solved height, and the disc snaps there on release.
 * `Esc` returns to the height the drag started at. It is a slider for keyboard and screen readers
 * (arrows, Home, End). A view setting: no undo entry.
 */
export function WindLiftHandle({ centre, radius, heightAt, heights, heightM, dragM, onDrag, onChange, controlsRef }: Props) {
  const { camera, gl } = useThree()
  // The edge nearest the viewer when the circle is placed; it stays put while the camera orbits.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera position is read once per placement
  const anchor = useMemo(() => liftAnchor(centre, radius, [camera.position.x, -camera.position.z]), [centre, radius])
  const ground = heightAt(anchor[0], anchor[1])
  const lift = windDrawLift(dragM ?? heightM)
  const stopRef = useRef<(() => void) | null>(null)
  useEffect(() => () => stopRef.current?.(), [])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    stopRef.current?.()
    const start = heightM
    let shown = heightM
    // A vertical plane through the handle, facing the camera: the pointer's height on it is the lift.
    const point = new Vector3(...enuToThreeXyz([anchor[0], anchor[1], ground + lift]))
    const facing = new Vector3(camera.position.x - point.x, 0, camera.position.z - point.z)
    if (facing.lengthSq() < 1e-6) facing.set(0, 0, 1)
    const plane = new Plane().setFromNormalAndCoplanarPoint(facing.normalize(), point)
    const raycaster = new Raycaster(), ndc = new Vector2(), hit = new Vector3()

    const onMove = (move: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(((move.clientX - rect.left) / rect.width) * 2 - 1, -((move.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(plane, hit)) return
      const z = clampLift(hit.y - ground, heights)
      onDrag(z)
      const snapped = nearestHeight(z, heights)
      if (snapped !== shown) { shown = snapped; onChange(snapped) }
    }
    const onUp = () => { stop(); onDrag(null) }
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== 'Escape') return
      // This Esc cancels the drag only; the studio's own Esc handlers (deselect, placing) never see it.
      key.preventDefault()
      key.stopImmediatePropagation()
      stop()
      onChange(start)
      onDrag(null)
    }
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey, true)
      if (controlsRef.current) controlsRef.current.enabled = true
      stopRef.current = null
    }
    if (controlsRef.current) controlsRef.current.enabled = false
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey, true)
    stopRef.current = stop
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? stepHeight(heightM, heights, 1)
      : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? stepHeight(heightM, heights, -1)
      : event.key === 'Home' ? heights[0]
      : event.key === 'End' ? heights[heights.length - 1]
      : undefined
    if (next === undefined) return
    event.preventDefault()
    if (next !== heightM) onChange(next)
  }

  const shown = dragM === null ? heightM : nearestHeight(dragM, heights)
  return (
    <Html position={enuToThreeXyz([anchor[0], anchor[1], ground + lift + 0.8])} center zIndexRange={[20, 10]}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Lift the wind map"
        aria-valuemin={heights[0]}
        aria-valuemax={heights[heights.length - 1]}
        aria-valuenow={shown}
        aria-valuetext={heightText(shown)}
        title="Drag up or down to lift the wind map · Esc cancels"
        onPointerDown={startDrag}
        onKeyDown={onKeyDown}
        className="grid size-6 cursor-ns-resize touch-none place-items-center rounded-full border-2 border-surface bg-danger text-surface shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 1.5v9M3.5 4 6 1.5 8.5 4M3.5 8 6 10.5 8.5 8" />
        </svg>
      </div>
    </Html>
  )
}

const SEGMENTS = 96
const noRaycast = () => null

/** Dashed rims at the other solved heights, so the stack the disc moves through is visible. */
export function GhostRings({ centre, radius, heightAt, heights }: { centre: Vec2; radius: number; heightAt: (east: number, north: number) => number; heights: readonly number[] }) {
  const rings = useMemo(() => heights.map((z) => ({
    z,
    points: Array.from({ length: SEGMENTS + 1 }, (_, i): ThreeVec3 => {
      const a = (2 * Math.PI * i) / SEGMENTS
      const x = centre[0] + radius * Math.cos(a), y = centre[1] + radius * Math.sin(a)
      return enuToThreeXyz([x, y, heightAt(x, y) + windDrawLift(z) + 0.8])
    }),
  })), [centre, radius, heightAt, heights])
  return (
    <group>
      {rings.map((ring) => (
        <Line key={ring.z} points={ring.points} color="#1F2328" lineWidth={1} dashed dashSize={2} gapSize={3} transparent opacity={0.45} depthTest={false} renderOrder={4} raycast={noRaycast} />
      ))}
    </group>
  )
}
