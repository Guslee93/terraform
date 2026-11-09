import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Edges, Html, Line } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3, type Group } from 'three'
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
import { soften } from './palette'
import { enuToThreeXyz } from '../lib/coordinates'
import { tierTop } from '../features/massing/aggregate'
import { createStoreyLineGeometry, createTierGeometry, roofHandlePosition } from './massGeometry'

// Accent-family tint: the proposal is the only coloured object against the white context.
const MASS_COLOR = soften('#C9DBE5')
const INVALID_COLOR = '#EBC9C4'
/** Amber tint for clearance warnings (design contract: amber = warning). */
const WARNING_COLOR = soften('#EFD9AC')
/** New masses rise from the ground once, over this many seconds (contract §7); off for reduced motion. */
const RISE_SECONDS = 0.5
const reducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The selected mass is the one solid accent object in the scene (draft 4). */
const SELECTED_FILL = '#3550E0'
const SELECTED_EDGE = '#172DA8'
const SELECTION_COLOR = '#355E79'
/** Storey bands and unselected outlines: a darker accent so they read on the tinted faces. */
const MASS_LINE_COLOR = '#355E79'
const MASS_LINE_OPACITY = 0.35

type MassLayerProps = {
  editor: EditorState
  dispatch: (event: EditorEvent) => void
  editable: boolean
  controlsRef: RefObject<OrbitControlsHandle | null>
  heightAt: (east: number, north: number) => number
  /** Ids of volumes with clearance warnings. */
  warnedVolumes: ReadonlySet<string>
  /** Two-line leader labels per volume id, built from the scenario metrics (spec §7.3). */
  annotations?: ReadonlyMap<string, MassAnnotation>
}

export type MassAnnotation = { readonly title: string; readonly detail: string; readonly status: 'attention' | 'pass' }

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
  warning,
  onPointerDown,
  swallowClicks = true,
}: {
  tier: MassTier
  selected: boolean
  invalid: boolean
  warning: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  swallowClicks?: boolean
}) {
  // Keyed on values, so a preview that keeps a tier's shape does not rebuild it.
  const { footprint, baseElevation, storeys, storeyHeight } = tier
  const geometry = useMemo(
    () => createTierGeometry({ footprint, baseElevation, storeys, storeyHeight }),
    [footprint, baseElevation, storeys, storeyHeight],
  )
  const storeyLines = useMemo(
    () => createStoreyLineGeometry({ footprint, baseElevation, storeys, storeyHeight }),
    [footprint, baseElevation, storeys, storeyHeight],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      storeyLines.dispose()
    },
    [geometry, storeyLines],
  )

  // Grow from the ground on first mount only; edits and drags keep the full height.
  const group = useRef<Group>(null)
  const rise = useRef(reducedMotion() ? 1 : 0)
  useFrame((_, delta) => {
    if (rise.current >= 1 || !group.current) return
    rise.current = Math.min(rise.current + delta / RISE_SECONDS, 1)
    group.current.scale.y = Math.max(1 - (1 - rise.current) ** 3, 0.001)
  })

  return (
    <group ref={group} scale={[1, rise.current >= 1 ? 1 : 0.001, 1]}>
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      // Only the select tool owns mass clicks; the draw tool must reach the ground behind.
      onClick={swallowClicks ? (event) => event.stopPropagation() : undefined}
    >
      {/* Faces pushed back so storey bands and edges lying on them do not z-fight. */}
      <meshStandardMaterial
        color={invalid ? INVALID_COLOR : selected ? SELECTED_FILL : warning ? WARNING_COLOR : MASS_COLOR}
        roughness={0.85}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
      {selected ? (
        <Edges color={SELECTED_EDGE} threshold={20} lineWidth={1.5} />
      ) : (
        <Edges threshold={20} color={MASS_LINE_COLOR} transparent opacity={MASS_LINE_OPACITY} />
      )}
      <lineSegments geometry={storeyLines} raycast={() => null}>
        <lineBasicMaterial color={selected ? '#FFFFFF' : MASS_LINE_COLOR} transparent opacity={selected ? 0.25 : MASS_LINE_OPACITY} />
      </lineSegments>
    </mesh>
    </group>
  )
}

