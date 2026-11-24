import { CanvasTexture, RepeatWrapping } from 'three'

/**
 * A code-generated alpha map for the identity crowns (Run 9 T5, reworked in visuals plan V4). The
 * green channel carries alpha, which three.js reads with `alphaMap`; with `alphaHash` it needs no
 * sorting. Run 9 used per-texel noise between 0.62 and 1, which averaged into a solid crown at any
 * distance. This one is blotchy value noise: leaf clusters with real holes plus a little fine grain,
 * so the ground shows through at the city view too.
 */
export function createSpeckleAlphaTexture(size = 128, seed = 7): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  const alpha = speckleAlpha(size, seed)
  const image = context.createImageData(size, size)
  for (let index = 0; index < size * size; index += 1) {
    const p = index * 4
    image.data[p] = 255
    image.data[p + 1] = Math.round(alpha[index]! * 255)
    image.data[p + 2] = 255
    image.data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}

/** Pure, tileable alpha values 0–1 (row-major), deterministic for a seed. */
export function speckleAlpha(size: number, seed: number, cells = 8): Float32Array {
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000
  }
  const lattice = Array.from({ length: cells * cells }, random)
  const at = (x: number, y: number) => lattice[((y + cells) % cells) * cells + ((x + cells) % cells)]!
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * cells, fy = (y / size) * cells
      const x0 = Math.floor(fx), y0 = Math.floor(fy)
      const tx = smooth(fx - x0), ty = smooth(fy - y0)
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx
      const blotch = top * (1 - ty) + bottom * ty
      // Threshold the blotches into clusters and holes (provisional), then grain inside clusters.
      const cluster = Math.min(1, Math.max(0, (blotch - 0.3) / 0.16))
      out[y * size + x] = cluster * (0.8 + random() * 0.2)
    }
  }
  return out
}
