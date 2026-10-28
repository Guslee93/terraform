import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, NeutralToneMapping } from 'three'
import type { CameraPresetId } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import { sampleTerrainHeight } from '../features/sites/geometry'
import { enuToThreeXyz, type Vec2 } from '../lib/coordinates'
import { EMPTY_SELECTION } from '../features/massing/types'
import { cameraLocked, type EditorEvent, type EditorState } from '../features/editor/interaction'
import { CameraRig, type OrbitControlsHandle } from './CameraRig'
import { HudProbe } from './HudProbe'
import { DEFAULT_SUN, sunPosition } from './lighting'
import { MassLayer } from './MassLayer'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import {
  createContextGeometry,
  createTerrainGeometry,
  createTerrainGridGeometry,
  createTerrainSkirtGeometry,
} from './siteGeometry'

export type SceneLayers = {
  terrain: boolean
  context: boolean
  parcel: boolean
}

type ViewportProps = {
  sitePackage: SitePackage
  layers: SceneLayers
  presetId: CameraPresetId
  cameraNonce: number
  editor: EditorState
  dispatch: (event: EditorEvent) => void
  editable: boolean
  warnedVolumes: ReadonlySet<string>
}

/** Pointer travel (px) below which a press-and-release counts as a click, not an orbit. */
const CLICK_TOLERANCE_PX = 4

const VIEWPORT_BACKGROUND = '#EEEDE9'
const CONTEXT_COLOR = '#F3F2EE'
const EDGE_COLOR = '#6F6E6A'
/** One line-weight knob: ~0.3 reads as a clay model, ~0.7 as a sketch model. */
const EDGE_OPACITY = 0.3
/** Crease angle (degrees) above which a context edge is drawn; hides coplanar triangle seams. */
const EDGE_THRESHOLD_DEG = 30

type GroundHandlers = {
  onGroundClick?: (point: Vec2, elevation: number) => void
  onGroundMove?: (point: Vec2) => void
}

