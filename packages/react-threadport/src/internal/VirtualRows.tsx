import type { VirtualItem } from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode, Ref } from 'react'
import type { ItemKey, RenderItemArgs } from '../types'
import { TailReserve } from './TailReserve'

type TailReserveRenderOptions = {
  className?: string
  style?: CSSProperties
}

type VirtualRowsProps<TItem> = {
  activeTailKey: ItemKey | null
  contentClassName?: string
  getItemKey: (item: TItem, index: number) => ItemKey
  itemClassName?: string
  items: readonly TItem[]
  measureElement: Ref<HTMLDivElement>
  renderItem: (args: RenderItemArgs<TItem>) => ReactNode
  setActiveTailReserveContent: (element: HTMLDivElement | null) => void
  tailReserveEnabled: boolean
  tailReserveMinHeight: number
  tailReserveOptions?: TailReserveRenderOptions
  totalSize: number
  virtualItems: VirtualItem[]
}

export function VirtualRows<TItem>({
  activeTailKey,
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
          activeTailKey === itemKey &&
          virtualItem.index === items.length - 1
        const renderedItem = renderItem({
          item,
          index: virtualItem.index,
          itemKey,
          virtualItem,
        })

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
            {hasActiveTailReserve ? (
              <TailReserve
                className={tailReserveOptions?.className}
                contentRef={setActiveTailReserveContent}
                minHeight={tailReserveMinHeight}
                style={tailReserveOptions?.style}
              >
                {renderedItem}
              </TailReserve>
            ) : (
              renderedItem
            )}
          </div>
        )
      })}
    </div>
  )
}
