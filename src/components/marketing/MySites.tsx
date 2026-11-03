import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteImported, getImportedSiteStore } from '../../features/import/session'
import type { ImportedEntry, ImportedSiteStore } from '../../features/import/store'
import { getScenarioRepository } from '../../features/scenarios/defaultRepository'
import type { ScenarioRepository } from '../../features/scenarios/repository'
import { ConfirmDialog, type Confirmation } from '../ui/ConfirmDialog'
import { Button } from '../ui/Button'

export function MySites({ store = getImportedSiteStore(), scenarios = getScenarioRepository() }: { store?: ImportedSiteStore; scenarios?: ScenarioRepository }) {
  const [entries, setEntries] = useState<ImportedEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const deleted = useRef(false)
  useEffect(() => {
    let active = true
    store.list().then((rows) => { if (active) setEntries(rows) }).catch(() => { if (active) setError('Saved sites could not be loaded from this browser.') })
    return () => { active = false }
  }, [store])
  // After a delete, once the dialog has closed: the browser's own dialog focus restoration
  // targets the removed Delete button and lands on <body>, so move focus after it settles.
  useEffect(() => {
    if (confirmation || !deleted.current) return
    deleted.current = false
    const timer = window.setTimeout(() => {
      const target = heading.current ?? document.querySelector<HTMLAnchorElement>('a[href="/new"]')
      target?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [confirmation, entries])
  function close() {
    setConfirmation(null)
  }
  if (!entries.length) return error ? <p role="alert" className="mx-auto max-w-[1200px] px-4 py-6 text-body-sm">{error}</p> : null
  return <section aria-labelledby="my-sites-heading" className="border-t border-line">
    <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-7 lg:py-20">
      <h2 id="my-sites-heading" ref={heading} tabIndex={-1} className="text-figure-s text-ink focus-visible:outline-2 focus-visible:outline-focus">My sites</h2>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {entries.map((entry) => {
          const title = entry.status === 'ready' ? entry.summary.title : 'Unreadable site'
          return <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="min-w-0 break-words">
              <h3 className="text-title text-ink">{title}</h3>
              <p className="mt-1 text-body-sm text-ink-secondary">{entry.status === 'ready'
                ? `Imported ${new Date(entry.savedAt).toLocaleDateString()} · ${entry.buildingCount} buildings`
                : 'This saved site could not be read.'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-6">
              <Link to={`/studio/import/${encodeURIComponent(entry.id)}`} aria-label={`Open ${title}`} className="inline-flex min-h-11 items-center text-body-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus">Open</Link>
              <Button variant="ghost" aria-label={`Delete ${title}`} onClick={() => setConfirmation({
                title: `Delete ${title}?`, message: 'This removes the imported site and its saved scenarios from this browser.', action: 'Delete',
                onConfirm: async () => {
                  await deleteImported(entry.id, store, scenarios)
                  deleted.current = true
                  setEntries((rows) => rows.filter((row) => row.id !== entry.id))
                },
              })}>Delete</Button>
            </div>
          </li>
        })}
      </ul>
    </div>
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={close} />}
  </section>
}
