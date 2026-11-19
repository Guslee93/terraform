import { Vector3, Vector4, type Material } from 'three'
import type { DissolveParams, HazeParams } from './dissolve'

/**
 * The aerial-perspective haze GLSL (Run 9 T2), shared by every identity material. `hazeAmount` is
 * the exact mirror of the pure `hazeAmount` in dissolve.ts: the tile-edge fade plus horizontal
 * aerial perspective, so the site and the analysis circle stay crisp and every edge reaches the
 * haze colour. The mix happens after fog, in output space, toward `uHazeColor` (sRGB).
 */
const HAZE_GLSL = /* glsl */ `
float hazeEdgeDistance(vec2 p) {
  vec2 centre = (uHazeBounds.xy + uHazeBounds.zw) * 0.5;
  vec2 halfSize = (uHazeBounds.zw - uHazeBounds.xy) * 0.5;
  float radius = uHazeWidth;
  vec2 q = abs(p - centre) - halfSize + radius;
  float signed = min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - radius;
  float edgeDistance = -signed;
  return 1.0 - clamp(edgeDistance / uHazeWidth, 0.0, 1.0);
}
float hazeAmount(vec2 p) {
  float edge = hazeEdgeDistance(p);
  float dist = length(p);
  float aerial = dist <= uHazeStart ? 0.0 : (dist >= uHazeEnd ? 1.0 : (dist - uHazeStart) / (uHazeEnd - uHazeStart));
  return min(1.0, max(edge, aerial));
}
`

export type HazeInput = { readonly params: HazeParams; readonly colour: string }

/** The haze uniforms + GLSL chunk, for materials that compose their own onBeforeCompile. */
export const hazeUniforms = (haze: HazeInput) => {
  const [r, g, b] = hexToRgb(haze.colour)
  return {
    uHazeColor: { value: new Vector3(r, g, b) },
    uHazeBounds: { value: new Vector4(haze.params.minX, haze.params.minY, haze.params.maxX, haze.params.maxY) },
    uHazeWidth: { value: haze.params.fadeWidth },
    uHazeStart: { value: haze.params.hazeStart },
    uHazeEnd: { value: haze.params.hazeEnd },
  }
}
export const hazeShaderChunk = () => 'uniform vec3 uHazeColor;\nuniform vec4 uHazeBounds;\nuniform float uHazeWidth;\nuniform float uHazeStart;\nuniform float uHazeEnd;\n' + HAZE_GLSL
export const hazeMixLine = 'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, hazeAmount(vSceneFadeWorld.xz));'

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace(/^#/, ''), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

/**
 * Apply one or both scene fades to a material: the aerial-perspective haze (Run 9 T2, mixes toward
 * the haze colour, opaque) and/or a camera-distance fade (TF-VIS-053 minor-contour density, alpha).
 * Works for Mesh, Line and Points materials (all share the `diffuseColor` / `fog_fragment` lines).
 */
export function applySceneFades(
  material: Material,
  opts: { haze?: HazeInput | null; cameraFade?: { start: number; end: number } | null },
): Material {
  const { haze, cameraFade } = opts
  if (!haze && !cameraFade) return material
  if (cameraFade) material.transparent = true
  material.onBeforeCompile = (shader) => {
    if (haze) {
      const [r, g, b] = hexToRgb(haze.colour)
      shader.uniforms.uHazeColor = { value: new Vector3(r, g, b) }
      shader.uniforms.uHazeBounds = { value: new Vector4(haze.params.minX, haze.params.minY, haze.params.maxX, haze.params.maxY) }
      shader.uniforms.uHazeWidth = { value: haze.params.fadeWidth }
      shader.uniforms.uHazeStart = { value: haze.params.hazeStart }
      shader.uniforms.uHazeEnd = { value: haze.params.hazeEnd }
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
    if (haze) header.push('uniform vec3 uHazeColor;', 'uniform vec4 uHazeBounds;', 'uniform float uHazeWidth;', 'uniform float uHazeStart;', 'uniform float uHazeEnd;', HAZE_GLSL)
    if (cameraFade) header.push('uniform float uFadeStart;', 'uniform float uFadeEnd;')
    let fragment = header.join('\n') + '\n' + shader.fragmentShader
    if (cameraFade) {
      fragment = fragment.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * (1.0 - smoothstep(uFadeStart, uFadeEnd, distance(vSceneFadeWorld, cameraPosition))) );',
      )
    }
    if (haze) {
      fragment = fragment.replace(
        '#include <fog_fragment>',
        '#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, hazeAmount(vSceneFadeWorld.xz));',
      )
    }
    shader.fragmentShader = fragment
  }
  material.customProgramCacheKey = () => `scene-fade-${haze?.colour ?? 0}-${haze?.params.fadeWidth ?? 0}-${haze?.params.hazeStart ?? 0}-${haze?.params.hazeEnd ?? 0}-${cameraFade?.start ?? 0}-${cameraFade?.end ?? 0}`
  return material
}

export { type DissolveParams }
