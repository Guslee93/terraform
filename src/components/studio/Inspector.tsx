import type { SiteSummary } from '../../features/sites/siteCatalog'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

export type InspectorTab = 'model' | 'sun' | 'constraints' | 'compare'

type Tab = {
  id: InspectorTab
  label: string
  available: boolean
  note?: string
}

const TABS: readonly Tab[] = [
  { id: 'model', label: 'Model', available: true },
  { id: 'sun', label: 'Sun', available: false, note: 'M3' },
  { id: 'constraints', label: 'Constraints', available: false, note: 'M3' },
  { id: 'compare', label: 'Compare', available: false, note: 'M4' },
]

type InspectorProps = {
  site: SiteSummary
  activeTab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  isOpen: boolean
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">{label}</dt>
      <dd className="text-right text-[11.5px] font-medium text-ink">{value}</dd>
    </div>
  )
}

export function Inspector({ site, activeTab, onTabChange, isOpen, onClose }: InspectorProps) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close inspector"
          onClick={onClose}
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-ink/20 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        aria-label="Inspector"
        className={cn(
          'fixed bottom-0 right-0 top-14 z-40 flex w-[min(360px,92vw)] flex-col border-l border-line bg-surface transition-transform duration-300 ease-[var(--ease-out)] lg:static lg:z-auto lg:w-[336px] lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <div role="tablist" aria-label="Inspector sections" className="flex gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                disabled={!tab.available}
                title={tab.available ? tab.label : `${tab.label} — available in ${tab.note}`}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary transition-colors',
                  'hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent',
                  tab.id === activeTab &&
                    'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <IconButton label="Close inspector" className="lg:hidden" onClick={onClose}>
            <Icon name="close" size={16} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <section aria-labelledby="selection-heading">
            <div className="flex items-center justify-between">
              <h2
                id="selection-heading"
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-secondary"
              >
                Selection
              </h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-ink-secondary">
                Nothing selected
              </span>
            </div>

            <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[#cdd2ca] bg-[#fbfbf8] px-4 py-5 text-center">
              <span className="mx-auto grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-secondary">
                <Icon name="cube" size={17} />
              </span>
              <p className="mt-3 text-[12.5px] font-medium text-ink">No mass selected</p>
              <p className="mx-auto mt-1.5 max-w-[28ch] text-[11.5px] leading-relaxed text-ink-secondary">
                Massing tools and numeric properties arrive with the M2 engine. This panel is wired
                to the domain model, not placeholder values.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Add mass — available in M2"
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-[6px] border border-line bg-surface px-2.5 text-[11px] font-medium text-ink-secondary opacity-50"
                >
                  <Icon name="cube" size={13} />
                  Add mass
                </button>
                <button
                  type="button"
                  disabled
                  title="Draw footprint — available in M2"
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-[6px] border border-line bg-surface px-2.5 text-[11px] font-medium text-ink-secondary opacity-50"
                >
                  <Icon name="polygon" size={13} />
                  Draw
                </button>
              </div>
            </div>
          </section>

          <section aria-labelledby="site-heading" className="mt-6">
            <h2
              id="site-heading"
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-secondary"
            >
              Site package
            </h2>
            <dl className="mt-2">
              <Row label="Site" value={site.title} />
              <Row label="Morphology" value={site.morphology} />
              <Row label="Data" value="Curated demo" />
              <Row label="Frame" value="Local ENU · metres" />
              <Row label="Context" value="Pending M1 package" />
              <Row label="Constraints" value="Illustrative only" />
            </dl>
          </section>

          <section aria-labelledby="assumptions-heading" className="mt-6">
            <h2
              id="assumptions-heading"
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-secondary"
            >
              Planned assumptions
            </h2>
            <dl className="mt-2">
              <Row label="Storey height" value="3.2 m" />
              <Row label="Height mode" value="Storey-driven" />
              <Row label="Units" value="Metres · 2 dp" />
            </dl>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-secondary">
              Defaults from the PRD. Editable controls are introduced with the massing engine.
            </p>
          </section>

          <section className="mt-6 rounded-[var(--radius-card)] border border-warning/25 bg-warning/[0.06] p-3.5">
            <div className="flex gap-2.5">
              <Icon name="info" size={15} className="mt-px shrink-0 text-warning" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-warning">
                  Illustrative constraint
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-secondary">
                  Envelope statuses are demonstration checks, not planning advice, legal setbacks or
                  a compliance determination.
                </p>
              </div>
            </div>
          </section>

        </div>

        <div className="border-t border-line px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] text-ink-secondary">
          {site.dataStatus === 'curated-demo' ? 'Curated Oslo demonstration' : 'Licensed source'}
        </div>
      </aside>
    </>
  )
}
