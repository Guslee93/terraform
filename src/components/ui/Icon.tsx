import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'area'
  | 'arrow-up-right'
  | 'chevron-down'
  | 'close'
  | 'compare'
  | 'compass'
  | 'cube'
  | 'cursor'
  | 'download'
  | 'draw'
  | 'fit'
  | 'footprint'
  | 'grid'
  | 'height'
  | 'info'
  | 'layers'
  | 'menu'
  | 'move'
  | 'ok'
  | 'pause'
  | 'play'
  | 'polygon'
  | 'redo'
  | 'rotate'
  | 'ruler'
  | 'shield'
  | 'sun'
  | 'undo'
  | 'warn'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
}

/** Design contract §5 / spec §6: one line family on a 16 grid, 1.4 px stroke. */
const paths: Record<IconName, ReactNode> = {
  area: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" />
      <path d="M2.5 6.2h11M2.5 9.8h11" />
    </>
  ),
  'arrow-up-right': <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />,
  'chevron-down': <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
  close: <path d="m4 4 8 8M12 4l-8 8" />,
  compare: (
    <>
      <rect x="2" y="2.5" width="5" height="11" rx="1" />
      <rect x="9" y="2.5" width="5" height="11" rx="1" />
    </>
  ),
  compass: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="m10.4 5.6-1.4 3.4-3.4 1.4 1.4-3.4z" />
    </>
  ),
  cube: (
    <>
      <path d="M2.5 4.8 8 2l5.5 2.8v6.4L8 14l-5.5-2.8z" />
      <path d="M2.5 4.8 8 7.6l5.5-2.8M8 7.6V14" />
    </>
  ),
  cursor: <path d="M3.5 2.5 12.5 8 8.4 9 6.7 13.3z" />,
  download: <path d="M8 2.5v8m0 0 3-3m-3 3-3-3M3 13.5h10" />,
  draw: (
    <>
      <path d="M2.5 13.5V6l5.5-3.5L13.5 6v7.5" />
      <path d="M2.5 13.5h11M6 13.5V9.5h4v4" />
    </>
  ),
  fit: <path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5" />,
  footprint: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" strokeDasharray="2 2" />
      <rect x="5.5" y="5.5" width="5" height="5" />
    </>
  ),
  grid: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" />
      <path d="M2.5 8h11M8 2.5v11" />
    </>
  ),
  height: <path d="M8 13.5V2.5M5.5 5 8 2.5 10.5 5M3 13.5h10" />,
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.3v4M8 4.9v.2" />
    </>
  ),
  layers: (
    <>
      <path d="M8 2.5 14 6 8 9.5 2 6z" />
      <path d="M2 9.2 8 12.7l6-3.5" />
    </>
  ),
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  move: (
    <>
      <path d="M8 2v12M2 8h12" />
      <path d="M6 4 8 2l2 2M6 12l2 2 2-2M4 6 2 8l2 2M12 6l2 2-2 2" />
    </>
  ),
  ok: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="m5.4 8.1 1.8 1.8 3.4-3.6" />
    </>
  ),
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  play: <path d="M5 3.2 12.5 8 5 12.8z" fill="currentColor" stroke="none" />,
  polygon: (
    <>
      <path d="m3 5.5 3.5-3 5 1.5 2 4-1.5 4.5-5.5 1.5-3.5-3.5z" />
    </>
  ),
  redo: (
    <>
      <path d="M10.5 3.5 13.5 6.5l-3 3" />
      <path d="M13.5 6.5h-7a3.5 3.5 0 0 0 0 7H10" />
    </>
  ),
  rotate: (
    <>
      <path d="M13.3 7.3A5.3 5.3 0 1 0 11.8 11.7" />
      <path d="M13.3 2.7v4.6H8.7" />
    </>
  ),
  ruler: (
    <>
      <path d="m2.5 13.5 11-11v3l-8 8h-3z" />
      <path d="m6 10 1.3 1.3M8 8l1.3 1.3M10 6l1.3 1.3" />
    </>
  ),
  shield: (
    <>
      <path d="M8 1.5 13.5 3.5v4c0 3.4-2.4 5.9-5.5 7-3.1-1.1-5.5-3.6-5.5-7v-4z" />
      <path d="m5.6 8 1.7 1.7L10.6 6.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" />
    </>
  ),
  undo: (
    <>
      <path d="M5.5 3.5 2.5 6.5l3 3" />
      <path d="M2.5 6.5h7a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  warn: (
    <>
      <path d="M8 2.2 14.2 13H1.8z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.2" r="0.4" fill="currentColor" />
    </>
  ),
}

export function Icon({ name, size = 16, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
