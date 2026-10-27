import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import { parseSiteManifest } from './manifest'
import {
  loadSitePackage,
  parseBuildings,
  parseStudyArea,
  parseTerrain,
  type SitePackage,
} from './package'
import { useSitePackage } from './useSitePackage'
import type * as packageModule from './package'

vi.mock('./package', async (importOriginal) => {
  const actual = await importOriginal<typeof packageModule>()
  return { ...actual, loadSitePackage: vi.fn() }
})

const SAMPLE_PACKAGE: SitePackage = {
  manifest: parseSiteManifest(compactManifest),
  terrain: parseTerrain(compactTerrain),
  buildings: parseBuildings(compactBuildings),
  studyArea: parseStudyArea(compactStudyArea),
}

const NO_SITE: string | null = null

describe('useSitePackage', () => {
  beforeEach(() => {
    vi.mocked(loadSitePackage).mockReset()
  })

  it('is idle when no site is chosen and never loads', () => {
    const { result } = renderHook(() => useSitePackage(null))

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(loadSitePackage).not.toHaveBeenCalled()
  })

  it('moves a chosen site through loading to ready', async () => {
    vi.mocked(loadSitePackage).mockResolvedValue(SAMPLE_PACKAGE)

    const { result } = renderHook(() => useSitePackage('compact-infill'))

    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data?.manifest.id).toBe('compact-infill')
    expect(loadSitePackage).toHaveBeenCalledWith('compact-infill', expect.any(AbortSignal))
  })

  it('returns idle when the chosen site changes to none', async () => {
    vi.mocked(loadSitePackage).mockResolvedValue(SAMPLE_PACKAGE)

    const { result, rerender } = renderHook<
      ReturnType<typeof useSitePackage>,
      { siteId: string | null }
    >(
      ({ siteId }) => useSitePackage(siteId),
      { initialProps: { siteId: NO_SITE } },
    )
    expect(result.current.status).toBe('idle')

    rerender({ siteId: 'compact-infill' })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ siteId: null })

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('reports a load failure as error with a retry action', async () => {
    vi.mocked(loadSitePackage).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useSitePackage('compact-infill'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('boom')
    expect(typeof result.current.retry).toBe('function')
  })
})