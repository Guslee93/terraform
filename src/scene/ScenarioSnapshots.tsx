import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EdgesGeometry, PerspectiveCamera, Group, type Scene, type WebGLRenderer } from 'three'
import type { ScenarioDocument } from '../features/massing/types'
import type { CameraPreset } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import { evaluateEnvelope, type EnvelopeSite } from '../features/analysis/constraints'
import { enuToThreeXyz } from '../lib/coordinates'
import { createStoreyLineGeometry, createTierGeometry } from './massGeometry'
import { soften } from './palette'
import { Trees } from './Trees'
import { visibleTierFootprints } from './massFootprints'
import { ConstraintLayer } from './ConstraintLayer'
import type { SceneLayers } from './ViewportCanvas'

export type SnapshotRequest = { a: ScenarioDocument; b: ScenarioDocument; preset: CameraPreset; site: EnvelopeSite; layers: SceneLayers; sunKey: string }
export type SnapshotResult = { request: SnapshotRequest; images: readonly [string, string] | null }

/** Synchronous pair: nothing can advance the sun or camera between the two renders. */
export function captureScenarioPair(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, live: Group, a: Group, b: Group): readonly [string, string] {
  const target = gl.getRenderTarget()
  const visibility = [live.visible, a.visible, b.visible]
  try {
    if (gl.getContext().isContextLost()) throw new Error('WebGL context unavailable')
    live.visible = false
    gl.setRenderTarget(null)
    const capture = (group: Group) => {
      a.visible = false; b.visible = false; group.visible = true
      gl.shadowMap.needsUpdate = true
      gl.render(scene, camera)
      const png = gl.domElement.toDataURL('image/png')
      if (!png.startsWith('data:image/png;base64,')) throw new Error('Snapshot unavailable')
      return png
    }
    return [capture(a), capture(b)]
  } finally {
    live.visible = visibility[0] ?? true
    a.visible = visibility[1] ?? false
    b.visible = visibility[2] ?? false
    gl.shadowMap.needsUpdate = true
    gl.setRenderTarget(target)
  }
}

function SnapshotTier({ tier }: { tier: ScenarioDocument['volumes'][number]['tiers'][number] }) {
  const geometry = useMemo(() => createTierGeometry(tier), [tier])
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry])
  const storeys = useMemo(() => createStoreyLineGeometry(tier), [tier])
  useEffect(() => () => { geometry.dispose(); edges.dispose(); storeys.dispose() }, [geometry, edges, storeys])
  return <>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={soften('#C9DBE5')} roughness={0.9} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} /></mesh>
    <lineSegments geometry={edges}><lineBasicMaterial color="#355E79" transparent opacity={0.35} /></lineSegments>
    <lineSegments geometry={storeys}><lineBasicMaterial color="#355E79" transparent opacity={0.35} /></lineSegments>
  </>
}

function SnapshotContent({ document, request, sitePackage }: { document: ScenarioDocument; request: SnapshotRequest; sitePackage: SitePackage }) {
  const envelope = useMemo(() => evaluateEnvelope(document, request.site), [document, request.site])
  return <>
    {request.layers.trees && <Trees sitePackage={sitePackage} exclude={visibleTierFootprints(document)} />}
    <ConstraintLayer sitePackage={sitePackage} constraints={request.site.constraints} envelope={envelope} selectedVolume={null} setback={request.layers.setback} heightLimit={request.layers.heightLimit} />
    {document.volumes.filter((volume) => volume.visible).flatMap((volume) => volume.tiers.map((tier) => <SnapshotTier key={`${volume.id}-${tier.id}`} tier={tier} />))}
  </>
}

export function ScenarioSnapshots({ request, sitePackage, onResult }: { request: SnapshotRequest; sitePackage: SitePackage; onResult: (result: SnapshotResult) => void }) {
  const a = useRef<Group>(null)
  const b = useRef<Group>(null)
  const processed = useRef<SnapshotRequest | null>(null)
  const { gl, scene, camera: liveCamera, size } = useThree()
  useFrame(() => {
    if (processed.current === request || !a.current || !b.current) return
    const live = scene.getObjectByName('live-scenario')
    if (!(live instanceof Group)) return
    processed.current = request
    let images: readonly [string, string] | null
    try {
      const camera = new PerspectiveCamera(request.preset.fov ?? 32, size.width / size.height, 0.5, 2600)
      camera.position.set(...enuToThreeXyz(request.preset.position))
      camera.lookAt(...enuToThreeXyz(request.preset.target))
      camera.updateMatrixWorld()
      images = captureScenarioPair(gl, scene, camera, live, a.current, b.current)
    } catch { images = null }
    finally { try { gl.render(scene, liveCamera) } catch { images = null } }
    onResult({ request, images })
  })
  return <>
    <group ref={a} visible={false}><SnapshotContent document={request.a} request={request} sitePackage={sitePackage} /></group>
    <group ref={b} visible={false}><SnapshotContent document={request.b} request={request} sitePackage={sitePackage} /></group>
  </>
}
