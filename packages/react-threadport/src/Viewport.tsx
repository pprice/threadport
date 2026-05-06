import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type ForwardedRef,
  forwardRef,
  type ReactElement,
  type RefAttributes,
  useCallback,
  useContext,
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
import { computeItemKeyTransition } from './internal/itemKeyTransitions'
import { RootContext, useRootRegistration } from './internal/rootContext'
import { afterTwoFrames, nextFrame } from './internal/scheduleFrame'
import {
  type ActiveScrollAnimation,
  animateScrollTop,
  resolveScrollAnimation,
} from './internal/scrollAnimation'
import { scrollAsPromise } from './internal/scrollPromise'
import { isTailReserveEnabled } from './internal/TailReserve'
import {
  resolveMaxScrollTop,
  resolveTailReserveMinHeight,
  resolveUnconsumedTailReserve,
} from './internal/tailReserveCalculation'
import { useAnchorManager } from './internal/useAnchorManager'
import { useAwaitMountQueue } from './internal/useAwaitMountQueue'
import { useLatest } from './internal/useLatest'
import { useScrollbarInlineSize } from './internal/useScrollbarInlineSize'
import { useTailReserveContentMeasurement } from './internal/useTailReserveContentMeasurement'
import { useViewportStateEmitter } from './internal/useViewportStateEmitter'
import { useVisibilityTracker } from './internal/useVisibilityTracker'
import { VirtualRows } from './internal/VirtualRows'
import { createViewportStore } from './internal/viewportStore'
import type {
  ItemKey,
  ScrollAlign,
  ScrollAnimation,
  ScrollDirection,
  ScrollResult,
  ScrollToItemOptions,
  ViewportHandle,
  ViewportProps,
  ViewportState,
} from './types'

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
    onVisibilityChange,
    overscan,
    preserveScrollOnPrepend = true,
    role,
    scrollElementProps,
    style,
    tailInset = 0,
    tailReserve,
    scrollAnimation,
    virtualizerOptions,
    visibilityOptions,
  }: ViewportProps<TItem>,
  forwardedRef: ForwardedRef<ViewportHandle>,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<ActiveScrollAnimation | null>(null)
  const programmaticScrollRef = useRef(false)
  const scrollAnimationIdRef = useRef(0)
  const previousCountRef = useRef<number | null>(null)
  const previousFirstKeyRef = useRef<ItemKey | null>(null)
  const previousLastKeyRef = useRef<ItemKey | null>(null)
  const didInitialScrollRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const pendingSizeAdjustmentRef = useRef(0)
  const scrollDirectionRef = useRef<ScrollDirection>(null)
  const measuredTailReserveKeyRef = useRef<ItemKey | null>(null)
  const tailReserveContentSizeRef = useRef(0)
  const tailReserveConsumedBeforeTailRef = useRef(0)
  const tailReserveHeadKeyRef = useRef<ItemKey | null>(null)
  const [reservedTailKey, setReservedTailKey] = useState<ItemKey | null>(null)
  const [tailReserveContentElement, setTailReserveContentElement] =
    useState<HTMLDivElement | null>(null)
  const reservedTailKeyRef = useRef<ItemKey | null>(null)
  const isReadyRef = useRef(false)
  const awaitMountQueue = useAwaitMountQueue()
  const rootContext = useContext(RootContext)
  const registerViewportFrame = useRootRegistration()
  const localStoreRef = useRef(
    createViewportStore({
      distanceFromHead: 0,
      distanceFromTail: 0,
      isAtHead: true,
      isAtTail: false,
      isReady: false,
      isScrolling: false,
      scrollbarInlineSize: 0,
      scrollOffset: 0,
      scrollSize: 0,
      viewportSize: 0,
      scrollDirection: null,
      totalItems: 0,
      virtualItems: 0,
    }),
  )
  const viewportStore = rootContext?.viewportStore ?? localStoreRef.current

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
      activeTailReserveKey: activeTailKeyRef.current,
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
      isReady: isReadyRef.current,
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

  const pushStoreSnapshot = useCallback(() => {
    viewportStore.emit(readState())
  }, [readState, viewportStore])

  const onStateChangeWithStore = useCallback(
    (state: ViewportState) => {
      viewportStore.emit(state)
      onStateChange?.(state)
    },
    [onStateChange, viewportStore],
  )

  const { emitState, scheduleSettledStateEmit, scheduleStateEmit } =
    useViewportStateEmitter({
      onStateChange: onStateChangeWithStore,
      readState,
    })

  const markReady = useCallback(() => {
    if (isReadyRef.current) {
      return
    }

    isReadyRef.current = true
    pushStoreSnapshot()
    emitState()
  }, [emitState, pushStoreSnapshot])

  const requestStateUpdate = useCallback(() => {
    emitState()
    scheduleSettledStateEmit()
  }, [emitState, scheduleSettledStateEmit])

  function scrollToTarget(
    getTargetTop: () => number,
    options: ScrollAnimation | undefined,
    onSettled?: (result: ScrollResult) => void,
  ): boolean {
    const element = scrollRef.current

    if (!element) {
      return false
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
      (result) => {
        done = true

        if (scrollAnimationIdRef.current !== animationId) {
          onSettled?.('cancelled')
          return
        }

        programmaticScrollRef.current = false
        animationRef.current = null
        captureAnchor()
        scheduleStateEmit()
        onSettled?.(result)
      },
    )

    if (!done) {
      animationRef.current = activeAnimation
    }

    return true
  }

  function scrollToIndex(
    index: number,
    { align = 'head', animation }: ScrollToItemOptions = {},
  ): Promise<ScrollResult> {
    if (index < 0 || index >= items.length) {
      return Promise.resolve<ScrollResult>('rejected')
    }

    return scrollAsPromise((onSettled) =>
      scrollToTarget(
        () =>
          virtualizer.getOffsetForIndex(index, toVirtualAlign(align))?.[0] ??
          scrollRef.current?.scrollTop ??
          0,
        animation,
        onSettled,
      ),
    )
  }

  function scrollToItem(
    key: ItemKey,
    options: ScrollToItemOptions = {},
  ): Promise<ScrollResult> {
    const { awaitMount = false, ...scrollOptions } = options
    const index = keyToIndex.get(key)

    if (index !== undefined) {
      return scrollToIndex(index, scrollOptions)
    }

    if (!awaitMount) {
      return Promise.resolve<ScrollResult>('rejected')
    }

    return new Promise<ScrollResult>((resolve) => {
      // Defer until the next frame after the items-change effect flushes,
      // so the virtualizer has positioned and sized the new row before we
      // measure its offset. Look up via refs so we use the *current*
      // keyToIndex / scrollToIndex closures, not the ones captured when
      // scrollToItem was originally called.
      const run = () =>
        nextFrame(() => {
          const nextIndex = keyToIndexRef.current.get(key)

          if (nextIndex === undefined) {
            resolve('rejected')
            return
          }

          scrollToIndexRef.current(nextIndex, scrollOptions).then(resolve)
        })

      awaitMountQueue.enqueue(key, run, resolve)
    })
  }

  const keyToIndexRef = useLatest(keyToIndex)
  const scrollToIndexRef = useLatest(scrollToIndex)

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
  })

  const { captureAnchor, captureAnchorThrottle, restoreIfPrepended } =
    useAnchorManager({
      getItemKey,
      items,
      keyToIndex,
      scrollRef,
      virtualizer,
    })

  function snapToTail() {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const targetTop = getMaxScrollTop()

    if (Math.abs(element.scrollTop - targetTop) > 0.5) {
      element.scrollTop = targetTop
      lastScrollTopRef.current = targetTop
    }

    captureAnchor()
    emitState()
  }

  useLayoutEffect(() => {
    reservedTailKeyRef.current = reservedTailKey
  }, [reservedTailKey])

  const scrollbarInlineSizeRef = useScrollbarInlineSize({
    onChange: scheduleStateEmit,
    scrollRef,
  })

  useLayoutEffect(() => {
    if (!registerViewportFrame) {
      return
    }

    return registerViewportFrame({
      headInset,
      requestStateUpdate,
      scrollElement: scrollRef.current,
      tailInset,
    })
  }, [headInset, registerViewportFrame, requestStateUpdate, tailInset])

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

      if (item.start < scrollOffset) {
        pendingSizeAdjustmentRef.current += _delta
      }

      return false
    }
  }, [virtualizer])

  useLayoutEffect(() => {
    const firstKey =
      items.length > 0 && items[0] !== undefined
        ? getItemKey(items[0], 0)
        : null
    const previousFirstKey = previousFirstKeyRef.current
    const prependDetected =
      previousFirstKey !== null &&
      keyToIndex.has(previousFirstKey) &&
      (keyToIndex.get(previousFirstKey) ?? 0) > 0
    const { lastKey, appendedToTail } = computeItemKeyTransition(
      items,
      getItemKey,
      keyToIndex,
      previousLastKeyRef.current,
    )

    if (preserveScrollOnPrepend && prependDetected) {
      restoreIfPrepended()
    }

    awaitMountQueue.flush(keyToIndex)

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

    if (initialAnchor === 'tail') {
      let cancelSecondSnap: (() => void) | null = null
      let cancelThirdSnap: (() => void) | null = null
      let didRun = false
      const cancelFirstSnap = nextFrame(() => {
        didRun = true
        didInitialScrollRef.current = true
        scrollToTarget(getMaxScrollTop, { duration: 0 }, snapToTail)
        cancelSecondSnap = afterTwoFrames(() => {
          snapToTail()
          cancelThirdSnap = afterTwoFrames(snapToTail)
        })
      })

      return () => {
        cancelFirstSnap()
        cancelSecondSnap?.()
        cancelThirdSnap?.()

        if (!didRun) {
          didInitialScrollRef.current = false
        }
      }
    }

    didInitialScrollRef.current = true
  }, [initialAnchor, items.length])

  useEffect(() => {
    return () => {
      stopScrollAnimation()
    }
  }, [])

  useEffect(() => {
    if (isReadyRef.current) {
      return
    }

    if (items.length === 0) {
      markReady()
      return
    }

    return afterTwoFrames(markReady)
  }, [items.length, markReady])

  function getScrollElement() {
    return scrollRef.current
  }

  function measure() {
    virtualizer.measure()
  }

  function scrollToHead(options?: ScrollAnimation): Promise<ScrollResult> {
    return scrollAsPromise((onSettled) =>
      scrollToTarget(() => 0, options, onSettled),
    )
  }

  function scrollToTail(options?: ScrollAnimation): Promise<ScrollResult> {
    return scrollAsPromise((onSettled) =>
      scrollToTarget(getMaxScrollTop, options, (result) => {
        if (result !== 'completed') {
          onSettled(result)
          return
        }

        // After landing, take one more frame to absorb any tail-reserve
        // size deltas that arrived between the final scroll write and now.
        nextFrame(() => {
          const element = scrollRef.current

          if (!element) {
            onSettled(result)
            return
          }

          const targetTop = getMaxScrollTop()

          if (Math.abs(element.scrollTop - targetTop) > 1) {
            element.scrollTop = targetTop
          }

          captureAnchor()
          emitState()
          onSettled(result)
        })
      }),
    )
  }

  useImperativeHandle(forwardedRef, () => ({
    getScrollElement,
    getState: readState,
    measure,
    scrollToHead,
    scrollToIndex,
    scrollToItem,
    scrollToTail,
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
    const delta = pendingSizeAdjustmentRef.current
    const element = scrollRef.current

    if (!element || Math.abs(delta) < 0.5) {
      pendingSizeAdjustmentRef.current = 0
      return
    }

    pendingSizeAdjustmentRef.current = 0
    element.scrollTop += delta
    captureAnchor()
    scheduleStateEmit()
  }, [captureAnchor, scheduleStateEmit, totalSize, virtualItems.length])

  useLayoutEffect(() => {
    scheduleStateEmit()

    return nextFrame(() => {
      emitState()
    })
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

  useVisibilityTracker({
    getItemKey,
    items,
    onVisibilityChange,
    scrollRef,
    virtualItems,
    visibilityOptions,
  })

  const {
    lastKey: renderLastKey,
    previousLastIndex: renderPreviousLastIndex,
    appendedToTail: renderAppendedToTail,
  } = computeItemKeyTransition(
    items,
    getItemKey,
    keyToIndex,
    previousLastKeyRef.current,
  )
  const activeTailKey =
    tailReserveEnabled && renderAppendedToTail && renderLastKey !== null
      ? renderLastKey
      : reservedTailKey
  const firstAppendedKey = (() => {
    if (!renderAppendedToTail || renderPreviousLastIndex === undefined) {
      return null
    }

    const headIndex = renderPreviousLastIndex + 1
    const item = items[headIndex]

    return item === undefined ? null : getItemKey(item, headIndex)
  })()
  const activeTailHeadKey = firstAppendedKey ?? tailReserveHeadKeyRef.current
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
  const activeTailStart = readVirtualItemStart(activeTailKey)
  const consumedBeforeTail =
    appendedHeadStart !== null && activeTailStart !== null
      ? Math.max(0, activeTailStart - appendedHeadStart)
      : tailReserveConsumedBeforeTailRef.current
  const tailReserveMinHeight = readTailReserveMinHeight(consumedBeforeTail)

  const activeTailKeyRef = useLatest(activeTailKey)
  const tailReserveMinHeightRef = useLatest(tailReserveMinHeight)
  tailReserveHeadKeyRef.current =
    activeTailKey === null ? null : activeTailHeadKey
  tailReserveConsumedBeforeTailRef.current =
    activeTailKey === null ? 0 : consumedBeforeTail

  const setActiveTailReserveContent = useCallback(
    (element: HTMLDivElement | null) => {
      setTailReserveContentElement(element)
    },
    [],
  )

  useTailReserveContentMeasurement({
    activeTailKey,
    measuredTailReserveKeyRef,
    scheduleStateEmit,
    tailReserveContentElement,
    tailReserveContentSizeRef,
  })

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: callers can provide an ARIA role, and labeled viewports default to region.
    <div
      {...scrollElementProps}
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
        activeTailKey={activeTailKey}
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
