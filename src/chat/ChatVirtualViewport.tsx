import {
  useVirtualizer,
  type ReactVirtualizerOptions,
  type VirtualItem,
} from '@tanstack/react-virtual'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from 'react'
import {
  readScrollbarInlineSize,
  useChatViewportFrameRegistration,
} from './ChatViewportFrame'
import { easeOutQuart } from './easing'

export type ChatItemKey = string | number
export type ChatScrollAlign = 'head' | 'center' | 'tail' | 'auto'
export type ChatScrollDirection = 'head' | 'tail' | null
export type ChatScrollEasing = (t: number) => number

export type ChatScrollAnimation = {
  duration?: number
  easing?: ChatScrollEasing
}

export type ChatScrollToItemOptions = ChatScrollAnimation & {
  align?: ChatScrollAlign
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
  virtualizerOptions?: ChatVirtualizerOptions
}

type AnchorSnapshot = {
  itemKey: ChatItemKey
  scrollDelta: number
}

type ActiveScrollAnimation = {
  cancel: () => void
}

type TailReserveProps = {
  active: boolean
  children: ReactNode
  className?: string
  contentRef?: Ref<HTMLDivElement>
  minHeight: number
  style?: CSSProperties
}

const DEFAULT_ESTIMATE = 160
const DEFAULT_SCROLL_DURATION = 460
const DEFAULT_AT_HEAD_THRESHOLD = 16
const DEFAULT_AT_TAIL_THRESHOLD = 36

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toVirtualAlign(align: ChatScrollAlign) {
  if (align === 'head') {
    return 'start'
  }

  if (align === 'tail') {
    return 'end'
  }

  return align
}

function isTailReserveEnabled(tailReserve: ChatTailReserveConfig | undefined) {
  if (tailReserve === undefined) {
    return false
  }

  if (typeof tailReserve === 'boolean') {
    return tailReserve
  }

  return tailReserve.enabled ?? true
}

