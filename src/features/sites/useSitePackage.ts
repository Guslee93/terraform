import { useCallback, useEffect, useState } from 'react'
import { loadSitePackage, type SitePackage } from './package'

type PackageState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: SitePackage; error: null }
  | { status: 'error'; data: null; error: string }

const IDLE: PackageState = { status: 'idle', data: null, error: null }
const INITIAL: PackageState = { status: 'loading', data: null, error: null }

export function useSitePackage(siteId: string | null) {
  const [state, setState] = useState<PackageState>(() => (siteId ? INITIAL : IDLE))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!siteId) {
      setState(IDLE)
      return
    }
    const controller = new AbortController()
    let active = true

    setState(INITIAL)

    loadSitePackage(siteId, controller.signal)
      .then((data) => {
        if (active) setState({ status: 'ready', data, error: null })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'The site package could not be loaded.',
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [siteId, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return { ...state, retry }
}
