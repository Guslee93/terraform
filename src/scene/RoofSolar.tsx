import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import type { FootprintBuilding } from '../features/analysis/grid'
import { ROOF_SOLAR_COLOUR, roofSolarBand, type RoofSolarValue } from '../features/analysis/roofSolar'
import { enuToThreeXyz } from '../lib/coordinates'
import { ringCentroid } from '../lib/polygon'

const noRaycast = () => null

/** Flat roof polygons coloured by clear-sky annual irradiation; one merged geometry, one draw call. */
export function roofSolarGeometry(
  buildings: readonly FootprintBuilding[],
  values: readonly RoofSolarValue[],
  heightAt: (east: number, north: number) => number,
): BufferGeometry {
  const positions: number[] = []
  const colours: number[] = []
  const colour = new Color()
  buildings.forEach((building, index) => {
    const value = values[index]
    if (!value) return
    const centroid = ringCentroid(building.footprint)
    const z = heightAt(centroid[0], centroid[1]) + building.height + 0.3
    colour.set(ROOF_SOLAR_COLOUR[roofSolarBand(value.kwhPerM2)])
    const triangles = ShapeUtils.triangulateShape(
      building.footprint.map((point) => new Vector2(point[0], point[1])),
      [],
    )
    for (const triangle of triangles) {
      for (const vertex of triangle) {
        const point = building.footprint[vertex]
        if (!point) continue
        positions.push(...enuToThreeXyz([point[0], point[1], z]))
        colours.push(colour.r, colour.g, colour.b)
      }
    }
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  return geometry
}

export function RoofSolar({
  buildings,
  values,
  heightAt,
}: {
  buildings: readonly FootprintBuilding[]
  values: readonly RoofSolarValue[]
  heightAt: (east: number, north: number) => number
}) {
  const geometry = useMemo(
    () => roofSolarGeometry(buildings, values, heightAt),
    [buildings, values, heightAt],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  if (geometry.getAttribute('position').count === 0) return null
  return (
    <mesh geometry={geometry} raycast={noRaycast} renderOrder={2}>
      <meshBasicMaterial
        vertexColors
        side={DoubleSide}
        transparent
        opacity={0.88}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  )
}
