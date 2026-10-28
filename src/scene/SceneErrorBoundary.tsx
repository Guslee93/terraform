import { Component, type ErrorInfo, type ReactNode } from 'react'

/** `fallback` replaces the default WebGL notice, e.g. `null` to drop an optional effect. */
type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean }

export function SceneUnavailable({
  reason,
  onRetry,
}: {
  reason: 'unsupported' | 'runtime'
  onRetry?: () => void
}) {
  return (
    <div className="grid h-full place-items-center bg-viewport p-8">
      <div className="max-w-sm text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-warning">
          {reason === 'unsupported' ? 'WebGL unavailable' : 'Rendering interrupted'}
        </p>
        <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
          3D view unavailable
        </h2>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-secondary">
          {reason === 'unsupported'
            ? "WebGL isn't available in this browser."
            : 'The 3D renderer could not start or stopped unexpectedly.'}{' '}
          The inspector, masses list, site data and metrics still work. Enable hardware
          acceleration in your browser settings, then restart the browser, or try a current browser.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-[12px] font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

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
    if (this.props.fallback !== undefined) return this.props.fallback

    return <SceneUnavailable reason="runtime" onRetry={this.retry} />
  }
}
