// n8ao 2.0.1 ships no type declarations. This covers only the surface the scene uses (ADR-0005).
declare module 'n8ao' {
  import type { Camera, Color, Scene } from 'three'
  import { Pass } from 'postprocessing'

  export type N8AOQualityMode = 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number)
    configuration: {
      aoRadius: number
      distanceFalloff: number
      intensity: number
      color: Color
      halfRes: boolean
      screenSpaceRadius: boolean
    }
    setQualityMode(mode: N8AOQualityMode): void
  }
}
