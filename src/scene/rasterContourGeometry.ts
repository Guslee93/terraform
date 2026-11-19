import { BufferGeometry, Float32BufferAttribute } from 'three'
import { CONTOUR_LIFT } from './siteGeometry'

/**
 * The 1 m-tile contours (flat `[ax, ay, bx, by]` per segment from the worker), placed on the drawn
 * 16 m terrain: each vertex's elevation is re-sampled through `heightAt` (the same height function
 * the 16 m mesh uses) and lifted by the same `CONTOUR_LIFT` the 16 m contours use, so the finer
 * lines never float or sink where the 1 m tile differs from the 16 m mesh. Lives in its own module
 * so the 1 m path can be lazy-loaded out of production (Run 8 T3).
 */
export function createRasterContourGeometry(
  flat: Float32Array,
  heightAt: (east: number, north: number) => number,
  slopeAt: (east: number, north: number) => number = () => 0,
): BufferGeometry {
  const positions: number[] = []
  const slopes: number[] = []
  for (let index = 0; index + 3 < flat.length; index += 4) {
    const ax = flat[index]!
    const ay = flat[index + 1]!
    const bx = flat[index + 2]!
    const by = flat[index + 3]!
    positions.push(ax, heightAt(ax, ay) + CONTOUR_LIFT, -ay, bx, heightAt(bx, by) + CONTOUR_LIFT, -by)
    slopes.push(slopeAt(ax, ay), slopeAt(bx, by))
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('slope', new Float32BufferAttribute(slopes, 1))
  return geometry
}
