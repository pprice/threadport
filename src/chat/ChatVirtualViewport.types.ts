import type {
  ReactVirtualizerOptions,
  VirtualItem,
} from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'
import type {
  ChatScrollAnimation,
  ChatScrollEasing,
} from './easing'

export type ChatItemKey = string | number
export type ChatScrollAlign = 'head' | 'center' | 'tail' | 'auto'
export type ChatScrollDirection = 'head' | 'tail' | null
export type { ChatScrollAnimation, ChatScrollEasing }

export type ChatScrollToItemOptions = {
  align?: ChatScrollAlign
  animation?: ChatScrollAnimation
}

export type ChatViewportState = {
  distanceFromHead: number
  distanceFromTail: number
  isAtHead: boolean
  isAtTail: boolean
  isScrolling: boolean
  scrollbarInlineSize: number
  scrollOffset: number
  scrollSize: number
  viewportSize: number
  scrollDirection: ChatScrollDirection
  totalItems: number
  virtualItems: number
}

export type ChatTailReserveMetrics = {
  headInset: number
  headReserve: number
  tailInset: number
  viewportSize: number
}

export type ChatTailReserveOptions = {
  className?: string
  enabled?: boolean
  minHeight?: number | ((metrics: ChatTailReserveMetrics) => number)
  style?: CSSProperties
}

export type ChatTailReserveConfig = boolean | ChatTailReserveOptions

type ChatOwnedVirtualizerOption =
  | 'count'
  | 'enabled'
  | 'estimateSize'
  | 'getItemKey'
  | 'getScrollElement'
  | 'horizontal'
  | 'indexAttribute'
  | 'initialOffset'
  | 'isRtl'
  | 'laneAssignmentMode'
  | 'lanes'
  | 'observeElementOffset'
  | 'observeElementRect'
  | 'onChange'
  | 'paddingEnd'
  | 'paddingStart'
  | 'scrollMargin'
  | 'scrollPaddingEnd'
  | 'scrollPaddingStart'
  | 'scrollToFn'

export type ChatVirtualizerOptions = Partial<
  Omit<
    ReactVirtualizerOptions<HTMLDivElement, HTMLDivElement>,
    ChatOwnedVirtualizerOption
  >
>

export type ChatVirtualViewportHandle = {
  getScrollElement: () => HTMLDivElement | null
  getState: () => ChatViewportState
  measure: () => void
  scrollToHead: (options?: ChatScrollAnimation) => void
  scrollToIndex: (index: number, options?: ChatScrollToItemOptions) => void
  scrollToItem: (
    key: ChatItemKey,
    options?: ChatScrollToItemOptions,
  ) => void
  scrollToTail: (options?: ChatScrollAnimation) => void
  stopScrollAnimation: () => void
}

export type ChatVirtualRenderArgs<TItem> = {
  item: TItem
  index: number
  itemKey: ChatItemKey
  virtualItem: VirtualItem
}

export type ChatVirtualViewportProps<TItem> = {
  items: readonly TItem[]
  getItemKey: (item: TItem, index: number) => ChatItemKey
  estimateSize: (item: TItem, index: number) => number
  renderItem: (args: ChatVirtualRenderArgs<TItem>) => ReactNode
  ariaLabel?: string
  atHeadThreshold?: number
  atTailThreshold?: number
  className?: string
  contentClassName?: string
  headInset?: number
  headReserve?: number
  initialAnchor?: 'head' | 'tail'
  itemClassName?: string
  itemGap?: number
  onStateChange?: (state: ChatViewportState) => void
  overscan?: number
  preserveScrollOnPrepend?: boolean
  role?: string
  style?: CSSProperties
  tailInset?: number
  tailReserve?: ChatTailReserveConfig
  scrollAnimation?: ChatScrollAnimation
  virtualizerOptions?: ChatVirtualizerOptions
}
