import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { evaluateEnvelope } from '../features/analysis/constraints'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../features/massing/factories'
import type { Vec2 } from '../lib/coordinates'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import compactManifest from '../../public/sites/compact-infill/manifest.json'
import compactTerrain from '../../public/sites/compact-infill/terrain.json'
import compactBuildings from '../../public/sites/compact-infill/buildings.json'
import compactStudyArea from '../../public/sites/compact-infill/study-area.json'
import { parseSiteManifest } from '../features/sites/manifest'
import { parseBuildings, parseStudyArea, parseTerrain } from '../features/sites/package'
import { ConstraintLayer } from './ConstraintLayer'

const sitePackage = {
  manifest: parseSiteManifest(compactManifest), terrain: parseTerrain(compactTerrain),
  buildings: parseBuildings(compactBuildings), studyArea: parseStudyArea(compactStudyArea),
  roads: [], trees: [], landcover: [],
}

type SceneProps = { children?: ReactNode; position?: readonly number[]; args?: readonly number[]; raycast?: () => null; opacity?: number; depthWrite?: boolean }
function elements(node: ReactNode): ReactElement<SceneProps>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<SceneProps>(child) ? [child, ...elements(child.props.children)] : [])
}
const studyArea: Vec2[] = [[-20, -25], [20, -25], [20, 25], [-20, 25]]
const volume = createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3 })] })
const document = createScenario({ siteId: 'fixture', volumes: [volume] })

describe('ConstraintLayer', () => {
  it.each(['grade', 'datum'] as const)('places the %s plane using the correct bounds and external reference', (heightReference) => {
    const constraints = { maxHeightM: 18, setbackM: 4, heightReference }
    const envelope = evaluateEnvelope(document, { studyArea, heightAt: () => -1, constraints })
    const tree = ConstraintLayer({ sitePackage: { ...sitePackage, studyArea: { ...sitePackage.studyArea, polygon: studyArea } }, constraints, envelope, selectedVolume: volume, setback: false, heightLimit: true })
    const nodes = elements(tree)
    const mesh = nodes.find((node) => node.type === 'mesh')
    expect(mesh?.props.position).toEqual([0, heightReference === 'grade' ? 17 : 18, -0])
    expect(mesh?.props.raycast?.()).toBeNull()
    expect(nodes.find((node) => node.type === 'planeGeometry')?.props.args).toEqual(heightReference === 'grade' ? [36, 26] : [40, 50])
    expect(nodes.find((node) => node.type === 'meshBasicMaterial')?.props).toMatchObject({ opacity: 0.18, depthWrite: false })
  })

  it('does not render a grade plane without a selection', () => {
    const constraints = { maxHeightM: 18, setbackM: 4, heightReference: 'grade' as const }
    const envelope = evaluateEnvelope(document, { studyArea, heightAt: () => -1, constraints })
    const tree = ConstraintLayer({ sitePackage, constraints, envelope, selectedVolume: null, setback: false, heightLimit: true })
    expect(elements(tree).some((node) => node.type === 'mesh')).toBe(false)
  })

  it('renders nothing when constraints are null, even with layers enabled', () => {
    const { container } = render(<ConstraintLayer sitePackage={sitePackage} constraints={null} envelope={null} selectedVolume={null} setback heightLimit />)
    expect(container).toBeEmptyDOMElement()
  })
})
