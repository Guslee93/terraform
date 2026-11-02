import type { Vec2 } from '../../lib/coordinates'
import { createFootprint, createTier, createVolume } from '../massing/factories'
import type { MassSelection, ScenarioDocument } from '../massing/types'
import {
  MassingValidationError,
  validateScenario,
  type ValidationIssue,
} from '../massing/validation'
import { addVolume, moveVolume, updateTier } from './commands'
import {
  beginPreview,
  commitPreview,
  execute,
  type MassingCommand,
  redo,
  select,
  undo,
  updatePreview,
  type MassingHistory,
  type Preview,
} from './history'
import { snapValue } from './snapping'

/**
 * Renderer-free tool and pointer state machine (M2 deliverable 6, ADR-0003 transactions).
 *
 * The scene adapter converts raycasts to local ENU metres (ADR-0002) before dispatching.
 * A pointer-down without a gesture belongs to the camera (navigation); one with a gesture
 * captures the pointer until release (commit) or Esc / pointer loss (cancel). Errors never
 * escape the reducer: the document stays unchanged and `error` carries the message.
 */

export type Tool = 'select' | 'draw'

type DocumentTransform = (document: ScenarioDocument) => ScenarioDocument

export type Gesture = {
  readonly label: string
  /** Builds the transform for a drag from `from` to `to`, always applied to the gesture's base. */
  readonly transform: (from: Vec2, to: Vec2) => DocumentTransform
  readonly selectionAfter?: MassSelection
}

export type InteractionState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'dragging'
      readonly gesture: Gesture
      readonly origin: Vec2
      readonly preview: Preview
      /** Validation issues of the ghost preview, for live feedback. */
      readonly issues: readonly ValidationIssue[]
    }
  | {
      readonly kind: 'drawing'
      readonly vertices: readonly Vec2[]
      /** Terrain elevation under each vertex, parallel to `vertices`. */
      readonly elevations: readonly number[]
      readonly cursor: Vec2 | null
    }

export type EditorState = {
  readonly history: MassingHistory
  readonly tool: Tool
  readonly interaction: InteractionState
  readonly error: string | null
}

export type EditorEvent =
  | { readonly type: 'setTool'; readonly tool: Tool }
  | {
      readonly type: 'pointerDown'
      readonly point: Vec2
      /** Set by the adapter when a mass or handle was hit with the select tool. */
      readonly gesture?: Gesture
      /** Terrain elevation at `point`, used by the draw tool. */
      readonly elevation?: number
    }
  | { readonly type: 'pointerMove'; readonly point: Vec2 }
  | { readonly type: 'pointerUp' }
  | { readonly type: 'pointerCancel' }
  | { readonly type: 'key'; readonly key: 'Escape' | 'Enter' | 'Backspace' }
  | { readonly type: 'select'; readonly selection: MassSelection }
  /** A discrete edit from the inspector; check it with `commandError` first. */
  | { readonly type: 'command'; readonly command: MassingCommand }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }

const IDLE: InteractionState = { kind: 'idle' }
const DEFAULT_DRAW_STOREYS = 3

export function createEditorState(history: MassingHistory): EditorState {
  return { history, tool: 'select', interaction: IDLE, error: null }
}

/** The document the renderer should show: the ghost preview while dragging. */
export function displayedDocument(state: EditorState): ScenarioDocument {
  return state.interaction.kind === 'dragging'
    ? state.interaction.preview.document
    : state.history.document
}

/** True while an edit gesture owns the pointer; orbit controls must be disabled. */
export function cameraLocked(state: EditorState): boolean {
  return state.interaction.kind === 'dragging'
}

/** Moves a whole mass on the ground plane; optional grid step snaps the total delta. */
export function moveGesture(volumeId: string, gridStep?: number): Gesture {
  const snap = (value: number) => (gridStep === undefined ? value : snapValue(value, gridStep))
  return {
    label: 'Move mass',
    transform: (from, to) => moveVolume(volumeId, snap(to[0] - from[0]), snap(to[1] - from[1])).apply,
  }
}

/** Roof handle: vertical drag in metres (point[1] = up) changes whole storeys. */
export function roofGesture(volumeId: string, tierId: string): Gesture {
  return {
    label: 'Set storeys',
    transform: (from, to) => (document) => {
      const tier = document.volumes
        .find((volume) => volume.id === volumeId)
        ?.tiers.find((candidate) => candidate.id === tierId)
      if (!tier) throw new Error(`Unknown tier: ${tierId}`)
      const storeys = tier.storeys + Math.round((to[1] - from[1]) / tier.storeyHeight)
      return updateTier(volumeId, tierId, { storeys }).apply(document)
    },
  }
}

const FIELD_LABELS: Record<string, string> = {
  vertices: 'Footprint',
  storeys: 'Storeys',
  storeyHeight: 'Storey height',
  baseElevation: 'Base elevation',
  name: 'Name',
  tiers: 'A mass',
}

/** User-facing sentence for the first validation issue, e.g. "Storeys must be …". */
function message(error: unknown): string {
  if (error instanceof MassingValidationError) {
    const first = error.issues[0]
    if (first) {
      const field = first.path.split('.').pop()?.replace(/\[\d+\]$/, '') ?? ''
      const hint = first.message === 'edges must not cross' ? ' Move a corner so the outline doesn\'t overlap itself.'
        : first.message.startsWith('area must be at least') ? ' Make the shape larger.' : ''
      return `${FIELD_LABELS[field] ?? 'This edit'} ${first.message}.${hint}`
    }
  }
  return error instanceof Error ? error.message : 'The edit could not be applied.'
}

