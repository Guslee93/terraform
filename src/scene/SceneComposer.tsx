import { useEffect, useState } from 'react'
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

/**
 * Render → N8AO ambient occlusion → neutral tone mapping (ADR-0005). AO runs in linear light
 * before tone mapping, so the renderer's own tone mapping is bypassed while this is mounted.
 * Rendering at priority 1 takes over the frame loop from R3F. Default export so the viewport can
 * lazy-load it: postprocessing + n8ao are ~96 kB gzip and must not delay the first frame.
 */
export default function SceneComposer() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  // Built inside the effect, not useMemo: StrictMode mounts effects twice, and a memoised
  // composer disposed by the first cleanup has no passes left, freezing the canvas on its
  // last frame (camera moves and new masses never appeared).
  const [composer, setComposer] = useState<EffectComposer | null>(null)

  useEffect(() => {
    const effectComposer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 })
    effectComposer.addPass(new RenderPass(scene, camera))
    const ao = new N8AOPostPass(scene, camera)
    ao.setQualityMode('Medium')
    // Metres: contact darkening at wall bases, in courtyards and between close blocks.
    ao.configuration.aoRadius = 4
    ao.configuration.distanceFalloff = 1
    ao.configuration.intensity = 1.6
    // Cool dark grey, matching the blue-grey hemisphere shade instead of black.
    ao.configuration.color = new Color('#2B3138')
    effectComposer.addPass(ao)
    effectComposer.addPass(
      new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })),
    )
    setComposer(effectComposer)
    return () => {
      setComposer(null)
      effectComposer.dispose()
    }
  }, [gl, scene, camera])

  useEffect(() => composer?.setSize(size.width, size.height), [composer, size.width, size.height])

  // A priority-1 frame callback switches off R3F's own render, so draw directly until ready.
  useFrame((_, delta) => {
    if (composer) composer.render(delta)
    else gl.render(scene, camera)
  }, 1)
  return null
}
