import type { SceneLayers } from './ViewportCanvas'
import { useHudStore } from './hudStore'
import { soften } from './palette'

/** Legend swatches come from the scene constants, so they match what is drawn. */
const GREEN_SPACE = soften('#D3DCCB')

/** Viewport HUD (ADR-0016): a compass on a frosted disc, bottom centre, and one legend pill with the scale. */
export function CameraHud({ layers }: { layers?: SceneLayers } = {}) {
  const bearingDegrees = useHudStore((state) => state.bearingDegrees)
  const scaleLabel = useHudStore((state) => state.scaleLabel)
  const scaleWidthPx = useHudStore((state) => state.scaleWidthPx)

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 z-10 grid size-12 -translate-x-1/2 place-items-center rounded-full border border-card-line bg-frost shadow-float backdrop-blur-md">
        <svg width="30" height="30" viewBox="0 0 26 26">
          <g style={{ transform: `rotate(${bearingDegrees}deg)`, transformOrigin: 'center' }}>
            <text x="13" y="5.2" textAnchor="middle" fontSize="4.6" fontWeight="600" fill="var(--accent)">N</text>
            <path d="M13 6.5 15.6 13 13 12 10.4 13z" fill="var(--accent)" />
            <path d="M13 19.5 15.6 13 13 14 10.4 13z" fill="none" stroke="var(--ink-secondary)" strokeWidth="0.8" />
          </g>
        </svg>
      </div>

      <div
        data-testid="legend"
        className="pointer-events-none absolute right-3 top-3 z-10 hidden lg:top-[60px] items-center gap-5 rounded-control border border-card-line bg-frost px-3 py-1.5 backdrop-blur-md text-caption text-ink-secondary sm:flex"
      >
        <span data-testid="scale-bar" className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-[5px] border-x border-b border-ink" style={{ width: `${scaleWidthPx}px` }} />
          {scaleLabel}
        </span>
        {(layers?.terrain ?? true) && (layers?.ground ?? true) && (
          <span className="hidden items-center gap-1.5 lg:inline-flex">
            <span aria-hidden="true" className="size-2" style={{ backgroundColor: GREEN_SPACE }} />
            Green space
          </span>
        )}
      </div>
    </>
  )
}