function TailReserve({
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

function prefersReducedMotion() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function shallowEqualState(
  previous: ChatViewportState | null,
  next: ChatViewportState,
) {
  return (
    previous !== null &&
    previous.distanceFromHead === next.distanceFromHead &&
    previous.distanceFromTail === next.distanceFromTail &&
    previous.isAtHead === next.isAtHead &&
    previous.isAtTail === next.isAtTail &&
    previous.isScrolling === next.isScrolling &&
    previous.scrollbarInlineSize === next.scrollbarInlineSize &&
    previous.scrollOffset === next.scrollOffset &&
    previous.scrollSize === next.scrollSize &&
    previous.viewportSize === next.viewportSize &&
    previous.scrollDirection === next.scrollDirection &&
    previous.totalItems === next.totalItems &&
    previous.virtualItems === next.virtualItems
  )
}

function animateScrollTop(
  element: HTMLElement,
  getTargetTop: () => number,
  options: ChatScrollAnimation | undefined,
  onDone: () => void,
): ActiveScrollAnimation {
  const duration = options?.duration ?? DEFAULT_SCROLL_DURATION
  const easing = options?.easing ?? easeOutQuart
  const startTop = element.scrollTop

  function readTargetTop() {
    const maxTop = Math.max(0, element.scrollHeight - element.clientHeight)

    return clamp(getTargetTop(), 0, maxTop)
  }

  const initialTarget = readTargetTop()

  if (
    duration <= 0 ||
    Math.abs(initialTarget - startTop) < 1 ||
    prefersReducedMotion()
  ) {
    element.scrollTop = initialTarget
    onDone()

    return { cancel: () => undefined }
  }

  let animationFrame = 0
  let cancelled = false
  let finished = false
  const startTime = performance.now()
  const cancelEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

  function cleanup() {
    cancelEvents.forEach((eventName) => {
      element.removeEventListener(eventName, cancelFromUser)
    })
  }

  function finish() {
    if (finished) {
      return
    }

    finished = true
    cancelAnimationFrame(animationFrame)
    cleanup()
    onDone()
  }

  function cancel() {
    if (cancelled) {
      return
    }

    cancelled = true
    finish()
  }

  function cancelFromUser() {
    cancel()
  }

  function frame(now: number) {
    if (cancelled) {
      return
    }

    const progress = clamp((now - startTime) / duration, 0, 1)
    const targetTop = readTargetTop()
    element.scrollTop = startTop + (targetTop - startTop) * easing(progress)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(frame)
      return
    }

    element.scrollTop = readTargetTop()
    finish()
  }

  cancelEvents.forEach((eventName) => {
    element.addEventListener(eventName, cancelFromUser, { passive: true })
  })

  animationFrame = requestAnimationFrame(frame)

  return { cancel }
}

function ChatVirtualViewportInner<TItem>(
  {
    items,
    getItemKey,
    estimateSize,
    renderItem,
    ariaLabel,
    atHeadThreshold = DEFAULT_AT_HEAD_THRESHOLD,
    atTailThreshold = DEFAULT_AT_TAIL_THRESHOLD,
    className,
    contentClassName,
    headInset = 0,
    headReserve = 0,
    initialAnchor = 'head',
    itemClassName,
    itemGap,
    onStateChange,
    overscan,
    preserveScrollOnPrepend = true,
    role,
    style,
    tailInset = 0,
    tailReserve,
    virtualizerOptions,
  }: ChatVirtualViewportProps<TItem>,
  forwardedRef: ForwardedRef<ChatVirtualViewportHandle>,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<ActiveScrollAnimation | null>(null)
  const programmaticScrollRef = useRef(false)
  const scrollAnimationIdRef = useRef(0)
  const anchorRef = useRef<AnchorSnapshot | null>(null)
  const previousCountRef = useRef<number | null>(null)
  const previousFirstKeyRef = useRef<ChatItemKey | null>(null)
  const previousLastKeyRef = useRef<ChatItemKey | null>(null)
  const didInitialScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollDirectionRef = useRef<ChatScrollDirection>(null)
  const lastStateRef = useRef<ChatViewportState | null>(null)
  const stateFrameRef = useRef<number | null>(null)
  const settledStateFrameRef = useRef<number | null>(null)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const activeTailReserveKeyRef = useRef<ChatItemKey | null>(null)
  const measuredTailReserveKeyRef = useRef<ChatItemKey | null>(null)
  const tailReserveContentRef = useRef<HTMLDivElement | null>(null)
  const tailReserveContentSizeRef = useRef(0)
  const tailReserveMinHeightRef = useRef(0)
  const [reservedTailKey, setReservedTailKey] =
    useState<ChatItemKey | null>(null)
  const [tailReserveContentElement, setTailReserveContentElement] =
    useState<HTMLDivElement | null>(null)
  const reservedTailKeyRef = useRef<ChatItemKey | null>(null)
  const registerViewportFrame = useChatViewportFrameRegistration()

  const tailReserveEnabled = isTailReserveEnabled(tailReserve)
  const tailReserveOptions =
    typeof tailReserve === 'object' ? tailReserve : undefined
  const headPadding = Math.max(0, headInset) + Math.max(0, headReserve)
  const virtualizerGap = itemGap ?? virtualizerOptions?.gap ?? 0
  const virtualizerOverscan = overscan ?? virtualizerOptions?.overscan ?? 10

  const keyToIndex = useMemo(() => {
    const map = new Map<ChatItemKey, number>()

    items.forEach((item, index) => {
      map.set(getItemKey(item, index), index)
    })

    return map
  }, [getItemKey, items])

  function stopScrollAnimation() {
    animationRef.current?.cancel()
    animationRef.current = null
    programmaticScrollRef.current = false
  }

  function getUnconsumedTailReserve() {
    if (!tailReserveEnabled || activeTailReserveKeyRef.current === null) {
      return 0
    }

    return Math.max(
      0,
      tailReserveMinHeightRef.current - tailReserveContentSizeRef.current,
    )
  }

  function getMaxScrollTop() {
    const element = scrollRef.current

    if (!element) {
      return 0
    }

    return Math.max(
      0,
      element.scrollHeight - getUnconsumedTailReserve() - element.clientHeight,
    )
  }

  function getTailReserveMinHeight() {
    const explicitMinHeight = tailReserveOptions?.minHeight
    const viewportSize =
      scrollRef.current?.clientHeight ?? virtualizer.scrollRect?.height ?? 0

    if (typeof explicitMinHeight === 'number') {
      return Math.max(0, explicitMinHeight)
    }

    if (typeof explicitMinHeight === 'function') {
      return Math.max(
        0,
        explicitMinHeight({
          headInset,
          headReserve,
          tailInset,
          viewportSize,
        }),
      )
    }

    return Math.max(0, viewportSize - tailInset)
  }

  function readState(): ChatViewportState {
    const element = scrollRef.current
    const scrollOffset = element?.scrollTop ?? 0
    const viewportSize = element?.clientHeight ?? 0
    const scrollSize = element?.scrollHeight ?? virtualizer.getTotalSize()
    const maxScrollTop = getMaxScrollTop()
    const distanceFromHead = scrollOffset
    const distanceFromTail = Math.max(0, maxScrollTop - scrollOffset)

    return {
      distanceFromHead,
      distanceFromTail,
      isAtHead: scrollOffset <= atHeadThreshold,
      isAtTail: distanceFromTail <= atTailThreshold,
      isScrolling: virtualizer.isScrolling,
      scrollbarInlineSize: readScrollbarInlineSize(element),
      scrollOffset,
      scrollSize,
      viewportSize,
      scrollDirection: scrollDirectionRef.current,
      totalItems: items.length,
      virtualItems: virtualizer.getVirtualItems().length,
    }
  }

  function emitState() {
    if (!onStateChange) {
      return
    }

    const next = readState()

    if (shallowEqualState(lastStateRef.current, next)) {
      return
    }

    lastStateRef.current = next
    onStateChange(next)
  }

  function scheduleStateEmit() {
    if (!onStateChange || stateFrameRef.current !== null) {
      return
    }

    stateFrameRef.current = requestAnimationFrame(() => {
      stateFrameRef.current = null
      emitState()
    })
  }

  function scheduleSettledStateEmit() {
    if (!onStateChange || settledStateFrameRef.current !== null) {
      return
    }

    settledStateFrameRef.current = requestAnimationFrame(() => {
      settledStateFrameRef.current = requestAnimationFrame(() => {
        settledStateFrameRef.current = null
        emitState()
      })
    })
  }

  requestStateUpdateRef.current = () => {
    emitState()
    scheduleSettledStateEmit()
  }

  function captureAnchor() {
    const element = scrollRef.current

    if (!element || items.length === 0) {
      return
    }

    const anchorItem =
      virtualizer.getVirtualItemForOffset(element.scrollTop) ??
      virtualizer.getVirtualItems()[0]

    if (!anchorItem) {
      return
    }

    const item = items[anchorItem.index]

    if (item === undefined) {
      return
    }

    anchorRef.current = {
      itemKey: getItemKey(item, anchorItem.index),
      scrollDelta: element.scrollTop - anchorItem.start,
    }
  }

  function scrollToTarget(
    getTargetTop: () => number,
    options: ChatScrollAnimation | undefined,
    onSettled?: () => void,
  ) {
    const element = scrollRef.current

    if (!element) {
      return
    }

    stopScrollAnimation()
    programmaticScrollRef.current = true

    let done = false
    const animationId = scrollAnimationIdRef.current + 1
    scrollAnimationIdRef.current = animationId
    const animation = animateScrollTop(element, getTargetTop, options, () => {
      done = true

      if (scrollAnimationIdRef.current !== animationId) {
        return
      }

      programmaticScrollRef.current = false
      animationRef.current = null
      captureAnchor()
      scheduleStateEmit()
      onSettled?.()
    })

    if (!done) {
      animationRef.current = animation
    }
  }

  function scrollToIndex(
    index: number,
    { align = 'head', duration, easing }: ChatScrollToItemOptions = {},
  ) {
    if (index < 0 || index >= items.length) {
      return
    }

    scrollToTarget(
      () =>
        virtualizer.getOffsetForIndex(index, toVirtualAlign(align))?.[0] ??
        scrollRef.current?.scrollTop ??
        0,
      { duration, easing },
    )
  }

  function scrollToItem(
    key: ChatItemKey,
    options: ChatScrollToItemOptions = {},
  ) {
    const index = keyToIndex.get(key)

    if (index === undefined) {
      return
    }

    scrollToIndex(index, options)
  }

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    ...virtualizerOptions,
    count: items.length,
    estimateSize: (index) => {
      const item = items[index]

      if (item === undefined) {
        return DEFAULT_ESTIMATE
      }

      return estimateSize(item, index)
    },
    getItemKey: (index) => {
      const item = items[index]

      if (item === undefined) {
        return index
      }

      return getItemKey(item, index)
    },
    getScrollElement: () => scrollRef.current,
    gap: virtualizerGap,
    onChange: () => {
      captureAnchor()
      scheduleStateEmit()
      scheduleSettledStateEmit()
    },
    overscan: virtualizerOverscan,
    paddingEnd: tailInset,
    paddingStart: headPadding,
    scrollPaddingEnd: tailInset,
    scrollPaddingStart: headInset,
    useAnimationFrameWithResizeObserver:
      virtualizerOptions?.useAnimationFrameWithResizeObserver ?? true,
  })

  useLayoutEffect(() => {
    reservedTailKeyRef.current = reservedTailKey
  }, [reservedTailKey])

  useLayoutEffect(() => {
    if (!registerViewportFrame) {
      return
    }

    return registerViewportFrame({
      headInset,
      requestStateUpdate: () => requestStateUpdateRef.current?.(),
      scrollElement: scrollRef.current,
      tailInset,
    })
  }, [headInset, registerViewportFrame, tailInset])

  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
      item,
      _delta,
      instance,
    ) => {
      if (programmaticScrollRef.current) {
        return false
      }

      if (reservedTailKeyRef.current === item.key) {
        return false
      }

      const scrollOffset = instance.scrollOffset ?? 0

      return item.start < scrollOffset
    }
  }, [virtualizer])

  useLayoutEffect(() => {
    const firstKey =
      items.length > 0 && items[0] !== undefined
        ? getItemKey(items[0], 0)
        : null
    const lastKey =
      items.length > 0 && items[items.length - 1] !== undefined
        ? getItemKey(items[items.length - 1], items.length - 1)
        : null
    const previousCount = previousCountRef.current
    const previousFirstKey = previousFirstKeyRef.current
    const previousLastKey = previousLastKeyRef.current
    const previousFirstMoved =
      previousFirstKey !== null &&
      keyToIndex.has(previousFirstKey) &&
      (keyToIndex.get(previousFirstKey) ?? 0) > 0
    const appendedToTail =
      previousCount !== null &&
      items.length > previousCount &&
      previousFirstKey === firstKey &&
      previousLastKey !== lastKey

    if (preserveScrollOnPrepend && previousFirstMoved) {
      const anchor = anchorRef.current
      const element = scrollRef.current

      if (anchor && element) {
        const anchorIndex = keyToIndex.get(anchor.itemKey)
        const offset =
          anchorIndex === undefined
            ? undefined
            : virtualizer.getOffsetForIndex(anchorIndex, 'start')?.[0]

        if (offset !== undefined) {
          element.scrollTop = offset + anchor.scrollDelta
        }
      }
    }

    if (!tailReserveEnabled || lastKey === null) {
      setReservedTailKey((current) => (current === null ? current : null))
    } else if (appendedToTail) {
      setReservedTailKey((current) => (current === lastKey ? current : lastKey))
    } else {
      setReservedTailKey((current) =>
        current !== null && !keyToIndex.has(current) ? null : current,
      )
    }

    previousCountRef.current = items.length
    previousFirstKeyRef.current = firstKey
    previousLastKeyRef.current = lastKey
    captureAnchor()
    scheduleStateEmit()
  }, [
    getItemKey,
    items,
    keyToIndex,
    preserveScrollOnPrepend,
    tailReserveEnabled,
    virtualizer,
  ])

  useLayoutEffect(() => {
    if (didInitialScrollRef.current || items.length === 0) {
      return
    }

    didInitialScrollRef.current = true

    if (initialAnchor === 'tail') {
      requestAnimationFrame(() => {
        scrollToTarget(getMaxScrollTop, { duration: 0 })
      })
    }
  }, [initialAnchor, items.length])

  useEffect(() => {
    return () => {
      stopScrollAnimation()

      if (stateFrameRef.current !== null) {
        cancelAnimationFrame(stateFrameRef.current)
      }

      if (settledStateFrameRef.current !== null) {
        cancelAnimationFrame(settledStateFrameRef.current)
      }
    }
  }, [])

  useImperativeHandle(
    forwardedRef,
    () => ({
      getScrollElement: () => scrollRef.current,
      getState: readState,
      measure: () => virtualizer.measure(),
      scrollToHead: (options) => {
        scrollToTarget(() => 0, options)
      },
      scrollToIndex,
      scrollToItem,
      scrollToTail: (options) => {
        scrollToTarget(getMaxScrollTop, options, () => {
          requestAnimationFrame(() => {
            const element = scrollRef.current

            if (!element) {
              return
            }

            const targetTop = getMaxScrollTop()

            if (Math.abs(element.scrollTop - targetTop) > 1) {
              element.scrollTop = targetTop
            }

            captureAnchor()
            emitState()
          })
        })
      },
      stopScrollAnimation,
    }),
  )

  function handleScroll() {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const delta = element.scrollTop - lastScrollTopRef.current

    if (Math.abs(delta) > 1) {
      scrollDirectionRef.current = delta > 0 ? 'tail' : 'head'
      lastScrollTopRef.current = element.scrollTop
    }

    captureAnchor()
    scheduleStateEmit()
    scheduleSettledStateEmit()
  }

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  useLayoutEffect(() => {
    scheduleStateEmit()

    const frame = requestAnimationFrame(() => {
      emitState()
    })

    return () => cancelAnimationFrame(frame)
  }, [
    atHeadThreshold,
    atTailThreshold,
    headInset,
    headReserve,
    items.length,
    tailInset,
    totalSize,
    virtualItems.length,
  ])

  const tailReserveMinHeight = getTailReserveMinHeight()
  const renderFirstKey =
    items.length > 0 && items[0] !== undefined ? getItemKey(items[0], 0) : null
  const renderLastKey =
    items.length > 0 && items[items.length - 1] !== undefined
      ? getItemKey(items[items.length - 1], items.length - 1)
      : null
  const renderAppendedToTail =
    previousCountRef.current !== null &&
    items.length > previousCountRef.current &&
    previousFirstKeyRef.current === renderFirstKey &&
    previousLastKeyRef.current !== renderLastKey
  const activeReservedTailKey =
    tailReserveEnabled && renderAppendedToTail && renderLastKey !== null
      ? renderLastKey
      : reservedTailKey

  activeTailReserveKeyRef.current = activeReservedTailKey
  tailReserveMinHeightRef.current = tailReserveMinHeight

  const setActiveTailReserveContent = useCallback(
    (element: HTMLDivElement | null) => {
      setTailReserveContentElement(element)
    },
    [],
  )

  useLayoutEffect(() => {
    tailReserveContentRef.current = tailReserveContentElement

    if (measuredTailReserveKeyRef.current !== activeReservedTailKey) {
      measuredTailReserveKeyRef.current = activeReservedTailKey
      tailReserveContentSizeRef.current = 0
    }

    if (activeReservedTailKey === null) {
      tailReserveContentSizeRef.current = 0
      scheduleStateEmit()
      return
    }

    const element = tailReserveContentElement

    if (!element) {
      scheduleStateEmit()
      return
    }

    const measuredElement: HTMLDivElement = element

    function measureTailReserveContent() {
      const measuredSize = measuredElement.getBoundingClientRect().height

      if (
        Math.abs(measuredSize - tailReserveContentSizeRef.current) < 0.5
      ) {
        return
      }

      tailReserveContentSizeRef.current = measuredSize
      scheduleStateEmit()
    }

    measureTailReserveContent()

    const observer = new ResizeObserver(measureTailReserveContent)

    observer.observe(measuredElement)

    return () => observer.disconnect()
  }, [activeReservedTailKey, tailReserveContentElement, tailReserveMinHeight])

  return (
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={className}
      onScroll={handleScroll}
      role={role}
      style={{
        overflowY: 'auto',
        position: 'relative',
        ...style,
      }}
    >
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
              ref={virtualizer.measureElement}
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
    </div>
  )
}

const ChatVirtualViewportBase = forwardRef(ChatVirtualViewportInner)
ChatVirtualViewportBase.displayName = 'ChatVirtualViewport'

export const ChatVirtualViewport = ChatVirtualViewportBase as <TItem>(
  props: ChatVirtualViewportProps<TItem> &
    RefAttributes<ChatVirtualViewportHandle>,
) => ReactElement
