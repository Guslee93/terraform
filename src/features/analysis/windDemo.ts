/** Scripted 20 s wind demo for screen recording (C22). Pure: time in, settings out. */
export type DemoFrame = { readonly from: number; readonly orbitDeg: number; readonly streamlines: boolean; readonly done: boolean }

export const DEMO_SECONDS = 20
const SWEEP_START = 3
const STEP_DEG = 15
const STEPS = 12 // 270° → 450° (= 90°), one 15° step per second between 3 s and 15 s
const STREAMLINES_AT = 15
const ORBIT_DEG = 40
const REDUCED = { directions: [270, 0, 90, 180], holdSeconds: 3 } as const

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

export function demoFrame(t: number, reducedMotion = false): DemoFrame {
  if (reducedMotion) {
    const i = Math.floor(t / REDUCED.holdSeconds)
    const done = i >= REDUCED.directions.length
    return { from: REDUCED.directions[Math.min(i, REDUCED.directions.length - 1)]!, orbitDeg: 0, streamlines: false, done }
  }
  const steps = t < SWEEP_START ? 0 : Math.min(STEPS, Math.floor(t - SWEEP_START))
  const clamped = Math.min(Math.max(t / DEMO_SECONDS, 0), 1)
  return {
    from: 270 + steps * STEP_DEG,
    orbitDeg: ORBIT_DEG * easeInOut(clamped),
    streamlines: t >= STREAMLINES_AT,
    done: t >= DEMO_SECONDS,
  }
}
