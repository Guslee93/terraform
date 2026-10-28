import { describe, expect, it } from 'vitest'
import { isSoftwareRenderer } from './rendererTier'

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'softpipe',
    'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
  ])('treats %s as software', (name) => {
    expect(isSoftwareRenderer(name)).toBe(true)
  })

  it.each([
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    '',
  ])('treats %j as hardware', (name) => {
    expect(isSoftwareRenderer(name)).toBe(false)
  })
})
