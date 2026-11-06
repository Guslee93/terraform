import type { Vec2 } from '../../lib/coordinates'

/**
 * One drawn particle segment, clipped to the analysis circle (C23 finding 6). Pure, renderer-free.
 * `head` is the advected position; the tail trails `tailM` metres back along the velocity.
 * When the head has left the circle the particle must respawn and nothing is drawn; when only the
 * tail would poke out, the segment collapses onto the head (zero length).
 */
export function particleSegment(head: Vec2, velocity: Vec2, tailM: number, centre: Vec2, radius: number):
  { readonly tail: Vec2; readonly respawn: boolean } {
  const outside = (p: Vec2) => Math.hypot(p[0] - centre[0], p[1] - centre[1]) > radius
  const speed = Math.hypot(velocity[0], velocity[1])
  const tail: Vec2 = speed > 0 ? [head[0] - (velocity[0] / speed) * tailM, head[1] - (velocity[1] / speed) * tailM] : head
  if (outside(head)) return { tail: head, respawn: true }
  return { tail: outside(tail) ? head : tail, respawn: false }
}
