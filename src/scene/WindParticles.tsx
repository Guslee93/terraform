import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import { speedBand } from '../features/analysis/climateView'
import type { FlowResult } from '../features/analysis/flowRunner'
import { sampleVelocity } from '../features/analysis/lbm'
import { enuToThreeXyz } from '../lib/coordinates'

// ponytail: fixed particle count; make it adapt to frame time if low-end GPUs stutter.
const COUNT = 2500
const SPEED_MS = 18 // visual speed of undisturbed flow, metres per second on screen
const TAIL_S = 0.35 // comet tail length in seconds of travel
const LIFE_S = 6
const LIFT_M = 1.5
const noRaycast = () => null

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Short moving segments advected through the 2D flow. Under reduced motion they stay still as flow arrows. */
export function WindParticles({ flow, heightAt }: { flow: FlowResult; heightAt: (east: number, north: number) => number }) {
  const [still] = useState(reducedMotion)
  const state = useMemo(() => ({ pos: new Float32Array(COUNT * 2), age: new Float32Array(COUNT) }), [])
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 6), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(COUNT * 6), 3))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const { frame } = flow
  const half = (frame.nx * frame.dx) / 2 / 1.3 // spawn over the study area, not the whole margin
  const spawn = (i: number) => {
    state.pos[2 * i] = frame.centre[0] + (Math.random() * 2 - 1) * half
    state.pos[2 * i + 1] = frame.centre[1] + (Math.random() * 2 - 1) * half
    state.age[i] = Math.random() * LIFE_S
  }

  const colour = useMemo(() => new Color(), [])
  const write = (dt: number) => {
    const p = geometry.getAttribute('position') as BufferAttribute
    const c = geometry.getAttribute('color') as BufferAttribute
    for (let i = 0; i < COUNT; i++) {
      let v = sampleVelocity(frame, flow.velocity, flow.solid, [state.pos[2 * i]!, state.pos[2 * i + 1]!])
      state.age[i]! += dt
      if (!v || state.age[i]! > LIFE_S || Math.hypot(v[0], v[1]) < 0.02) {
        spawn(i)
        v = sampleVelocity(frame, flow.velocity, flow.solid, [state.pos[2 * i]!, state.pos[2 * i + 1]!]) ?? [0, 0]
      }
      const x = (state.pos[2 * i]! += v[0] * SPEED_MS * dt)
      const y = (state.pos[2 * i + 1]! += v[1] * SPEED_MS * dt)
      const z = heightAt(x, y) + LIFT_M
      const head = enuToThreeXyz([x, y, z])
      const tail = enuToThreeXyz([x - v[0] * SPEED_MS * TAIL_S, y - v[1] * SPEED_MS * TAIL_S, z])
      p.setXYZ(2 * i, tail[0], tail[1], tail[2])
      p.setXYZ(2 * i + 1, head[0], head[1], head[2])
      colour.set(speedBand(Math.hypot(v[0], v[1])).colour)
      c.setXYZ(2 * i, colour.r * 0.35, colour.g * 0.35, colour.b * 0.35)
      c.setXYZ(2 * i + 1, colour.r, colour.g, colour.b)
    }
    p.needsUpdate = true
    c.needsUpdate = true
  }

  // Seed once; under reduced motion redraw the still arrows whenever the field changes.
  useEffect(() => {
    for (let i = 0; i < COUNT; i++) spawn(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (still) write(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, still])

  useFrame((_, delta) => {
    if (!still) write(Math.min(delta, 0.05))
  })

  return (
    <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={3} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
    </lineSegments>
  )
}
