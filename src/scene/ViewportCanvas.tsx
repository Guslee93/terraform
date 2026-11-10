import { WindHeatmap } from './WindHeatmap'
import { RoofWind } from './RoofWind'
import { WindRampBar } from './WindRampBar'
import type { FootprintBuilding } from '../features/analysis/grid'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, NeutralToneMapping, PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CameraPresetId } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import { contourSegments } from '../features/sites/contours'
import { sampleTerrainHeight, terrainHeightRange } from '../features/sites/geometry'
import { enuToThreeXyz, type Vec2 } from '../lib/coordinates'
import { EMPTY_SELECTION } from '../features/massing/types'
import { cameraLocked, displayedDocument, type EditorEvent, type EditorState } from '../features/editor/interaction'
import { CameraRig, type OrbitControlsHandle } from './CameraRig'
import { HudProbe } from './HudProbe'
import { fitShadowFrustum, lightRig, sunPosition } from './lighting'
import type { SunDirection } from '../features/analysis/sun'
import { ClimateLayer } from './ClimateLayer'
import { FacadeSun, type FacadeOverlay } from './FacadeSun'
import { RoofSolar } from './RoofSolar'
import { WindStreamlines } from './WindStreamlines'
import { FLOW_DISCLAIMER } from '../features/analysis/lbm'
import { WindParticles } from './WindParticles'
import { AnalysisCircle } from './AnalysisCircle'
import { WorstArrows } from './WorstArrows'
import type { FlowResult } from '../features/analysis/flowRunner'
import type { RoofSolarValue } from '../features/analysis/roofSolar'
import { DEFAULT_WIND, type WindSettings, type WindBaseline, type ClimateOverlay } from '../features/analysis/climateView'
import { MassLayer, type MassAnnotation } from './MassLayer'
import { Trees } from './Trees'
import { visibleTierFootprints } from './massFootprints'
import { webglRendererName } from './rendererTier'
import { createFrameBudget, downgrade, RENDER_PROFILES, resolveProfile, type RenderPreference, type RenderProfile } from './renderQuality'
import { detectWebGL } from './webglSupport'
import { PassExporter } from './PassExporter'
import { ANALYSIS_OVERLAY_NAME, type PassImages } from './exportPasses'
import { CameraHud } from './CameraHud'
import { createLandCoverTexture } from './landCoverTexture'
import { SceneErrorBoundary, SceneUnavailable } from './SceneErrorBoundary'
import {
  createContextGeometry,
  createContourGeometry,
  createRoadGeometry,
  createTerrainGeometry,
  createTerrainGridGeometry,
  createTerrainSkirtGeometry,
} from './siteGeometry'

export type SceneLayers = {
  terrain: boolean
  context: boolean
  streets: boolean
  trees: boolean
}

type ViewportProps = {
  sitePackage: SitePackage
  sun: SunDirection
  layers: SceneLayers
  presetId: CameraPresetId
  cameraNonce: number
  editor: EditorState
  dispatch: (event: EditorEvent) => void
  editable: boolean
  annotations?: ReadonlyMap<string, MassAnnotation>
  renderPreference: RenderPreference
  /** Wind or noise screening cells; null when the climate layer is off. */
  climate?: ClimateOverlay | null
  /** Per-roof clear-sky irradiation, aligned with `windBuildings`; null when Roof solar is off. */
  roofSolar?: readonly RoofSolarValue[] | null
  /** Façade sun-hours or VSC quads; null when neither façade layer is showing. */
  facade?: FacadeOverlay | null
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
  /** Endless ENU floor grid (1 m minor, 10 m major) under the site block. */
  grid?: boolean
  /** Each new number captures the export passes once (ADR-0019). */
  exportRequest?: number | null
  onExport?: (result: PassImages | Error) => void
}

/** Pointer travel (px) below which a press-and-release counts as a click, not an orbit. */
const CLICK_TOLERANCE_PX = 4

