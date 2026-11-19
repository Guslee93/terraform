import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { SLOPE_BANDS, slopeBandIndex, type TerrainRaster } from '../features/analysis/terrainTools'
import type { TerrainData } from '../features/sites/package'
import { DrapedTexture } from './NoiseBands'

/** RGBA bytes for the slope bands, one pixel per raster cell, north row first. Gentle ground stays clear. */
export function slopePixels(slope: Float32Array): Uint8ClampedArray {
  // The band colours as sRGB bytes, as written: three's Color would convert them to linear.
  const colours = SLOPE_BANDS.map((band) => [1, 3, 5].map((at) => Number.parseInt(band.colour.slice(at, at + 2), 16)) as [number, number, number])
  const pixels = new Uint8ClampedArray(slope.length * 4)
  slope.forEach((degrees, index) => {
    if (Number.isNaN(degrees)) return
    const band = slopeBandIndex(degrees)
    // The lowest band is most of a city: left transparent, so the overlay shows where the ground is not flat.
    if (band === 0) return
    const [r, g, b] = colours[band]!
    pixels.set([r, g, b, 255], index * 4)
  })
  return pixels
}

function createSlopeTexture(raster: TerrainRaster, degrees: Float32Array): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = raster.cols
  canvas.height = raster.rows
  const context = canvas.getContext('2d')
  if (!context) return null
  context.putImageData(new ImageData(slopePixels(degrees) as Uint8ClampedArray<ArrayBuffer>, raster.cols, raster.rows), 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Slope of the 1 m terrain in four bands, draped on the terrain (ADR-0037). The raster covers the
 * terrain extent exactly, so its pixels map to the terrain's planar ENU UVs with no resampling.
 */
export function SlopeOverlay({ raster, degrees, terrain }: { raster: TerrainRaster; /** Horn slope of every cell, computed once by the caller. */ degrees: Float32Array; terrain: TerrainData }) {
  const texture = useMemo(() => createSlopeTexture(raster, degrees), [raster, degrees])
  return <DrapedTexture texture={texture} terrain={terrain} opacity={0.7} />
}
