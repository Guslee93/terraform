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

/**
 * Scale a colour's HSL lightness by `factor` (1 = unchanged, <1 darker, >1 lighter), keeping hue and
 * saturation. Pure; used by the identity tuning controls (Run 8 T4).
 */
export function adjustLightness(hex: string, factor: number): string {
  const color = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  color.setHSL(hsl.h, hsl.s, hsl.l * factor)
  return `#${color.getHexString().toUpperCase()}`
}

/**
 * The scene colour that DISPLAYS as `hex` after the composer's exposure and neutral tone mapping
 * (three's `NeutralToneMapping`, Khronos PBR Neutral). That tone mapper subtracts a toe offset equal
 * to roughly the weakest channel, which darkens a dark grey-green and crushes its red into a
 * saturated green. Inverting it means the identity's background and haze show the colour the look
 * spec (or the owner's slider) asked for. Valid below the highlight-compression knee (peak < 0.76),
 * which every haze/background colour is; brighter inputs are returned unchanged.
 */
export function sceneColourForDisplay(hex: string, exposure: number): string {
  const want = new Color(hex) // linear working space
  const outMin = Math.min(want.r, want.g, want.b)
  if (Math.max(want.r, want.g, want.b) >= 0.76) return hex
  // Forward: x = min(in·e); offset = x < 0.08 ? x − 6.25x² : 0.04; out = in·e − offset.
  // So out_min = 6.25x² when x < 0.08 (out_min < 0.04), else x − 0.04.
  const x = outMin < 0.04 ? Math.sqrt(outMin / 6.25) : outMin + 0.04
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04
  const scene = new Color((want.r + offset) / exposure, (want.g + offset) / exposure, (want.b + offset) / exposure)
  return `#${scene.getHexString().toUpperCase()}`
}
