import { Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, NeutralToneMapping } from 'three'
import type { CameraPresetId } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import { contourSegments } from '../features/sites/contours'
import { sampleTerrainHeight, terrainHeightRange } from '../features/sites/geometry'
import { enuToThreeXyz, type Vec2 } from '../lib/coordinates'
import { EMPTY_SELECTION } from '../features/massing/types'
import { cameraLocked, type EditorEvent, type EditorState } from '../features/editor/interaction'
import { CameraRig, type OrbitControlsHandle } from './CameraRig'
import { HudProbe } from './HudProbe'
import { DEFAULT_SUN, fitShadowFrustum, sunPosition } from './lighting'
import { MassLayer } from './MassLayer'
import { Trees } from './Trees'
import { createLandCoverTexture } from './landCoverTexture'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import {
  createContextGeometry,
  createContourGeometry,
  createRoadGeometry,
  drapePolyline,
  createTerrainGeometry,
  createTerrainGridGeometry,
  createTerrainSkirtGeometry,
} from './siteGeometry'

export type SceneLayers = {
  terrain: boolean
  context: boolean
  streets: boolean
  trees: boolean
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

const VIEWPORT_BACKGROUND = '#F4F2EE'
const CONTEXT_COLOR = '#FAF9F6'
const EDGE_COLOR = '#7E7D7A'
/** One line-weight knob. 0.85 matches Hektar's thin mid-grey outline (≈ 140/255 on white walls). */
const EDGE_OPACITY = 0.85
/** Crease angle (degrees) above which a context edge is drawn; hides coplanar triangle seams. */
const EDGE_THRESHOLD_DEG = 30
/** Contours every 1 m, emphasised every 5 m; skipped on sites with less relief than that. */
const CONTOUR_INTERVAL_M = 1
const CONTOUR_MAJOR_INTERVAL_M = 5
const CONTOUR_MIN_RELIEF_M = 2

type GroundHandlers = {
  onGroundClick?: (point: Vec2, elevation: number) => void
  onGroundMove?: (point: Vec2) => void
}

function TerrainMesh({
  terrain,
  landcover,
  showGrid,
  onGroundClick,
  onGroundMove,
}: {
  terrain: SitePackage['terrain']
  landcover: SitePackage['landcover']
  showGrid: boolean
} & GroundHandlers) {
  const geometry = useMemo(() => createTerrainGeometry(terrain), [terrain])
  const grid = useMemo(() => createTerrainGridGeometry(terrain), [terrain])
  const skirt = useMemo(() => createTerrainSkirtGeometry(terrain), [terrain])
  // Parks green, water blue, painted in plan and draped by the terrain UVs (ADR-0005 §5).
  const landcoverTexture = useMemo(
    () => createLandCoverTexture(landcover, terrain),
    [landcover, terrain],
  )
  useEffect(() => () => landcoverTexture?.dispose(), [landcoverTexture])
  const contours = useMemo(() => {
    const { min, max } = terrainHeightRange(terrain)
    const { minor, major } =
      max - min < CONTOUR_MIN_RELIEF_M
        ? { minor: [], major: [] }
        : contourSegments(terrain, CONTOUR_INTERVAL_M, CONTOUR_MAJOR_INTERVAL_M)
    return { minor: createContourGeometry(minor), major: createContourGeometry(major) }
  }, [terrain])

  useEffect(
    () => () => {
      geometry.dispose()
      grid.dispose()
      skirt.dispose()
      contours.minor.dispose()
      contours.major.dispose()
    },
    [geometry, grid, skirt, contours],
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
        <meshStandardMaterial
          vertexColors
          map={landcoverTexture}
          roughness={0.97}
          metalness={0}
        />
      </mesh>
      <mesh geometry={skirt} receiveShadow>
        <meshStandardMaterial color="#DCD8D1" roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
      <lineSegments geometry={contours.minor}>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.14} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={contours.major}>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.32} depthWrite={false} />
      </lineSegments>
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
      <mesh geometry={geometry} castShadow receiveShadow>
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

/** One value step darker than the ground (ref 8): streets read without a hue. */
const ROAD_COLOR = '#E2E1DD'

function Streets({ sitePackage }: { sitePackage: SitePackage }) {
  const geometry = useMemo(
    () => createRoadGeometry(sitePackage.roads, sitePackage.terrain),
    [sitePackage],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={ROAD_COLOR}
        roughness={1}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

function StudyBoundary({ sitePackage }: { sitePackage: SitePackage }) {
  // The ring is closed (first point repeated), so draping it as a polyline closes the loop.
  const points = useMemo(
    () => drapePolyline(sitePackage.studyArea.polygon, sitePackage.terrain, 4, 0.6),
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

/** Floor for the shadow volume's height so proposed masses taller than the context still cast. */
const MIN_SHADOW_HEIGHT = 60

function SiteLights({ sitePackage }: { sitePackage: SitePackage }) {
  const frustum = useMemo(() => {
    const { terrain, buildings } = sitePackage
    const corners = [terrain.minX, terrain.maxX].flatMap((east) =>
      [terrain.minY, terrain.maxY].map((north) => Math.hypot(east, north)),
    )
    const { min, max } = terrainHeightRange(terrain)
    const tops = buildings.buildings.map((building) => building.baseElevation + building.height)
    // ponytail: masses above MIN_SHADOW_HEIGHT can clip at the frustum edge; feed mass tops in if that shows.
    return fitShadowFrustum(Math.max(...corners), Math.max(-min, max, ...tops, MIN_SHADOW_HEIGHT))
  }, [sitePackage])

  return (
    <>
      {/* Low ambient + cool hemisphere fill keeps a ~3:1 lit/shaded ratio with blue-grey shade. */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#FFFFFF', '#D2D5D8', 2.2]} />
      <directionalLight
        position={sunPosition(DEFAULT_SUN.azimuthDeg, DEFAULT_SUN.elevationDeg, frustum.distance)}
        intensity={3.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-frustum.halfExtent}
        shadow-camera-right={frustum.halfExtent}
        shadow-camera-top={frustum.halfExtent}
        shadow-camera-bottom={-frustum.halfExtent}
        shadow-camera-near={frustum.near}
        shadow-camera-far={frustum.far}
        shadow-radius={1}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
      />
    </>
  )
}

const SceneComposer = lazy(() => import('./SceneComposer'))

/** Below this canvas width the scene renders without ambient occlusion (ADR-0005 §3). */
const AO_MIN_WIDTH_PX = 640

/** Ambient occlusion on wide canvases only; narrow (mobile, read-only) views render directly. */
function AmbientOcclusion() {
  const wide = useThree((state) => state.size.width >= AO_MIN_WIDTH_PX)
  if (!wide) return null
  // If the composer cannot start, drop AO and keep R3F's own render loop.
  return (
    <SceneErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <SceneComposer />
      </Suspense>
    </SceneErrorBoundary>
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
          // PCF + shadow-radius: three r186 removed PCFSoftShadowMap.
          shadows="percentage"
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
          <SiteLights sitePackage={sitePackage} />

          {layers.terrain && (
            <TerrainMesh
              terrain={terrain}
              landcover={sitePackage.landcover}
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
          {layers.streets && layers.terrain && <Streets sitePackage={sitePackage} />}
          {layers.trees && <Trees sitePackage={sitePackage} />}
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
          <AmbientOcclusion />

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