function TerrainMesh({
  terrain,
  showGrid,
  onGroundClick,
  onGroundMove,
}: { terrain: SitePackage['terrain']; showGrid: boolean } & GroundHandlers) {
  const geometry = useMemo(() => createTerrainGeometry(terrain), [terrain])
  const grid = useMemo(() => createTerrainGridGeometry(terrain), [terrain])
  const skirt = useMemo(() => createTerrainSkirtGeometry(terrain), [terrain])

  useEffect(
    () => () => {
      geometry.dispose()
      grid.dispose()
      skirt.dispose()
    },
    [geometry, grid, skirt],
  )

  return (
    <group>
      <mesh
        geometry={geometry}
        receiveShadow
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (!onGroundClick || event.delta > CLICK_TOLERANCE_PX) return
          onGroundClick([event.point.x, -event.point.z], event.point.y)
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) =>
          onGroundMove?.([event.point.x, -event.point.z])
        }
      >
        <meshStandardMaterial vertexColors roughness={0.97} metalness={0} />
      </mesh>
      <mesh geometry={skirt} receiveShadow>
        <meshStandardMaterial color="#D8D7D3" roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
      <lineSegments geometry={grid} visible={showGrid}>
        <lineBasicMaterial color="#7C8E7D" transparent opacity={0.22} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function ContextBuildings({ buildings }: { buildings: SitePackage['buildings']['buildings'] }) {
  const geometry = useMemo(() => createContextGeometry(buildings), [buildings])
  const edges = useMemo(() => new EdgesGeometry(geometry, EDGE_THRESHOLD_DEG), [geometry])

  useEffect(
    () => () => {
      geometry.dispose()
      edges.dispose()
    },
    [geometry, edges],
  )

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={CONTEXT_COLOR}
          roughness={0.9}
          metalness={0}
          flatShading
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={EDGE_OPACITY} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function StudyBoundary({ sitePackage }: { sitePackage: SitePackage }) {
  const points = useMemo(
    () =>
      sitePackage.studyArea.polygon.map(
        ([east, north]) =>
          [east, sampleTerrainHeight(sitePackage.terrain, east, north) + 0.6, -north] as [
            number,
            number,
            number,
          ],
      ),
    [sitePackage],
  )

  return (
    <Line
      points={points}
      color="#355E79"
      lineWidth={2}
      dashed
      dashSize={3}
      gapSize={2}
      transparent
      opacity={0.95}
    />
  )
}

function SiteLights() {
  return (
    <>
      {/* Low ambient + cool hemisphere fill keeps a ~3:1 lit/shaded ratio with blue-grey shade. */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#FFFFFF', '#CDD0D4', 1.6]} />
      <directionalLight
        position={sunPosition(DEFAULT_SUN.azimuthDeg, DEFAULT_SUN.elevationDeg, 340)}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-520}
        shadow-camera-right={520}
        shadow-camera-top={520}
        shadow-camera-bottom={-520}
        shadow-camera-near={10}
        shadow-camera-far={1100}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
      />
    </>
  )
}

export function ViewportCanvas({
  sitePackage,
  layers,
  presetId,
  cameraNonce,
  editor,
  dispatch,
  editable,
  warnedVolumes,
}: ViewportProps) {
  const controlsRef = useRef<OrbitControlsHandle>(null)
  const { manifest, terrain, buildings } = sitePackage
  const initialPreset = manifest.cameraPresets.isometric
  const initialPosition = enuToThreeXyz(initialPreset.position)
  const initialTarget = enuToThreeXyz(initialPreset.target)
  const heightAt = (east: number, north: number) => sampleTerrainHeight(terrain, east, north)
  const drawing = editable && editor.tool === 'draw'

  const onGroundClick = (point: Vec2, elevation: number) => {
    if (!editable) return
    if (drawing) dispatch({ type: 'pointerDown', point, elevation })
    else dispatch({ type: 'select', selection: EMPTY_SELECTION })
  }

  return (
    <div
      className="relative h-full w-full bg-viewport"
      role="region"
      aria-label={`3D site viewport for ${manifest.title}. Drag to orbit, middle-drag to pan, scroll to zoom.`}
    >
      <SceneErrorBoundary>
        <Canvas
          key={manifest.id}
          shadows
          dpr={[1, 1.75]}
          // Neutral tone mapping keeps white-model albedo white; ACES greys it down.
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
          camera={{
            position: initialPosition,
            fov: initialPreset.fov ?? 32,
            near: 0.5,
            far: 2600,
          }}
        >
          <color attach="background" args={[VIEWPORT_BACKGROUND]} />
          <fog attach="fog" args={[VIEWPORT_BACKGROUND, 600, 1400]} />
          <SiteLights />

          {layers.terrain && (
            <TerrainMesh
              terrain={terrain}
              showGrid={presetId === 'top' || drawing}
              onGroundClick={onGroundClick}
              onGroundMove={
                drawing && editor.interaction.kind === 'drawing'
                  ? (point) => dispatch({ type: 'pointerMove', point })
                  : undefined
              }
            />
          )}
          {layers.context && <ContextBuildings buildings={buildings.buildings} />}
          {layers.parcel && <StudyBoundary sitePackage={sitePackage} />}

          <MassLayer
            editor={editor}
            dispatch={dispatch}
            editable={editable}
            controlsRef={controlsRef}
            heightAt={heightAt}
            warnedVolumes={warnedVolumes}
          />

          <CameraRig
            presetId={presetId}
            nonce={cameraNonce}
            presets={manifest.cameraPresets}
            controlsRef={controlsRef}
          />
          <HudProbe controlsRef={controlsRef} />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={!cameraLocked(editor)}
            enableDamping
            dampingFactor={0.075}
            minDistance={20}
            maxDistance={1100}
            minPolarAngle={0.02}
            maxPolarAngle={Math.PI / 2 - 0.015}
            target={initialTarget}
          />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  )
}
