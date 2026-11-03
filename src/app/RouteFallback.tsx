export function RouteFallback() {
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

