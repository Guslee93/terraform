export function detectWebGL(): 'webgl2' | 'webgl' | 'none' {
  try {
    const canvas = document.createElement('canvas')
    const webgl2 = canvas.getContext('webgl2')
    const context = webgl2 ?? canvas.getContext('webgl')
    if (!context) return 'none'
    // This probe never renders; release its context rather than using a browser context slot.
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return webgl2 ? 'webgl2' : 'webgl'
  } catch {
    return 'none'
  }
}
