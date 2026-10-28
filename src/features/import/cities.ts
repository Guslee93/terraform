/**
 * Nordic city quick picks for the site-import "Find" screen (D26).
 *
 * All coordinates were read from OpenStreetMap on 2026-10-28 (Nominatim/Photon
 * lookups, one request per second). Three districts have genuine OSM `place`
 * nodes; the other six are mapped in OSM as relations/ways, so their coordinates
 * are the OSM feature label position and the object id is cited per row.
 */
export type CountryCode = 'NO' | 'SE' | 'DK' | 'FI'

export type QuickPick = {
  id: string
  label: string
  country: CountryCode
  latitude: number
  longitude: number
  frameMetres: 400
}

export const QUICK_PICKS: readonly QuickPick[] = [
  {
    id: 'oslo-grunerlokka',
    label: 'Oslo (Grünerløkka)',
    country: 'NO',
    latitude: 59.9239,
    longitude: 10.7579,
    frameMetres: 400,
    // OSM place node 1125975790 (place=suburb "Grünerløkka"), 2026-10-28.
  },
  {
    id: 'bergen-bryggen',
    label: 'Bergen (Bryggen)',
    country: 'NO',
    latitude: 60.3977,
    longitude: 5.3229,
    frameMetres: 400,
    // No OSM place node for Bryggen; label position of relation 6492162
    // (place=neighbourhood "Bryggen"), 2026-10-28.
  },
  {
    id: 'trondheim-bakklandet',
    label: 'Trondheim (Bakklandet)',
    country: 'NO',
    latitude: 63.428,
    longitude: 10.4029,
    frameMetres: 400,
    // OSM place node 177561372 (place=quarter "Bakklandet"), 2026-10-28.
  },
  {
    id: 'stockholm-sodermalm',
    label: 'Stockholm (Södermalm)',
    country: 'SE',
    latitude: 59.3159,
    longitude: 18.078,
    frameMetres: 400,
    // No OSM place node for the district; label position of relation 5695402
    // (place=suburb, the Södermalm administrative area), 2026-10-28.
  },
  {
    id: 'goteborg-haga',
    label: 'Göteborg (Haga)',
    country: 'SE',
    latitude: 57.6984,
    longitude: 11.9558,
    frameMetres: 400,
    // No OSM place node for Haga; label position of relation 1517292
    // (boundary:administrative), 2026-10-28.
  },
  {
    id: 'malmo-mollevangen',
    label: 'Malmö (Möllevången)',
    country: 'SE',
    latitude: 55.5934,
    longitude: 13.0129,
    frameMetres: 400,
    // No OSM place node for Möllevången; label position of relation 3050065
    // (boundary:administrative), 2026-10-28.
  },
  {
    id: 'copenhagen-norrebro',
    label: 'Copenhagen (Nørrebro)',
    country: 'DK',
    latitude: 55.6959,
    longitude: 12.545,
    frameMetres: 400,
    // OSM place node 21701704 (place=suburb "Nørrebro"), 2026-10-28.
  },
  {
    id: 'aarhus-latinerkvarteret',
    label: 'Aarhus (Latinerkvarteret)',
    country: 'DK',
    latitude: 56.1587,
    longitude: 10.2099,
    frameMetres: 400,
    // No OSM place node; label position of way 1106091494
    // (place=neighbourhood "Latin Quarter"), 2026-10-28.
  },
  {
    id: 'helsinki-kallio',
    label: 'Helsinki (Kallio)',
    country: 'FI',
    latitude: 60.184,
    longitude: 24.9525,
    frameMetres: 400,
    // No OSM place node for the district; label position of relation 184765
    // (boundary:administrative), 2026-10-28.
  },
]

const COUNTRY_BOUNDS: Record<CountryCode, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  NO: { minLat: 57.9, maxLat: 71.2, minLon: 4, maxLon: 31.5 },
  SE: { minLat: 55.3, maxLat: 69.1, minLon: 10.9, maxLon: 24.2 },
  DK: { minLat: 54.5, maxLat: 57.8, minLon: 8, maxLon: 15.2 },
  FI: { minLat: 59.7, maxLat: 70.1, minLon: 19, maxLon: 31.6 },
}

export function liesInCountryBounds(pick: QuickPick): boolean {
  const bounds = COUNTRY_BOUNDS[pick.country]
  return (
    pick.latitude >= bounds.minLat &&
    pick.latitude <= bounds.maxLat &&
    pick.longitude >= bounds.minLon &&
    pick.longitude <= bounds.maxLon
  )
}