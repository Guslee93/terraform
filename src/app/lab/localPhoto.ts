/**
 * Local aerial-photo preview (visuals plan V2a/V2b), Visual Lab only.
 *
 * The owner drops a screenshot from norgeibilder.no into the git-ignored folder
 * `public/local-ortho/<siteId>.<png|jpg|jpeg|webp>`. Kartverket's terms allow screenshots with
 * credit; draping them on our terrain and publishing them needs permission
 * (docs/data/orthophoto-source.md), so this never leaves the owner's machine: the folder is
 * git-ignored and nothing here is part of a site package.
 */

/** Where the photo lies on the ground, in local ENU metres (north up, like the screenshot). */
export type PhotoAlignment = {
  /** Photo centre, metres east / north of the site origin. */
  readonly offsetE: number
  readonly offsetN: number
  /** Ground width the photo covers, metres; the height follows the image's aspect ratio. */
  readonly widthM: number
  /** Kept colour, 0–1 (0.2 = 80 % desaturated, the look spec's default). */
  readonly keepColour: number
  /** Brightness multiplier. */
  readonly brightness: number
  readonly enabled: boolean
}

export const DEFAULT_ALIGNMENT = (tileWidthM: number): PhotoAlignment => ({
  offsetE: 0,
  offsetN: 0,
  widthM: Math.round(tileWidthM),
  keepColour: 1,
  brightness: 1,
  enabled: true,
})

import type { Extent } from '../../scene/photoPlacement'

export { photoTextureTransform } from '../../scene/photoPlacement'

/** The ground rectangle the photo covers. */
export function photoRect(alignment: PhotoAlignment, imageAspect: number): Extent {
  const height = alignment.widthM / imageAspect
  return {
    minX: alignment.offsetE - alignment.widthM / 2,
    maxX: alignment.offsetE + alignment.widthM / 2,
    minY: alignment.offsetN - height / 2,
    maxY: alignment.offsetN + height / 2,
  }
}

/**
 * Grey the photo in place (RGBA bytes): mix each pixel toward its luminance, keeping `keepColour`
 * of the colour, then scale by `brightness`. The look spec asks for ≈ 80 % desaturation.
 */
export function greyPixels(data: Uint8ClampedArray, keepColour: number, brightness: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    data[i] = (y + keepColour * (r - y)) * brightness
    data[i + 1] = (y + keepColour * (g - y)) * brightness
    data[i + 2] = (y + keepColour * (b - y)) * brightness
  }
}

const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const

/**
 * Find `public/local-ortho/<siteId>.*`. The dev server answers a missing file with the app's
 * index.html (status 200), so only an `image/*` content type counts as found.
 */
export async function findLocalPhoto(siteId: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  for (const ext of EXTENSIONS) {
    const url = `/local-ortho/${siteId}.${ext}`
    try {
      const response = await fetchImpl(url, { method: 'HEAD' })
      if (response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')) return url
    } catch {
      // Network error: treat as absent and try the next extension.
    }
  }
  return null
}

const storageKey = (siteId: string) => `terraform.lab.localPhoto.${siteId}`

/** The saved alignment for a site, or null (private mode, cleared storage, bad data). */
export function loadAlignment(siteId: string): PhotoAlignment | null {
  try {
    const raw = window.localStorage.getItem(storageKey(siteId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PhotoAlignment>
    const numbers = ['offsetE', 'offsetN', 'widthM', 'keepColour', 'brightness'] as const
    if (!numbers.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) return null
    if (typeof value.enabled !== 'boolean') return null
    return value as PhotoAlignment
  } catch {
    return null
  }
}

export function saveAlignment(siteId: string, alignment: PhotoAlignment): void {
  try {
    window.localStorage.setItem(storageKey(siteId), JSON.stringify(alignment))
  } catch {
    // Storage unavailable: the alignment simply is not remembered.
  }
}
