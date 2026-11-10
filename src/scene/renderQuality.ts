import { isSoftwareRenderer } from './rendererTier'

export type RenderProfile = 'high' | 'balanced' | 'low'
export type RenderPreference = 'auto' | RenderProfile

export const RENDER_QUALITY_KEY = 'terraform.renderQuality'

/** Rendering spec tiers (ADR-0018): Balanced is the spec's Medium. */
export const RENDER_PROFILES = {
  high: { shadowMapSize: 4096, shadows: true, ambientOcclusion: 'full' },
  balanced: { shadowMapSize: 2048, shadows: true, ambientOcclusion: 'half' },
  low: { shadowMapSize: undefined, shadows: false, ambientOcclusion: false },
} satisfies Record<RenderProfile, {
  shadowMapSize: number | undefined
  shadows: boolean
  ambientOcclusion: 'full' | 'half' | false
}>

const LOWER: Record<RenderProfile, RenderProfile> = { high: 'balanced', balanced: 'low', low: 'low' }

/** The profile `steps` tiers below `profile`, never below Low. */
export function downgrade(profile: RenderProfile, steps: number): RenderProfile {
  let result = profile
  for (let i = 0; i < steps; i++) result = LOWER[result]
  return result
}

/** 30 fps budget and the window it must hold over before a drop (rendering spec). */
export const FRAME_BUDGET_MS = 33
export const FRAME_WINDOW_S = 3
/** Deltas above this are a hidden tab or a one-off hitch, not sustained load. */
const MAX_SAMPLE_S = 0.25

/**
 * Feed it frame deltas (seconds). Returns true when a full window's mean frame time is over
 * budget. The first window is skipped (shader compile and texture upload make it slow).
 */
export function createFrameBudget(budgetMs = FRAME_BUDGET_MS, windowS = FRAME_WINDOW_S) {
  let total = 0
  let frames = 0
  let warm = false
  return (delta: number): boolean => {
    if (delta > MAX_SAMPLE_S) return false
    total += delta
    frames += 1
    if (total < windowS) return false
    const slow = warm && (total / frames) * 1000 > budgetMs
    warm = true
    total = 0
    frames = 0
    return slow
  }
}

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