const VIEWPORT_BACKGROUND = '#F1F1EF'
/** Ground plane one step below the background; fog fades it into the horizon. */
const GROUND_COLOR = '#EBEBE8'
const GRID_MINOR_COLOR = '#DDDDD9'
const GRID_MAJOR_COLOR = '#D8D8D3'
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

/** Matches createTerrainSkirtGeometry's default drop. */
const SKIRT_DROP_M = 2

/**
 * Endless floor grid (ADR-0016). It sits at the base of the terrain skirt (2 m below the lowest
 * terrain sample), so the terrain block stands on it like a model on a table and the two never
 * share a depth (no z-fighting). The ground plane sits a further 0.6 m down for the same reason.
 * Lines fall on whole ENU metres (mesh at east = north = 0). Two layers, so nothing aliases:
 * 10 m lines fade out around the site; 1 m lines exist only within ~140 m of the camera, i.e.
 * once you zoom in, where they are several pixels apart.
 */
function FloorGrid({ terrain, viewScale }: { terrain: SitePackage['terrain']; viewScale: number }) {
  const floor = terrainHeightRange(terrain).min - SKIRT_DROP_M
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, floor - 0.6, 0]}>
        <circleGeometry args={[3000 * viewScale, 64]} />
        <meshBasicMaterial color={GROUND_COLOR} toneMapped={false} />
      </mesh>
      <Grid
        position={[0, floor, 0]}
        infiniteGrid
        cellSize={10}
        cellThickness={0}
        sectionSize={10}
        sectionThickness={0.8}
        sectionColor={GRID_MAJOR_COLOR}
        fadeDistance={460 * viewScale}
        fadeStrength={2.2}
        fadeFrom={0}
        followCamera={false}
      />
      <Grid
        position={[0, floor + 0.01, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={0}
        sectionSize={1}
        sectionThickness={0.6}
        sectionColor={GRID_MINOR_COLOR}
        fadeDistance={140}
        fadeStrength={1.5}
        fadeFrom={1}
        followCamera={false}
      />
    </>
  )
}

/**
 * Image-based fill (rendering spec Phase 1): a procedural room baked once into a PMREM, so
 * faces get soft, direction-varied daylight instead of one flat ambient grey. No HDRI file.
 * The background stays the flat viewport colour; only lit materials see it.
 */
function EnvironmentLight({ intensity }: { intensity: number }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = pmrem.fromScene(room, 0.04)
    room.dispose()
    pmrem.dispose()
    scene.environment = target.texture
    return () => {
      scene.environment = null
      target.dispose()
    }
  }, [gl, scene])
  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])
  return null
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
      <EnvironmentLight intensity={rig.environment} />
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

/** Ambient occlusion on wide canvases at the resolved profile's resolution; off on Low. */
function AmbientOcclusion({ profile, busy }: { profile: RenderProfile; busy: boolean }) {
  const wide = useThree((state) => state.size.width >= AO_MIN_WIDTH_PX)
  const ao = RENDER_PROFILES[profile].ambientOcclusion
  if (!wide || !ao) return null
  // If the composer cannot start, drop AO and keep R3F's own render loop.
  return (
    <SceneErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <SceneComposer ao={ao} busy={busy} />
      </Suspense>
    </SceneErrorBoundary>
  )
}

