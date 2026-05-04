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

/**
 * Props for `<ThreadPort.Root>`, the frame element that publishes inset and
 * scrollbar geometry to overlays.
 *
 * Root ships with `display: flex; flex-direction: column; min-height: 0`
 * inline-style defaults so the viewport fills any parent that has a definite
 * height. The Root's parent must provide that height (100dvh, `flex: 1`,
 * fixed pixels, or a sized grid track) for internal scrolling to engage; an
 * unconstrained parent will let the viewport grow with content. See the
 * Layout section of the README for patterns.
 */
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

/**
 * Props for `<ThreadPort.Viewport>`, the virtualized scroll element.
 *
 * The Viewport ships with `flex: 1 1 auto; min-height: 0; overflow-y: auto`
 * inline-style defaults. It fills whatever height its parent gives it and
 * scrolls internally when content exceeds that height. See the Layout
 * section of the README for parent sizing patterns and the `headInset` /
 * `tailInset` / `tailReserve` props for chrome and reserved space.
 */
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
