export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Import cancelled', 'AbortError')
}
/** Also cancels waiting for a custom provider that ignores the signal. */
export async function abortable<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  checkAbort(signal)
  let onAbort: (() => void) | undefined
  try {
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(new DOMException('Import cancelled', 'AbortError'))
      signal?.addEventListener('abort', onAbort, { once: true })
    })
    const result = await Promise.race([action(), cancelled])
    checkAbort(signal)
    return result
  } finally {
    if (onAbort) signal?.removeEventListener('abort', onAbort)
  }
}
export async function requestBytes(url: string, source: string, signal?: AbortSignal, timeoutMs = 30_000, init?: RequestInit): Promise<ArrayBuffer> {
  checkAbort(signal)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs / 1000} s`)), timeoutMs)
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    return await abortable(async () => {
      const response = await fetch(url, { ...init, signal: controller.signal })
      checkAbort(signal)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.arrayBuffer()
    }, signal)
  } catch (error) {
    checkAbort(signal)
    throw new Error(`${source}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
