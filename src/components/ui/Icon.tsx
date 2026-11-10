import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'arrow-up-right'
  | 'area'
  | 'chevron-down'
  | 'chevron-left'
  | 'cursor'
  | 'eye'
  | 'eye-off'
  | 'noise'
  | 'pen'
  | 'plus'
  | 'redo'
  | 'trash'
  | 'undo'
  | 'wind'
  | 'x'
  | 'cube'
  | 'layers'
  | 'rotate'
  | 'ruler'
  | 'sun'
  | 'warn'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
}

/** Design contract §5 / spec §6: one line family on a 16 grid, 1.4 px stroke. */
const paths: Record<IconName, ReactNode> = {
  'arrow-up-right': <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />,
  area: (
    <>
      <path d="M2.5 2.5h11v11h-11z" />
      <path d="M2.5 8.5 7.5 13.5M2.5 4.5l9 9M5.5 2.5l8 8M9.5 2.5l4 4" />
    </>
  ),
  'chevron-down': <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
  'chevron-left': <path d="M9.5 4.5 6 8l3.5 3.5" />,
  cursor: <path d="M3.5 2.5 12.5 7 8.6 8.4 7 12.5z" />,
  eye: (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M6.2 4A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.6 2.1M10.3 11.9A6 6 0 0 1 8 12.5C4 12.5 1.5 8 1.5 8a12 12 0 0 1 2.2-2.7" />
      <path d="m2.5 2.5 11 11" />
    </>
  ),
  noise: <path d="M2 8h1.5M5 5v6M8 2.5v11M11 5v6M13.5 8H14" />,
  pen: (
    <>
      <path d="M10.8 2.7 13.3 5.2 5.5 13H3v-2.5z" />
      <path d="m9.3 4.2 2.5 2.5" />
    </>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  redo: (
    <>
      <path d="M12.5 6.5H6a3.5 3.5 0 0 0 0 7h3" />
      <path d="m10 4 2.5 2.5L10 9" />
    </>
  ),
  trash: (
    <>
      <path d="M2.5 4.5h11M6 4.5V2.8h4v1.7M4 4.5l.7 9h6.6l.7-9" />
      <path d="M6.8 7v4M9.2 7v4" />
    </>
  ),
  undo: (
    <>
      <path d="M3.5 6.5H10a3.5 3.5 0 0 1 0 7H7" />
      <path d="M6 4 3.5 6.5 6 9" />
    </>
  ),
  wind: <path d="M1.5 6h8a2 2 0 1 0-2-2M1.5 9.5h11a2 2 0 1 1-2 2M1.5 12.5h5" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  cube: (
    <>
      <path d="M2.5 4.8 8 2l5.5 2.8v6.4L8 14l-5.5-2.8z" />
      <path d="M2.5 4.8 8 7.6l5.5-2.8M8 7.6V14" />
    </>
  ),
  layers: (
    <>
      <path d="M8 2.5 14 6 8 9.5 2 6z" />
      <path d="M2 9.2 8 12.7l6-3.5" />
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
  sun: (
    <>
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" />
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
