// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { abortable, requestBytes } from './request'
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
it('cancels a provider that ignores AbortSignal', async () => {
  const controller = new AbortController()
  const result = abortable(() => new Promise(()=>{}),controller.signal)
  controller.abort('custom reason')
  await expect(result).rejects.toMatchObject({name:'AbortError'})
})
it('rejects before invoking a provider when already cancelled', async () => {
  const action = vi.fn()
  await expect(abortable(action,AbortSignal.abort())).rejects.toMatchObject({name:'AbortError'})
  expect(action).not.toHaveBeenCalled()
})
it('names the failing source for HTTP errors', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})))
  await expect(requestBytes('https://example.test','Test tiles')).rejects.toThrow(/Test tiles: HTTP 503/)
})
it('aborts the response body on timeout', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch',vi.fn(async (_url, init: RequestInit) => ({ok:true,arrayBuffer:()=>new Promise((_resolve,reject)=>init.signal!.addEventListener('abort',()=>reject(new Error('timeout'))))})))
  const assertion = expect(requestBytes('https://example.test','Slow source')).rejects.toThrow(/Slow source: timeout/)
  await vi.advanceTimersByTimeAsync(30000)
  await assertion
})
