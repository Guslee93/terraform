import { useEffect, useRef } from 'react'
import { addAfterEffect, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { exportPixelRatio, renderPasses, type PassImages } from './exportPasses'
import type { OrbitControlsHandle } from './CameraRig'

/** Frames to let the composer and shadow map settle at the export resolution. */
const SETTLE_FRAMES = 4

/**
 * On each new `request`, raises the pixel ratio to 4K, waits a few frames, captures the
 * composer's finished frame (the still) right after it is drawn, then the depth, white-model
 * and analysis passes, and restores the pixel ratio (ADR-0019).
 */
export function PassExporter({ request, controls, onDone }: {
  request: number | null
  controls: { current: OrbitControlsHandle | null }
  onDone: (result: PassImages | Error) => void
}) {
  const get = useThree((state) => state.get)
  const handled = useRef<number | null>(null)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })

  useEffect(() => {
    if (request === null || handled.current === request) return
    const { gl, size, viewport, setDpr } = get()
    const originalDpr = viewport.dpr
    let frames = SETTLE_FRAMES
    let finished = false
    const exportDpr = exportPixelRatio(size.width, size.height, gl.capabilities.maxTextureSize)
    // Frames allowed to re-raise the ratio before capturing anyway (never worse than a screen-size export).
    let reraises = 120
    setDpr(exportDpr)
    const finish = (result: PassImages | Error) => {
      finished = true
      handled.current = request
      stop()
      get().setDpr(originalDpr)
      done.current(result)
    }
    const stop = addAfterEffect(() => {
      if (finished) return
      // Any re-render of the canvas (sun playback, wind demo) puts the pixel ratio back to the
      // screen value. Raise it again and wait for a frame actually drawn at the export size.
      if (get().viewport.dpr !== exportDpr && --reraises > 0) {
        get().setDpr(exportDpr)
        frames = Math.max(frames, 1)
        return
      }
      if (--frames > 0) return
      try {
        const { gl: renderer, scene, camera } = get()
        const still = renderer.domElement.toDataURL('image/png')
        const target = controls.current?.target ?? new Vector3()
        const passes = renderPasses(renderer, scene, camera, camera.position.distanceTo(target))
        finish({ still, ...passes })
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Export failed.'))
      }
    })
    return () => {
      if (!finished) { stop(); get().setDpr(originalDpr) }
    }
  }, [request, get, controls])
  return null
}
