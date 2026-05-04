type Props = {
  className?: string
  size?: number
}

export function BrandMark({ className, size = 18 }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      height={size}
      viewBox="0 0 20 20"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="3" width="10" height="2" rx="1" />
      <rect x="2" y="8" width="10" height="2" rx="1" />
      <rect x="8" y="13" width="10" height="2" rx="1" />
    </svg>
  )
}
