import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readRenderPreference, RENDER_QUALITY_KEY, resolveProfile, writeRenderPreference,
} from './renderQuality'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('resolveProfile', () => {
  it.each(['SwiftShader', 'llvmpipe', 'softpipe', 'Microsoft Basic Render Driver'])(
    'uses Low automatically for %s', (renderer) => expect(resolveProfile('auto', renderer)).toBe('low'),
  )
  it.each(['Apple M1', 'NVIDIA RTX', ''])(
    'uses High automatically for hardware or hidden renderer %s',
    (renderer) => expect(resolveProfile('auto', renderer)).toBe('high'),
  )
  it.each(['high', 'balanced', 'low'] as const)('honours explicit %s even on software GL', (profile) => {
    expect(resolveProfile(profile, 'SwiftShader')).toBe(profile)
    expect(resolveProfile(profile, 'Apple M1')).toBe(profile)
  })
})

describe('render preference storage', () => {
  it.each(['auto', 'high', 'balanced', 'low'] as const)('persists %s', (preference) => {
    expect(writeRenderPreference(preference)).toBe(preference)
    expect(localStorage.getItem(RENDER_QUALITY_KEY)).toBe(preference)
    expect(readRenderPreference()).toBe(preference)
  })
  it('defaults missing and invalid preferences to Auto', () => {
    expect(readRenderPreference()).toBe('auto')
    localStorage.setItem(RENDER_QUALITY_KEY, 'ultra')
    expect(readRenderPreference()).toBe('auto')
  })
  it('falls back to Auto when reading throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readRenderPreference()).toBe('auto')
  })
  it('falls back to Auto when writing throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(writeRenderPreference('high')).toBe('auto')
  })
  it('also catches access to the storage property itself', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('private') })
    expect(readRenderPreference()).toBe('auto')
    expect(writeRenderPreference('low')).toBe('auto')
  })
})
