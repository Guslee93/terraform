// SVG presentation attributes use the same tokens as the surrounding interface.
const palette = {
  ink: 'var(--ink-primary)',
  secondary: 'var(--ink-secondary)',
  ground: 'var(--surface-viewport)',
  top: 'var(--surface-paper)',
  left: 'var(--border)',
  right: 'var(--muted-fill)',
  accent: 'var(--accent)',
}

type IsoBlockProps = {
  x: number
  y: number
  width: number
  depth: number
  height: number
  top: string
  left: string
  right: string
}

/**
 * A deterministic axonometric block for the landing illustration.
 * No site data is implied: this is a diagrammatic study, not a parcel claim.
 */
function IsoBlock({ x, y, width, depth, height, top, left, right }: IsoBlockProps) {
  const eastX = Math.cos(Math.PI / 6) * width
  const eastY = Math.sin(Math.PI / 6) * width
  const northX = -Math.cos(Math.PI / 6) * depth
  const northY = Math.sin(Math.PI / 6) * depth

  const point = (vx: number, vy: number) => `${(x + vx).toFixed(2)},${(y + vy).toFixed(2)}`

  const topFace = [
    point(0, -height),
    point(eastX, eastY - height),
    point(eastX + northX, eastY + northY - height),
    point(northX, northY - height),
  ].join(' ')

  const rightFace = [
    point(0, 0),
    point(eastX, eastY),
    point(eastX, eastY - height),
    point(0, -height),
  ].join(' ')

  const leftFace = [
    point(0, 0),
    point(northX, northY),
    point(northX, northY - height),
    point(0, -height),
  ].join(' ')

  return (
    <g>
      <polygon points={leftFace} fill={left} stroke={palette.ink} strokeOpacity={0.08} strokeWidth={0.75} />
      <polygon points={rightFace} fill={right} stroke={palette.ink} strokeOpacity={0.08} strokeWidth={0.75} />
      <polygon points={topFace} fill={top} stroke={palette.ink} strokeOpacity={0.08} strokeWidth={0.75} />
    </g>
  )
}

export function SiteStudyGraphic() {
  return (
    <svg
      viewBox="0 0 640 480"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
    >
      <rect width="640" height="480" fill={palette.ground} />

      <g stroke={palette.secondary} strokeOpacity="0.28" fill="none" strokeWidth="1">
        <path d="M-40 410c90-38 160-30 236 4s150 42 244 6 148-32 240 2" />
        <path d="M-40 438c92-34 158-24 232 8s154 38 246 2 146-28 242 6" />
        <path d="M-40 466c88-28 158-18 228 12s156 34 250-2 148-24 242 8" />
      </g>

      <g stroke={palette.secondary} strokeOpacity="0.22" fill="none" strokeWidth="1">
        <path d="M54 250 192 170 334 252 196 336Z" />
        <path d="M80 258 194 193 310 260 198 326Z" />
        <path d="M112 264 198 216 286 268 200 314Z" />
      </g>

      <g>
        <IsoBlock
          x={150}
          y={238}
          width={84}
          depth={70}
          height={96}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
        <IsoBlock
          x={330}
          y={206}
          width={92}
          depth={72}
          height={126}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
        <IsoBlock
          x={476}
          y={264}
          width={72}
          depth={82}
          height={156}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
        <IsoBlock
          x={112}
          y={350}
          width={94}
          depth={58}
          height={68}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
      </g>

      <g>
        <polygon
          points="222,322 284.4,358 232.4,388 170,352"
          fill={palette.accent}
          fillOpacity="0.1"
          stroke={palette.accent}
          strokeOpacity="0.95"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <IsoBlock
          x={226}
          y={336}
          width={78}
          depth={58}
          height={132}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
        <IsoBlock
          x={252}
          y={204}
          width={52}
          depth={40}
          height={46}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
        <IsoBlock
          x={318}
          y={366}
          width={44}
          depth={38}
          height={78}
          top={palette.top}
          left={palette.left}
          right={palette.right}
        />
      </g>

      <g fill="none" stroke={palette.accent} strokeOpacity="0.6" strokeWidth="1">
        <path d="M226 336v-132M226 336l67.5 39M226 336l-50.2 29" strokeDasharray="3 4" />
      </g>

      <g className="font-sans" fill={palette.ink}>
        <text x="166" y="410" fontSize="11" letterSpacing="1.8" fillOpacity="0.62">
          CURATED PARCEL 01
        </text>
        <text x="292" y="286" fontSize="11" letterSpacing="1.6" fillOpacity="0.7">
          CONCEPT A
        </text>
        <text x="292" y="301" fontSize="11" letterSpacing="1.2" fillOpacity="0.48">
          6 STOREYS
        </text>
      </g>

      <g transform="translate(568 70)">
        <circle r="26" fill={palette.top} fillOpacity="0.72" stroke={palette.ink} strokeOpacity="0.12" />
        <path d="M0 11V-11M0-11-5-4M0-11 5-4" stroke={palette.ink} strokeWidth="1.3" fill="none" />
        <text
          y="-15"
          textAnchor="middle"
          className="font-sans"
          fontSize="11"
          letterSpacing="1.4"
          fill={palette.ink}
          fillOpacity="0.7"
        >
          N
        </text>
      </g>

      <g transform="translate(48 70)" className="font-sans">
        <text fontSize="11" letterSpacing="2.2" fill={palette.ink} fillOpacity="0.52">
          OSLO / SITE STUDY
        </text>
        <text y="24" fontSize="11" fill={palette.ink} fillOpacity="0.72">
          CURATED DEMONSTRATION
        </text>
      </g>

    </svg>
  )
}
