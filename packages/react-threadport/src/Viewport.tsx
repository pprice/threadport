import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type ForwardedRef,
  forwardRef,
  type ReactElement,
  type RefAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  DEFAULT_AT_HEAD_THRESHOLD,
  DEFAULT_AT_TAIL_THRESHOLD,
  DEFAULT_ESTIMATE,
} from './internal/constants'
import { createFrameThrottle } from './internal/scheduleFrame'
import {
  type ActiveScrollAnimation,
  animateScrollTop,
  resolveScrollAnimation,
} from './internal/scrollAnimation'
import { isTailReserveEnabled } from './internal/TailReserve'
import {
  resolveMaxScrollTop,
  resolveTailReserveMinHeight,
  resolveUnconsumedTailReserve,
} from './internal/tailReserveCalculation'
import { useTailReserveContentMeasurement } from './internal/useTailReserveContentMeasurement'
import { useViewportStateEmitter } from './internal/useViewportStateEmitter'
import { VirtualRows } from './internal/VirtualRows'
import { readScrollbarInlineSize, useRootRegistration } from './Root'
import type {
  ItemKey,
  ScrollAlign,
  ScrollAnimation,
  ScrollDirection,
  ScrollToItemOptions,
  ViewportHandle,
  ViewportProps,
  ViewportState,
} from './types'

type AnchorSnapshot = {
  elementTop: number | null
  itemKey: ItemKey
  scrollDelta: number
}

function noop() {}

function toVirtualAlign(align: ScrollAlign) {
  if (align === 'head') {
    return 'start'
  }

  if (align === 'tail') {
    return 'end'
  }

  return align
}

