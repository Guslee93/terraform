import { CAMERA_PRESET_IDS, type CameraPresetId } from '../../features/sites/manifest'
import type { IdentityStage } from '../../scene/style'
import type { LabStateId } from './states'

/** The Lab's camera presets: the site presets plus the Lab-only "overview" view (T1 Run 8). */
export type LabPresetId = CameraPresetId | 'overview'

/**
 * The Lab's reproducible-view URL parameters (TF-VIS-020 / T7). Unknown or invalid values fall back
 * to the Lab's defaults, so any copied URL still opens a valid view.
 *
 *   /lab/compact-infill?style=identity&stage=C&state=wind&preset=isometric&date=2026-06-21&minute=900
 */

export type LabParams = {
  readonly styleId: 'nordic' | 'identity'
  readonly stage: IdentityStage
  readonly stateId: LabStateId
  readonly presetId: LabPresetId
  readonly date: string
  readonly minute: number
}

const LAB_STATE_IDS: readonly LabStateId[] = ['neutral', 'sun-hours', 'wind', 'noise', 'water', 'slope', 'mass']
const DEFAULT_DATE = '2026-06-21'
const DEFAULT_MINUTE = 900

function isLabState(value: string | null): value is LabStateId {
  return value !== null && LAB_STATE_IDS.includes(value as LabStateId)
}

function isPreset(value: string | null): value is LabPresetId {
  return value !== null && (value === 'overview' || (CAMERA_PRESET_IDS as readonly string[]).includes(value))
}

function isStage(value: string | null): value is IdentityStage {
  return value === 'A' || value === 'B' || value === 'C'
}

function isDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function minuteOf(value: string | null): number | null {
  if (value === null) return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 1439 ? number : null
}

export function parseLabParams(search: string): LabParams {
  const params = new URLSearchParams(search)
  const style = params.get('style')
  const stage = params.get('stage')
  const state = params.get('state')
  const preset = params.get('preset')
  return {
    styleId: style === 'identity' ? 'identity' : 'nordic',
    stage: isStage(stage) ? stage : 'C',
    stateId: isLabState(state) ? state : 'neutral',
    presetId: isPreset(preset) ? preset : 'isometric',
    date: isDate(params.get('date')) ? (params.get('date') as string) : DEFAULT_DATE,
    minute: minuteOf(params.get('minute')) ?? DEFAULT_MINUTE,
  }
}
