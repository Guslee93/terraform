import type { SceneLayers } from './ViewportCanvas'
import { ACCENT, AMBER } from './ConstraintLayer'
import { useHudStore } from './hudStore'
import { soften } from './palette'

/** Legend swatches come from the scene constants, so they match what is drawn. */
const GREEN_SPACE = soften('#D3DCCB')

/** Viewport HUD (draft 4): a compact compass beside the views and one legend pill with the scale. */
export function CameraHud({ layers }: { layers?: SceneLayers } = {}) {
  const bearingDegrees = useHudStore((state) => state.bearingDegrees)
  const scaleLabel = useHudStore((state) => state.scaleLabel)
  const scaleWidthPx = useHudStore((state) => state.scaleWidthPx)

  return (
    <>
      <svg
        aria-hidden="true"
        width="26"
        height="26"
        viewBox="0 0 26 26"
        className="pointer-events-none absolute right-5 top-[19px] z-10"
      >
        <circle cx="13" cy="13" r="12" fill="none" stroke="var(--border)" />
        <g style={{ transform: `rotate(${bearingDegrees}deg)`, transformOrigin: 'center' }}>
          <path d="M13 4 16 13 13 11.5 10 13z" fill="var(--ink-primary)" />
          <path d="M13 22 16 13 13 14.5 10 13z" fill="none" stroke="var(--ink-primary)" strokeWidth="0.8" />
        </g>
      </svg>

      <div
        data-testid="legend"
        className="pointer-events-none absolute bottom-4 left-4 z-10 hidden items-center gap-5 rounded-chip bg-surface/90 px-3 py-1.5 text-caption text-ink-secondary sm:flex"
      >
        <span data-testid="scale-bar" className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-[5px] border-x border-b border-ink" style={{ width: `${scaleWidthPx}px` }} />
          {scaleLabel}
        </span>
        {layers?.parcel !== false && (
          <span className="hidden items-center gap-1.5 md:inline-flex" title="Authored study area — not a cadastral parcel">
            <span aria-hidden="true" className="w-4 border-t border-dashed" style={{ borderColor: ACCENT }} />
            Study boundary
          </span>
        )}
        {layers?.setback && (
          <span className="hidden items-center gap-1.5 md:inline-flex" title="Illustrative constraint — not planning advice">
            <span aria-hidden="true" className="w-4 border-t border-dashed" style={{ borderColor: AMBER }} />
            Setback
          </span>
        )}
        {(layers?.terrain ?? true) && (
          <span className="hidden items-center gap-1.5 lg:inline-flex">
            <span aria-hidden="true" className="size-2" style={{ backgroundColor: GREEN_SPACE }} />
            Green space
          </span>
        )}
      </div>
    </>
  )
}
