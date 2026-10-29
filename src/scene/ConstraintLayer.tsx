import { Line } from '@react-three/drei'
import { DoubleSide } from 'three'
import type { EnvelopeConstraints, EnvelopeResult } from '../features/analysis/constraints'
import type { MassVolume } from '../features/massing/types'
import type { SitePackage } from '../features/sites/package'
import type { Ring } from '../lib/clip'
import { enuToThreeXyz } from '../lib/coordinates'
import { normalizeRing } from '../lib/polygon'
import { drapePolyline } from './siteGeometry'

export type ConstraintLayerProps = {
  sitePackage: SitePackage
  constraints: EnvelopeConstraints | null
  envelope: EnvelopeResult | null
  selectedVolume: MassVolume | null
  setback: boolean
  heightLimit: boolean
}

const noRaycast = () => null
const AMBER = '#B8822B'
const ACCENT = '#355E79'

function DrapedRing({ ring, sitePackage, dashed = false }: { ring: Ring; sitePackage: SitePackage; dashed?: boolean }) {
  const first = ring[0]
  if (!first || ring.length < 3) return null
  const points = drapePolyline([...ring, first], sitePackage.terrain, 4, dashed ? 0.6 : 0.8)
  return <Line points={points} color={AMBER} lineWidth={2} dashed={dashed} dashSize={3} gapSize={2} raycast={noRaycast} />
}

export function ConstraintLayer({ sitePackage, constraints, envelope, selectedVolume, setback, heightLimit }: ConstraintLayerProps) {
  if (!constraints || !envelope) return null
  const selectedResult = envelope.perVolume.find((volume) => volume.volumeId === selectedVolume?.id)
  const datum = envelope.heightReference === 'datum'
  const footprint = datum ? normalizeRing(sitePackage.studyArea.polygon)
    : selectedVolume?.tiers.flatMap((tier) => tier.footprint.vertices) ?? []
  const showPlane = heightLimit && constraints.maxHeightM !== undefined && footprint.length > 0 && (datum || selectedResult !== undefined)
  const elevation = (datum ? 0 : selectedResult?.referenceElevationM ?? 0) + (constraints.maxHeightM ?? 0)
  const east = footprint.map((point) => point[0])
  const north = footprint.map((point) => point[1])
  const minEast = Math.min(...east), maxEast = Math.max(...east)
  const minNorth = Math.min(...north), maxNorth = Math.max(...north)
  const paddingEast = datum ? 0 : (maxEast - minEast) * 0.05
  const paddingNorth = datum ? 0 : (maxNorth - minNorth) * 0.05
  const west = minEast - paddingEast, right = maxEast + paddingEast
  const south = minNorth - paddingNorth, top = maxNorth + paddingNorth
  const outline: [number, number, number][] = [[west, elevation, -south], [right, elevation, -south], [right, elevation, -top], [west, elevation, -top], [west, elevation, -south]]

  return <group>
    {setback && <>
      {envelope.setbackPolygon?.map((ring, index) => <DrapedRing key={`setback-${index}`} ring={ring} sitePackage={sitePackage} dashed />)}
      {envelope.perVolume.filter((volume) => volume.status === 'exceeds').flatMap((volume) => [...volume.outsideSetbackRings, ...volume.outsideBoundaryRings].map((ring, index) => <DrapedRing key={`${volume.volumeId}-${index}`} ring={ring} sitePackage={sitePackage} />))}
    </>}
    {showPlane && <>
      <mesh position={enuToThreeXyz([(west + right) / 2, (south + top) / 2, elevation])} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[right - west, top - south]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.08} depthWrite={false} side={DoubleSide} />
      </mesh>
      <Line points={outline} color={ACCENT} lineWidth={1} transparent opacity={0.35} depthWrite={false} raycast={noRaycast} />
    </>}
  </group>
}
