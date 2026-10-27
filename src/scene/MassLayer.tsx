import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Edges, Html, Line } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec2 } from '../lib/coordinates'
import { tierHeight } from '../features/massing/aggregate'
import type { MassTier, MassVolume } from '../features/massing/types'
import {
  displayedDocument,
  moveGesture,
  roofGesture,
  type EditorEvent,
  type EditorState,
} from '../features/editor/interaction'
import { DEFAULT_GRID_STEP_M } from '../features/editor/snapping'
import type { OrbitControlsHandle } from './CameraRig'
import { createTierGeometry, roofHandlePosition } from './massGeometry'

const MASS_COLOR = '#F2EFE7'
const INVALID_COLOR = '#EBC9C4'
const SELECTION_COLOR = '#355E79'

type MassLayerProps = {
  editor: EditorState
  dispatch: (event: EditorEvent) => void
  editable: boolean
  controlsRef: RefObject<OrbitControlsHandle | null>
  heightAt: (east: number, north: number) => number
}

type StartDrag = (plane: Plane, toPoint: (hit: Vector3) => Vec2) => void

/**
 * Follows a pointer drag on a fixed plane with window listeners, so the drag survives
 * leaving the canvas. Points reach the reducer in local ENU metres.
 */
function usePlaneDrag(
  dispatch: (event: EditorEvent) => void,
  controlsRef: RefObject<OrbitControlsHandle | null>,
): StartDrag {
  const { camera, gl } = useThree()
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  return (plane, toPoint) => {
    stopRef.current?.()
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    const hit = new Vector3()

    const onMove = (move: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(
        ((move.clientX - rect.left) / rect.width) * 2 - 1,
        -((move.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      if (raycaster.ray.intersectPlane(plane, hit)) dispatch({ type: 'pointerMove', point: toPoint(hit) })
    }
    const finish = (type: 'pointerUp' | 'pointerCancel') => () => {
      stop()
      dispatch({ type })
    }
    const onUp = finish('pointerUp')
    const onCancel = finish('pointerCancel')
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      if (controlsRef.current) controlsRef.current.enabled = true
      stopRef.current = null
    }

    // OrbitControls saw this pointer-down first; disabling it now stops the orbit.
    if (controlsRef.current) controlsRef.current.enabled = false
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    stopRef.current = stop
  }
}

function TierMesh({
  tier,
  selected,
  invalid,
  onPointerDown,
}: {
  tier: MassTier
  selected: boolean
  invalid: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
}) {
  // Keyed on values, so a preview that keeps a tier's shape does not rebuild it.
  const { footprint, baseElevation, storeys, storeyHeight } = tier
  const geometry = useMemo(
    () => createTierGeometry({ footprint, baseElevation, storeys, storeyHeight }),
    [footprint, baseElevation, storeys, storeyHeight],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
    >
      <meshStandardMaterial
        color={invalid ? INVALID_COLOR : MASS_COLOR}
        roughness={0.85}
        metalness={0}
      />
      {selected && <Edges color={SELECTION_COLOR} threshold={20} lineWidth={1.5} />}
    </mesh>
  )
}

function RoofHandle({
  tier,
  dragLabel,
  onPointerDown,
}: {
  tier: MassTier
  dragLabel: string | null
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <Html position={roofHandlePosition(tier)} center zIndexRange={[20, 10]}>
      <div className="flex flex-col items-center gap-1">
        {dragLabel && (
          <span className="whitespace-nowrap rounded-[4px] bg-ink px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-surface shadow-sm">
            {dragLabel}
          </span>
        )}
        <button
          type="button"
          aria-label={`Drag to change storeys of ${tier.name}`}
          title="Drag up or down to change storeys"
          onPointerDown={onPointerDown}
          className="grid size-5 cursor-ns-resize touch-none place-items-center rounded-full border-2 border-accent bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </Html>
  )
}

function DrawOverlay({
  vertices,
  cursor,
  heightAt,
}: {
  vertices: readonly Vec2[]
  cursor: Vec2 | null
  heightAt: (east: number, north: number) => number
}) {
  const points = [...vertices, ...(cursor ? [cursor] : [])].map(
    ([east, north]) => [east, heightAt(east, north) + 0.25, -north] as [number, number, number],
  )
  if (points.length < 2) return null
  return <Line points={points} color={SELECTION_COLOR} lineWidth={2} dashed={false} />
}

export function MassLayer({ editor, dispatch, editable, controlsRef, heightAt }: MassLayerProps) {
  const document = displayedDocument(editor)
  const { selection } = editor.history
  const { interaction } = editor
  const startDrag = usePlaneDrag(dispatch, controlsRef)
  const camera = useThree((state) => state.camera)

  const invalidPreview = interaction.kind === 'dragging' && interaction.issues.length > 0
  const selectedTier = useMemo(() => {
    const volume = document.volumes.find((candidate) => candidate.id === selection.volumeId)
    const tier = volume?.tiers.find((candidate) => candidate.id === selection.tierId)
    return volume && tier ? { volume, tier } : null
  }, [document, selection])

  const startMove = (volume: MassVolume, tier: MassTier) => (event: ThreeEvent<PointerEvent>) => {
    if (!editable || editor.tool !== 'select' || event.button !== 0) return
    event.stopPropagation()
    dispatch({ type: 'select', selection: { volumeId: volume.id, tierId: tier.id } })
    if (volume.locked) return
    const ground = new Plane(new Vector3(0, 1, 0), -tier.baseElevation)
    const toPoint = (hit: Vector3): Vec2 => [hit.x, -hit.z]
    const origin = event.ray.intersectPlane(ground, new Vector3())
    if (!origin) return
    dispatch({
      type: 'pointerDown',
      point: toPoint(origin),
      gesture: moveGesture(volume.id, DEFAULT_GRID_STEP_M),
    })
    startDrag(ground, toPoint)
  }

  const startRoof = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!selectedTier || event.button !== 0) return
    event.stopPropagation()
    event.preventDefault() // no text selection while dragging the handle
    const [x, y, z] = roofHandlePosition(selectedTier.tier)
    const facing = camera.getWorldDirection(new Vector3()).setY(0)
    const normal = facing.lengthSq() > 1e-6 ? facing.normalize() : new Vector3(0, 0, 1)
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(x, y, z))
    dispatch({
      type: 'pointerDown',
      point: [0, y],
      gesture: roofGesture(selectedTier.volume.id, selectedTier.tier.id),
    })
    startDrag(plane, (hit) => [0, hit.y])
  }

  const dragLabel =
    interaction.kind === 'dragging' && interaction.gesture.label === 'Set storeys' && selectedTier
      ? `${selectedTier.tier.storeys} storeys · ${tierHeight(selectedTier.tier).toFixed(1)} m`
      : null

  return (
    <group>
      {document.volumes
        .filter((volume) => volume.visible)
        .map((volume) =>
          volume.tiers.map((tier) => (
            <TierMesh
              key={tier.id}
              tier={tier}
              selected={selection.volumeId === volume.id}
              invalid={invalidPreview && selection.volumeId === volume.id}
              onPointerDown={editable ? startMove(volume, tier) : undefined}
            />
          )),
        )}

      {editable &&
        selectedTier &&
        selectedTier.volume.visible &&
        !selectedTier.volume.locked &&
        editor.tool === 'select' && (
        <RoofHandle tier={selectedTier.tier} dragLabel={dragLabel} onPointerDown={startRoof} />
      )}

      {interaction.kind === 'drawing' && (
        <DrawOverlay vertices={interaction.vertices} cursor={interaction.cursor} heightAt={heightAt} />
      )}
    </group>
  )
}
