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

const AO_INTENSITY = 1.6
/** Polish fades back in over this after a drag ends (rendering spec). */
const FADE_IN_S = 0.3

type Passes = { composer: EffectComposer; ao: N8AOPostPass }

/**
 * Render → N8AO ambient occlusion → neutral tone mapping (ADR-0005, ADR-0018). AO runs in
 * linear light before tone mapping, so the renderer's own tone mapping is bypassed while this is
 * mounted. Rendering at priority 1 takes over the frame loop from R3F. While `busy` (a mass
 * drag) AO is off; it fades back in after.
 * Default export so the viewport can lazy-load it: postprocessing + n8ao are ~96 kB gzip.
 */
export default function SceneComposer({ ao, busy }: { ao: 'full' | 'half'; busy: boolean }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

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
    aoPass.configuration.aoRadius = 4
    aoPass.configuration.distanceFalloff = 1
    aoPass.configuration.intensity = AO_INTENSITY
    // Cool dark grey, matching the blue-grey hemisphere shade instead of black.
    aoPass.configuration.color = new Color('#2B3138')
    composer.addPass(aoPass)
    composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })))
    setPasses({ composer, ao: aoPass })
    return () => {
      setPasses(null)
      composer.dispose()
    }
  }, [gl, scene, camera, ao])

  useEffect(() => passes?.composer.setSize(size.width, size.height), [passes, size.width, size.height])

  // A priority-1 frame callback switches off R3F's own render, so draw directly until ready.
  useFrame((_, delta) => {
    if (!passes) return gl.render(scene, camera)
    // Interaction beats polish: off at once while busy, eased back in after.
    polish.current = busy ? 0 : Math.min(1, polish.current + delta / FADE_IN_S)
    passes.ao.enabled = polish.current > 0
    passes.ao.configuration.intensity = AO_INTENSITY * polish.current
    passes.composer.render(delta)
  }, 1)
  return null
}
