import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, MeshBasicMaterial, type Camera, type OrthographicCamera, type PerspectiveCamera } from 'three'
import { particleColour, type WindSettings } from '../features/analysis/climateView'
import type { FlowResult } from '../features/analysis/flowRunner'
import { advect, smoothVelocity } from '../features/analysis/particles'
import type { Vec2 } from '../lib/coordinates'

/** Most trails drawn at once; the frame-time guard below lowers the live count on slow machines. */
export const MAX_PARTICLES = 4000
export const MIN_PARTICLES = 1200
/** Points kept per trail, and how often the trail advances: 15 links × 70 ms ≈ 1 s of travel. */
const TRAIL = 16
const TRAIL_STEP_S = 0.07
const SPEED_MS = 16 // visual speed of undisturbed flow, metres per second on screen
const LIFE_S = 7
/** Trail width on screen (CSS px). Ribbons, not GL lines: those are one device pixel and vanish on dense displays. */
const WIDTH_PX = 0.9
/** Ribbon width (m) at which every trail is shown; wider (zoomed out) shows proportionally fewer, so they never merge into a wash. */
const FULL_DENSITY_WIDTH_M = 0.36
/** Time the trail update may take per frame before trails are shed, and the level at which they return. */
export const TRAIL_BUDGET_MS = 3
const TRAIL_HEADROOM_MS = 1.4
/** Height of the trails above the ground. */
export const PARTICLE_LIFT_M = 2
/** Trails are drawn darker than the map colour under them so they read on the pale heatmap. */
const INK = 0.55
const STALL_RATIO = 0.02
/** Speed-ratio steps in the colour lookup (0–3 × the free wind). */
const LUT_STEP = 0.025
const LUT_SIZE = 121
const noRaycast = () => null

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Next live particle count from what the trail update itself cost per frame (not the whole frame:
 * a heavy scene must not strip the trails, and the trails must not be what makes a scene heavy).
 */
export function nextParticleCount(active: number, updateMs: number): number {
  if (updateMs > TRAIL_BUDGET_MS) return Math.max(MIN_PARTICLES, Math.floor(active * 0.75))
  if (updateMs < TRAIL_HEADROOM_MS) return Math.min(MAX_PARTICLES, Math.ceil(active * 1.1))
  return active
}

/** Share of the live trails to draw for a ribbon this wide on the ground (m): all of them when thin, fewer as they widen. */
export function trailDensity(widthM: number): number {
  return Math.min(1, Math.max(0.25, FULL_DENSITY_WIDTH_M / widthM))
}

/** Ground metres covered by one CSS pixel at `distance` from the camera. */
export function metresPerPixel(camera: Camera, distance: number, viewportHeightPx: number): number {
  const ortho = camera as OrthographicCamera
  if (ortho.isOrthographicCamera) return (ortho.top - ortho.bottom) / ortho.zoom / viewportHeightPx
  const fov = (camera as PerspectiveCamera).fov ?? 50
  return (2 * distance * Math.tan((fov * Math.PI) / 360)) / viewportHeightPx
}

/**
 * Wind trails: each particle is carried through the flow (interpolated, midpoint steps) and drags a
 * fading tail of its last positions, so the lines curve with the wind round the buildings. Under
 * reduced motion the trails are traced once and stay still.
 */
