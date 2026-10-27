import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[terraform] scene error', error, info.componentStack)
  }

  private retry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="grid h-full place-items-center bg-viewport p-8">
        <div className="max-w-sm text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-warning">
            3D view unavailable
          </p>
          <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
            WebGL could not start.
          </h2>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-secondary">
            The site information and numeric inspector still work. Try a current browser with
            hardware acceleration enabled, or reload the view.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-[12px] font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
