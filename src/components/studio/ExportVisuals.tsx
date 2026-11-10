import { useState } from 'react'
import { passFileName, recordCanvas, type PassImages, type PassName } from '../../scene/exportPasses'
import { pillButtonClass } from '../ui/controls'

const CLIP_MS = 6000

function download(href: string, name: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
}

/** Saves each captured pass as a PNG; returns how many were saved. */
export function downloadPasses(images: PassImages, siteId: string): number {
  const names: PassName[] = ['still', 'depth', 'white', 'analysis']
  let count = 0
  for (const name of names) {
    const image = images[name]
    if (!image) continue
    download(image, passFileName(siteId, name))
    count += 1
  }
  return count
}

/**
 * Rendering spec Phase 3 (ADR-0019): image passes for offline enhancement, and a short clip.
 * The passes are captured by the viewport (`onExportPasses`); the clip records the live canvas.
 */
export function ExportVisuals({ siteId, onExportPasses, exporting, message }: {
  siteId: string
  onExportPasses: () => void
  exporting: boolean
  message: string | null
}) {
  const [recording, setRecording] = useState(false)
  const [clipMessage, setClipMessage] = useState<string | null>(null)
  const busy = exporting || recording

  const recordClip = async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('section[aria-label="Studio viewport"] canvas')
    if (!canvas) return setClipMessage('Viewport not ready.')
    setRecording(true)
    setClipMessage('Recording 6 s…')
    try {
      const { blob, extension } = await recordCanvas(canvas, CLIP_MS)
      const url = URL.createObjectURL(blob)
      download(url, passFileName(siteId, 'clip', extension))
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setClipMessage('Clip saved.')
    } catch (error) {
      setClipMessage(error instanceof Error ? error.message : 'Recording failed.')
    } finally {
      setRecording(false)
    }
  }

  return (
    <div className="mt-3 border-t border-card-line pt-3">
      <p className="text-body-sm text-ink-secondary">Export visuals</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => { setClipMessage(null); onExportPasses() }} className={pillButtonClass}>Image passes</button>
        <button type="button" disabled={busy} onClick={() => void recordClip()} className={pillButtonClass}>Record 6 s clip</button>
      </div>
      <p className="mt-2 text-caption text-ink-secondary">
        4K still plus depth, white-model and analysis-overlay passes for offline enhancement. Label enhanced images as visualisations.
      </p>
      {(clipMessage ?? message) && <p role="status" className="mt-1 text-caption text-ink-secondary">{clipMessage ?? message}</p>}
    </div>
  )
}
