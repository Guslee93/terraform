import { useEffect, useState } from 'react'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { FIT_SITE_EVENT, ViewportCanvas } from '../../scene/ViewportCanvas'
import { Icon } from '../ui/Icon'
import { Inspector, type InspectorTab } from './Inspector'
import { StudioTopBar } from './StudioTopBar'
import { ToolRail, type ToolId } from './ToolRail'

export function StudioShell({ site }: { site: SiteSummary }) {
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const [activeTab, setActiveTab] = useState<InspectorTab>('model')
  const [scenario, setScenario] = useState('Concept A')
  const [inspectorOpen, setInspectorOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, select, textarea, [contenteditable="true"]')) return

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        window.dispatchEvent(new Event(FIT_SITE_EVENT))
      }

      if (event.key === 'Escape') {
        setInspectorOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const fitSite = () => {
    window.dispatchEvent(new Event(FIT_SITE_EVENT))
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-ink">
      <StudioTopBar
        site={site}
        scenario={scenario}
        onScenarioChange={setScenario}
        onFitSite={fitSite}
        onToggleInspector={() => setInspectorOpen((open) => !open)}
        inspectorOpen={inspectorOpen}
      />

      <div className="flex min-h-0 flex-1">
        <ToolRail
          activeTool={activeTool}
          onSelect={setActiveTool}
          onOpenLayers={() => setInspectorOpen(true)}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden" aria-label="Studio viewport">
          <ViewportCanvas />

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:left-4 sm:top-4">
            <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm">
              Curated demo
            </span>
            <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm">
              {scenario}
            </span>
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-10 hidden items-center gap-2.5 rounded-[10px] border border-line bg-surface/85 px-3 py-2 shadow-sm backdrop-blur-sm sm:flex">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full border border-line text-ink-secondary"
            >
              <Icon name="move" size={13} />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-medium text-ink">Oslo</p>
              <p className="text-[8.5px] uppercase tracking-[0.12em] text-ink-secondary">
                Local ENU · metres
              </p>
            </div>
          </div>

          <div className="absolute inset-0 z-10 grid place-items-center p-4">
            <div className="pointer-events-auto w-full max-w-[22rem] rounded-[14px] border border-line bg-surface/92 p-6 text-center shadow-[var(--shadow-soft)] backdrop-blur-md">
              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-accent">
                Viewport ready
              </p>
              <h1 className="mt-2.5 text-balance font-display text-[26px] leading-[1.05] tracking-[-0.01em] text-ink">
                Site geometry arrives in milestone M1.
              </h1>
              <p className="mx-auto mt-3 max-w-[34ch] text-[11.5px] leading-relaxed text-ink-secondary">
                The camera, coordinate frame and studio shell are in place. Curated terrain, context
                buildings and parcel linework are next — no invented site data is shown here.
              </p>
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-muted"
              >
                Inspect the site notes
                <Icon name="arrow-up-right" size={13} />
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden items-center gap-2 md:flex">
            {[
              ['Drag', 'Orbit'],
              ['Middle', 'Pan'],
              ['Scroll', 'Zoom'],
            ].map(([key, action]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/85 px-2 py-1 text-[9px] text-ink-secondary shadow-sm backdrop-blur-sm"
              >
                <kbd className="rounded border border-line bg-app px-1 py-px text-[8px] uppercase tracking-[0.08em] text-ink">
                  {key}
                </kbd>
                {action}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={fitSite}
            className="absolute bottom-3 right-3 z-10 inline-flex min-h-8 items-center gap-1.5 rounded-[6px] border border-line bg-surface/90 px-2.5 text-[10px] font-medium text-ink-secondary shadow-sm backdrop-blur-sm transition-colors hover:text-ink"
          >
            <Icon name="fit" size={13} />
            Fit site
          </button>

        </main>

        <Inspector
          site={site}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
        />
      </div>

      <footer className="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-line bg-surface px-3 text-[8.5px] uppercase tracking-[0.12em] text-ink-secondary">
        <span className="truncate">
          {site.title} · {scenario}
        </span>
        <span className="hidden sm:inline">Illustrative constraints · not planning advice</span>
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
          M0 shell · site packages pending
        </span>
      </footer>
    </div>
  )
}
