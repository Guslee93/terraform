import { Color } from 'three'

/** Share of saturation the scene keeps (draft 4: colour stays, but quiet behind the UI). */
export const SCENE_SATURATION = 0.6

/** Same hue and lightness, saturation scaled by `SCENE_SATURATION`. One knob for every scene tint. */
export function soften(hex: string, keep: number = SCENE_SATURATION): string {
  const color = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  return `#${color.setHSL(hsl.h, hsl.s * keep, hsl.l).getHexString().toUpperCase()}`
}
