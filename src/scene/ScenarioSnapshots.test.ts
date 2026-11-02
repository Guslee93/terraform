import { describe, expect, it, vi } from 'vitest'
import { Group, PerspectiveCamera, Scene, type WebGLRenderer } from 'three'
import { captureScenarioPair } from './ScenarioSnapshots'

describe('captureScenarioPair', () => {
  it('uses one camera and context, then restores visibility even when capture throws', () => {
    const scene = new Scene(), camera = new PerspectiveCamera(), live = new Group(), a = new Group(), b = new Group()
    a.visible = false; b.visible = false
    const render = vi.fn()
    const gl = {
      getRenderTarget: () => null, setRenderTarget: vi.fn(), shadowMap: { needsUpdate: false },
      getContext: () => ({ isContextLost: () => false }), render,
      domElement: { toDataURL: vi.fn().mockReturnValueOnce('data:image/png;base64,a').mockImplementationOnce(() => { throw new Error('unsupported') }) },
    } as unknown as WebGLRenderer
    expect(() => captureScenarioPair(gl, scene, camera, live, a, b)).toThrow('unsupported')
    expect(render.mock.calls).toEqual([[scene,camera],[scene,camera]])
    expect([live.visible,a.visible,b.visible]).toEqual([true,false,false])
    expect(gl.setRenderTarget).toHaveBeenLastCalledWith(null)
  })
})
