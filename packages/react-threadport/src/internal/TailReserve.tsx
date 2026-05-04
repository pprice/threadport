import type { CSSProperties, ReactNode, Ref } from 'react'
import type { TailReserveConfig } from '../types'

type TailReserveProps = {
  children: ReactNode
  className?: string
  contentRef?: Ref<HTMLDivElement>
  minHeight: number
  style?: CSSProperties
}

export function isTailReserveEnabled(
  tailReserve: TailReserveConfig | undefined,
) {
  if (tailReserve === undefined) {
    return false
  }

  if (typeof tailReserve === 'boolean') {
    return tailReserve
  }

  return tailReserve.enabled ?? true
}

export function TailReserve({
  children,
  className,
  contentRef,
  minHeight,
  style,
}: TailReserveProps) {
  return (
    <div
      className={className}
      data-tail-reserve="active"
      style={{
        ...style,
        minHeight,
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
}
