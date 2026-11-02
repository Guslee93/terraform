import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'arrow-up-right'
  | 'chevron-down'
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
  'chevron-down': <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
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
