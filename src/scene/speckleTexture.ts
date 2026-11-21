import { CanvasTexture, RepeatWrapping } from 'three'

/**
 * A code-generated speckle alpha map (Run 9 T5): fine random speckles in the green channel, which
 * three.js reads as the material alpha. Combined with `alphaHash` it makes the crown see-through
 * without alpha sorting, so the ground shows through and forests read as connected bodies.
 */
export function createSpeckleAlphaTexture(size = 128): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  const image = context.createImageData(size, size)
  for (let index = 0; index < size * size; index += 1) {
    const p = index * 4
    // Green channel carries alpha; ~30 % of texels fall back to near-transparent speckles.
    const speckle = 0.62 + Math.random() * 0.38
    image.data[p] = 255
    image.data[p + 1] = Math.round(speckle * 255)
    image.data[p + 2] = 255
    image.data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
