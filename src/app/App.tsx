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
    <main className="grid min-h-dvh place-items-center bg-app px-4 py-16 sm:px-7">
      <div role="status" aria-live="polite" className="w-full max-w-2xl border-t border-line pt-8">
        <span
          aria-hidden="true"
          className="block h-1 w-16 animate-pulse bg-muted-fill"
        />
        <h1 className="mt-4 text-figure-s text-ink sm:text-figure-l">
          Preparing the studio
        </h1>
        <a href="/" className="mt-6 inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4">
          Back to the sites
        </a>
      </div>
    </main>
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
