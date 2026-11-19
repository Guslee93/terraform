import { inputClass, labelClass, rangeClass, segmentClass, segmentGroupClass } from '../../components/ui/controls'
import { LAB_STATES, LAB_STYLES, type LabStateId } from './states'
import type { IdentityStage, IdentityTuning } from '../../scene/style'
import type { LabPresetId } from './params'

const PRESETS: ReadonlyArray<{ id: LabPresetId; label: string }> = [
  { id: 'isometric', label: '3D' },
  { id: 'top', label: 'Plan' },
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
  { id: 'eyeLevel', label: 'Street' },
  { id: 'overview', label: 'Overview' },
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
  tuning,
  onTuning,
  onCopyTuning,
  onResetTuning,
}: {
  stateId: LabStateId
  styleId: 'nordic' | 'identity'
  stage: IdentityStage
  presetId: LabPresetId
  date: string
  minute: number
  quality: LabQuality
  tuning: IdentityTuning
  onState: (state: LabStateId) => void
  onStyle: (style: 'nordic' | 'identity') => void
  onStage: (stage: IdentityStage) => void
  onPreset: (preset: LabPresetId) => void
  onDate: (date: string) => void
  onMinute: (minute: number) => void
  onQuality: (quality: LabQuality) => void
  onTuning: (tuning: IdentityTuning) => void
  onCopyTuning: () => void
  onResetTuning: () => void
}) {
  const setTuning = (key: keyof IdentityTuning, value: number) => onTuning({ ...tuning, [key]: value })
  const slider = (key: keyof IdentityTuning, label: string, min: number, max: number, step: number, unit = '') => (
    <div key={key} className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className={labelClass}>{label}</span>
        <span className="tabular-nums text-xs text-ink/70">{tuning[key]}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={tuning[key]} aria-label={`Tune ${label}`} className={rangeClass} onChange={(event) => setTuning(key, Number(event.currentTarget.value))} />
    </div>
  )
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

      {styleId === 'identity' && (
        <div className="space-y-2 rounded-panel border border-card-line bg-app p-3">
          <p className={labelClass}>Identity tuning</p>
          <div className="space-y-2">
            {slider('exposure', 'Exposure', 0.5, 2, 0.05, '×')}
            {slider('vignetteStrength', 'Vignette', 0, 1, 0.05)}
            {slider('waterSheen', 'Water sheen', 0, 1, 0.05)}
            {slider('roadLightness', 'Road lightness', 0, 2, 0.05, '×')}
            {slider('waterLightness', 'Water lightness', 0, 2, 0.05, '×')}
            {slider('contourMinorOpacity', 'Contour minor opacity', 0, 1, 0.02)}
            {slider('contourMajorOpacity', 'Contour major opacity', 0, 1, 0.02)}
            {slider('contourSlopeMinDeg', 'Contour slope min', 0, 20, 1, '°')}
            {slider('contourSlopeMaxDeg', 'Contour slope max', 5, 45, 1, '°')}
            {slider('minorFadeDistanceM', 'Minor fade distance', 0.5, 3, 0.1, '×')}
            {slider('treeColourLightness', 'Tree colour lightness', 0.5, 2, 0.05, '×')}
            {slider('treeDensity', 'Tree density', 0.25, 1.5, 0.05, '×')}
            {slider('dissolveSiteMarginM', 'Haze site margin', 0, 120, 5, ' m')}
            {slider('dissolveMaxFadeWidthM', 'Haze max width', 40, 300, 10, ' m')}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCopyTuning} className={segmentClass}>Copy values</button>
            <button type="button" onClick={onResetTuning} className={segmentClass}>Reset</button>
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
