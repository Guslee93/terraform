import type { WebGLRenderer } from 'three'

/** Software rasterisers: headless Chromium (SwiftShader), Mesa (llvmpipe, softpipe), Windows WARP. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

/** True when the WebGL renderer name belongs to a CPU rasteriser, where post-processing is too slow. */
export function isSoftwareRenderer(rendererName: string): boolean {
  return SOFTWARE_RENDERER.test(rendererName)
}

/** Unmasked renderer name, or '' when the browser hides it (then treat the GPU as hardware). */
export function webglRendererName(gl: WebGLRenderer): string {
  try {
    const context = gl.getContext()
    const extension = context.getExtension('WEBGL_debug_renderer_info')
    if (!extension) return ''
    const name: unknown = context.getParameter(extension.UNMASKED_RENDERER_WEBGL)
    return typeof name === 'string' ? name : ''
  } catch {
    return ''
  }
}