function fail(state: EditorState, error: unknown, interaction: InteractionState): EditorState {
  return { ...state, interaction, error: message(error) }
}

function startDrag(state: EditorState, point: Vec2, gesture: Gesture): EditorState {
  try {
    // A zero-length drag surfaces locked masses and unknown ids before capture.
    gesture.transform(point, point)(state.history.document)
  } catch (error) {
    return fail(state, error, IDLE)
  }
  const preview = beginPreview(state.history.document)
  return {
    ...state,
    interaction: { kind: 'dragging', gesture, origin: point, preview, issues: [] },
  }
}

function moveDrag(
  state: EditorState,
  drag: Extract<InteractionState, { kind: 'dragging' }>,
  point: Vec2,
): EditorState {
  try {
    const preview = updatePreview(drag.preview, drag.gesture.transform(drag.origin, point))
    return { ...state, interaction: { ...drag, preview, issues: validateScenario(preview.document) } }
  } catch (error) {
    return fail(state, error, IDLE)
  }
}

function commitDrag(
  state: EditorState,
  drag: Extract<InteractionState, { kind: 'dragging' }>,
): EditorState {
  try {
    const history = commitPreview(
      state.history,
      drag.preview,
      drag.gesture.label,
      drag.gesture.selectionAfter,
    )
    return { ...state, history, interaction: IDLE, error: null }
  } catch (error) {
    return fail(state, error, IDLE)
  }
}

function finishDrawing(
  state: EditorState,
  drawing: Extract<InteractionState, { kind: 'drawing' }>,
): EditorState {
  if (drawing.vertices.length < 3) {
    return { ...state, error: 'A footprint needs at least three points.' }
  }
  try {
    const document = state.history.document
    const volume = createVolume({
      name: `Mass ${document.volumes.length + 1}`,
      tiers: [
        createTier({
          footprint: createFootprint(drawing.vertices),
          // Seat the mass at its lowest corner, like M1 context buildings on slopes.
          baseElevation: Math.min(...drawing.elevations),
          storeys: DEFAULT_DRAW_STOREYS,
          storeyHeight: document.assumptions.defaultStoreyHeight,
        }),
      ],
    })
    const history = execute(state.history, addVolume(volume))
    return { history, tool: 'select', interaction: IDLE, error: null }
  } catch (error) {
    // Keep the points so the user can fix them with Backspace.
    return fail(state, error, drawing)
  }
}

const BUSY = 'Finish the current edit first.'

/**
 * Why `command` would be rejected right now, in plain language, or null if it would apply.
 * Lets a form field show its own error and keep its prior value (QA-16).
 */
export function commandError(state: EditorState, command: MassingCommand): string | null {
  if (state.interaction.kind !== 'idle') return BUSY
  try {
    execute(state.history, command)
    return null
  } catch (error) {
    return message(error)
  }
}

export function reduceEditor(state: EditorState, event: EditorEvent): EditorState {
  const { interaction } = state

  switch (event.type) {
    case 'setTool':
      // Switching tools cancels any gesture or drawing in progress.
      return { ...state, tool: event.tool, interaction: IDLE, error: null }

    case 'pointerDown':
      if (interaction.kind === 'dragging') return state
      if (state.tool === 'draw') {
        const drawing =
          interaction.kind === 'drawing'
            ? interaction
            : { kind: 'drawing' as const, vertices: [], elevations: [], cursor: null }
        return {
          ...state,
          interaction: {
            ...drawing,
            vertices: [...drawing.vertices, event.point],
            elevations: [...drawing.elevations, event.elevation ?? 0],
          },
        }
      }
      return event.gesture ? startDrag(state, event.point, event.gesture) : state

    case 'pointerMove':
      if (interaction.kind === 'dragging') return moveDrag(state, interaction, event.point)
      if (interaction.kind === 'drawing') {
        return { ...state, interaction: { ...interaction, cursor: event.point } }
      }
      return state

    case 'pointerUp':
      return interaction.kind === 'dragging' ? commitDrag(state, interaction) : state

    case 'pointerCancel':
      return interaction.kind === 'dragging' ? { ...state, interaction: IDLE } : state

    case 'key':
      if (event.key === 'Escape') {
        return interaction.kind === 'idle' && !state.error
          ? state
          : { ...state, interaction: IDLE, error: null }
      }
      if (interaction.kind !== 'drawing') return state
      if (event.key === 'Enter') return finishDrawing(state, interaction)
      return {
        ...state,
        interaction: {
          ...interaction,
          vertices: interaction.vertices.slice(0, -1),
          elevations: interaction.elevations.slice(0, -1),
        },
      }

    case 'select':
      if (interaction.kind === 'dragging') return state
      return { ...state, history: select(state.history, event.selection) }

    case 'command':
      if (interaction.kind !== 'idle') return state
      try {
        return { ...state, history: execute(state.history, event.command), error: null }
      } catch {
        // Callers check commandError first; a rejected command leaves everything as it was.
        return state
      }

    case 'undo':
    case 'redo':
      // History must not move under an open gesture or drawing.
      if (interaction.kind !== 'idle') return state
      return {
        ...state,
        history: event.type === 'undo' ? undo(state.history) : redo(state.history),
        error: null,
      }
  }
}
