import { expect, it } from 'vitest'
import manifest from '../../../public/sites/compact-infill/manifest.json'
import { parseSiteManifest } from './manifest'
it.each(['user-import','curated-demo','licensed-real-world-simplified'])('accepts dataStatus %s', (dataStatus) => {
  expect(parseSiteManifest({...manifest,dataStatus}).dataStatus).toBe(dataStatus)
})
it('rejects an unrecognized dataStatus', () => {
  expect(()=>parseSiteManifest({...manifest,dataStatus:'surveyed'})).toThrow(/unknown data status/)
})