const ViewportBase = forwardRef(function ViewportInner<TItem>(
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
    scrollAnimation,
    virtualizerOptions,
  }: ViewportProps<TItem>,
  forwardedRef: ForwardedRef<ViewportHandle>,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<ActiveScrollAnimation | null>(null)
  const programmaticScrollRef = useRef(false)
  const scrollAnimationIdRef = useRef(0)
  const anchorRef = useRef<AnchorSnapshot | null>(null)
  const previousCountRef = useRef<number | null>(null)
  const previousFirstKeyRef = useRef<ItemKey | null>(null)
  const previousLastKeyRef = useRef<ItemKey | null>(null)
  const didInitialScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollDirectionRef = useRef<ScrollDirection>(null)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const activeTailReserveKeyRef = useRef<ItemKey | null>(null)
  const measuredTailReserveKeyRef = useRef<ItemKey | null>(null)
  const scrollbarInlineSizeRef = useRef(0)
  const tailReserveContentSizeRef = useRef(0)
  const tailReserveMinHeightRef = useRef(0)
  const tailReserveConsumedBeforeTailRef = useRef(0)
  const tailReserveHeadKeyRef = useRef<ItemKey | null>(null)
  const [reservedTailKey, setReservedTailKey] = useState<ItemKey | null>(null)
  const [tailReserveContentElement, setTailReserveContentElement] =
    useState<HTMLDivElement | null>(null)
  const reservedTailKeyRef = useRef<ItemKey | null>(null)
  const registerViewportFrame = useRootRegistration()

  const tailReserveEnabled = isTailReserveEnabled(tailReserve)
  const tailReserveOptions =
    typeof tailReserve === 'object' ? tailReserve : undefined
  const headPadding = Math.max(0, headInset) + Math.max(0, headReserve)
  const virtualizerGap = itemGap ?? virtualizerOptions?.gap ?? 0
  const virtualizerOverscan = overscan ?? virtualizerOptions?.overscan ?? 10

  const keyToIndex = useMemo(() => {
    const map = new Map<ItemKey, number>()

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

  function readUnconsumedTailReserve() {
    return resolveUnconsumedTailReserve({
      activeTailReserveKey: activeTailReserveKeyRef.current,
      contentSize: tailReserveContentSizeRef.current,
      enabled: tailReserveEnabled,
      minHeight: tailReserveMinHeightRef.current,
    })
  }

  function getMaxScrollTop() {
    const element = scrollRef.current

    if (!element) {
      return 0
    }

    return resolveMaxScrollTop({
      scrollSize: element.scrollHeight,
      unconsumedTailReserve: readUnconsumedTailReserve(),
      viewportSize: element.clientHeight,
    })
  }

  function readTailReserveMinHeight(consumedBeforeTail: number) {
    const viewportSize =
      scrollRef.current?.clientHeight ?? virtualizer.scrollRect?.height ?? 0

    return resolveTailReserveMinHeight({
      consumedBeforeTail,
      headInset,
      headReserve,
      minHeight: tailReserveOptions?.minHeight,
      tailInset,
      viewportSize,
    })
  }

  function updateScrollbarInlineSize() {
    const nextSize = readScrollbarInlineSize(scrollRef.current)

    if (Math.abs(nextSize - scrollbarInlineSizeRef.current) < 0.5) {
      return false
    }

    scrollbarInlineSizeRef.current = nextSize
    return true
  }

  function readState(): ViewportState {
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
      scrollbarInlineSize: scrollbarInlineSizeRef.current,
      scrollOffset,
      scrollSize,
      viewportSize,
      scrollDirection: scrollDirectionRef.current,
      totalItems: items.length,
      virtualItems: virtualizer.getVirtualItems().length,
    }
  }

  const { emitState, scheduleSettledStateEmit, scheduleStateEmit } =
    useViewportStateEmitter({ onStateChange, readState })
  const scheduleStateEmitRef = useRef(scheduleStateEmit)
  scheduleStateEmitRef.current = scheduleStateEmit

  requestStateUpdateRef.current = () => {
    emitState()
    scheduleSettledStateEmit()
  }

  const captureAnchorRef = useRef<() => void>(noop)
  const captureAnchorThrottle = useMemo(
    () => createFrameThrottle(() => captureAnchorRef.current()),
    [],
  )

  useEffect(() => {
    return () => {
      captureAnchorThrottle.cancel()
    }
  }, [captureAnchorThrottle])

  function captureAnchor() {
    const element = scrollRef.current

    if (!element || items.length === 0) {
      return
    }

    const virtualItems = virtualizer.getVirtualItems()
    const anchorItem =
      virtualItems.find(
        (virtualItem) => virtualItem.end >= element.scrollTop,
      ) ??
      virtualizer.getVirtualItemForOffset(element.scrollTop) ??
      virtualItems[0]

    if (!anchorItem) {
      return
    }

    const item = items[anchorItem.index]

    if (item === undefined) {
      return
    }

    anchorRef.current = {
      elementTop:
        element
          .querySelector<HTMLElement>(`[data-index="${anchorItem.index}"]`)
          ?.getBoundingClientRect().top ?? null,
      itemKey: getItemKey(item, anchorItem.index),
      scrollDelta: element.scrollTop - anchorItem.start,
    }
  }
  captureAnchorRef.current = captureAnchor

  function restoreAnchorElementTop(index: number, anchor: AnchorSnapshot) {
    const element = scrollRef.current

    if (!element || anchor.elementTop === null) {
      return false
    }

    const anchorElement = element.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    )
    const nextTop = anchorElement?.getBoundingClientRect().top

    if (nextTop === undefined) {
      return false
    }

    const delta = nextTop - anchor.elementTop

    if (Math.abs(delta) >= 0.5) {
      element.scrollTop += delta
    }

    return true
  }

  function scrollToTarget(
    getTargetTop: () => number,
    options: ScrollAnimation | undefined,
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
    const activeAnimation = animateScrollTop(
      element,
      getTargetTop,
      resolveScrollAnimation(options, scrollAnimation),
      () => {
        done = true

        if (scrollAnimationIdRef.current !== animationId) {
          return
        }

        programmaticScrollRef.current = false
        animationRef.current = null
        captureAnchor()
        scheduleStateEmit()
        onSettled?.()
      },
    )

    if (!done) {
      animationRef.current = activeAnimation
    }
  }

  function scrollToIndex(
    index: number,
    { align = 'head', animation }: ScrollToItemOptions = {},
  ) {
    if (index < 0 || index >= items.length) {
      return
    }

    scrollToTarget(
      () =>
        virtualizer.getOffsetForIndex(index, toVirtualAlign(align))?.[0] ??
        scrollRef.current?.scrollTop ??
        0,
      animation,
    )
  }

  function scrollToItem(key: ItemKey, options: ScrollToItemOptions = {}) {
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
      if (previousCountRef.current === items.length) {
        captureAnchor()
      }

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
    if (typeof window === 'undefined') {
      return
    }

    function measureScrollbarInlineSize() {
      if (updateScrollbarInlineSize()) {
        scheduleStateEmitRef.current()
      }
    }

    measureScrollbarInlineSize()

    const element = scrollRef.current
    const observer =
      element && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measureScrollbarInlineSize)
        : null

    if (element) {
      observer?.observe(element)
    }

    window.addEventListener('resize', measureScrollbarInlineSize)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureScrollbarInlineSize)
    }
  }, [])

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
    const previousFirstKey = previousFirstKeyRef.current
    const previousLastKey = previousLastKeyRef.current
    const previousFirstMoved =
      previousFirstKey !== null &&
      keyToIndex.has(previousFirstKey) &&
      (keyToIndex.get(previousFirstKey) ?? 0) > 0
    const previousLastIndex =
      previousLastKey !== null ? keyToIndex.get(previousLastKey) : undefined
    const appendedToTail =
      previousLastKey !== null &&
      previousLastKey !== lastKey &&
      previousLastIndex !== undefined &&
      previousLastIndex < items.length - 1

    if (preserveScrollOnPrepend && previousFirstMoved) {
      const anchor = anchorRef.current
      const element = scrollRef.current

      if (anchor && element) {
        const anchorIndex = keyToIndex.get(anchor.itemKey)

        if (anchorIndex !== undefined) {
          const restoredFromElement = restoreAnchorElementTop(
            anchorIndex,
            anchor,
          )
          const offset =
            virtualizer
              .getVirtualItems()
              .find((virtualItem) => virtualItem.index === anchorIndex)
              ?.start ??
            virtualizer.getOffsetForIndex(anchorIndex, 'start')?.[0]

          if (!restoredFromElement && offset !== undefined) {
            element.scrollTop = offset + anchor.scrollDelta

            requestAnimationFrame(() => {
              restoreAnchorElementTop(anchorIndex, anchor)
            })
          }
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
    }
  }, [])

  useImperativeHandle(forwardedRef, () => ({
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
  }))

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

    captureAnchorThrottle.call()
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

  const renderLastKey =
    items.length > 0 && items[items.length - 1] !== undefined
      ? getItemKey(items[items.length - 1], items.length - 1)
      : null
  const renderPreviousLastIndex =
    previousLastKeyRef.current !== null
      ? keyToIndex.get(previousLastKeyRef.current)
      : undefined
  const renderAppendedToTail =
    previousLastKeyRef.current !== null &&
    previousLastKeyRef.current !== renderLastKey &&
    renderPreviousLastIndex !== undefined &&
    renderPreviousLastIndex < items.length - 1
  const activeReservedTailKey =
    tailReserveEnabled && renderAppendedToTail && renderLastKey !== null
      ? renderLastKey
      : reservedTailKey
  const appendedHeadKey = (() => {
    if (!renderAppendedToTail || renderPreviousLastIndex === undefined) {
      return null
    }

    const headIndex = renderPreviousLastIndex + 1
    const item = items[headIndex]

    return item === undefined ? null : getItemKey(item, headIndex)
  })()
  const activeTailHeadKey = appendedHeadKey ?? tailReserveHeadKeyRef.current
  const readVirtualItemStart = (itemKey: ItemKey | null) => {
    if (itemKey === null) {
      return null
    }

    const index = keyToIndex.get(itemKey)

    if (index === undefined) {
      return null
    }

    return (
      virtualItems.find((virtualItem) => virtualItem.index === index)?.start ??
      virtualizer.getOffsetForIndex(index, 'start')?.[0] ??
      null
    )
  }
  const appendedHeadStart = readVirtualItemStart(activeTailHeadKey)
  const activeTailStart = readVirtualItemStart(activeReservedTailKey)
  const consumedBeforeTail =
    appendedHeadStart !== null && activeTailStart !== null
      ? Math.max(0, activeTailStart - appendedHeadStart)
      : tailReserveConsumedBeforeTailRef.current
  const tailReserveMinHeight = readTailReserveMinHeight(consumedBeforeTail)

  activeTailReserveKeyRef.current = activeReservedTailKey
  tailReserveHeadKeyRef.current =
    activeReservedTailKey === null ? null : activeTailHeadKey
  tailReserveConsumedBeforeTailRef.current =
    activeReservedTailKey === null ? 0 : consumedBeforeTail
  tailReserveMinHeightRef.current = tailReserveMinHeight

  const setActiveTailReserveContent = useCallback(
    (element: HTMLDivElement | null) => {
      setTailReserveContentElement(element)
    },
    [],
  )

  useTailReserveContentMeasurement({
    activeReservedTailKey,
    measuredTailReserveKeyRef,
    scheduleStateEmit,
    tailReserveContentElement,
    tailReserveContentSizeRef,
    tailReserveMinHeight,
  })

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: callers can provide an ARIA role, and labeled viewports default to region.
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={className}
      onScroll={handleScroll}
      role={role ?? (ariaLabel ? 'region' : undefined)}
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      <VirtualRows
        activeReservedTailKey={activeReservedTailKey}
        contentClassName={contentClassName}
        getItemKey={getItemKey}
        itemClassName={itemClassName}
        items={items}
        measureElement={virtualizer.measureElement}
        renderItem={renderItem}
        setActiveTailReserveContent={setActiveTailReserveContent}
        tailReserveEnabled={tailReserveEnabled}
        tailReserveMinHeight={tailReserveMinHeight}
        tailReserveOptions={tailReserveOptions}
        totalSize={totalSize}
        virtualItems={virtualItems}
      />
    </div>
  )
})
ViewportBase.displayName = 'Viewport'

