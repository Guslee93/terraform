import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'arrow-up-right'
  | 'chevron-down'
  | 'close'
  | 'cube'
  | 'cursor'
  | 'download'
  | 'fit'
  | 'grid'
  | 'info'
  | 'layers'
  | 'menu'
  | 'move'
  | 'polygon'
  | 'redo'
  | 'rotate'
  | 'ruler'
  | 'sun'
  | 'undo'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
}

const paths: Record<IconName, ReactNode> = {
  'arrow-up-right': <path d="M7 17 17 7M9 7h8v8" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  cube: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
  cursor: <path d="m5 3 7.5 17 2.2-7.3L22 10.5 5 3Z" />,
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />,
  fit: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  grid: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 10h16M10 4v16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </>
  ),
  polygon: (
    <>
      <path d="m5 8 5-4 7 2 3 6-2 7-8 2-5-5V8Z" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="17" cy="6" r="1.2" />
      <circle cx="18" cy="14" r="1.2" />
      <circle cx="10" cy="20" r="1.2" />
    </>
  ),
  redo: <path d="M20 7h-5V2m5 5-4-4M4 19a8 8 0 0 1 12-10" />,
  rotate: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 4v7h-7" />
    </>
  ),
  ruler: (
    <>
      <path d="m4 20 16-16 0 4L8 20H4v-4Z" />
      <path d="m9 15 2 2M12 12l2 2M15 9l2 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  undo: <path d="M4 7h5V2M4 7l4-4M20 19A8 8 0 0 0 8 9" />,
}

export function Icon({ name, size = 18, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
