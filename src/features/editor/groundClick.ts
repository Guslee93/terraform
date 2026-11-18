/**
 * Ground-click arbitration (TF-VIS-034, 04 §5.4). A pure decision of what one ground click means,
 * from the editor state and the pointer/parcel inputs. `ViewportCanvas` dispatches on the result;
 * this keeps the priority order reviewable and covered by a table test.
 */

export type GroundClickIntent =
  | 'pick-point'
  | 'pick-parcel-and-deselect'
  | 'pick-parcel'
  | 'draw-vertex'
  | 'deselect'
  | 'none'

export type GroundClickInput = {
  /** A point pick is active (placing the analysis circle or picking a section point). */
  readonly picking: boolean
  /** The parcel layer is on, so a click also selects the parcel under it (ADR-0035). */
  readonly parcelLayerOn: boolean
  /** The draw tool is active: a click places a footprint corner. */
  readonly drawing: boolean
  /** Editing is allowed (the studio is wide and "Add a block" is on). */
  readonly editable: boolean
}

/**
 * The intent of a ground click, preserving today's priority order in `ViewportCanvas.onGroundClick`:
 * a point pick wins; otherwise a parcel (while not drawing) is picked and — when editable — also
 * deselects; then the draw tool places a vertex; otherwise the click deselects; without editing
 * nothing happens.
 */
export function groundClickIntent({ picking, parcelLayerOn, drawing, editable }: GroundClickInput): GroundClickIntent {
  if (picking) return 'pick-point'
  if (parcelLayerOn && !drawing) return editable ? 'pick-parcel-and-deselect' : 'pick-parcel'
  if (!editable) return 'none'
  return drawing ? 'draw-vertex' : 'deselect'
}