export function WindParticles({ flow, circle, heightAt, wind }: {
  flow: FlowResult
  /** Display settings: particles use the same colour scale as the map. */
  wind: WindSettings
  circle: { readonly centre: Vec2; readonly radius: number }
  heightAt: (east: number, north: number) => number
}) {
  const [still] = useState(reducedMotion)
  const state = useMemo(() => ({
    pos: new Float32Array(MAX_PARTICLES * 2), // head, local ENU east/north
    head: new Float32Array(MAX_PARTICLES * 6), // head in scene coordinates: left and right edge of the ribbon
    ink: new Float32Array(MAX_PARTICLES * 3), // head colour
    age: new Float32Array(MAX_PARTICLES),
    dying: new Uint8Array(MAX_PARTICLES), // trail steps left while the tail retracts into the head
    v: new Float32Array(2),
    limit: still ? MIN_PARTICLES : MAX_PARTICLES, // most trails the budget allows
    shown: 0, // trails simulated and drawn right now (limit × zoom density)
    sinceStep: 0,
    frames: 0,
    costMs: 0,
    halfWidth: 0.4,
  }), [still])

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    // Two vertices (left and right edge) per trail point, joined into a ribbon of quads.
    const vertices = MAX_PARTICLES * TRAIL * 2
    const position = new BufferAttribute(new Float32Array(vertices * 3), 3)
    const colour = new BufferAttribute(new Float32Array(vertices * 3), 3)
    position.setUsage(DynamicDrawUsage)
    colour.setUsage(DynamicDrawUsage)
    // The tail end is transparent and the head opaque; this never changes, only positions do.
    const fade = new Float32Array(vertices)
    const index = new Uint32Array(MAX_PARTICLES * (TRAIL - 1) * 6)
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      for (let k = 0; k < TRAIL; k += 1) {
        const left = (i * TRAIL + k) * 2
        fade[left] = fade[left + 1] = (k / (TRAIL - 1)) ** 1.5
        if (k < TRAIL - 1) index.set([left, left + 1, left + 2, left + 1, left + 3, left + 2], (i * (TRAIL - 1) + k) * 6)
      }
    }
    g.setAttribute('position', position)
    g.setAttribute('color', colour)
    g.setAttribute('fade', new BufferAttribute(fade, 1))
    g.setIndex(new BufferAttribute(index, 1))
    return g
  }, [])
  const material = useMemo(() => {
    const mat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: DoubleSide, toneMapped: false })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = 'attribute float fade;\nvarying float trailFade;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntrailFade = fade;')
      shader.fragmentShader = 'varying float trailFade;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= trailFade;')
    }
    mat.customProgramCacheKey = () => 'wind-trails'
    return mat
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  // Parsing a colour string per particle per frame is the costly part; look it up instead.
  const lut = useMemo(() => {
    const table = new Float32Array(LUT_SIZE * 3)
    const colour = new Color()
    for (let step = 0; step < LUT_SIZE; step += 1) {
      colour.set(particleColour(step * LUT_STEP, wind))
      table.set([colour.r * INK, colour.g * INK, colour.b * INK], step * 3)
    }
    return table
  }, [wind])

  const { frame } = flow
  const { centre, radius } = circle
  const position = geometry.getAttribute('position') as BufferAttribute
  const colour = geometry.getAttribute('color') as BufferAttribute
  const positions = position.array as Float32Array
  const colours = colour.array as Float32Array

  /** Ribbon edges and colour of particle `i`'s head from its ENU position, velocity and speed ratio. */
  const setHead = (i: number, vx: number, vy: number, ratio: number) => {
    const x = state.pos[2 * i]!, y = state.pos[2 * i + 1]!
    const up = heightAt(x, y) + PARTICLE_LIFT_M
    // Half the ribbon width across the wind: ENU (−vy, vx), scene x = east, z = −north.
    const speed = Math.hypot(vx, vy) || 1
    const ax = (-vy / speed) * state.halfWidth, ay = (vx / speed) * state.halfWidth
    state.head.set([x + ax, up, -(y + ay), x - ax, up, -(y - ay)], 6 * i)
    const entry = Math.min(LUT_SIZE - 1, Math.round(ratio / LUT_STEP)) * 3
    state.ink[3 * i] = lut[entry]!
    state.ink[3 * i + 1] = lut[entry + 1]!
    state.ink[3 * i + 2] = lut[entry + 2]!
  }
  const writeSlot = (i: number, k: number) => {
    const at = (i * TRAIL + k) * 6
    for (let n = 0; n < 6; n += 1) {
      positions[at + n] = state.head[6 * i + n]!
      colours[at + n] = state.ink[3 * i + (n % 3)]!
    }
  }
  /** A fresh particle somewhere open in the circle, with a zero-length trail that then grows. */
  const spawn = (i: number, age: number) => {
    let ratio = 0
    // A few tries so most particles start in moving air, not inside a building.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const a = Math.random() * 2 * Math.PI
      const r = radius * Math.sqrt(Math.random())
      state.pos[2 * i] = centre[0] + r * Math.cos(a)
      state.pos[2 * i + 1] = centre[1] + r * Math.sin(a)
      if (smoothVelocity(frame, flow.velocity, flow.solid, state.pos[2 * i]!, state.pos[2 * i + 1]!, state.v)) {
        ratio = Math.hypot(state.v[0]!, state.v[1]!)
        if (ratio >= STALL_RATIO) break
      }
    }
    state.age[i] = age
    state.dying[i] = 0
    setHead(i, state.v[0]!, state.v[1]!, ratio)
    for (let k = 0; k < TRAIL; k += 1) writeSlot(i, k)
  }

  const animate = (dt: number) => {
    state.sinceStep += dt
    const step = state.sinceStep >= TRAIL_STEP_S
    if (step) {
      state.sinceStep %= TRAIL_STEP_S
      // Every trail moves one slot towards its tail in a single memory move; heads are rewritten below.
      positions.copyWithin(0, 6)
      colours.copyWithin(0, 6)
    }
    for (let i = 0; i < state.shown; i += 1) {
      if (state.dying[i]! > 0) {
        // The head has stopped; the tail catches up with it, then the particle starts again.
        if (step && (state.dying[i]! -= 1) === 0) spawn(i, 0)
      } else {
        state.age[i]! += dt
        const ratio = advect(frame, flow.velocity, flow.solid, state.pos, 2 * i, SPEED_MS * dt, state.v)
        const gone = Math.hypot(state.pos[2 * i]! - centre[0], state.pos[2 * i + 1]! - centre[1]) > radius
        if (ratio < STALL_RATIO || gone || state.age[i]! > LIFE_S) state.dying[i] = TRAIL - 1
        else setHead(i, state.v[0]!, state.v[1]!, ratio)
      }
      writeSlot(i, TRAIL - 1)
    }
    position.needsUpdate = true
    if (step) colour.needsUpdate = true
  }

  /** Reduced motion: each trail is traced downwind once and left in place. */
  const trace = () => {
    for (let i = 0; i < state.shown; i += 1) {
      spawn(i, 0)
      for (let k = 1; k < TRAIL; k += 1) {
        const ratio = advect(frame, flow.velocity, flow.solid, state.pos, 2 * i, SPEED_MS * TRAIL_STEP_S, state.v)
        if (ratio >= STALL_RATIO && Math.hypot(state.pos[2 * i]! - centre[0], state.pos[2 * i + 1]! - centre[1]) <= radius) setHead(i, state.v[0]!, state.v[1]!, ratio)
        for (let rest = k; rest < TRAIL; rest += 1) writeSlot(i, rest)
      }
    }
    position.needsUpdate = true
    colour.needsUpdate = true
  }

  /** Brings the drawn count to `target`; trails joining the set start fresh at staggered ages. */
  const show = (target: number) => {
    for (let i = state.shown; i < target; i += 1) spawn(i, Math.random() * LIFE_S)
    state.shown = target
    geometry.setDrawRange(0, target * (TRAIL - 1) * 6)
  }
  useEffect(() => {
    show(Math.floor(state.limit * (still ? 1 : trailDensity(state.halfWidth * 2))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (still) trace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, still])

  useFrame(({ camera, size }, delta) => {
    if (still) return
    // Constant width on screen: sized for the distance to the circle, baked into each new trail point.
    const distance = Math.hypot(camera.position.x - centre[0], camera.position.y - heightAt(centre[0], centre[1]), camera.position.z + centre[1])
    state.halfWidth = Math.min(1.5, Math.max(0.03, (metresPerPixel(camera, distance, size.height) * WIDTH_PX) / 2))
    const started = performance.now()
    animate(Math.min(delta, 0.05))
    // Budget guard on the trails' own cost, so they never become what slows the page down.
    state.costMs += performance.now() - started
    state.frames += 1
    if (state.frames >= 45) {
      // Cost is judged per shown trail, so zooming out (fewer shown) does not read as headroom.
      const perTrail = state.costMs / state.frames / Math.max(1, state.shown)
      state.limit = nextParticleCount(state.limit, perTrail * state.limit)
      state.frames = 0
      state.costMs = 0
    }
    const target = Math.floor(state.limit * trailDensity(state.halfWidth * 2))
    if (target !== state.shown) show(target)
  })

  return <mesh geometry={geometry} material={material} raycast={noRaycast} renderOrder={3} frustumCulled={false} />
}
