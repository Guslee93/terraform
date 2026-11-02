import { useEffect, useRef } from 'react'
import { ENVELOPE_STATUS_LABEL, type EnvelopeSite } from '../../features/analysis/constraints'
import { compareScenarios } from '../../features/scenarios/compare'
import type { ScenarioDocument } from '../../features/massing/types'
import { inputClass, textButtonSmClass } from '../ui/controls'
import { formatNumber } from './format'

/** 'pending' = a capture for the current view hasn't finished; 'failed' = it ran and couldn't render. */
export type Thumbnails = 'pending' | 'failed' | readonly [string, string]

export function ComparePanel({ scenarios, a, b, site, thumbnails, cameraLabel, disabled, onPairChange, onEdit, onClose }: {
  scenarios: readonly ScenarioDocument[]; a: ScenarioDocument; b: ScenarioDocument; site: EnvelopeSite
  thumbnails: Thumbnails; cameraLabel: string; disabled: boolean
  onPairChange: (a: string, b: string) => void; onEdit: (id: string) => void; onClose: () => void
}) {
  const selectRef = useRef<HTMLSelectElement>(null)
  useEffect(() => { selectRef.current?.focus() }, [])
  const comparison = compareScenarios(a, b, site)
  return <aside aria-label="Compare" className="min-h-0 overflow-y-auto rounded-card bg-surface p-5">
    <header className="flex items-center justify-between"><h2 className="text-title">Compare</h2><button type="button" className={textButtonSmClass} onClick={onClose}>Close</button></header>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {[a, b].map((document, index) => <div key={index} className="min-w-0">
        <label className="text-caption text-ink-secondary" htmlFor={`compare-${index}`}>Scenario {index === 0 ? 'A' : 'B'}</label>
        <select ref={index === 0 ? selectRef : undefined} id={`compare-${index}`} className={`${inputClass} mt-1 font-sans`} value={document.id} onChange={(event) => index === 0 ? onPairChange(event.target.value, b.id) : onPairChange(a.id, event.target.value)}>
          {scenarios.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        {typeof thumbnails === 'string'
          ? <p role={thumbnails === 'pending' ? 'status' : undefined} className="mt-3 flex aspect-video items-center bg-surface-paper p-2 text-caption text-ink-secondary">{thumbnails === 'pending' ? 'Updating thumbnails…' : 'Thumbnail unavailable in this browser'}</p>
          : <img className="mt-3 aspect-video w-full rounded-chip object-contain" src={thumbnails[index]} alt={`${document.name}, ${cameraLabel} camera view`} />}
        <p className="mt-2 break-words text-body-sm">{document.name}</p>
        <p className="text-caption text-ink-secondary">Same camera · same sun time</p>
        <button type="button" disabled={disabled} className={textButtonSmClass} onClick={() => onEdit(document.id)}>Edit {index === 0 ? 'A' : 'B'}</button>
      </div>)}
    </div>
    <table className="mt-5 w-full table-fixed text-caption">
      <caption className="sr-only">Scenario metrics; differences are B minus A</caption>
      <thead><tr className="border-b border-line"><th scope="col" className="w-2/5 py-2 text-left font-medium">Metric</th><th scope="col" className="text-right font-medium">A</th><th scope="col" className="text-right font-medium">B</th><th scope="col" className="text-right font-medium">B − A</th></tr></thead>
      <tbody>
        {comparison.rows.map((row) => <tr key={row.key} className="border-b border-line">
          <th scope="row" className="py-3 pr-2 text-left font-normal">{row.label}{row.unit && <span className="block text-ink-secondary">{row.unit}</span>}</th>
          <td className="text-right font-mono">{formatNumber(row.a, row.decimals)}</td><td className="text-right font-mono">{formatNumber(row.b, row.decimals)}</td>
          <td className="pl-1 text-right font-mono">{row.delta === 0 ? '±0' : `${row.delta > 0 ? '+' : '−'}${formatNumber(Math.abs(row.delta), row.decimals)}${row.unit ? ` ${row.unit}` : ''}`}</td>
        </tr>)}
        <tr><th scope="row" className="pt-3 text-left font-normal">Envelope</th><td className="pt-3 text-right">{ENVELOPE_STATUS_LABEL[comparison.envelope.a]}</td><td className="pt-3 text-right">{ENVELOPE_STATUS_LABEL[comparison.envelope.b]}</td><td className="text-right">—</td></tr>
        <tr><td colSpan={4} className="pb-3 pt-2 text-ink-secondary">Illustrative constraint — not planning advice</td></tr>
        <tr className="border-t border-line"><th scope="row" className="py-3 text-left align-top font-normal">Notes</th><td className="break-words whitespace-pre-wrap p-1 align-top">{comparison.notes.a || '—'}</td><td className="break-words whitespace-pre-wrap p-1 align-top">{comparison.notes.b || '—'}</td><td className="text-right align-top">—</td></tr>
      </tbody>
    </table>
  </aside>
}
