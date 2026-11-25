import { decodeTerrainRaster, parseTerrainRasterHeader, type TerrainRaster } from '../analysis/terrainTools'
import { SitePackageError } from './manifest'

/**
 * The 1 m terrain tile of a curated package (ADR-0037), fetched only when a terrain tool is first
 * used: it is about half a megabyte on the wire, and most visits never open a section.
 */
export async function loadTerrainRaster(siteId: string, headerPath: string, signal?: AbortSignal): Promise<TerrainRaster> {
  if (headerPath.startsWith('/') || headerPath.includes('..') || headerPath.includes('://') || !headerPath.endsWith('.json')) {
    throw new SitePackageError(`unsafe asset path: ${headerPath}`, 'assetPaths.terrain1m')
  }
  const base = `/sites/${encodeURIComponent(siteId)}/`
  const [headerResponse, dataResponse] = await Promise.all([
    fetch(base + headerPath, { signal, headers: { Accept: 'application/json' } }),
    fetch(base + headerPath.replace(/\.json$/, '.bin'), { signal }),
  ])
  if (!headerResponse.ok || !dataResponse.ok) throw new SitePackageError(`request failed with HTTP ${headerResponse.ok ? dataResponse.status : headerResponse.status}`, 'terrain1m')
  try {
    const header = parseTerrainRasterHeader(await headerResponse.json())
    if (header.siteId !== siteId) throw new Error('site id does not match the package')
    return decodeTerrainRaster(header, await dataResponse.arrayBuffer())
  } catch (error) {
    throw new SitePackageError(error instanceof Error ? error.message : 'invalid 1 m terrain', 'terrain1m')
  }
}
