import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'
import { searchPlaces, type PlaceResult } from '../features/import/geocode'

// Shared by the landing and the framing step. Kept free of maplibre so the landing stays light.

/** Link to the framing step at a place chosen elsewhere (the landing search or a quick pick). */
export function framingHref(latitude: number, longitude: number, label: string): string {
  return `/new?${new URLSearchParams({ lat: latitude.toFixed(6), lon: longitude.toFixed(6), label })}`
}

export function PlaceSearch({ disabled, onSelect, label = 'Search for an address or place', hideLabel = false, placeholder = 'Thorvald Meyers gate 40, Oslo', inputClassName }: {
  disabled: boolean
  onSelect: (place: PlaceResult) => void
  label?: string
  /** Keep the label for screen readers only (the landing's search card shows a placeholder instead). */
  hideLabel?: boolean
  placeholder?: string
  inputClassName?: string
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [message, setMessage] = useState('')
  // The label just picked: putting it in the box must not search (and reopen the list) again.
  const chosen = useRef<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3 || query === chosen.current) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return
          setResults(places)
          setActive(-1)
          setOpen(true)
          setMessage(places.length ? '' : 'No places found')
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResults([])
          setOpen(false)
          setMessage('Search is unavailable right now. You can still move the map.')
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function choose(place: PlaceResult) {
    chosen.current = place.label
    setQuery(place.label)
    setOpen(false)
    setResults([])
    setMessage('')
    onSelect(place)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault()
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1))
    } else if (event.key === 'Enter' && open && results[active]) {
      event.preventDefault()
      choose(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const expanded = open && results.length > 0

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className={hideLabel ? 'sr-only' : 'text-caption text-ink-secondary'}>{label}</label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          if (event.target.value.trim().length < 3) {
            setResults([])
            setOpen(false)
            setMessage('')
          }
        }}
        onKeyDown={onKeyDown}
        className={inputClassName ?? 'mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3 text-body-sm text-ink placeholder:text-ink-disabled focus-visible:outline-2 focus-visible:outline-focus'}
      />
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label="Places"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-control border border-line bg-surface py-1 shadow-lg"
      >
        {results.map((place, index) => (
          <li
            key={place.id}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(place)}
            className={cn('cursor-pointer px-3 py-2', index === active ? 'bg-muted-fill' : 'hover:bg-surface-hover')}
          >
            <span className="block text-body-sm text-ink">{place.label}</span>
            <span className="block text-caption text-ink-secondary">{place.detail}</span>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-1 min-h-4 text-caption text-ink-secondary">{message}</p>
    </div>
  )
}
