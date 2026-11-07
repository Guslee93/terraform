import { WindHeatmap } from './WindHeatmap'
import { RoofWind } from './RoofWind'
import { WindRampBar } from './WindRampBar'
import type { FootprintBuilding } from '../features/analysis/grid'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, NeutralToneMapping, Vector3 } from 'three'
import type { CameraPresetId } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import { contourSegments } from '../features/sites/contours'
import { sampleTerrainHeight, terrainHeightRange } from '../features/sites/geometry'
import { enuToThreeXyz, type Vec2 } from '../lib/coordinates'
import { EMPTY_SELECTION } from '../features/massing/types'
import { cameraLocked, displayedDocument, type EditorEvent, type EditorState } from '../features/editor/interaction'
import { ScenarioSnapshots, type SnapshotRequest, type SnapshotResult } from './ScenarioSnapshots'
import { CameraRig, type OrbitControlsHandle } from './CameraRig'
import { HudProbe } from './HudProbe'
import { fitShadowFrustum, lightRig, sunPosition } from './lighting'
import type { SunDirection } from '../features/analysis/sun'
import type { EnvelopeConstraints, EnvelopeResult } from '../features/analysis/constraints'
import { ConstraintLayer } from './ConstraintLayer'
import { ClimateLayer } from './ClimateLayer'
import { WindStreamlines } from './WindStreamlines'
import { FLOW_DISCLAIMER } from '../features/analysis/lbm'
import { WindParticles } from './WindParticles'
import { AnalysisCircle } from './AnalysisCircle'
import { WorstArrows } from './WorstArrows'
import type { FlowResult } from '../features/analysis/flowRunner'
import { DEFAULT_WIND, type WindSettings, type WindBaseline, type ClimateOverlay } from '../features/analysis/climateView'
import { MassLayer, type MassAnnotation } from './MassLayer'
import { Trees } from './Trees'
import { visibleTierFootprints } from './massFootprints'
import { webglRendererName } from './rendererTier'
import { RENDER_PROFILES, resolveProfile, type RenderPreference, type RenderProfile } from './renderQuality'
import { detectWebGL } from './webglSupport'
import { CameraHud } from './CameraHud'
import { createLandCoverTexture } from './landCoverTexture'
import { SceneErrorBoundary, SceneUnavailable } from './SceneErrorBoundary'
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
  setback: boolean
  heightLimit: boolean
}

type ViewportProps = {
  snapshotRequest?: SnapshotRequest | null
  onSnapshot?: (result: SnapshotResult) => void
  sitePackage: SitePackage
  sun: SunDirection
  constraints: EnvelopeConstraints | null
  envelope: EnvelopeResult | null
  layers: SceneLayers
  presetId: CameraPresetId
  cameraNonce: number
  editor: EditorState
  dispatch: (event: EditorEvent) => void
  editable: boolean
  warnedVolumes: ReadonlySet<string>
  annotations?: ReadonlyMap<string, MassAnnotation>
  renderPreference: RenderPreference
  /** Wind or noise screening cells; null when the climate layer is off. */
  climate?: ClimateOverlay | null
  /** Live 2D wind flow for the particle layer; null when wind is off. */
  windFlow?: FlowResult | null
  windSettings?: WindSettings
  windBuildings?: readonly FootprintBuilding[]
  windBaseline?: WindBaseline | null
  windStreamlines?: boolean
  /** Worst-case view (ADR-0015): arrows instead of the single-direction flow layers. */
  windWorst?: { readonly cells: Float32Array; readonly worstFrom: readonly number[] } | null
  demoOrbitDeg?: number | null
  onStopDemo?: () => void
  /** Wind analysis circle (ring + particle bounds); null when wind is off. */
  windCircle?: { readonly centre: Vec2; readonly radius: number } | null
  /** When set, the next ground click picks a point (e.g. placing the wind circle) instead of editing. */
  onPickPoint?: (point: Vec2) => void
}

/** Pointer travel (px) below which a press-and-release counts as a click, not an orbit. */
const CLICK_TOLERANCE_PX = 4

const VIEWPORT_BACKGROUND = '#F1F1EF'
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

