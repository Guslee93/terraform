export type SiteId = 'compact-infill' | 'sloped-edge'

export type SiteSummary = {
  id: SiteId
  title: string
  subtitle: string
  description: string
  morphology: 'Urban infill' | 'Landscape edge'
  thumbnail: string
  dataStatus: 'curated-demo'
}

/**
 * Catalogue-level site summaries. Full site packages (terrain, context, parcel
 * geometry and provenance) arrive in M1 behind the SiteManifest contract.
 */
export const SITES: readonly SiteSummary[] = [
  {
    id: 'compact-infill',
    title: 'Compact Infill',
    subtitle: 'Dense Oslo block · strong shadow study',
    description:
      'A tight urban study area surrounded by mature apartment blocks. Clear setbacks, a simple lot edge and long seasonal shadows make it the primary demonstration site.',
    morphology: 'Urban infill',
    thumbnail: '/sites/compact-infill.svg',
    dataStatus: 'curated-demo',
  },
  {
    id: 'sloped-edge',
    title: 'Sloped Edge',
    subtitle: 'Topography · stepped massing',
    description:
      'A study area at the city edge where the ground begins to fall away. Noticeable relief and asymmetric surroundings reward a stepped, terrain-aware concept.',
    morphology: 'Landscape edge',
    thumbnail: '/sites/sloped-edge.svg',
    dataStatus: 'curated-demo',
  },
]

export function getSite(id: string | undefined): SiteSummary | undefined {
  return SITES.find((site) => site.id === id)
}
