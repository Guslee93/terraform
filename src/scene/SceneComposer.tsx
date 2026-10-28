import { useEffect, useMemo } from 'react'
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

  const composer = useMemo(() => {
    const effectComposer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 })
    effectComposer.addPass(new RenderPass(scene, camera))
    const ao = new N8AOPostPass(scene, camera)
    ao.setQualityMode('Medium')
    // Metres: contact darkening at wall bases, in courtyards and between close blocks.
    ao.configuration.aoRadius = 5
    ao.configuration.distanceFalloff = 1
    ao.configuration.intensity = 3
    // Cool dark grey, matching the blue-grey hemisphere shade instead of black.
    ao.configuration.color = new Color('#2B3138')
    effectComposer.addPass(ao)
    effectComposer.addPass(
      new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })),
    )
    return effectComposer
  }, [gl, scene, camera])

  useEffect(() => composer.setSize(size.width, size.height), [composer, size.width, size.height])
  useEffect(() => () => composer.dispose(), [composer])

  useFrame((_, delta) => composer.render(delta), 1)
  return null
}