function SiteLights({ sitePackage, sun, profile }: {
  sitePackage: SitePackage
  sun: SunDirection
  profile: RenderProfile
}) {
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
  const rig = lightRig(sun, profile)
  const shadowMapSize = RENDER_PROFILES[profile].shadowMapSize

  return (
    <>
      {/* Fill low enough that walls read by their angle to the sun (Hektar: ≈195 away, ≈225 oblique, white facing). */}
      <ambientLight intensity={rig.ambient} />
      <hemisphereLight args={[rig.hemisphere.sky, rig.hemisphere.ground, rig.hemisphere.intensity]} />
      {rig.sun && (
        <directionalLight
          // Recreate the light when the map size changes, releasing the previous shadow target.
          key={profile}
          position={sunPosition(sun.azimuthDeg, sun.elevationDeg, frustum.distance)}
          intensity={rig.sun.intensity}
          castShadow={rig.sun.castShadow}
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
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
      )}
    </>
  )
}

const SceneComposer = lazy(() => import('./SceneComposer'))

/** Below this canvas width the scene renders without ambient occlusion (ADR-0005 §3). */
const AO_MIN_WIDTH_PX = 640

/** Ambient occlusion on wide canvases when the resolved quality profile enables it. */
function AmbientOcclusion({ profile }: { profile: RenderProfile }) {
  const wide = useThree((state) => state.size.width >= AO_MIN_WIDTH_PX)
  if (!wide || !RENDER_PROFILES[profile].ambientOcclusion) return null
  // If the composer cannot start, drop AO and keep R3F's own render loop.
  return (
    <SceneErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <SceneComposer />
      </Suspense>
    </SceneErrorBoundary>
  )
}

function WindDemoCamera({ orbitDeg, controlsRef }: { orbitDeg: number | null; controlsRef: RefObject<OrbitControlsHandle | null> }) {
  const { camera } = useThree()
  const saved = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const playing = orbitDeg !== null
  useLayoutEffect(() => {
    const controls = controlsRef.current
    if (!playing || !controls) return
    const previous = { position: camera.position.clone(), target: controls.target.clone() }
    saved.current = previous
    return () => {
      camera.position.copy(previous.position)
      controls.target.copy(previous.target)
      controls.update()
      saved.current = null
    }
  }, [playing, camera, controlsRef])
  useFrame(() => {
    const controls = controlsRef.current
    const previous = saved.current
    if (orbitDeg === null || !previous || !controls) return
    camera.position.copy(previous.position).sub(previous.target)
      .applyAxisAngle(new Vector3(0, 1, 0), orbitDeg * Math.PI / 180).add(previous.target)
    controls.target.copy(previous.target)
    controls.update()
  })
  return null
}

