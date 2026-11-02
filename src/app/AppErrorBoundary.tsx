import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[terraform] unhandled render error', error, info.componentStack)
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-dvh place-items-center bg-app px-4 py-16 sm:px-7">
        <div className="w-full max-w-2xl border-t border-line pt-8">
          <p className="text-caption text-ink-secondary">
            Interface error
          </p>
          <h1 className="mt-4 text-figure-s sm:text-figure-l text-ink">
            The studio could not render.
          </h1>
          <p className="mt-3 text-body leading-relaxed text-ink-secondary">
            Nothing was saved or changed. Reload the demo to return to the prepared site. If the
            problem persists, clear this site’s local storage and try again.
          </p>
          <Button className="mt-6 min-h-11" onClick={this.reload}>
            Reload the demo
          </Button>
        </div>
      </main>
    )
  }
}
