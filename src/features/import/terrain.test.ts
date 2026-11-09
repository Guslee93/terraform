// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import grunerlokka from './__fixtures__/terrain/grunerlokka.json'
import bjorvika from './__fixtures__/terrain/bjorvika.json'
import { buildTerrainGrid, decodeTerrarium, kartverketProvider, parseKartverketSamples, sampleTerrarium, terrainPoints, terrariumProvider, timeZoneFor, type TerrainSample } from './terrain'
import { grunerlokka as frame } from './testFixtures'
afterEach(()=>vi.unstubAllGlobals())
const measured = (size = 169): TerrainSample[] => Array.from({length:size},(_,i)=>({height:i,kind:'land'}))
function batchSamples(record: typeof bjorvika) {
  return record.batches.flatMap(batch=>parseKartverketSamples(batch.response,batch.response.punkter.map(p=>[p.x,p.y])))
}
it('preserves the recorded Grünerløkka elevations without estimates', () => {
  expect(terrainPoints(frame)).toEqual(grunerlokka.points)
  expect(buildTerrainGrid(batchSamples(grunerlokka)).counts).toEqual({measured:169,water:0,estimated:0})
})
it('reproduces Bjørvika water, estimate counts and donor heights', () => {
  const grid = buildTerrainGrid(batchSamples(bjorvika))
  expect(grid.counts).toEqual({measured:113,water:54,estimated:2})
  expect(grid.absolute[11]).toBe(0.89)
  expect(grid.absolute[9*13+3]).toBe(2.54)
  expect(grid.absolute[6*13+6]).toBe(2.33)
  grid.flags.forEach((flag,i)=> { if(flag==='water-surface') expect(grid.absolute[i]).toBe(0) })
})
it('classifies each sea indicator independently, even with null height', () => {
  const samples = parseKartverketSamples({punkter:[{x:10,y:60,z:null,terreng:'Havflate'},{x:11,y:60,z:-15,datakilde:'dybdekurver'}]},[[10,60],[11,60]])
  expect(samples.map(s=>s.kind)).toEqual(['water','water'])
  const values = measured(); values[0]=samples[0]!; values[1]=samples[1]!
  expect(buildTerrainGrid(values).absolute.slice(0,2)).toEqual([0,0])
})
it('breaks nearest-donor ties by row, then column, and never uses estimates as donors', () => {
  const samples = measured()
  samples[14]={height:null,kind:'land'} // row 1 col 1: row 0 col 1 wins
  expect(buildTerrainGrid(samples).absolute[14]).toBe(1)
  samples[0]={height:null,kind:'land'}
  samples[1]={height:null,kind:'land'}
  // index 0 must choose original index 13, not newly filled index 1.
  expect(buildTerrainGrid(samples).absolute[0]).toBe(13)
  expect(buildTerrainGrid(samples).absolute[1]).toBe(2)
})
it('allows water-surface donors and exactly 5%, but rejects nine of 169 gaps', () => {
  const samples = measured()
  samples[0]={height:null,kind:'land'}; samples[1]={height:-30,kind:'water'}
  expect(buildTerrainGrid(samples).absolute[0]).toBe(0)
  const twenty=measured(20);twenty[0]={height:null,kind:'land'}
  expect(buildTerrainGrid(twenty,{rows:4,cols:5}).counts.estimated).toBe(1)
  const eight=measured(); for(let i=0;i<8;i++)eight[i]={height:null,kind:'land'}
  expect(buildTerrainGrid(eight).counts.estimated).toBe(8)
  eight[8]={height:null,kind:'land'}
  expect(()=>buildTerrainGrid(eight,{source:'Kartverket'})).toThrow(/Kartverket.*exceeds 5%/)
})
it('rejects malformed and all-null terrain instead of labelling it measured', () => {
  expect(()=>buildTerrainGrid(Array.from({length:169},()=>({height:null,kind:'land'})))).toThrow(/all.*null/)
  expect(()=>buildTerrainGrid([{height:0,kind:'land'}])).toThrow(/count/)
  const samples=measured();samples[0]={height:NaN,kind:'land'}
  expect(()=>buildTerrainGrid(samples)).toThrow(/invalid/)
  expect(()=>parseKartverketSamples({punkter:[{x:10,y:60,z:'1'}]},[[10,60]])).toThrow(/invalid/)
  expect(()=>parseKartverketSamples({punkter:[{x:11,y:60,z:1}]},[[10,60]])).toThrow(/coordinates/)
  expect(()=>parseKartverketSamples({punkter:[]},[[10,60]])).toThrow(/count/)
})
it('batches Kartverket requests 49/49/49/22 and parses recorded responses', async () => {
  let index=0
  const fetcher=vi.fn(async (url: string)=>{
    const batch=grunerlokka.batches[index++]!
    expect(url).toBe(batch.url)
    return new Response(JSON.stringify(batch.response))
  })
  vi.stubGlobal('fetch',fetcher)
  const samples=await kartverketProvider().sample(terrainPoints(frame))
  expect(samples).toHaveLength(169)
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect(kartverketProvider().covers(59.92,10.75)).toBe(true)
  expect(kartverketProvider().covers(55.69,12.55)).toBe(false)
})
it('stops Kartverket batches immediately on cancellation', async () => {
  const controller=new AbortController()
  const fetcher=vi.fn(async()=>{controller.abort();return new Response('{}')})
  vi.stubGlobal('fetch',fetcher)
  await expect(kartverketProvider().sample(terrainPoints(frame),controller.signal)).rejects.toMatchObject({name:'AbortError'})
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('decodes negative, zero and fractional Terrarium heights and bilinear interpolation', () => {
  const pixels=new Uint8ClampedArray([128,0,0,255,128,10,128,255,127,246,0,255,128,20,0,255])
  const raster=decodeTerrarium(pixels,2,2)
  expect(Array.from(raster.heights)).toEqual([0,10.5,-10,20])
  expect(sampleTerrarium(raster,0.5,0.5)).toBe(5.125)
  expect(sampleTerrarium(raster,1,0)).toBe(10.5)
  expect(sampleTerrarium(raster,-5,8)).toBe(-10)
  expect(()=>decodeTerrarium(pixels,1,2)).toThrow(/dimensions/)
})
it('treats transparent pixels as missing, not zero elevation', () => {
  const raster=decodeTerrarium(new Uint8ClampedArray([128,0,0,255,0,0,0,0]),2,1)
  expect(sampleTerrarium(raster,0,0)).toBe(0)
  expect(sampleTerrarium(raster,0.5,0)).toBeNull()
  expect(sampleTerrarium(raster,1,0)).toBeNull()
})
it('exposes global Terrarium coverage and honours already-aborted calls without browser APIs', async () => {
  const provider=terrariumProvider()
  expect(provider.covers(59.316,18.071)).toBe(true)
  expect(provider.covers(90,18)).toBe(false)
  await expect(provider.sample([[18,59]],AbortSignal.abort())).rejects.toMatchObject({name:'AbortError'})
})
it.each([[59.9225,10.7595,'Europe/Oslo'],[60.3977,5.3229,'Europe/Oslo'],[63.428,10.4029,'Europe/Oslo'],[59.316,18.071,'Europe/Stockholm'],[57.6984,11.9558,'Europe/Stockholm'],[55.5934,13.0129,'Europe/Stockholm'],[55.6959,12.545,'Europe/Copenhagen'],[56.1587,10.2099,'Europe/Copenhagen'],[60.184,24.9525,'Europe/Helsinki'],[65.012,25.471,'Europe/Helsinki'],[60.097,19.935,'Europe/Helsinki'],[69.907,27.028,'Europe/Helsinki'],[63.826,20.263,'Europe/Stockholm'],[65.584,22.154,'Europe/Stockholm'],[67.856,20.225,'Europe/Stockholm'],[69.969,23.272,'Europe/Oslo'],[69.727,30.045,'Europe/Oslo'],[54,4,'UTC']] as const)('assigns bbox zone at %s,%s', (lat,lon,zone)=>{
  expect(timeZoneFor(lat,lon)).toBe(zone)
})
