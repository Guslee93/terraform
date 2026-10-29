import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { constraintsFromManifest, evaluateEnvelope, type HeightReference } from '../../features/analysis/constraints'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../features/massing/factories'
import type { Vec2 } from '../../lib/coordinates'
import { ConstraintsPanel } from './ConstraintsPanel'

const studyArea: Vec2[] = [[-20, -25], [20, -25], [20, 25], [-20, 25]]
const limits = { maxHeightMeters: 18, setbackMeters: 4, label: 'Illustrative design constraint' }
const volume = createVolume({ id: 'crossing', name: 'East wing', tiers: [createTier({ footprint: createRectangleFootprint(10, 10, [20, 0]), storeys: 6, storeyHeight: 3.2 })] })
const document = createScenario({ siteId: 'fixture', volumes: [volume] })

function Harness({ onSelect = () => {} }: { onSelect?: (id: string) => void }) {
  const [reference, setReference] = useState<HeightReference>('grade')
  const envelope = evaluateEnvelope(document, { studyArea, heightAt: () => -1, constraints: constraintsFromManifest(limits, reference) })
  return <ConstraintsPanel envelope={envelope} limits={limits} heightReference={reference} onHeightReferenceChange={setReference} masses={[{ id: volume.id, name: volume.name, hidden: false, warning: true, detail: '' }]} onSelectMass={onSelect} />
}

describe('Constraints panel', () => {
  it('announces the status, keeps the disclaimer adjacent and selects the offending mass', () => {
    const select = vi.fn()
    render(<Harness onSelect={select} />)
    const headline = screen.getByRole('heading', { name: 'Exceeds demo envelope' })
    expect(headline).toHaveAttribute('aria-live', 'polite')
    expect(headline.nextElementSibling).toHaveTextContent('Illustrative constraint — not planning advice')
    expect(screen.getByText('Max height 18.0 m · Setback 4.0 m')).toBeVisible()
    const warning = screen.getByRole('button', { name: /East wing.*outside the setback/ })
    expect(warning).toHaveTextContent('outside the study area')
    fireEvent.click(warning)
    expect(select).toHaveBeenCalledWith('crossing')
  })

  it('changes the reported height reference from Grade to Datum', () => {
    render(<Harness />)
    expect(screen.getByRole('button')).toHaveTextContent('2.2 m above the limit (above grade, ref −1.0 m)')
    fireEvent.change(screen.getByLabelText('Height measured from'), { target: { value: 'datum' } })
    expect(screen.getByRole('button')).toHaveTextContent('1.2 m above the limit (above datum, ref 0.0 m)')
  })

  it('shows Not evaluated when no package is available', () => {
    render(<ConstraintsPanel envelope={null} limits={null} heightReference="grade" onHeightReferenceChange={() => {}} masses={[]} onSelectMass={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Not evaluated' })).toBeVisible()
  })
})
