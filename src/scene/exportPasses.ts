import {
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three'

/** Rendering spec Phase 3 (ADR-0019): the still is 4K wide. */
export const EXPORT_WIDTH_PX = 3840
/** Scene objects drawn into the transparent analysis pass (wind and noise layers). */
export const ANALYSIS_OVERLAY_NAME = 'analysis-overlay'

export type PassName = 'still' | 'depth' | 'white' | 'analysis'
export type PassImages = { readonly [K in PassName]?: string }

/**
 * Device pixel ratio that makes a `cssWidth` × `cssHeight` canvas `targetWidth` pixels wide,
 * capped so neither side exceeds the GPU's `maxSize`.
 */
export function exportPixelRatio(cssWidth: number, cssHeight: number, maxSize: number, targetWidth = EXPORT_WIDTH_PX): number {
  if (cssWidth <= 0 || cssHeight <= 0) return 1
  return Math.min(targetWidth / cssWidth, maxSize / cssWidth, maxSize / cssHeight)
}

/** e.g. `terraform-compact-infill-depth.png`. */
export function passFileName(siteId: string, pass: PassName | 'clip', extension = 'png'): string {
  const safe = siteId.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  return `terraform-${safe}-${pass}.${extension}`
}

/** First recordable container the browser supports (Chrome/Firefox WebM, Safari MP4), or null. */
export function pickVideoType(isTypeSupported: (type: string) => boolean): { mime: string; extension: string } | null {
  const options = [
    { mime: 'video/webm;codecs=vp9', extension: 'webm' },
    { mime: 'video/webm', extension: 'webm' },
    { mime: 'video/mp4', extension: 'mp4' },
  ]
  return options.find((option) => isTypeSupported(option.mime)) ?? null
}

/** Linear view depth: near = white, far = black (what depth-guided image tools expect). Instancing-aware. */
function depthMaterial(near: number, far: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { near: { value: near }, far: { value: far } },
    vertexShader: /* glsl */ `
      #include <common>
      varying float vDepth;
      void main() {
        #include <begin_vertex>
        #include <project_vertex>
        vDepth = -mvPosition.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform float near;
      uniform float far;
      varying float vDepth;
      void main() {
        gl_FragColor = vec4(vec3(1.0 - clamp((vDepth - near) / (far - near), 0.0, 1.0)), 1.0);
      }`,
  })
}

/** Fat lines (drei Line/Edges) are instanced quads that an override material would draw as junk. */
function isFatLine(object: Object3D): boolean {
  const material = (object as Object3D & { material?: Material & { isLineMaterial?: boolean } }).material
  return material?.isLineMaterial === true
}

/**
 * Renders the depth, white-model and analysis passes of the current view with `gl`, returning
 * PNG data URLs. Scene state (override material, background, fog, visibility, clear colour,
 * auto-clear) is restored even if a render throws. `still` is not drawn here: it is the
 * composer's own frame, captured by the caller before this runs.
 */
export function renderPasses(gl: WebGLRenderer, scene: Scene, camera: Camera, focusDistance: number): PassImages {
  const saved = {
    override: scene.overrideMaterial,
    background: scene.background,
    fog: scene.fog,
    autoClear: gl.autoClear,
    clearColor: gl.getClearColor(new Color()),
    clearAlpha: gl.getClearAlpha(),
  }
  const hidden: Object3D[] = []
  scene.traverse((object) => {
    if (object.visible && isFatLine(object)) {
      object.visible = false
      hidden.push(object)
    }
  })
  // Near half the focus distance is white, twice it is black: buildings around the target span the range.
  const depth = depthMaterial(Math.max(0.5, focusDistance * 0.5), focusDistance * 2)
  const white = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, metalness: 0, fog: false })
  const depthOnly = new MeshBasicMaterial({ colorWrite: false })
  const overlay = scene.getObjectByName(ANALYSIS_OVERLAY_NAME)
  const overlayVisible = overlay?.visible ?? false
  const background = saved.background instanceof Color ? saved.background : new Color('#FFFFFF')
  const capture = () => {
    const png = gl.domElement.toDataURL('image/png')
    if (!png.startsWith('data:image/png;base64,')) throw new Error('Image capture unavailable')
    return png
  }
  // postprocessing's composer turns autoClear off, so every pass clears explicitly.
  const draw = (root: Object3D, clear: Color | null, alpha = 1) => {
    if (clear) {
      gl.setClearColor(clear, alpha)
      gl.clear(true, true, true)
    }
    gl.render(root, camera)
  }
  try {
    scene.fog = null
    scene.background = null
    gl.autoClear = false
    gl.setRenderTarget(null)
    gl.shadowMap.needsUpdate = true
    // Depth and white model show geometry only, without the analysis layers.
    if (overlay) overlay.visible = false

    scene.overrideMaterial = depth
    draw(scene, new Color('#000000'))
    const depthPng = capture()

    scene.overrideMaterial = white
    draw(scene, background)
    const whitePng = capture()

    // Analysis layers alone on a transparent background, hidden where buildings stand in front.
    let analysisPng: string | undefined
    if (overlay && overlayVisible && overlay.children.length > 0) {
      scene.overrideMaterial = depthOnly
      draw(scene, new Color('#000000'), 0)
      scene.overrideMaterial = null
      overlay.visible = true
      draw(overlay, null)
      analysisPng = capture()
    }
    return { depth: depthPng, white: whitePng, ...(analysisPng ? { analysis: analysisPng } : {}) }
  } finally {
    if (overlay) overlay.visible = overlayVisible
    scene.overrideMaterial = saved.override
    scene.background = saved.background
    scene.fog = saved.fog
    gl.autoClear = saved.autoClear
    gl.setClearColor(saved.clearColor, saved.clearAlpha)
    for (const object of hidden) object.visible = true
    gl.shadowMap.needsUpdate = true
    depth.dispose()
    white.dispose()
    depthOnly.dispose()
  }
}

/** Records `ms` of the canvas as video. Rejects when the browser cannot record a canvas. */
export function recordCanvas(canvas: HTMLCanvasElement, ms: number): Promise<{ blob: Blob; extension: string }> {
  const type = typeof MediaRecorder === 'undefined' ? null : pickVideoType((mime) => MediaRecorder.isTypeSupported(mime))
  if (!type || typeof canvas.captureStream !== 'function') return Promise.reject(new Error('This browser cannot record the viewport.'))
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 12_000_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
    recorder.onerror = () => reject(new Error('Recording failed.'))
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      resolve({ blob: new Blob(chunks, { type: type.mime }), extension: type.extension })
    }
    recorder.start()
    window.setTimeout(() => recorder.stop(), ms)
  })
}
