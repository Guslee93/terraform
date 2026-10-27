import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { SceneErrorBoundary } from './SceneErrorBoundary'

export const FIT_SITE_EVENT = 'terraform:fit-site'

function FitSiteHandler() {
  const { camera } = useThree()

  useEffect(() => {
    const fit = () => {
      camera.position.set(92, 74, 112)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
    }

    window.addEventListener(FIT_SITE_EVENT, fit)
    return () => window.removeEventListener(FIT_SITE_EVENT, fit)
  }, [camera])

  return null
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
      <planeGeometry args={[900, 900]} />
      <meshStandardMaterial color="#DDE3DA" roughness={0.96} metalness={0} />
    </mesh>
  )
}

export function ViewportCanvas() {
  return (
    <div
      className="relative h-full w-full bg-viewport"
      role="region"
      aria-label="3D site viewport. Drag to orbit, middle-drag to pan, scroll to zoom. The site model is not included in this preview."
    >
      <SceneErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: [92, 74, 112], fov: 32, near: 0.5, far: 2200 }}
        >
          <color attach="background" args={['#E8EBE7']} />
          <fog attach="fog" args={['#E8EBE7', 260, 620]} />

          <ambientLight intensity={0.85} />
          <hemisphereLight args={['#FFFFFF', '#C9CFC5', 0.65]} />
          <directionalLight
            position={[90, 130, 45]}
            intensity={1.55}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-190}
            shadow-camera-right={190}
            shadow-camera-top={190}
            shadow-camera-bottom={-190}
            shadow-camera-near={1}
            shadow-camera-far={420}
            shadow-bias={-0.0004}
          />

          <Ground />
          <gridHelper args={[600, 60, '#A6B0A3', '#C5CCC2']} position={[0, 0.01, 0]} />
          <gridHelper args={[600, 12, '#8A968B', '#B4BDB2']} position={[0, 0.02, 0]} />

          <FitSiteHandler />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.075}
            minDistance={24}
            maxDistance={420}
            maxPolarAngle={Math.PI / 2 - 0.02}
            target={[0, 0, 0]}
          />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  )
}