export function ViewportCanvas({
  snapshotRequest,
  onSnapshot,
  constraints,
  envelope,
  sitePackage,
  sun,
  layers,
  presetId,
  cameraNonce,
  editor,
  dispatch,
  editable,
  warnedVolumes,
  annotations,
  renderPreference,
  climate = null,
  windFlow = null,
  windStreamlines = false,
  windWorst = null,
  windSettings = DEFAULT_WIND,
  windBuildings = [],
  windBaseline = null,
  demoOrbitDeg = null,
  onStopDemo,
  windCircle = null,
  onPickPoint,
}: ViewportProps) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const controlsRef = useRef<OrbitControlsHandle>(null)
  const [webgl] = useState(detectWebGL)
  const [rendererName, setRendererName] = useState<string | null>(null)
  const profile = resolveProfile(renderPreference, rendererName ?? '')
  const { manifest, terrain, buildings } = sitePackage
  const initialPreset = manifest.cameraPresets.isometric
  const initialPosition = enuToThreeXyz(initialPreset.position)
  const initialTarget = enuToThreeXyz(initialPreset.target)
  const heightAt = useCallback((east: number, north: number) => sampleTerrainHeight(terrain, east, north), [terrain])
  const drawing = editable && editor.tool === 'draw'
  const treeExclude = useMemo(
    () => visibleTierFootprints(displayedDocument(editor)),
    [editor],
  )

  const onGroundClick = (point: Vec2, elevation: number) => {
    if (onPickPoint) return onPickPoint(point)
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
      {windCircle && (
        // The wind claim stays visible with the wind layer even when the inspector group is closed (PRD R8).
        <div className="pointer-events-none absolute inset-x-3 bottom-14 z-20 flex flex-col items-end gap-2">
          {windSettings.display === 'ratio' && <WindRampBar />}
          <p className="rounded-chip bg-surface/90 px-2 py-1 text-caption text-ink-secondary">{FLOW_DISCLAIMER}</p>
        </div>
      )}
      {webgl === 'none' ? (
        <SceneUnavailable reason="unsupported" />
      ) : (
        <SceneErrorBoundary>
          <Canvas
            key={manifest.id}
            onPointerDownCapture={onStopDemo}
            // PCF + shadow-radius: three r186 removed PCFSoftShadowMap.
            shadows={RENDER_PROFILES[profile].shadows ? 'percentage' : false}
            onCreated={({ gl }) => setRendererName(webglRendererName(gl))}
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
            <SiteLights sitePackage={sitePackage} sun={sun} profile={profile} />

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
            {layers.parcel && <StudyBoundary sitePackage={sitePackage} />}
            {climate && layers.terrain && (windCircle
              ? <WindHeatmap overlay={climate} heightAt={heightAt} circle={windCircle} />
              : <ClimateLayer overlay={climate} heightAt={heightAt} />)}
            {windWorst && layers.terrain && <WorstArrows cells={windWorst.cells} worstFrom={windWorst.worstFrom} heightAt={heightAt} />}
            {!windWorst && windFlow?.slices && windCircle && layers.terrain && <RoofWind buildings={windBuildings} flow={windFlow} circle={windCircle} heightAt={heightAt} wind={windSettings} baseline={windBaseline} />}
            {!windWorst && windFlow && windCircle && layers.terrain && ((windStreamlines || reducedMotion)
              ? windFlow.settled && <WindStreamlines flow={windFlow} circle={windCircle} heightAt={heightAt} heightM={windSettings.streamlineHeight} opacity={windSettings.streamlineOpacity} buildings={windBuildings} />
              : <WindParticles flow={windFlow} circle={windCircle} heightAt={heightAt} wind={windSettings} />)}
            {windCircle && layers.terrain && <AnalysisCircle centre={windCircle.centre} radius={windCircle.radius} heightAt={heightAt} />}

            <group name="live-scenario">
            {layers.trees && <Trees sitePackage={sitePackage} exclude={treeExclude} />}
            <ConstraintLayer
              sitePackage={sitePackage}
              constraints={constraints}
              envelope={envelope}
              selectedVolume={displayedDocument(editor).volumes.find((volume) => volume.visible && volume.id === editor.history.selection.volumeId) ?? null}
              setback={layers.setback}
              heightLimit={layers.heightLimit}
            />
            <MassLayer
              editor={editor}
              dispatch={dispatch}
              editable={editable}
              controlsRef={controlsRef}
              heightAt={heightAt}
              warnedVolumes={warnedVolumes}
              annotations={annotations}
            />

            </group>
            {snapshotRequest && onSnapshot && <ScenarioSnapshots request={snapshotRequest} sitePackage={sitePackage} onResult={onSnapshot} />}
            <CameraRig
              presetId={presetId}
              nonce={cameraNonce}
              presets={manifest.cameraPresets}
              controlsRef={controlsRef}
            />
            <WindDemoCamera orbitDeg={demoOrbitDeg} controlsRef={controlsRef} />
            <HudProbe controlsRef={controlsRef} />
            {/* Wait for renderer detection so Auto never starts AO on software GL. */}
            {rendererName !== null && <AmbientOcclusion profile={profile} />}

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enabled={!cameraLocked(editor)}
              enableDamping={demoOrbitDeg === null}
              dampingFactor={0.075}
              minDistance={20}
              maxDistance={1100}
              minPolarAngle={0.02}
              maxPolarAngle={Math.PI / 2 - 0.015}
              target={initialTarget}
            />
          </Canvas>
        </SceneErrorBoundary>
      )}
      <CameraHud layers={layers} />
    </div>
  )
}
