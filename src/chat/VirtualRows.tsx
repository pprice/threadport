import type { VirtualItem } from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { TailReserve } from './TailReserve'
import type {
  ChatItemKey,
  ChatVirtualRenderArgs,
} from './ChatVirtualViewport.types'

type TailReserveRenderOptions = {
  className?: string
  style?: CSSProperties
}

type VirtualRowsProps<TItem> = {
  activeReservedTailKey: ChatItemKey | null
  contentClassName?: string
  getItemKey: (item: TItem, index: number) => ChatItemKey
  itemClassName?: string
  items: readonly TItem[]
  measureElement: Ref<HTMLDivElement>
  renderItem: (args: ChatVirtualRenderArgs<TItem>) => ReactNode
  setActiveTailReserveContent: (element: HTMLDivElement | null) => void
  tailReserveEnabled: boolean
  tailReserveMinHeight: number
  tailReserveOptions?: TailReserveRenderOptions
  totalSize: number
  virtualItems: VirtualItem[]
}

export function VirtualRows<TItem>({
  activeReservedTailKey,
  contentClassName,
  getItemKey,
  itemClassName,
  items,
  measureElement,
  renderItem,
  setActiveTailReserveContent,
  tailReserveEnabled,
  tailReserveMinHeight,
  tailReserveOptions,
  totalSize,
  virtualItems,
}: VirtualRowsProps<TItem>) {
  return (
    <div
      className={contentClassName}
      style={{
        height: totalSize,
        position: 'relative',
        width: '100%',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const item = items[virtualItem.index]

        if (item === undefined) {
          return null
        }

        const itemKey = getItemKey(item, virtualItem.index)
        const hasActiveTailReserve =
          tailReserveEnabled &&
          activeReservedTailKey === itemKey &&
          virtualItem.index === items.length - 1

        return (
          <div
            key={itemKey}
            ref={measureElement}
            className={itemClassName}
            data-index={virtualItem.index}
            style={{
              left: 0,
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: '100%',
            }}
          >
            <TailReserve
              active={hasActiveTailReserve}
              className={tailReserveOptions?.className}
              contentRef={
                hasActiveTailReserve ? setActiveTailReserveContent : undefined
              }
              minHeight={tailReserveMinHeight}
              style={tailReserveOptions?.style}
            >
              {renderItem({
                item,
                index: virtualItem.index,
                itemKey,
                virtualItem,
              })}
            </TailReserve>
          </div>
        )
      })}
    </div>
  )
}
