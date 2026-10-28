// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import grunerlokkaTerrain from './__fixtures__/terrain/grunerlokka.json'
import bjorvikaTerrain from './__fixtures__/terrain/bjorvika.json'
import { importSite, type ImportStep } from './assemble'
import { bjorvika, fixtureTiles, grunerlokka } from './testFixtures'
import { buildTerrainGrid, kartverketProvider, parseKartverketSamples, terrainPoints, type TerrainProvider, type TerrainSample } from './terrain'
import { parseSiteManifest } from '../sites/manifest'
import { parseBuildings, parseLandCover, parseRoads, parseStudyArea, parseTerrain, parseTrees } from '../sites/package'
import { isSimpleRing } from '../../lib/polygon'
import type { ImportFrame } from './frame'

afterEach(()=>vi.unstubAllGlobals())
function fixtureTerrain(record: typeof bjorvikaTerrain): TerrainProvider {
  return {...kartverketProvider(),async sample(points) {
    expect(points).toEqual(record.points)
    return record.batches.flatMap(batch=>parseKartverketSamples(batch.response,batch.response.punkter.map(p=>[p.x,p.y])))
  }}
}
const emptyTiles = { name:'Empty recorded tiles', attribution:'Synthetic fixture', async fetchTile(){return new ArrayBuffer(0)} }
const provider = (name: string, samples: TerrainSample[]): TerrainProvider => ({name,attribution:'Synthetic fixture',covers:()=>true,async sample(){return samples}})
const measured = (): TerrainSample[] => Array.from({length:169},()=>({height:10,kind:'land'}))
const missing = (): TerrainSample[] => Array.from({length:169},()=>({height:null,kind:'land'}))
const stockholm: ImportFrame = {...grunerlokka,latitude:59.316,longitude:18.071}

