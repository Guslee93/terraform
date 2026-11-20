import { describe, expect, it } from 'vitest'
import { groundClickIntent, type GroundClickInput, type GroundClickIntent } from './groundClick'

// Every combination of the four inputs, with the intent the viewport's onGroundClick produces
// today (TF-VIS-034 acceptance: no behaviour change).
const table: ReadonlyArray<readonly [GroundClickInput, GroundClickIntent]> = [
  // A point pick (placing the circle / a section point) wins over everything.
  [{ picking: true, parcelLayerOn: false, drawing: false, editable: false }, 'pick-point'],
  [{ picking: true, parcelLayerOn: false, drawing: false, editable: true }, 'pick-point'],
  [{ picking: true, parcelLayerOn: false, drawing: true, editable: false }, 'pick-point'],
  [{ picking: true, parcelLayerOn: false, drawing: true, editable: true }, 'pick-point'],
  [{ picking: true, parcelLayerOn: true, drawing: false, editable: false }, 'pick-point'],
  [{ picking: true, parcelLayerOn: true, drawing: false, editable: true }, 'pick-point'],
  [{ picking: true, parcelLayerOn: true, drawing: true, editable: false }, 'pick-point'],
  [{ picking: true, parcelLayerOn: true, drawing: true, editable: true }, 'pick-point'],
  // Parcel layer on, not drawing: pick the parcel; when editable the click also deselects.
  [{ picking: false, parcelLayerOn: true, drawing: false, editable: true }, 'pick-parcel-and-deselect'],
  [{ picking: false, parcelLayerOn: true, drawing: false, editable: false }, 'pick-parcel'],
  // Parcel layer on while drawing: the parcel is not picked; the click is a draw vertex.
  [{ picking: false, parcelLayerOn: true, drawing: true, editable: true }, 'draw-vertex'],
  [{ picking: false, parcelLayerOn: true, drawing: true, editable: false }, 'none'],
  // No point pick, no parcel.
  [{ picking: false, parcelLayerOn: false, drawing: true, editable: true }, 'draw-vertex'],
  [{ picking: false, parcelLayerOn: false, drawing: true, editable: false }, 'none'],
  [{ picking: false, parcelLayerOn: false, drawing: false, editable: true }, 'deselect'],
  [{ picking: false, parcelLayerOn: false, drawing: false, editable: false }, 'none'],
]

describe('groundClickIntent', () => {
  it('maps every input combination to the viewport\'s priority order', () => {
    for (const [input, expected] of table) {
      expect(groundClickIntent(input), JSON.stringify(input)).toBe(expected)
    }
  })
})
