import type { SceneLayers } from './ViewportCanvas'
import { useHudStore } from './hudStore'

const COMPASS = 86
const TICKS = Array.from({ length: 72 }, (_, index) => index * 5)
const SCALE_STEPS = 10

/** Viewport HUD (spec §7.3): text and line on the viewport card, no chips or backgrounds. */
export function CameraHud({ layers, night = false }: { layers?: SceneLayers; night?: boolean } = {}) {
  const bearingDegrees = useHudStore((state) => state.bearingDegrees)
  const scaleLabel = useHudStore((state) => state.scaleLabel)
  const scaleWidthPx = useHudStore((state) => state.scaleWidthPx)
  const scaleMetres = Number.parseFloat(scaleLabel)

  const terrainOn = layers?.terrain ?? true
  const streetsOn = layers?.streets ?? true
  const treesOn = layers?.trees ?? true
  const c = COMPASS / 2

  return (
    <>
      <p className="pointer-events-none absolute left-[26px] top-[22px] z-10 flex flex-wrap items-center gap-x-2 text-label text-ink">
        <span>01 / Massing</span>
        <span className="text-ink-secondary">· Curated demo</span>
        {night && (
          <span className="text-ink-secondary">
            · <span role="status">Sun below horizon</span>
          </span>
        )}
        <span className="text-ink-secondary sm:hidden">· Read-only preview</span>
      </p>

      <svg
        aria-hidden="true"
        width={COMPASS}
        height={COMPASS}
        viewBox={`0 0 ${COMPASS} ${COMPASS}`}
        className="pointer-events-none absolute right-5 top-4 z-10"
      >
        <g style={{ transform: `rotate(${bearingDegrees}deg)`, transformOrigin: 'center' }}>
          {TICKS.map((angle) => (
            <line
              key={angle}
              x1={c}
              y1={2}
              x2={c}
              y2={angle % 90 === 0 ? 9 : 6}
              stroke="var(--ink-primary)"
              strokeOpacity={0.5}
              strokeWidth={0.6}
              transform={`rotate(${angle} ${c} ${c})`}
            />
          ))}
          <path d={`M${c} 20 L${c + 5} ${c} L${c} ${c + 14} L${c - 5} ${c} Z`} fill="var(--surface-paper)" stroke="var(--ink-primary)" strokeWidth={1} strokeLinejoin="round" />
          <path d={`M${c} 20 L${c + 5} ${c} L${c - 5} ${c} Z`} fill="var(--ink-primary)" />
          <text x={c} y={17} textAnchor="middle" fontFamily="var(--typeface-sans)" fontSize={9.5} fontWeight={500} fill="var(--ink-primary)">
            N
          </text>
        </g>
      </svg>

      <div
        data-testid="legend"
        className="pointer-events-none absolute bottom-[24px] left-[192px] z-10 hidden items-center gap-x-3 whitespace-nowrap text-label text-ink-secondary min-[105rem]:flex"
      >
        {layers?.parcel !== false && (
          <span className="inline-flex items-center gap-1.5" title="Authored study area — not a cadastral parcel">
            <span aria-hidden="true" className="w-3.5 border-t border-dashed border-ink" />
            Study boundary
          </span>
        )}
        {layers?.setback && (
          <span className="inline-flex items-center gap-1.5" title="Illustrative constraint — not planning advice">
            <span aria-hidden="true" className="w-3.5 border-t border-dashed border-warning" />
            Setback
          </span>
        )}
        {terrainOn && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[7px]" style={{ backgroundColor: '#CBDBC5' }} />
            Green space
          </span>
        )}
        {terrainOn && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[7px]" style={{ backgroundColor: '#BCD6E6' }} />
            Water
          </span>
        )}
        {streetsOn && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[7px] border border-line" style={{ backgroundColor: '#E2E1DD' }} />
            Streets
          </span>
        )}
        {treesOn && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[7px]" style={{ backgroundColor: '#9BBA94' }} />
            Trees
          </span>
        )}
      </div>

      <div
        data-testid="scale-bar"
        className="pointer-events-none absolute bottom-[22px] left-[26px] z-10 hidden sm:block"
        style={{ width: `${scaleWidthPx}px` }}
      >
        <div className="relative h-2.5 border-b border-ink">
          {Array.from({ length: SCALE_STEPS + 1 }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="absolute bottom-0 w-px bg-ink"
              style={{ left: `${(index / SCALE_STEPS) * 100}%`, height: index % 5 === 0 ? 10 : 5 }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-label text-ink-secondary">
          <span>0</span>
          <span>{Number.isFinite(scaleMetres) ? scaleMetres / 2 : ''}</span>
          <span>{scaleLabel}</span>
        </div>
      </div>
    </>
  )
}
