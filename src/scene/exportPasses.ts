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

/** Where the credit lines sit on an exported image: a band along the bottom edge. */
export type CreditLayout = {
  readonly fontPx: number
  readonly band: { readonly y: number; readonly height: number }
  readonly rows: readonly { readonly text: string; readonly x: number; readonly y: number }[]
}

/**
 * Lays the credit lines out for an image `width` × `height` pixels. Lines too long for the width
 * wrap between words. Attribution travels with the content (NLOD, ODbL, CC BY), so the exports
 * carry it in the picture itself (ADR-0032).
 * ponytail: line width is estimated from the character count (0.56 em per character), not
 * measured; measure with the 2D context if a credit ever clips.
 */
export function creditLayout(lines: readonly string[], width: number, height: number): CreditLayout | null {
  if (lines.length === 0 || width <= 0 || height <= 0) return null
  const fontPx = Math.max(11, Math.round(width / 160))
  const pad = Math.round(fontPx * 0.8)
  const perRow = Math.max(8, Math.floor((width - 2 * pad) / (fontPx * 0.56)))
  const wrapped: string[] = []
  for (const line of lines) {
    let row = ''
    for (const word of line.split(' ')) {
      if (row && row.length + 1 + word.length > perRow) { wrapped.push(row); row = word }
      else row = row ? `${row} ${word}` : word
    }
    if (row) wrapped.push(row)
  }
  const lineHeight = Math.round(fontPx * 1.35)
  const bandHeight = wrapped.length * lineHeight + 2 * pad
  const top = height - bandHeight
  return {
    fontPx,
    band: { y: top, height: bandHeight },
    rows: wrapped.map((text, index) => ({ text, x: pad, y: top + pad + index * lineHeight })),
  }
}

/** The part of a 2D context the credits need; a test passes a recorder. */
export type CreditContext = Pick<CanvasRenderingContext2D, 'fillRect' | 'fillText'> & { fillStyle: string | CanvasGradient | CanvasPattern; font: string; textBaseline: CanvasTextBaseline }

/** Draws the credit band onto `ctx`. Returns false when there is nothing to draw. */
export function drawCredits(ctx: CreditContext, lines: readonly string[], width: number, height: number): boolean {
  const layout = creditLayout(lines, width, height)
  if (!layout) return false
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  ctx.fillRect(0, layout.band.y, width, layout.band.height)
  ctx.fillStyle = '#1F2328'
  ctx.font = `${layout.fontPx}px Geist Variable, system-ui, sans-serif`
  ctx.textBaseline = 'top'
  for (const row of layout.rows) ctx.fillText(row.text, row.x, row.y)
  return true
}

/** PNG of `canvas` with the credit lines burned in. Without lines it is the canvas as it is. */
export function creditedPng(canvas: HTMLCanvasElement, lines: readonly string[]): string {
  let png: string
  if (lines.length === 0) png = canvas.toDataURL('image/png')
  else {
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    const ctx = copy.getContext('2d')
    // An export without its credits would break the licences: fail instead of saving one.
    if (!ctx) throw new Error('Image capture unavailable')
    ctx.drawImage(canvas, 0, 0)
    drawCredits(ctx, lines, copy.width, copy.height)
    png = copy.toDataURL('image/png')
  }
  if (!png.startsWith('data:image/png;base64,')) throw new Error('Image capture unavailable')
  return png
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

/** Point clouds must not take a mesh override material (TF-VIS-029); they are hidden per pass. */
function isPoints(object: Object3D): boolean {
  return (object as Object3D & { isPoints?: boolean }).isPoints === true
}

/**
 * Renders the depth, white-model and analysis passes of the current view with `gl`, returning
 * PNG data URLs. Scene state (override material, background, fog, visibility, clear colour,
 * auto-clear) is restored even if a render throws. `still` is not drawn here: it is the
 * composer's own frame, captured by the caller before this runs. `credits` are burned into the
 * white-model and analysis passes; the depth pass stays a clean depth signal (ADR-0032).
 */
export function renderPasses(gl: WebGLRenderer, scene: Scene, camera: Camera, focusDistance: number, credits: readonly string[] = []): PassImages {
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
    if (object.visible && (isFatLine(object) || isPoints(object))) {
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
  const capture = (lines: readonly string[] = credits) => creditedPng(gl.domElement, lines)
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
    const depthPng = capture([])

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

/**
 * Records `ms` of the canvas as video, with the credit lines burned into every frame. Rejects when
 * the browser cannot record a canvas.
 */
export function recordCanvas(canvas: HTMLCanvasElement, ms: number, credits: readonly string[] = []): Promise<{ blob: Blob; extension: string }> {
  const type = typeof MediaRecorder === 'undefined' ? null : pickVideoType((mime) => MediaRecorder.isTypeSupported(mime))
  if (!type || typeof canvas.captureStream !== 'function') return Promise.reject(new Error('This browser cannot record the viewport.'))
  // With credits the recording is of a 2D copy: each frame is the viewport plus the credit band.
  let recorded = canvas
  let frame = 0
  if (credits.length > 0) {
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    const ctx = copy.getContext('2d')
    if (!ctx) return Promise.reject(new Error('This browser cannot record the viewport.'))
    const draw = () => {
      // A frame the renderer skipped leaves the WebGL buffer cleared (transparent): the copy keeps
      // the last drawn frame under it, so the clip never flickers.
      ctx.drawImage(canvas, 0, 0, copy.width, copy.height)
      drawCredits(ctx, credits, copy.width, copy.height)
      frame = requestAnimationFrame(draw)
    }
    draw()
    recorded = copy
  }
  return new Promise((resolve, reject) => {
    const stream = recorded.captureStream(30)
    let recorder: MediaRecorder
    // A recorder that cannot start must not leave the per-frame copy running.
    try { recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 12_000_000 }) }
    catch { cancelAnimationFrame(frame); reject(new Error('Recording failed.')); return }
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
    recorder.onerror = () => { cancelAnimationFrame(frame); reject(new Error('Recording failed.')) }
    recorder.onstop = () => {
      cancelAnimationFrame(frame)
      stream.getTracks().forEach((track) => track.stop())
      resolve({ blob: new Blob(chunks, { type: type.mime }), extension: type.extension })
    }
    try { recorder.start() } catch { cancelAnimationFrame(frame); reject(new Error('Recording failed.')); return }
    window.setTimeout(() => recorder.stop(), ms)
  })
}
