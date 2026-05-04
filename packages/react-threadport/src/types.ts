import type {
  ReactVirtualizerOptions,
  VirtualItem,
} from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'
import type { ScrollAnimation, ScrollEasing } from './easing'

export type RootState = {
  headInset: number
  scrollbarInlineSize: number
  tailInset: number
}

export type RootRegistration = {
  headInset: number
  requestStateUpdate?: () => void
  scrollElement: HTMLElement | null
  tailInset: number
}

export type RootProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export type OverlayPlacement = 'fill' | 'head' | 'tail'

export type OverlayProps = {
  avoidScrollbar?: boolean
  children?: ReactNode
  className?: string
  forwardWheelToViewport?: boolean
  placement?: OverlayPlacement
  pointerEvents?: CSSProperties['pointerEvents']
  style?: CSSProperties
}

export type ItemKey = string | number
export type ScrollAlign = 'head' | 'center' | 'tail' | 'auto'
export type ScrollDirection = 'head' | 'tail' | null
export type { ScrollAnimation, ScrollEasing }

export type ScrollToItemOptions = {
  align?: ScrollAlign
  animation?: ScrollAnimation
}

export type ViewportState = {
  distanceFromHead: number
  distanceFromTail: number
  isAtHead: boolean
  isAtTail: boolean
  isScrolling: boolean
  scrollbarInlineSize: number
  scrollOffset: number
  scrollSize: number
  viewportSize: number
  scrollDirection: ScrollDirection
  totalItems: number
  virtualItems: number
}

export type TailReserveMetrics = {
  headInset: number
  headReserve: number
  tailInset: number
  viewportSize: number
}

export type TailReserveOptions = {
  className?: string
  enabled?: boolean
  minHeight?: number | ((metrics: TailReserveMetrics) => number)
  style?: CSSProperties
}

export type TailReserveConfig = boolean | TailReserveOptions

type OwnedVirtualizerOption =
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

export type VirtualizerOptions = Partial<
  Omit<
    ReactVirtualizerOptions<HTMLDivElement, HTMLDivElement>,
    OwnedVirtualizerOption
  >
>

export type ViewportHandle = {
  getScrollElement: () => HTMLDivElement | null
  getState: () => ViewportState
  measure: () => void
  scrollToHead: (options?: ScrollAnimation) => void
  scrollToIndex: (index: number, options?: ScrollToItemOptions) => void
  scrollToItem: (key: ItemKey, options?: ScrollToItemOptions) => void
  scrollToTail: (options?: ScrollAnimation) => void
  stopScrollAnimation: () => void
}

export type RenderItemArgs<TItem> = {
  item: TItem
  index: number
  itemKey: ItemKey
  virtualItem: VirtualItem
}

export type ViewportProps<TItem> = {
  items: readonly TItem[]
  getItemKey: (item: TItem, index: number) => ItemKey
  estimateSize: (item: TItem, index: number) => number
  renderItem: (args: RenderItemArgs<TItem>) => ReactNode
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
  onStateChange?: (state: ViewportState) => void
  overscan?: number
  preserveScrollOnPrepend?: boolean
  role?: string
  style?: CSSProperties
  tailInset?: number
  tailReserve?: TailReserveConfig
  scrollAnimation?: ScrollAnimation
  virtualizerOptions?: VirtualizerOptions
}