it.each([{frame:grunerlokka,record:grunerlokkaTerrain,count:202},{frame:bjorvika,record:bjorvikaTerrain,count:52}])('imports $frame.title completely offline with validated assets', async ({frame,record,count}) => {
  const network=vi.fn(()=>{throw new Error('Tests must not use the network')});vi.stubGlobal('fetch',network)
  const events: string[]=[]
  const result=await importSite(frame,{tiles:fixtureTiles,terrain:[fixtureTerrain(record)]},{onProgress:(step,state)=>events.push(`${step}:${state}`)})
  const pkg=result.sitePackage
  expect(parseSiteManifest(pkg.manifest).dataStatus).toBe('user-import')
  expect(parseTerrain(pkg.terrain).heights[6]![6]).toBe(0)
  expect(parseBuildings(pkg.buildings).buildings.length).toBeGreaterThanOrEqual(Math.ceil(count*0.95))
  expect(pkg.buildings.buildings.length).toBeLessThanOrEqual(Math.floor(count*1.05))
  expect(parseStudyArea(pkg.studyArea).label).toMatch(/not a cadastral/)
  const wrap=(body: object)=>({schemaVersion:1,siteId:frame.id,...body})
  expect(parseRoads(wrap({roads:pkg.roads})).roads.length).toBeGreaterThan(0)
  expect(parseLandCover(wrap({areas:pkg.landcover})).areas.length).toBeGreaterThan(0)
  expect(parseTrees(wrap({trees:pkg.trees})).trees).toEqual([])
  expect(pkg.manifest.statistics).toMatchObject({buildingCount:pkg.buildings.buildings.length,terrainSamples:169,studyAreaM2:78400})
  expect(pkg.manifest.statistics.sourceChecksum).toMatch(/^[a-f0-9]{64}$/)
  expect(pkg.buildings.buildings.every(b=>isSimpleRing(b.footprint))).toBe(true)
  expect(pkg.manifest.constraints.label).toMatch(/Illustrative design constraint/)
  expect(result.warnings.map(w=>w.code)).toEqual(expect.arrayContaining(['heights-estimated','roofs-flat','trees-unavailable']))
  expect(events).toEqual(['tiles:start','tiles:done','buildings:start','buildings:done','context:start','context:done','terrain:start','terrain:done','assemble:start','assemble:done'])
  expect(Object.keys(result.timings)).toEqual(['tiles','buildings','context','terrain','assemble'])
  expect(Object.values(result.timings).every(n=>Number.isFinite(n)&&n>=0)).toBe(true)
  if(frame===bjorvika) {
    const samples=await fixtureTerrain(record).sample(terrainPoints(frame))
    expect(buildTerrainGrid(samples).counts).toEqual({measured:113,water:54,estimated:2})
    expect(result.warnings.find(w=>w.code==='terrain-water')?.message).toMatch(/^54 of 169/)
    expect(result.warnings.find(w=>w.code==='terrain-estimated')?.message).toMatch(/^2 of 169/)
    expect(pkg.terrain.heights[0]![11]).toBe(-1.44)
    expect(pkg.terrain.heights[9]![3]).toBe(0.21)
  }
  expect(network).not.toHaveBeenCalled()
})
it('names a failing tile source in a failed progress event and rejects', async () => {
  const progress=vi.fn()
  const tiles={...emptyTiles,name:'Broken tile fixture',async fetchTile(){throw new Error('HTTP 503')}}
  await expect(importSite(grunerlokka,{tiles,terrain:[]},{onProgress:progress})).rejects.toThrow(/Broken tile fixture.*503/)
  expect(progress).toHaveBeenLastCalledWith('tiles','failed',expect.stringContaining('Broken tile fixture'))
})
it('aborts while awaiting a custom tile source that ignores the signal, with no later progress', async () => {
  const controller=new AbortController(), progress=vi.fn()
  let resolveTile: ((buffer: ArrayBuffer)=>void) | undefined
  const tiles={...emptyTiles,fetchTile:vi.fn(()=>new Promise<ArrayBuffer>(resolve=>{resolveTile=resolve}))}
  const result=importSite(grunerlokka,{tiles,terrain:[]},{signal:controller.signal,onProgress:progress})
  controller.abort('caller reason')
  await expect(result).rejects.toMatchObject({name:'AbortError'})
  const calls=progress.mock.calls.length
  resolveTile?.(new ArrayBuffer(0))
  await Promise.resolve()
  expect(progress).toHaveBeenCalledTimes(calls)
  expect(tiles.fetchTile).toHaveBeenCalledTimes(1)
})
it('does no work or progress for an already aborted import', async () => {
  const progress=vi.fn(), fetchTile=vi.fn()
  await expect(importSite(grunerlokka,{tiles:{...emptyTiles,fetchTile},terrain:[]},{signal:AbortSignal.abort(),onProgress:progress})).rejects.toMatchObject({name:'AbortError'})
  expect(fetchTile).not.toHaveBeenCalled();expect(progress).not.toHaveBeenCalled()
})
it.each(['tiles','buildings','context','terrain','assemble'] satisfies ImportStep[])('stops when a progress callback cancels at %s', async (cancelStep) => {
  const controller=new AbortController(), events: string[]=[]
  await expect(importSite(grunerlokka,{tiles:emptyTiles,terrain:[provider('Measured',measured())]}, {signal:controller.signal,onProgress:(step,state)=>{events.push(`${step}:${state}`);if(step===cancelStep&&state==='start')controller.abort()}})).rejects.toMatchObject({name:'AbortError'})
  expect(events.at(-1)).toBe(`${cancelStep}:start`)
})
it('aborts mid-terrain without attempting the next provider or flat fallback', async () => {
  const controller=new AbortController(), next=vi.fn(), progress=vi.fn()
  const first={...provider('Cancelled',[]),sample:vi.fn(async()=>{controller.abort();return measured()})}
  await expect(importSite(grunerlokka,{tiles:emptyTiles,terrain:[first,{...provider('Next',[]),sample:next}]},{signal:controller.signal,onProgress:progress})).rejects.toMatchObject({name:'AbortError'})
  expect(next).not.toHaveBeenCalled()
  expect(progress).toHaveBeenLastCalledWith('terrain','start','Terrain providers')
})
it('falls through an all-null non-Norwegian grid to a measured second provider', async () => {
  const progress=vi.fn()
  const result=await importSite(stockholm,{tiles:emptyTiles,terrain:[provider('No coverage',missing()),provider('Measured fallback',measured())]},{onProgress:progress})
  expect(result.warnings.map(w=>w.code)).not.toContain('terrain-flat')
  expect(result.sitePackage.terrain.originElevation).toBe(10)
  expect(result.sitePackage.terrain.source).toContain('Measured fallback')
  expect(result.sitePackage.manifest.crs.verticalDatum).toMatch(/unspecified/)
  expect(progress).toHaveBeenCalledWith('terrain','failed',expect.stringContaining('No coverage'))
})
it('only uses a labelled flat grid after every applicable provider fails', async () => {
  const failed=vi.fn(async()=>{throw new Error('HTTP 503')})
  const result=await importSite(stockholm,{tiles:emptyTiles,terrain:[provider('No data',missing()),{...provider('Unavailable',[]),sample:failed}]})
  expect(failed).toHaveBeenCalledOnce()
  expect(result.sitePackage.terrain.heights.flat().every(h=>h===0)).toBe(true)
  expect(result.sitePackage.manifest.crs.verticalDatum).toMatch(/Unreferenced/)
  expect(result.warnings.find(w=>w.code==='terrain-flat')?.message).toMatch(/No data.*Unavailable/)
})
it('does not flatten an incomplete Norwegian grid or bypass the 5% cap', async () => {
  for(const samples of [missing(),[...missing().slice(0,9),...measured().slice(9)]]) {
    await expect(importSite(grunerlokka,{tiles:emptyTiles,terrain:[provider('Kartverket fixture',samples)]})).rejects.toThrow(/Kartverket fixture/)
  }
})
it('skips providers outside coverage and does not fetch them', async () => {
  const sample=vi.fn()
  const result=await importSite(grunerlokka,{tiles:emptyTiles,terrain:[{...provider('Outside',[]),covers:()=>false,sample}]})
  expect(sample).not.toHaveBeenCalled()
  expect(result.warnings.map(w=>w.code)).toContain('terrain-flat')
})
