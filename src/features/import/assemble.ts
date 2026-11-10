import { ringCentroid } from '../../lib/polygon'
import { sampleTerrainHeight } from '../sites/geometry'
import { parseSiteManifest, type CameraPreset, type SiteSource, type Vec3Tuple } from '../sites/manifest'
import { parseBuildings, parseLandCover, parseRoads, parseStudyArea, parseTerrain, parseTrees, type SitePackage } from '../sites/package'
import { extractBuildings } from './buildings'
import { extractLandCover, extractRoads } from './context'
import { frameBounds, validateFrame, type ImportFrame } from './frame'
import { ringArea } from './geometry'
import { abortable, checkAbort } from './request'
import { fitRoof, roofSamplePoints } from './roofFit'
import { sampleSurface, type SurfaceRaster, type SurfaceSource } from './surface'
import { buildTerrainGrid, GRID_SIZE, terrainPoints, TerrainPolicyError, timeZoneFor, type TerrainGrid, type TerrainProvider, type TerrainSample } from './terrain'
import { decodeTile, tileCover, type TileFeature, type TileSource } from './tiles'
import { illustrativeTrees, mappedTrees, placeTrees, type TreeSource } from './trees'

export type ImportStep = 'tiles' | 'buildings' | 'context' | 'terrain' | 'roofs' | 'assemble'
export type ImportWarning = {
  code: 'terrain-estimated' | 'terrain-water' | 'terrain-flat' | 'heights-estimated' | 'trees-unavailable' | 'roofs-flat'
  message: string
}
export type ImportResult = { sitePackage: SitePackage; warnings: ImportWarning[]; timings: Record<ImportStep, number> }
export type ImportOptions = { signal?: AbortSignal; onProgress?: (step: ImportStep, state: 'start' | 'done' | 'skipped' | 'failed', detail?: string) => void }
const round = (value: number, decimals = 2) => Number(value.toFixed(decimals))
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error)

/** Browser/Node WebCrypto; hashes raw tile bytes plus the normalized provider samples.
 * Not a checksum of remote terrain response bytes (providers abstract those away). */
async function sourceChecksum(parts: Uint8Array[], samples: TerrainSample[], signal?: AbortSignal): Promise<string> {
  const inputs = [...parts,new TextEncoder().encode(JSON.stringify(samples))]
  const bytes = new Uint8Array(inputs.reduce((sum,part)=>sum+part.byteLength,0))
  let offset = 0
  for (const part of inputs) { bytes.set(part,offset); offset += part.byteLength }
  const hash = await abortable(()=>crypto.subtle.digest('SHA-256',bytes),signal)
  checkAbort(signal)
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')
}

/** No writes or app integration. A package becomes visible only after all parsers
 * and cross-asset checks pass. Timings are elapsed seconds, matching the C3 report. */
