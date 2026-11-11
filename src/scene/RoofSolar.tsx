import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from 'three'
import type { FootprintBuilding } from '../features/analysis/grid'
import { ROOF_SOLAR_COLOUR, roofSolarBand, type RoofSolarValue } from '../features/analysis/roofSolar'
import { enuToThreeXyz } from '../lib/coordinates'
import { roofBase, roofLift, roofTriangles } from './roofGeometry'

const noRaycast = () => null

/** Roof surfaces (flat or gabled) coloured by clear-sky annual irradiation; one merged geometry, one draw call. */
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
    if (!value || !value.analysed) return
    const ground = roofBase(building, heightAt) + 0.3
    const lift = roofLift(building)
    colour.set(ROOF_SOLAR_COLOUR[roofSolarBand(value.kwhPerM2)])
    for (const triangle of roofTriangles(building.footprint, building.roof)) {
      for (const point of triangle) {
        positions.push(...enuToThreeXyz([point[0], point[1], ground + lift(point[0], point[1])]))
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
