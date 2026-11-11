import { RouteFallback } from './RouteFallback'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AboutPage } from './AboutPage'
import { AppErrorBoundary } from './AppErrorBoundary'
import { LandingPage } from './LandingPage'
import { NotFoundPage } from './NotFoundPage'

const StudioPage = lazy(() =>
  import('./StudioPage').then((module) => ({ default: module.StudioPage })),
)
const ImportedStudioPage = lazy(() =>
  import('./StudioPage').then((module) => ({ default: module.ImportedStudioPage })),
)
// MapLibre lives only in this chunk; the landing and studio never load it (ADR-0006).
const NewSitePage = lazy(() =>
  import('./NewSitePage').then((module) => ({ default: module.NewSitePage })),
)

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // A link such as /about#data goes to its section; everything else starts at the top.
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target?.scrollIntoView) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio/import/:importId" element={<ImportedStudioPage />} />
        <Route path="/studio/:siteId" element={<StudioPage />} />
        <Route path="/new" element={<NewSitePage />} />
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
