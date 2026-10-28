import { useHudStore } from './hudStore'

export function CameraHud() {
  const bearingDegrees = useHudStore((state) => state.bearingDegrees)
  const scaleLabel = useHudStore((state) => state.scaleLabel)
  const scaleWidthPx = useHudStore((state) => state.scaleWidthPx)

  return (
    <>
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

      <div className="pointer-events-none absolute bottom-14 left-3 z-10 hidden items-center gap-2 min-[1100px]:bottom-9 sm:flex">
        <span aria-hidden="true" className="w-5 border-t border-dashed border-accent" />
        <span
          className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary"
          title="Authored study area — not a cadastral parcel"
        >
          Study boundary
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden flex-col gap-1 sm:flex">
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
