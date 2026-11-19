import type { Origin } from './frame'
import { project } from './projection'

/**
 * Polygons from a GML 3.2 answer asked for in `urn:ogc:def:crs:EPSG::4326` (latitude first), as
 * local ENU rings: every vertex through the app's own projection, never a UTM offset
 * (feasibility 09 §1). Shared by the parcel and hazard converters.
 */

function ring(posList: string, origin: Origin): [number, number][] {
  const values = posList.trim().split(/\s+/).map(Number)
  if (values.length < 8 || values.length % 2 !== 0 || values.some((value) => !Number.isFinite(value))) throw new Error('GML: malformed coordinate list')
  const points: [number, number][] = []
  for (let index = 0; index < values.length; index += 2) {
    const [x, y] = project(values[index]!, values[index + 1]!, origin.latitude, origin.longitude)
    points.push([Number(x.toFixed(2)), Number(y.toFixed(2))])
  }
  // GML rings repeat their first point; the app stores open rings.
  const first = points[0]!, last = points[points.length - 1]!
  if (first[0] === last[0] && first[1] === last[1]) points.pop()
  return points
}

/** Every `gml:Polygon` in `xml`: its outline first, then its holes. */
export function gmlPolygons(xml: string, origin: Origin): [number, number][][][] {
  // Only linear rings are read. A ring built from curve segments would lose all but its first
  // segment, so it is refused rather than drawn wrong.
  if (/<gml:(Ring|Curve|Arc)\b|curveMember/.test(xml)) throw new Error('GML: curve rings are not supported')
  return xml.split('<gml:Polygon').slice(1).flatMap((polygon) => {
    const rings = [...polygon.matchAll(/<gml:(exterior|interior)>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/g)]
      .sort((a, b) => Number(b[1] === 'exterior') - Number(a[1] === 'exterior'))
      .map((match) => ring(match[2]!, origin))
    return rings[0] && rings[0].length >= 3 ? [rings] : []
  })
}

/** The features of a WFS 2.0 answer, as XML fragments. Throws when the answer is not a feature collection. */
export function gmlMembers(gml: string, source: string): string[] {
  if (!gml.includes('FeatureCollection')) throw new Error(`${source}: not a WFS feature collection`)
  return gml.split('<wfs:member>').slice(1)
}