/** Calls `onSlow` each time a 3 s window averages over the 33 ms budget (ADR-0018). */
function FrameBudgetWatch({ onSlow }: { onSlow: () => void }) {
  const [sample] = useState(createFrameBudget)
  useFrame((_, delta) => {
    if (sample(delta)) onSlow()
  })
  return null
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
  sitePackage,
  sun,
  layers,
  presetId,
  cameraNonce,
  editor,
  dispatch,
  editable,
  annotations,
  renderPreference,
  climate = null,
  roofSolar = null,
  facade = null,
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
  grid = true,
  exportRequest = null,
  onExport,
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
  // Auto drops one tier per slow window and stays dropped for the session; explicit tiers never drop.
  const [slow, setSlow] = useState({ preference: renderPreference, steps: 0 })
  const steps = renderPreference === 'auto' && slow.preference === 'auto' ? slow.steps : 0
  const profile = downgrade(resolveProfile(renderPreference, rendererName ?? ''), steps)
  const onSlow = useCallback(() => setSlow((current) => ({ preference: 'auto', steps: current.preference === 'auto' ? current.steps + 1 : 1 })), [])
  const { manifest, terrain, buildings } = sitePackage
  const initialPreset = manifest.cameraPresets.isometric
  // Fog, orbit limit and far plane were tuned for the curated sites (farthest preset ≈ 870 m).
  // Large imports put presets farther out: scale up so they stay reachable and out of the fog.
  const viewScale = Math.max(1, ...Object.values(manifest.cameraPresets).map((p) =>
    Math.hypot(p.position[0] - p.target[0], p.position[1] - p.target[1], p.position[2] - p.target[2]) / 870))
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
              far: 2600 * viewScale,
            }}
          >
            <color attach="background" args={[VIEWPORT_BACKGROUND]} />
            <fog attach="fog" args={[VIEWPORT_BACKGROUND, 600 * viewScale, 1400 * viewScale]} />
            <SiteLights sitePackage={sitePackage} sun={sun} profile={profile} />
            {grid && <FloorGrid terrain={terrain} viewScale={viewScale} />}

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
            {/* Analysis layers, also exported alone as the transparent overlay pass (ADR-0019). */}
            <group name={ANALYSIS_OVERLAY_NAME}>
            {climate && layers.terrain && (windCircle
              ? <WindHeatmap overlay={climate} heightAt={heightAt} circle={windCircle} />
              : <ClimateLayer overlay={climate} heightAt={heightAt} />)}
            {roofSolar && layers.terrain && <RoofSolar buildings={windBuildings} values={roofSolar} heightAt={heightAt} />}
            {facade && layers.terrain && <FacadeSun overlay={facade} heightAt={heightAt} />}
            {windWorst && layers.terrain && <WorstArrows cells={windWorst.cells} worstFrom={windWorst.worstFrom} heightAt={heightAt} />}
            {!windWorst && windFlow?.slices && windCircle && layers.terrain && <RoofWind buildings={windBuildings} flow={windFlow} circle={windCircle} heightAt={heightAt} wind={windSettings} baseline={windBaseline} />}
            {!windWorst && windFlow && windCircle && layers.terrain && ((windStreamlines || reducedMotion)
              ? windFlow.settled && <WindStreamlines flow={windFlow} circle={windCircle} heightAt={heightAt} heightM={windSettings.streamlineHeight} opacity={windSettings.streamlineOpacity} buildings={windBuildings} />
              : <WindParticles flow={windFlow} circle={windCircle} heightAt={heightAt} wind={windSettings} />)}
            {windCircle && layers.terrain && <AnalysisCircle centre={windCircle.centre} radius={windCircle.radius} heightAt={heightAt} />}
            </group>

            <group name="live-scenario">
            {layers.trees && <Trees sitePackage={sitePackage} exclude={treeExclude} />}
            <MassLayer
              editor={editor}
              dispatch={dispatch}
              editable={editable}
              controlsRef={controlsRef}
              heightAt={heightAt}
              annotations={annotations}
            />

            </group>
            <CameraRig
              presetId={presetId}
              nonce={cameraNonce}
              presets={manifest.cameraPresets}
              controlsRef={controlsRef}
            />
            {onExport && <PassExporter request={exportRequest} controls={controlsRef} onDone={onExport} />}
            <WindDemoCamera orbitDeg={demoOrbitDeg} controlsRef={controlsRef} />
            <HudProbe controlsRef={controlsRef} />
            {/* Wait for renderer detection so Auto never starts AO on software GL. */}
            {rendererName !== null && <AmbientOcclusion profile={profile} busy={cameraLocked(editor)} />}
            {rendererName !== null && renderPreference === 'auto' && profile !== 'low' && <FrameBudgetWatch key={profile} onSlow={onSlow} />}

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enabled={!cameraLocked(editor)}
              enableDamping={demoOrbitDeg === null}
              dampingFactor={0.075}
              minDistance={20}
              maxDistance={1100 * viewScale}
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
