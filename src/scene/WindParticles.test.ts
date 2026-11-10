import { OrthographicCamera, PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { MAX_PARTICLES, metresPerPixel, MIN_PARTICLES, nextParticleCount, PARTICLE_LIFT_M, TRAIL_BUDGET_MS, trailDensity } from './WindParticles'

describe('wind trail budget', () => {
  it('sheds a quarter of the trails when their own update runs over budget, down to a floor', () => {
    expect(nextParticleCount(4000, TRAIL_BUDGET_MS + 1)).toBe(3000)
    expect(nextParticleCount(1300, TRAIL_BUDGET_MS + 1)).toBe(MIN_PARTICLES)
    expect(nextParticleCount(MIN_PARTICLES, 20)).toBe(MIN_PARTICLES)
  })

  it('holds steady in the comfortable band and recovers slowly with headroom', () => {
    expect(nextParticleCount(3000, 2)).toBe(3000)
    expect(nextParticleCount(2000, 0.5)).toBe(2200)
    expect(nextParticleCount(3900, 0.5)).toBe(MAX_PARTICLES)
  })

  it('flies the trails at head height, not on the ground', () => {
    expect(PARTICLE_LIFT_M).toBeGreaterThanOrEqual(1)
    expect(PARTICLE_LIFT_M).toBeLessThanOrEqual(2)
  })
})

describe('trail width on screen', () => {
  it('scales with distance for a perspective camera', () => {
    const camera = new PerspectiveCamera(90, 1, 0.1, 1000) // tan(45°) = 1
    expect(metresPerPixel(camera, 100, 1000)).toBeCloseTo(0.2)
    expect(metresPerPixel(camera, 200, 1000)).toBeCloseTo(0.4)
  })

  it('depends only on zoom for an orthographic camera', () => {
    const camera = new OrthographicCamera(-50, 50, 50, -50, 0.1, 1000)
    camera.zoom = 2
    expect(metresPerPixel(camera, 999, 500)).toBeCloseTo(0.1)
  })
})

describe('trail density with zoom', () => {
  it('shows every trail when the ribbons are thin on the ground, fewer as they widen', () => {
    expect(trailDensity(0.2)).toBe(1)
    expect(trailDensity(0.36)).toBe(1)
    expect(trailDensity(0.72)).toBeCloseTo(0.5)
    expect(trailDensity(10)).toBe(0.25)
  })
})
