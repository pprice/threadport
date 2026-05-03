import type { CSSProperties, ReactNode, Ref } from 'react'
import type { ChatTailReserveConfig } from './ChatVirtualViewport.types'

type TailReserveProps = {
  active: boolean
  children: ReactNode
  className?: string
  contentRef?: Ref<HTMLDivElement>
  minHeight: number
  style?: CSSProperties
}

export function isTailReserveEnabled(
  tailReserve: ChatTailReserveConfig | undefined,
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
  active,
  children,
  className,
  contentRef,
  minHeight,
  style,
}: TailReserveProps) {
  return (
    <div
      className={className}
      data-tail-reserve={active ? 'active' : undefined}
      style={{
        ...style,
        minHeight: active ? minHeight : style?.minHeight,
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
}
