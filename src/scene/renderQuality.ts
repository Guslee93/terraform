import { isSoftwareRenderer } from './rendererTier'

export type RenderProfile = 'high' | 'balanced' | 'low'
export type RenderPreference = 'auto' | RenderProfile

export const RENDER_QUALITY_KEY = 'terraform.renderQuality'

export const RENDER_PROFILES = {
  high: { shadowMapSize: 4096, shadows: true, ambientOcclusion: true },
  balanced: { shadowMapSize: 2048, shadows: true, ambientOcclusion: false },
  low: { shadowMapSize: undefined, shadows: false, ambientOcclusion: false },
} satisfies Record<RenderProfile, {
  shadowMapSize: number | undefined
  shadows: boolean
  ambientOcclusion: boolean
}>

export function isRenderPreference(value: unknown): value is RenderPreference {
  return value === 'auto' || value === 'high' || value === 'balanced' || value === 'low'
}

export function resolveProfile(preference: RenderPreference, rendererName: string): RenderProfile {
  return preference === 'auto' ? (isSoftwareRenderer(rendererName) ? 'low' : 'high') : preference
}

export function readRenderPreference(): RenderPreference {
  try {
    const value = window.localStorage.getItem(RENDER_QUALITY_KEY)
    return isRenderPreference(value) ? value : 'auto'
  } catch {
    return 'auto'
  }
}

/** Return the effective preference so blocked storage also falls back to Auto in the UI. */
export function writeRenderPreference(preference: RenderPreference): RenderPreference {
  try {
    window.localStorage.setItem(RENDER_QUALITY_KEY, preference)
    return preference
  } catch {
    return 'auto'
  }
}
