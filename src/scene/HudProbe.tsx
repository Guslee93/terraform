import { useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { OrbitControlsHandle } from './CameraRig'
import { useHudStore } from './hudStore'

const NORTH = new Vector3(0, 0, -1)
const RIGHT = new Vector3()
const UP = new Vector3()
const ORIGIN = new Vector3()
const SCALES = [5, 10, 20, 50, 100, 200, 500]

export function HudProbe({ controlsRef }: { controlsRef: RefObject<OrbitControlsHandle | null> }) {
  const { camera, size } = useThree()
  const setHud = useHudStore((state) => state.setHud)
  const lastUpdate = useRef(0)

  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastUpdate.current < 0.1) return
    lastUpdate.current = clock.elapsedTime

    RIGHT.setFromMatrixColumn(camera.matrixWorld, 0)
    UP.setFromMatrixColumn(camera.matrixWorld, 1)
    const east = NORTH.dot(RIGHT)
    const north = NORTH.dot(UP)
    const bearingDegrees = (Math.atan2(east, north) * 180) / Math.PI + 360

    const target = controlsRef.current?.target ?? ORIGIN
    const distance = Math.max(camera.position.distanceTo(target), 1)
    const fov = 'fov' in camera ? camera.fov : 32
    const metresPerPixel = (2 * distance * Math.tan((fov * Math.PI) / 360)) / Math.max(size.height, 1)
    const targetMetres = metresPerPixel * 110
    const scale = SCALES.find((candidate) => candidate >= targetMetres) ?? 500
    const scaleWidthPx = Math.min(Math.max(scale / metresPerPixel, 40), 150)

    setHud({
      bearingDegrees: bearingDegrees % 360,
      scaleLabel: `${scale} m`,
      scaleWidthPx,
    })
  })

  return null
}