/** Leader stem and label chip above the mass's top north-east corner (draft 4). Presentational only. */
function Annotation({ volume, annotation, selected }: { volume: MassVolume; annotation: MassAnnotation; selected: boolean }) {
  const anchor = useMemo(() => {
    const top = volume.tiers.reduce((best, tier) => (tierTop(tier) > tierTop(best) ? tier : best))
    const corner = top.footprint.vertices.reduce((best, vertex) => (vertex[1] + vertex[0] > best[1] + best[0] ? vertex : best))
    return enuToThreeXyz([corner[0], corner[1], tierTop(top)])
  }, [volume])
  return (
    <Html position={anchor} zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
      <div aria-hidden="true" className="relative flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <div className="whitespace-nowrap rounded-chip bg-surface/90 px-2.5 py-1.5 text-body-sm leading-tight">
          <p className={selected ? 'flex items-center gap-1.5 font-medium text-accent' : 'flex items-center gap-1.5 font-medium text-ink'}>
            <span className={annotation.status === 'attention' ? 'size-1.5 rounded-pill bg-warning' : 'size-1.5 rounded-pill bg-positive'} />
            {annotation.title}
          </p>
          <p className="mt-0.5 font-mono text-caption text-ink-secondary">{annotation.detail}</p>
        </div>
        <span className={selected ? 'h-9 w-px bg-accent' : 'h-9 w-px bg-ink'} />
        <span className={selected ? '-mt-[3px] size-[5px] rounded-pill bg-accent' : '-mt-[3px] size-[5px] rounded-pill bg-ink'} />
      </div>
    </Html>
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
          <span className="whitespace-nowrap rounded-control bg-ink px-1.5 py-0.5 text-body-sm font-medium tabular-nums text-surface">
            {dragLabel}
          </span>
        )}
        <button
          type="button"
          aria-label={`Drag to change storeys of ${tier.name}`}
          title="Drag up or down to change storeys"
          onPointerDown={onPointerDown}
          className="grid size-5 cursor-ns-resize touch-none place-items-center rounded-full border-2 border-accent bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

export function MassLayer({
  editor,
  dispatch,
  editable,
  controlsRef,
  heightAt,
  warnedVolumes,
  annotations,
}: MassLayerProps) {
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
    // A typed inspector value commits on blur: commit it now, while the editor is still idle.
    if (globalThis.document.activeElement instanceof HTMLElement) globalThis.document.activeElement.blur()
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
    // A typed inspector value commits on blur: commit it now, while the editor is still idle.
    if (globalThis.document.activeElement instanceof HTMLElement) globalThis.document.activeElement.blur()
    const [x, y, z] = roofHandlePosition(selectedTier.tier)
    const handle = new Vector3(x, y, z)
    const facing = camera.getWorldDirection(new Vector3()).setY(0)
    dispatch({
      type: 'pointerDown',
      point: [0, y],
      gesture: roofGesture(selectedTier.volume.id, selectedTier.tier.id),
    })
    // A vertical plane is seen edge-on from a steep (Top) view, so heights would jump wildly.
    // There, drag on the roof's horizontal plane and read screen-up travel as metres of height.
    if (facing.lengthSq() < 0.05) {
      const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).setY(0).normalize()
      startDrag(new Plane(new Vector3(0, 1, 0), -y), (hit) => [0, y + hit.clone().sub(handle).dot(up)])
    } else {
      startDrag(new Plane().setFromNormalAndCoplanarPoint(facing.normalize(), handle), (hit) => [0, hit.y])
    }
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
              // Outline the tier the inspector edits; single-tier masses read as the whole mass.
              selected={selection.volumeId === volume.id && selection.tierId === tier.id}
              invalid={invalidPreview && selection.volumeId === volume.id}
              warning={warnedVolumes.has(volume.id)}
              onPointerDown={editable ? startMove(volume, tier) : undefined}
              swallowClicks={editor.tool === 'select'}
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

      {annotations && interaction.kind !== 'drawing' &&
        document.volumes
          .filter((volume) => volume.visible)
          .map((volume) => {
            const annotation = annotations.get(volume.id)
            return annotation ? (
              <Annotation key={volume.id} volume={volume} annotation={annotation} selected={selection.volumeId === volume.id} />
            ) : null
          })}

      {interaction.kind === 'drawing' && (
        <DrawOverlay vertices={interaction.vertices} cursor={interaction.cursor} heightAt={heightAt} />
      )}
    </group>
  )
}
