import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { RUNOFF_LEGEND, runoffClass, type Runoff } from '../features/analysis/runoff'
import type { TerrainData } from '../features/sites/package'
import { DrapedTexture } from './NoiseBands'

/**
 * RGBA bytes for the runoff screening, one pixel per raster cell, north row first: depressions as a
 * soft fill, flow paths as lines; a main flow path is drawn three cells wide so it reads at site scale.
 */
export function runoffPixels(runoff: Runoff): Uint8ClampedArray {
  const { cols, rows } = runoff
  const colours = RUNOFF_LEGEND.map((entry) => [1, 3, 5].map((at) => Number.parseInt(entry.colour.slice(at, at + 2), 16)) as [number, number, number])
  const pixels = new Uint8ClampedArray(cols * rows * 4)
  const paint = (index: number, kind: 1 | 2 | 3) => {
    const [r, g, b] = colours[kind - 1]!
    pixels.set([r, g, b, kind === 1 ? 170 : 255], index * 4)
  }
  const kinds = new Uint8Array(cols * rows)
  for (let index = 0; index < kinds.length; index += 1) kinds[index] = runoffClass(runoff, index)
  // Depressions first, then the paths over them, then the main paths widened over everything.
  for (const kind of [1, 2, 3] as const) {
    for (let index = 0; index < kinds.length; index += 1) {
      if (kinds[index] !== kind) continue
      paint(index, kind)
      if (kind !== 3) continue
      const row = Math.floor(index / cols), col = index - row * cols
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const r = row + dr, c = col + dc
        if (r >= 0 && c >= 0 && r < rows && c < cols && !runoff.building[r * cols + c]) paint(r * cols + c, 3)
      }
    }
  }
  return pixels
}

function createRunoffTexture(runoff: Runoff): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = runoff.cols
  canvas.height = runoff.rows
  const context = canvas.getContext('2d')
  if (!context) return null
  context.putImageData(new ImageData(runoffPixels(runoff) as Uint8ClampedArray<ArrayBuffer>, runoff.cols, runoff.rows), 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** The runoff screening draped on the terrain (ADR-0038), by the same texture path as the noise bands. */
export function RunoffOverlay({ runoff, terrain }: { runoff: Runoff; terrain: TerrainData }) {
  const texture = useMemo(() => createRunoffTexture(runoff), [runoff])
  return <DrapedTexture texture={texture} terrain={terrain} opacity={0.8} />
}
