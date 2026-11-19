import type { LegendModel } from '../../features/analysis/graphics'

/**
 * The on-map legend for one analysis (TF-VIS-040 part B). Renders exactly what `legendFor` supplies
 * — title, output class, the colour scale with its boundaries and units, the claim sentence and the
 * sources — and a "computing" state. It never authors claim or source text; those come from the
 * model. Mounted in the Visual Lab only (the studio keeps its own caption blocks).
 */
export function MapLegend({ model }: { model: LegendModel }) {
  const { title, classLabel, scale, claim, sources, state } = model
  return (
    <div
      role="region"
      aria-label={`${title} legend`}
      className="pointer-events-none w-64 max-w-full rounded-panel border border-card-line bg-surface/90 p-3 text-ink shadow-card backdrop-blur-sm"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-body font-medium text-ink">{title}</h2>
        <span className="shrink-0 text-caption text-ink-secondary">{classLabel}</span>
      </div>

      {state === 'computing' && (
        <p role="status" className="mt-2 text-caption text-ink-secondary">
          Computing…
        </p>
      )}

      {scale.kind === 'ramp' ? (
        <div className="mt-2">
          <div
            aria-hidden="true"
            className="h-2 w-full rounded-sm"
            style={{ background: `linear-gradient(to right, ${scale.ramp.stops.map((stop) => stop.colour).join(', ')})` }}
          />
          <div className="mt-1 flex justify-between tabular-nums text-caption text-ink-secondary">
            <span>{scale.ramp.stops[0]?.at ?? 0}</span>
            <span>{scale.ramp.stops[scale.ramp.stops.length - 1]?.at ?? 0}</span>
          </div>
          <p className="text-center text-caption text-ink-secondary">{scale.unit}</p>
        </div>
      ) : (
        <div className="mt-2">
          <div aria-hidden="true" className="flex gap-1">
            {scale.bands.map((band) => (
              <span
                key={band.id}
                title={`${band.id} (below ${band.below === Infinity ? '∞' : band.below})`}
                className="h-2 flex-1 rounded-sm border border-card-line"
                style={{ backgroundColor: band.colour }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between tabular-nums text-caption text-ink-secondary">
            {scale.bands.map((band) => (
              <span key={band.id}>{band.below === Infinity ? '∞' : band.below}</span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-caption leading-snug text-ink-secondary">{claim}</p>
      {sources.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {sources.map((source) => (
            <li key={source} className="text-caption leading-snug text-ink-secondary">
              {source}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
