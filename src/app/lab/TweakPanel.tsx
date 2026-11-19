import { inputClass, labelClass, rangeClass, segmentClass, segmentGroupClass } from '../../components/ui/controls'
import { LAB_STATES, LAB_STYLES, type LabStateId } from './states'
import type { CameraPresetId } from '../../features/sites/manifest'
import type { IdentityStage } from '../../scene/style'

const PRESETS: ReadonlyArray<{ id: CameraPresetId; label: string }> = [
  { id: 'isometric', label: '3D' },
  { id: 'top', label: 'Plan' },
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
  { id: 'eyeLevel', label: 'Street' },
]

const STAGES: readonly IdentityStage[] = ['A', 'B', 'C']

const TIERS = [
  { id: 'auto', label: 'Auto' },
  { id: 'high', label: 'High' },
  { id: 'low', label: 'Low' },
] as const

export type LabQuality = (typeof TIERS)[number]['id']

/** Plain-HTML tweak panel for the Visual Lab (no GUI library, 04 §2.2). */
export function LabTweakPanel({
  stateId,
  styleId,
  stage,
  presetId,
  date,
  minute,
  quality,
  onState,
  onStyle,
  onStage,
  onPreset,
  onDate,
  onMinute,
  onQuality,
}: {
  stateId: LabStateId
  styleId: 'nordic' | 'identity'
  stage: IdentityStage
  presetId: CameraPresetId
  date: string
  minute: number
  quality: LabQuality
  onState: (state: LabStateId) => void
  onStyle: (style: 'nordic' | 'identity') => void
  onStage: (stage: IdentityStage) => void
  onPreset: (preset: CameraPresetId) => void
  onDate: (date: string) => void
  onMinute: (minute: number) => void
  onQuality: (quality: LabQuality) => void
}) {
  return (
    <aside aria-label="Visual Lab" className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-panel border border-card-line bg-card p-4 text-ink">
      <h2 className="text-title text-ink">Visual Lab</h2>

      <div>
        <p className={labelClass}>Style</p>
        <div role="group" aria-label="Style" className={`${segmentGroupClass} mt-1`}>
          {LAB_STYLES.map((option) => (
            <button key={option.id} type="button" aria-pressed={styleId === option.id} onClick={() => onStyle(option.id)} className={segmentClass}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {styleId === 'identity' && (
        <div>
          <p className={labelClass}>Stage</p>
          <div role="group" aria-label="Stage" className={`${segmentGroupClass} mt-1`}>
            {STAGES.map((option) => (
              <button key={option} type="button" aria-pressed={stage === option} onClick={() => onStage(option)} className={segmentClass}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className={labelClass}>State</p>
        <div role="group" aria-label="State" className="mt-1 flex flex-col gap-1">
          {LAB_STATES.map((state) => (
            <button key={state.id} type="button" aria-pressed={stateId === state.id} onClick={() => onState(state.id)} className={segmentClass}>
              {state.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={labelClass}>Camera preset</p>
        <div role="group" aria-label="Camera preset" className={`${segmentGroupClass} mt-1`}>
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" aria-pressed={presetId === preset.id} onClick={() => onPreset(preset.id)} className={segmentClass}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Date
          <input type="date" value={date} className={`${inputClass} mt-1`} onChange={(event) => onDate(event.currentTarget.value)} />
        </label>
      </div>

      <div>
        <label className={labelClass}>
          Time · {String(Math.floor(minute / 60)).padStart(2, '0')}:{String(minute % 60).padStart(2, '0')}
          <input type="range" min={0} max={1439} step={15} value={minute} aria-label="Lab time" className={`${rangeClass} mt-1`} onChange={(event) => onMinute(Number(event.currentTarget.value))} />
        </label>
      </div>

      <div>
        <p className={labelClass}>Render quality</p>
        <div role="group" aria-label="Render quality" className={`${segmentGroupClass} mt-1`}>
          {TIERS.map((tier) => (
            <button key={tier.id} type="button" aria-pressed={quality === tier.id} onClick={() => onQuality(tier.id)} className={segmentClass}>
              {tier.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
