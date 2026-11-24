import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { N8AOPostPass } from 'n8ao'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing'
import { Color, HalfFloatType } from 'three'
import { MistVignetteEffect } from './mistVignette'
import type { SceneStyle } from './style'

/** Polish fades back in over this after a drag ends (rendering spec). */
const FADE_IN_S = 0.3

type Passes = { composer: EffectComposer; ao: N8AOPostPass; toneMapping: ToneMappingEffect }

/**
 * Render → N8AO ambient occlusion → neutral tone mapping (ADR-0005, ADR-0018). AO runs in
 * linear light before tone mapping, so the renderer's own tone mapping is bypassed while this is
 * mounted. Rendering at priority 1 takes over the frame loop from R3F. While `busy` (a mass
 * drag) AO is off; it fades back in after.
 * Default export so the viewport can lazy-load it: postprocessing + n8ao are ~96 kB gzip.
 */
export default function SceneComposer({ ao, busy, style }: { ao: 'full' | 'half'; busy: boolean; style: SceneStyle }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  // The composer sizes its targets from the renderer's pixel ratio; resize when it changes (export).
  const dpr = useThree((state) => state.viewport.dpr)

  // Built inside the effect, not useMemo: StrictMode mounts effects twice, and a memoised
  // composer disposed by the first cleanup has no passes left, freezing the canvas on its
  // last frame (camera moves and new masses never appeared).
  const [passes, setPasses] = useState<Passes | null>(null)
  const polish = useRef(1)

  useEffect(() => {
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 })
    composer.addPass(new RenderPass(scene, camera))
    const aoPass = new N8AOPostPass(scene, camera)
    aoPass.setQualityMode('Medium')
    aoPass.configuration.halfRes = ao === 'half'
    // Metres: contact darkening at wall bases, in courtyards and between close blocks.
    aoPass.configuration.aoRadius = style.ao.radiusM
    aoPass.configuration.distanceFalloff = 1
    aoPass.configuration.intensity = style.ao.intensity
    // Cool dark grey, matching the blue-grey hemisphere shade instead of black.
    aoPass.configuration.color = new Color(style.ao.color)
    composer.addPass(aoPass)
    const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })
    composer.addPass(new EffectPass(camera, toneMapping))
    // Identity mist vignette (ADR-0041): the frame edges blur and mix into the mist colour, after
    // tone mapping. Only the composer applies it, so the depth / white / analysis export passes — which
    // render the scene directly — never see it. Provisional values, Lab-tunable.
    if (style.id === 'identity') {
      composer.addPass(new EffectPass(camera, new MistVignetteEffect({
        colour: style.hazeColour,
        strength: style.tuning?.vignetteStrength ?? 0.6,
        clearRadius: style.tuning?.mistClearRadius ?? 0.45,
        blurPx: style.tuning?.mistBlurPx ?? 14,
      })))
    }
    setPasses({ composer, ao: aoPass, toneMapping })
    return () => {
      setPasses(null)
      composer.dispose()
    }
  }, [gl, scene, camera, ao, style.ao, style.id, style.hazeColour, style.tuning?.vignetteStrength, style.tuning?.mistClearRadius, style.tuning?.mistBlurPx])

  useEffect(() => passes?.composer.setSize(size.width, size.height), [passes, size.width, size.height, dpr])

  // Live exposure (Lab slider): update the tone-mapping uniform without rebuilding the composer.
  useEffect(() => {
    const uniform = passes?.toneMapping.uniforms.get('toneMappingExposure')
    if (uniform) uniform.value = style.toneMappingExposure
  }, [passes, style.toneMappingExposure])

  // A priority-1 frame callback switches off R3F's own render, so draw directly until ready.
  useFrame((_, delta) => {
    if (!passes) return gl.render(scene, camera)
    // Interaction beats polish: off at once while busy, eased back in after.
    polish.current = busy ? 0 : Math.min(1, polish.current + delta / FADE_IN_S)
    passes.ao.enabled = polish.current > 0
    passes.ao.configuration.intensity = style.ao.intensity * polish.current
    passes.composer.render(delta)
  }, 1)
  return null
}
