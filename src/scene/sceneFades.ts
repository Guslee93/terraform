import { Vector4, type Material } from 'three'
import type { DissolveParams } from './dissolve'

/**
 * The scene-edge dissolve GLSL, shared by every faded material. `dissolveEdgeDistance` is the exact
 * mirror of the pure `dissolveAmount` in dissolve.ts (a rounded-rectangle signed distance).
 */
const DISSOLVE_GLSL = /* glsl */ `
float dissolveEdgeDistance(vec2 p) {
  vec2 centre = (uDissolveBounds.xy + uDissolveBounds.zw) * 0.5;
  vec2 halfSize = (uDissolveBounds.zw - uDissolveBounds.xy) * 0.5;
  float radius = uDissolveWidth;
  vec2 q = abs(p - centre) - halfSize + radius;
  float signed = min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - radius;
  float edgeDistance = -signed;
  return 1.0 - clamp(edgeDistance / uDissolveWidth, 0.0, 1.0);
}
`

/** The dissolve GLSL chunk and its uniforms, for materials that compose their own onBeforeCompile. */
export const dissolveUniforms = (dissolve: DissolveParams) => ({
  uDissolveBounds: { value: new Vector4(dissolve.minX, dissolve.minY, dissolve.maxX, dissolve.maxY) },
  uDissolveWidth: { value: dissolve.fadeWidth },
})

export const dissolveShaderChunk = (header: boolean) => `${header ? 'uniform vec4 uDissolveBounds;\nuniform float uDissolveWidth;\n' : ''}${DISSOLVE_GLSL}`
export const dissolveFactor = '1.0 - dissolveEdgeDistance(vSceneFadeWorld.xz)'

/**
 * Apply one or both scene fades to a material: the tile-edge dissolve (TF-VIS-02A) and/or a
 * camera-distance fade (TF-VIS-053 minor-contour density). The two multiply the base alpha and the
 * world position is computed once. Works for Mesh, Line and Points materials (all share the
 * `vec4 diffuseColor = vec4( diffuse, opacity );` line).
 */
export function applySceneFades(
  material: Material,
  opts: { dissolve?: DissolveParams | null; cameraFade?: { start: number; end: number } | null },
): Material {
  const { dissolve, cameraFade } = opts
  if (!dissolve && !cameraFade) return material
  material.transparent = true
  material.onBeforeCompile = (shader) => {
    if (dissolve) {
      shader.uniforms.uDissolveBounds = { value: new Vector4(dissolve.minX, dissolve.minY, dissolve.maxX, dissolve.maxY) }
      shader.uniforms.uDissolveWidth = { value: dissolve.fadeWidth }
    }
    if (cameraFade) {
      shader.uniforms.uFadeStart = { value: cameraFade.start }
      shader.uniforms.uFadeEnd = { value: cameraFade.end }
    }
    shader.vertexShader = 'varying vec3 vSceneFadeWorld;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n{ vec4 fadeWorldPos = modelMatrix * vec4(transformed, 1.0); vSceneFadeWorld = fadeWorldPos.xyz; }',
    )
    const header = ['varying vec3 vSceneFadeWorld;']
    const factors = ['1.0']
    if (dissolve) {
      header.push('uniform vec4 uDissolveBounds;', 'uniform float uDissolveWidth;', DISSOLVE_GLSL)
      factors.push('(1.0 - dissolveEdgeDistance(vSceneFadeWorld.xz))')
    }
    if (cameraFade) {
      header.push('uniform float uFadeStart;', 'uniform float uFadeEnd;')
      factors.push('(1.0 - smoothstep(uFadeStart, uFadeEnd, distance(vSceneFadeWorld, cameraPosition)))')
    }
    shader.fragmentShader = header.join('\n') + '\n' + shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      `vec4 diffuseColor = vec4( diffuse, opacity * (${factors.join(' * ')}) );`,
    )
  }
  material.customProgramCacheKey = () => `scene-fade-${dissolve?.fadeWidth ?? 0}-${cameraFade?.start ?? 0}-${cameraFade?.end ?? 0}`
  return material
}
