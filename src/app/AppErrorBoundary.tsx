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
      <main className="grid min-h-dvh place-items-center bg-app px-6">
        <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-danger">
            Interface error
          </p>
          <h1 className="mt-3 font-display text-[28px] leading-tight text-ink">
            The studio could not render.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
            Nothing was saved or changed. Reload the demo to return to the prepared site. If the
            problem persists, clear this site’s local storage and try again.
          </p>
          <Button className="mt-6" onClick={this.reload}>
            Reload the demo
          </Button>
        </div>
      </main>
    )
  }
}