/**
 * Headless virtualized chat viewport.
 *
 * The Viewport renders an absolutely-positioned virtualized list inside a
 * scrollable container, exposes imperative scroll commands via `ref`
 * ({@link ViewportHandle}), and publishes scroll state via
 * {@link ViewportProps.onStateChange}. It does not render any chrome,
 * composer, or message content — those belong to the host, usually layered
 * on top via {@link Overlay}.
 *
 * **Behavior owned by the Viewport:**
 * - Virtualization (mounting only the visible rows + overscan).
 * - Per-row measurement after paint, with anchor preservation when measured
 *   sizes diverge from estimates.
 * - Scroll-to-tail of the active appended item via the optional tail
 *   reserve.
 * - Anchor preservation across prepends ("loading older messages above
 *   doesn't move the row I'm reading").
 * - Append/prepend/rolling-buffer detection from item-key transitions.
 * - Imperative scroll commands with eased animation, cancelable by user
 *   wheel/touch input.
 *
 * **Behavior owned by the host:**
 * - Message content, composer, and all visible UI.
 * - When to call `scrollToItem` / `scrollToTail` / `scrollToHead`.
 * - When to surface a jump-to-bottom button (the Viewport just reports
 *   `distanceFromTail` via `onStateChange`).
 * - When to load older history.
 *
 * See {@link ViewportProps} for the prop contract and the README's Layout
 * section for parent sizing patterns.
 *
 * @example
 * function Chat({ messages }: { messages: Message[] }) {
 *   const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)
 *
 *   return (
 *     <ThreadPort.Root>
 *       <ThreadPort.Viewport
 *         ref={viewportRef}
 *         items={messages}
 *         getItemKey={(m) => m.id}
 *         estimateSize={() => 96}
 *         renderItem={({ item }) => <Message message={item} />}
 *         initialAnchor="tail"
 *         tailReserve
 *         tailInset={120}
 *         headInset={56}
 *       />
 *
 *       <ThreadPort.Overlay placement="tail">
 *         <Composer
 *           onSubmit={(messageId) =>
 *             viewportRef.current?.scrollToItem(messageId, {
 *               align: 'head',
 *               animation: ThreadPort.Animation.easeOutQuart(420),
 *             })
 *           }
 *         />
 *       </ThreadPort.Overlay>
 *     </ThreadPort.Root>
 *   )
 * }
 */
export const Viewport = ViewportBase as <TItem>(
  props: ViewportProps<TItem> & RefAttributes<ViewportHandle>,
) => ReactElement