export async function importSite(input: ImportFrame, deps: { tiles: TileSource; terrain: TerrainProvider[]; trees?: TreeSource; roofs?: SurfaceSource }, options: ImportOptions = {}): Promise<ImportResult> {
  const {signal,onProgress} = options
  checkAbort(signal)
  const frame = validateFrame(input)
  const timings: ImportResult['timings'] = {tiles:0,buildings:0,context:0,terrain:0,roofs:0,assemble:0}
  const warnings: ImportWarning[] = [
    {code:'heights-estimated',message:'OpenMapTiles render_height values are partly estimated; heights are not survey data.'},
    {code:'roofs-flat',message:'Roofs are modelled as flat extrusions; sloped and stepped roof shapes are not represented.'},
  ]
  const progress = (step: ImportStep, state: 'start' | 'done' | 'skipped' | 'failed', detail?: string) => {
    checkAbort(signal)
    onProgress?.(step,state,detail)
    checkAbort(signal)
  }
  async function step<T>(name: ImportStep, detail: string, action: () => T | Promise<T>): Promise<T> {
    progress(name,'start',detail)
    const start = performance.now()
    try {
      const result = await abortable(async()=>action(),signal)
      checkAbort(signal)
      progress(name,'done',detail)
      return result
    } catch (error) {
      checkAbort(signal)
      progress(name,'failed',`${detail}: ${messageOf(error)}`)
      throw error
    } finally { timings[name] = (performance.now()-start)/1000 }
  }
  const tileBuffers: Uint8Array[] = []
  const features = await step('tiles',deps.tiles.name,async()=>{
    const decoded: TileFeature[] = []
    for (const tile of tileCover(frameBounds(frame).lonLat,14)) {
      try {
        const buffer = await abortable(()=>deps.tiles.fetchTile(tile.z,tile.x,tile.y,signal),signal)
        checkAbort(signal)
        tileBuffers.push(new Uint8Array(buffer))
        decoded.push(...decodeTile(buffer,tile.z,tile.x,tile.y))
      } catch (error) {
        checkAbort(signal)
        throw new Error(`${deps.tiles.name} tile ${tile.z}/${tile.x}/${tile.y}: ${messageOf(error)}`,{cause:error})
      }
    }
    return decoded
  })
  checkAbort(signal)
  const drafts = await step('buildings',deps.tiles.name,()=>{
    const buildings = extractBuildings(features,frame)
    if (buildings.length > 2500) throw new Error('Import exceeds the 2,500-building budget')
    return buildings
  })
  checkAbort(signal)
  const context = await step('context',deps.tiles.name,async()=>{
    let failure = deps.trees ? '' : 'no tree source configured'
    let mapped: [number,number][] = []
    if (deps.trees) {
      try { mapped = placeTrees(mappedTrees(await abortable(()=>deps.trees!.fetchTrees(frameBounds(frame).lonLat,signal),signal),frame),drafts,frame) }
      catch (error) { checkAbort(signal); failure = messageOf(error) }
      if (!failure && !mapped.length) failure = 'OpenStreetMap has no mapped trees in this frame'
    }
    return {roads:extractRoads(features,frame),areas:extractLandCover(features,frame),
      trees: mapped.length ? mapped : placeTrees(illustrativeTrees(features,frame),drafts,frame),treesMapped:mapped.length>0,treeFailure:failure}
  })
  if (!context.treesMapped) warnings.push({code:'trees-unavailable',message:context.trees.length
    ? `Trees are illustrative, not mapped positions (${context.treeFailure}): ${context.trees.length} placed on a grid in mapped woods (9 m), gardens (14 m), parks (16 m) and cemeteries (18 m).`
    : `No trees shown: ${context.treeFailure}, and the frame has no mapped woods, gardens, parks or cemeteries.`})
  checkAbort(signal)
  const sampled = await step('terrain','Terrain providers',async()=>{
    const points = terrainPoints(frame)
    const failures: string[] = []
    let gappy: TerrainPolicyError | null = null
    for (const provider of deps.terrain) {
      checkAbort(signal)
      if (!provider.covers(frame.latitude,frame.longitude)) { progress('terrain','skipped',`${provider.name}: outside coverage`); continue }
      try {
        const samples = await abortable(()=>provider.sample(points.map(([lon,lat])=>[lon,lat]),signal),signal)
        checkAbort(signal)
        const grid = buildTerrainGrid(samples,{source:provider.name})
        return {samples,grid,provider,failures}
      } catch (error) {
        checkAbort(signal)
        // An incomplete grid must not silently become a successful flat import. Too many gaps (a frame
        // over the national border) tries the next provider, but never ends in a flat grid.
        if (error instanceof TerrainPolicyError && (error.reason === 'invalid' || (error.reason === 'all-null' && timeZoneFor(frame.latitude,frame.longitude) === 'Europe/Oslo'))) throw error
        if (error instanceof TerrainPolicyError && error.reason === 'too-many-estimates') gappy = error
        const detail = `${provider.name}: ${messageOf(error)}`
        failures.push(detail)
        progress('terrain','failed',detail)
      }
    }
    if (gappy) throw gappy
    const detail = `All applicable terrain providers failed or had no coverage; flat zero grid substituted, not measured terrain.${failures.length ? ` ${failures.join('; ')}` : ''}`
    warnings.push({code:'terrain-flat',message:detail})
    const samples: TerrainSample[] = points.map(()=>({height:null,kind:'land'}))
    progress('terrain','skipped',detail)
    return {samples, grid:null, provider:null, failures}
  })
  checkAbort(signal)
  // Roof heights only make sense on terrain in the same vertical datum; a failed download keeps flat roofs.
  let surface: SurfaceRaster | null = null
  const roofs = deps.roofs
  if (!roofs || !roofs.covers(frame.latitude,frame.longitude) || sampled.provider?.verticalDatum !== roofs.verticalDatum) {
    progress('roofs','skipped',roofs ? `${roofs.name}: no coverage on this terrain` : 'no surface model configured')
  } else {
    try { surface = await step('roofs',roofs.name,()=>roofs.fetchSurface(frameBounds(frame).lonLat,frame.sizeMetres,signal)) }
    catch { checkAbort(signal) }
  }
  checkAbort(signal)
  const sitePackage = await step('assemble','SitePackage validation',async()=>{
    const {grid,provider} = sampled
    const absolute = grid?.absolute ?? Array<number>(GRID_SIZE*GRID_SIZE).fill(0)
    const originElevation = absolute[6*GRID_SIZE+6]!
    const counts: TerrainGrid['counts'] = grid?.counts ?? {measured:0,water:0,estimated:0}
    if (counts.estimated) warnings.push({code:'terrain-estimated',message:`${counts.estimated} of 169 terrain samples estimated from nearest original valid neighbours (maximum 5%; ties: lowest row, then column).`})
    if (counts.water) warnings.push({code:'terrain-water',message:`${counts.water} of 169 terrain samples modelled at 0 m mean sea level before recentring; sea-floor depth is not modelled.`})
    const wrap = <T extends object>(body: T) => ({schemaVersion:1,siteId:frame.id,...body})
    const h = frame.sizeMetres/2, studyHalf = frame.sizeMetres*0.35
    const terrain = parseTerrain(wrap({cols:GRID_SIZE,rows:GRID_SIZE,minX:-h,maxX:h,minY:-h,maxY:h,originElevation:round(originElevation),
      heights:Array.from({length:GRID_SIZE},(_,row)=>absolute.slice(row*GRID_SIZE,(row+1)*GRID_SIZE).map(height=>round(height-originElevation))),
      source: provider ? `${provider.name}; ${counts.measured} measured / ${counts.water} water-surface / ${counts.estimated} estimated samples` : 'Flat zero grid — all providers unavailable; not measured terrain',
    }))
    const roofCounts = {gabled:0,flat:0,complex:0}
    const buildings = parseBuildings(wrap({buildings:drafts.map(({id,height,footprint})=>{
      const centroid = ringCentroid(footprint)
      const baseElevation = round(Math.min(...[...footprint,centroid].map(([x,y])=>sampleTerrainHeight(terrain,x,y)))-0.3)
      // Surface heights are absolute; the package is relative to the origin, the roof to the building's base.
      const fit = surface ? fitRoof(footprint,roofSamplePoints(footprint).map(([x,y])=>{
        const z = sampleSurface(surface,frame.sizeMetres,x,y)
        return {x,y,z:z === null ? null : z-terrain.originElevation-baseElevation}
      })) : null
      if (fit) roofCounts[fit.kind] += 1
      return {id,kind:'other',height:fit ? Math.min(200,Math.max(2.5,fit.height)) : height,footprint,area:round(ringArea(footprint),1),withinStudyArea:centroid.every(v=>Math.abs(v)<=studyHalf),
        baseElevation,...(fit?.kind === 'gabled' ? {roof:fit.roof} : {})}
    })}))
    const measured = roofCounts.gabled+roofCounts.flat+roofCounts.complex
    if (measured && roofs) {
      const total = buildings.buildings.length
      warnings.find(w=>w.code === 'heights-estimated')!.message = `${measured} of ${total} building heights are measured from ${roofs.name}; the rest are OpenMapTiles render_height estimates. Not survey data.`
      warnings.find(w=>w.code === 'roofs-flat')!.message = `Roofs from ${roofs.name} (1 m lidar): ${roofCounts.gabled} pitched (drawn as simple gables), ${roofCounts.flat} flat, ${roofCounts.complex} other shapes drawn flat at their measured height; ${total-measured} not measured and kept as flat extrusions. Hipped, mansard and stepped roofs are not represented; sun, wind and noise use each building's mean roof height.`
    }
    const studyArea = parseStudyArea(wrap({label:'Study area — not a cadastral parcel',polygon:[[-studyHalf,-studyHalf],[studyHalf,-studyHalf],[studyHalf,studyHalf],[-studyHalf,studyHalf],[-studyHalf,-studyHalf]]}))
    const roads = parseRoads(wrap({roads:context.roads}))
    const landcover = parseLandCover(wrap({areas:context.areas}))
    const trees = parseTrees(wrap({trees:context.trees}))
    const diagonal = Math.hypot(studyHalf*2,studyHalf*2), distance = diagonal*1.7, direction = Math.sqrt(1+1.15**2+1)
    const preset = (position: Vec3Tuple,target: Vec3Tuple = [0,0,8],fov = 32): CameraPreset => ({position,target,projection:'perspective',fov})
    const acquiredAt = new Date().toISOString()
    const sources: SiteSource[] = [{title:deps.tiles.name,attribution:deps.tiles.attribution,acquiredAt,...(deps.tiles.url ? {url:deps.tiles.url} : {}),...(deps.tiles.license ? {license:deps.tiles.license} : {})}]
    if (context.treesMapped && deps.trees) sources.push({title:deps.trees.name,attribution:deps.trees.attribution,acquiredAt,...(deps.trees.url ? {url:deps.trees.url} : {}),...(deps.trees.license ? {license:deps.trees.license} : {})})
    if (provider) sources.push({title:provider.name,attribution:provider.attribution,acquiredAt,...(provider.url ? {url:provider.url} : {}),...(provider.license ? {license:provider.license} : {})})
    if (measured && roofs) sources.push({title:roofs.name,attribution:roofs.attribution,acquiredAt,url:roofs.url,license:roofs.license})
    const checksum = await sourceChecksum(tileBuffers,sampled.samples,signal)
    checkAbort(signal)
    const manifest = parseSiteManifest({
      schemaVersion:1,id:frame.id,title:frame.title,subtitle:'OpenStreetMap context · heights partly estimated · not survey data',
      description:'User import clipped to an authored square frame; no cadastral or planning data.',morphology:'Imported urban context',
      location:{latitude:frame.latitude,longitude:frame.longitude,timeZone:timeZoneFor(frame.latitude,frame.longitude)},
      crs:{sourceEPSG:'EPSG:4326',horizontalDatum:'WGS84',verticalDatum:provider ? provider.verticalDatum ?? 'Provider datum unspecified; not survey data' : 'Unreferenced flat zero plane',originLatitude:frame.latitude,originLongitude:frame.longitude,originElevation:terrain.originElevation,projection:'local-tangent-plane-wgs84'},
      unit:'m',dataStatus:'user-import',
      assetPaths:{terrain:'terrain.json',buildings:'buildings.json',studyArea:'study-area.json',thumbnail:'thumbnail.svg',attribution:'attribution.md',roads:'roads.json',trees:'trees.json',landcover:'landcover.json'},
      constraints:{maxHeightMeters:18,setbackMeters:4,label:'Illustrative design constraint — not planning advice'},
      cameraPresets:{
        isometric:preset([round(distance/direction),round(-distance*1.15/direction),round(distance/direction)]),
        top:preset([0,-0.01,round(diagonal*2.25)],[0,0,0]),
        north:preset([0,round(-diagonal*1.35),round(diagonal*0.62)]),
        south:preset([0,round(diagonal*1.35),round(diagonal*0.62)]),
        eyeLevel:preset([round(diagonal*0.8),round(-diagonal*0.9),16],[0,0,8],34),
      },sources,
      simplified:[
        'OpenMapTiles render_height minus render_min_height; minimum extrusion 2.5 m; all building kinds other.',
        'Outer rings only; holes omitted. Same-ID fragments unioned in local ENU, simplified at 0.3 m, repaired; parts below 12 m² omitted.',
        'Buildings seated at minimum bilinear terrain height over vertices and vertex-average centroid, minus 0.3 m; raised parts are grounded.',
        `${terrain.source}; 13 × 13 grid (${round(frame.sizeMetres/12)} m spacing), recentered to origin elevation.`,
        'Sea cells use a modelled 0 m water surface before recentring (NN2000 for Kartverket); no bathymetry.',
        'Study area is the frame inset 15% on every side. Constraints 18 m / 4 m are illustrative defaults, not regulations; absent-constraint schema deferred.',
        'Road widths are illustrative; tunnels omitted; buffered road runs deduplicated within 0.5 m by class. Land-cover fragments may overlap; holes omitted.',
        'Time zone uses approximate country bounding boxes; border regions may be misclassified.',
        'Source checksum: SHA-256 of tile bytes followed by normalized terrain samples; not a checksum of provider HTTP responses.',
        ...sampled.failures.map(failure=>`Terrain provider fallback: ${failure}`),
        ...warnings.map(warning=>warning.message),
      ],statistics:{buildingCount:buildings.buildings.length,terrainSamples:terrain.rows*terrain.cols,studyAreaM2:round((studyHalf*2)**2,1),sourceChecksum:checksum},
    })
    for (const asset of [terrain,buildings,studyArea,roads,landcover,trees]) if (asset.siteId !== manifest.id) throw new Error('Package siteId mismatch')
    if (manifest.statistics.buildingCount !== buildings.buildings.length || manifest.statistics.terrainSamples !== terrain.heights.flat().length || Math.abs(manifest.statistics.studyAreaM2-ringArea(studyArea.polygon))>0.1) throw new Error('Package statistics mismatch')
    for (const items of [buildings.buildings,roads.roads,landcover.areas]) if (new Set(items.map(item=>item.id)).size !== items.length) throw new Error('Duplicate package feature IDs')
    for (const building of buildings.buildings) if (Math.abs(building.area-ringArea(building.footprint))>0.051) throw new Error('Building area mismatch')
    return {manifest,terrain,buildings,studyArea,roads:roads.roads,trees:trees.trees,landcover:landcover.areas}
  })
  checkAbort(signal)
  return {sitePackage,warnings,timings}
}
