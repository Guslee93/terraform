import type { OrbitControls } from '@react-three/drei'
import { useEffect, useRef, type ComponentRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraPreset, CameraPresetId } from '../features/sites/manifest'
import { enuToThreeXyz } from '../lib/coordinates'

export type OrbitControlsHandle = ComponentRef<typeof OrbitControls>

type CameraRigProps = {
  presetId: CameraPresetId
  nonce: number
  presets: Record<CameraPresetId, CameraPreset>
  controlsRef: RefObject<OrbitControlsHandle | null>
}

const DURATION = 0.75

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}

export function CameraRig({ presetId, nonce, presets, controlsRef }: CameraRigProps) {
  const { camera } = useThree()
  const startPosition = useRef(new Vector3())
  const endPosition = useRef(new Vector3())
  const startTarget = useRef(new Vector3())
  const endTarget = useRef(new Vector3())
  const progress = useRef(1)

  useEffect(() => {
    const preset = presets[presetId]
    const controls = controlsRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    startPosition.current.copy(camera.position)
    endPosition.current.set(...enuToThreeXyz(preset.position))
    startTarget.current.copy(controls?.target ?? new Vector3(0, 0, 0))
    endTarget.current.set(...enuToThreeXyz(preset.target))

    // No fov means the default (32°, as Compare thumbnails use), not whatever the last preset set.
    if (camera instanceof PerspectiveCamera && camera.fov !== (preset.fov ?? 32)) {
      camera.fov = preset.fov ?? 32
      camera.updateProjectionMatrix()
    }

    if (reduced) {
      camera.position.copy(endPosition.current)
      if (controls) {
        controls.target.copy(endTarget.current)
        controls.update()
      } else {
        camera.lookAt(endTarget.current)
      }
      progress.current = 1
      return
    }

    progress.current = 0
  }, [presetId, nonce, presets, camera, controlsRef])

  useFrame((_, delta) => {
    if (progress.current >= 1) return

    progress.current = Math.min(1, progress.current + delta / DURATION)
    const t = easeOutCubic(progress.current)
    camera.position.lerpVectors(startPosition.current, endPosition.current, t)

    const controls = controlsRef.current
    if (controls) {
      controls.target.lerpVectors(startTarget.current, endTarget.current, t)
      controls.update()
    } else {
      camera.lookAt(endTarget.current)
    }
  })

  return null
}
