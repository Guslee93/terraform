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
      <polygon points={leftFace} fill={left} />
      <polygon points={rightFace} fill={right} />
      <polygon points={topFace} fill={top} />
    </g>
  )
}

export function SiteStudyGraphic() {
  return (
    <svg
      viewBox="0 0 640 480"
      role="img"
      aria-labelledby="site-study-title site-study-description"
      className="h-full w-full"
    >
      <title id="site-study-title">Isometric site study</title>
      <desc id="site-study-description">
        An abstract axonometric drawing of an Oslo city block with surrounding buildings, a marked
        parcel, a stepped concept massing and contour lines.
      </desc>

      <defs>
        <pattern id="study-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#202521" strokeOpacity="0.055" />
        </pattern>
        <linearGradient id="study-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEF1EC" />
          <stop offset="0.62" stopColor="#E8EBE7" />
          <stop offset="1" stopColor="#DFE4DB" />
        </linearGradient>
        <radialGradient id="study-light" cx="0.7" cy="0.18" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="study-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#202521" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width="640" height="480" fill="url(#study-sky)" />
      <rect width="640" height="480" fill="url(#study-grid)" />
      <rect width="640" height="480" fill="url(#study-light)" />

      <g stroke="#69716C" strokeOpacity="0.28" fill="none" strokeWidth="1">
        <path d="M-40 410c90-38 160-30 236 4s150 42 244 6 148-32 240 2" />
        <path d="M-40 438c92-34 158-24 232 8s154 38 246 2 146-28 242 6" />
        <path d="M-40 466c88-28 158-18 228 12s156 34 250-2 148-24 242 8" />
      </g>

      <g stroke="#69716C" strokeOpacity="0.22" fill="none" strokeWidth="1">
        <path d="M54 250 192 170 334 252 196 336Z" />
        <path d="M80 258 194 193 310 260 198 326Z" />
        <path d="M112 264 198 216 286 268 200 314Z" />
      </g>

      <g filter="url(#study-shadow)">
        <IsoBlock
          x={150}
          y={238}
          width={84}
          depth={70}
          height={96}
          top="#D9DCD4"
          left="#C3C7BE"
          right="#CCD0C7"
        />
        <IsoBlock
          x={330}
          y={206}
          width={92}
          depth={72}
          height={126}
          top="#D6DAD2"
          left="#BFC4BA"
          right="#C9CDC4"
        />
        <IsoBlock
          x={476}
          y={264}
          width={72}
          depth={82}
          height={156}
          top="#D4D8D0"
          left="#BCC1B7"
          right="#C6CBC1"
        />
        <IsoBlock
          x={112}
          y={350}
          width={94}
          depth={58}
          height={68}
          top="#D9DCD4"
          left="#C3C7BE"
          right="#CCD0C7"
        />
      </g>

      <g filter="url(#study-shadow)">
        <polygon
          points="222,322 284.4,358 232.4,388 170,352"
          fill="#355E79"
          fillOpacity="0.1"
          stroke="#355E79"
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
          top="#F4F1E9"
          left="#D8D2C5"
          right="#E6E1D6"
        />
        <IsoBlock
          x={252}
          y={204}
          width={52}
          depth={40}
          height={46}
          top="#F8F5EE"
          left="#DCD6CA"
          right="#EAE5DA"
        />
        <IsoBlock
          x={318}
          y={366}
          width={44}
          depth={38}
          height={78}
          top="#E9EDF0"
          left="#C9D2D8"
          right="#D8E0E5"
        />
      </g>

      <g fill="none" stroke="#355E79" strokeOpacity="0.6" strokeWidth="1">
        <path d="M226 336v-132M226 336l67.5 39M226 336l-50.2 29" strokeDasharray="3 4" />
      </g>

      <g fontFamily="Inter Variable, Inter, sans-serif" fill="#202521">
        <text x="166" y="410" fontSize="10" letterSpacing="1.8" fillOpacity="0.62">
          CURATED PARCEL 01
        </text>
        <text x="292" y="286" fontSize="10" letterSpacing="1.6" fillOpacity="0.7">
          CONCEPT A
        </text>
        <text x="292" y="301" fontSize="9" letterSpacing="1.2" fillOpacity="0.48">
          6 STOREYS
        </text>
      </g>

      <g transform="translate(568 70)">
        <circle r="26" fill="#F5F5F1" fillOpacity="0.72" stroke="#202521" strokeOpacity="0.12" />
        <path d="M0 11V-11M0-11-5-4M0-11 5-4" stroke="#202521" strokeWidth="1.3" fill="none" />
        <text
          y="-15"
          textAnchor="middle"
          fontFamily="Inter Variable, Inter, sans-serif"
          fontSize="9"
          letterSpacing="1.4"
          fill="#202521"
          fillOpacity="0.7"
        >
          N
        </text>
      </g>

      <g transform="translate(48 70)" fontFamily="Inter Variable, Inter, sans-serif">
        <text fontSize="9" letterSpacing="2.2" fill="#202521" fillOpacity="0.52">
          OSLO / SITE STUDY
        </text>
        <text y="24" fontSize="11" fill="#202521" fillOpacity="0.72">
          CURATED DEMONSTRATION
        </text>
      </g>

    </svg>
  )
}
