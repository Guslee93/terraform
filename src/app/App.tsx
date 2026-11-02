import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AboutPage } from './AboutPage'
import { AppErrorBoundary } from './AppErrorBoundary'
import { LandingPage } from './LandingPage'
import { NotFoundPage } from './NotFoundPage'

const StudioPage = lazy(() =>
  import('./StudioPage').then((module) => ({ default: module.StudioPage })),
)

function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-app">
      <div className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto block size-7 animate-pulse rounded-full border border-line bg-muted-fill"
        />
        <p className="mt-3 text-label text-ink-secondary">
          Preparing the studio
        </p>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio/:siteId" element={<StudioPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AppErrorBoundary>
  )
}
