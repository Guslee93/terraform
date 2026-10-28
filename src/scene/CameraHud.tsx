import type { SceneLayers } from './ViewportCanvas'
import { useHudStore } from './hudStore'

export function CameraHud({ layers, night = false }: { layers?: SceneLayers; night?: boolean } = {}) {
  const bearingDegrees = useHudStore((state) => state.bearingDegrees)
  const scaleLabel = useHudStore((state) => state.scaleLabel)
  const scaleWidthPx = useHudStore((state) => state.scaleWidthPx)

  const terrainOn = layers?.terrain ?? true
  const streetsOn = layers?.streets ?? true
  const treesOn = layers?.trees ?? true

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:left-4 sm:top-4">
        <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm">
          Curated demo
        </span>
        {night && (
          <span role="status" className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm">
            Sun below horizon
          </span>
        )}
        <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm sm:hidden">
          Read-only preview
        </span>
      </div>
      <div className="pointer-events-none absolute right-3 top-12 z-10 flex flex-col items-center gap-1 sm:right-4 sm:top-4">
        <div className="relative grid size-10 place-items-center rounded-full border border-line bg-surface/85 shadow-sm backdrop-blur-sm">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#202521"
            strokeWidth="1.4"
            strokeLinecap="round"
            style={{ transform: `rotate(${bearingDegrees}deg)` }}
          >
            <path d="M12 20V4M12 4 7 9M12 4l5 5" />
          </svg>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-ink-secondary">N</span>
      </div>

      <div
        data-testid="legend"
        className="pointer-events-none absolute bottom-14 left-3 z-10 hidden flex-col gap-1 min-[1100px]:bottom-12 sm:flex"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t border-dashed border-accent" />
          <span
            className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary"
            title="Authored study area — not a cadastral parcel"
          >
            Study boundary
          </span>
        </div>
        {terrainOn && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded-[2px]"
              style={{ width: '12px', height: '8px', backgroundColor: '#CBDBC5' }}
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">Green space</span>
          </div>
        )}
        {terrainOn && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded-[2px]"
              style={{ width: '12px', height: '8px', backgroundColor: '#BCD6E6' }}
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">Water</span>
          </div>
        )}
        {streetsOn && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded-[2px] border border-line"
              style={{ width: '12px', height: '8px', backgroundColor: '#E2E1DD' }}
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">Streets</span>
          </div>
        )}
        {treesOn && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded-full"
              style={{ width: '8px', height: '8px', backgroundColor: '#9BBA94' }}
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">Trees</span>
          </div>
        )}
      </div>

      <div
        data-testid="scale-bar"
        className="pointer-events-none absolute bottom-3 left-3 z-10 hidden flex-col gap-1 sm:flex"
      >
        <div
          className="h-1.5 border-x border-b border-ink-secondary/70"
          style={{ width: `${scaleWidthPx}px` }}
        />
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">
          {scaleLabel}
        </span>
      </div>
    </>
  )
}
