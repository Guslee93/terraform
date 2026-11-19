import { Color } from 'three'

/** How a style transforms ground colours (land-cover paint and terrain vertex colours). */
export type GroundTint = { readonly saturation: number; readonly lightness: number }

/**
 * Pure ground-colour transform (TF-VIS-020). Scales HSL saturation and lightness by the tint's
 * factors; `null` is today's identity (the colour is returned unchanged). `saturation` is the
 * *kept* chroma fraction — 0.2 means "desaturated by 0.8" — and `lightness` the kept lightness
 * fraction (0.5 halves it). It is applied to both the land-cover paint and the terrain vertex
 * colours, which the terrain material multiplies, so a single factor acts twice in the shader.
 */
export function tintGroundColour(hex: string, tint: GroundTint | null): string {
  if (!tint) return hex
  const color = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  color.setHSL(hsl.h, hsl.s * tint.saturation, hsl.l * tint.lightness)
  return `#${color.getHexString().toUpperCase()}`
}
