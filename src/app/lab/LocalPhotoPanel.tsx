import { useEffect, useMemo, useState } from 'react'
import { checkboxClass, labelClass, rangeClass, textButtonSmClass } from '../../components/ui/controls'
import { DEFAULT_ALIGNMENT, findLocalPhoto, greyPixels, loadAlignment, photoRect, saveAlignment, type PhotoAlignment } from './localPhoto'

/** Longest side of the greyed photo canvas, px (GPU texture limits on every reasonable machine). */
const MAX_SIDE_PX = 4096

export const LOCAL_PHOTO_CREDIT = 'Aerial photo © Norge i bilder (Kartverket, Geovekst) — local preview only, not published'

/**
 * Finds the owner's local aerial photo for a site, keeps its alignment (remembered in this
 * browser), and returns the greyed canvas + ground rectangle for ViewportCanvas.groundPhoto.
 */
export function useLocalPhoto(siteId: string, tileWidthM: number) {
  const [url, setUrl] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [alignment, setAlignmentState] = useState<PhotoAlignment>(() => loadAlignment(siteId) ?? DEFAULT_ALIGNMENT(tileWidthM))

  useEffect(() => {
    let cancelled = false
    void findLocalPhoto(siteId).then((found) => { if (!cancelled) setUrl(found) })
    return () => { cancelled = true }
  }, [siteId])

  useEffect(() => {
    if (!url) { setImage(null); return }
    const img = new Image()
    let cancelled = false
    img.onload = () => { if (!cancelled) setImage(img) }
    img.src = url
    return () => { cancelled = true }
  }, [url])

  const setAlignment = (next: PhotoAlignment) => {
    setAlignmentState(next)
    saveAlignment(siteId, next)
  }

  // Grey once per image / colour / brightness change (a few tens of ms at 4096 px).
  const canvas = useMemo(() => {
    if (!image) return null
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(image.naturalWidth, image.naturalHeight))
    const out = document.createElement('canvas')
    out.width = Math.round(image.naturalWidth * scale)
    out.height = Math.round(image.naturalHeight * scale)
    const context = out.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, out.width, out.height)
    const pixels = context.getImageData(0, 0, out.width, out.height)
    greyPixels(pixels.data, alignment.keepColour, alignment.brightness)
    context.putImageData(pixels, 0, 0)
    return out
  }, [image, alignment.keepColour, alignment.brightness])

  const groundPhoto = useMemo(() => {
    if (!canvas || !image || !alignment.enabled) return null
    return { canvas, rect: photoRect(alignment, image.naturalWidth / image.naturalHeight) }
  }, [canvas, image, alignment])

  return { found: url !== null, url, alignment, setAlignment, reset: () => setAlignment(DEFAULT_ALIGNMENT(tileWidthM)), groundPhoto }
}

type Slider = { key: keyof Omit<PhotoAlignment, 'enabled'>; label: string; min: number; max: number; step: number; unit: string }

const SLIDERS: readonly Slider[] = [
  { key: 'offsetE', label: 'Move east', min: -400, max: 400, step: 1, unit: ' m' },
  { key: 'offsetN', label: 'Move north', min: -400, max: 400, step: 1, unit: ' m' },
  { key: 'widthM', label: 'Photo width', min: 100, max: 3000, step: 1, unit: ' m' },
  { key: 'keepColour', label: 'Colour kept', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.6, step: 0.05, unit: '×' },
]

/** The Lab's small card for the local photo: show/hide, line it up, grey it, credit it. */
export function LocalPhotoPanel({ siteId, photo }: { siteId: string; photo: ReturnType<typeof useLocalPhoto> }) {
  return (
    <details open className="w-72 rounded-card border border-card-line bg-card/95 p-3 text-ink shadow-card backdrop-blur">
      <summary className="cursor-pointer text-body-sm text-ink">Aerial photo (local)</summary>
      {!photo.found ? (
        <p className={`${labelClass} mt-2`}>
          No photo found. Save a north-up screenshot from norgeibilder.no as <code>public/local-ortho/{siteId}.png</code> (or .jpg/.webp) and reload.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" className={checkboxClass} checked={photo.alignment.enabled} onChange={(event) => photo.setAlignment({ ...photo.alignment, enabled: event.currentTarget.checked })} />
            Show photo on the ground
          </label>
          <p className={labelClass}>Line the white buildings up with the roofs in the photo.</p>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="block">
              <span className={`${labelClass} flex justify-between`}>
                <span>{slider.label}</span>
                <span>{photo.alignment[slider.key]}{slider.unit}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={photo.alignment[slider.key]}
                aria-label={`Photo ${slider.label}`}
                className={rangeClass}
                onChange={(event) => photo.setAlignment({ ...photo.alignment, [slider.key]: Number(event.currentTarget.value) })}
              />
            </label>
          ))}
          <button type="button" className={textButtonSmClass} onClick={photo.reset}>Reset</button>
        </div>
      )}
      <p className={`${labelClass} mt-2`}>{LOCAL_PHOTO_CREDIT}</p>
    </details>
  )
}
