import type {
  ReactVirtualizerOptions,
  VirtualItem,
} from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'
import type { ScrollAnimation, ScrollEasing } from './easing'

/**
 * Root frame state published to descendants via
 * {@link useRootState}.
 *
 * Captures the inset reservations declared on the active Viewport plus the
 * measured scrollbar width, so Overlays (and any host code outside the
 * Viewport) can position themselves relative to the active chrome geometry
 * without remeasuring it themselves.
 *
 * Updates are batched at most once per animation frame.
 */
export type RootState = {
  /** Pixels reserved at the head for sticky chrome (e.g. a header band). 0 when no Viewport is mounted or `headInset` is unset. */
  headInset: number
  /** Width of the vertical scrollbar lane in CSS pixels; 0 on overlay-scrollbar systems (macOS, iOS). Updates on resize. */
  scrollbarInlineSize: number
  /** Pixels reserved at the tail for sticky chrome (e.g. a composer dock). 0 when no Viewport is mounted or `tailInset` is unset. */
  tailInset: number
}

/**
 * The contract a Viewport posts to its enclosing Root on mount.
 *
 * Exposed for advanced integrations (e.g. authoring a custom Viewport that
 * reuses Root). Standard apps do not need to construct or consume this
 * directly.
 */
export type RootRegistration = {
  /** Head inset in CSS pixels — published into {@link RootState}. */
  headInset: number
  /** Optional callback the Root invokes to ask the Viewport to recompute and emit state. Called when a parent layout change makes the previously-published state stale. */
  requestStateUpdate?: () => void
  /** The scroll element whose geometry drives scrollbar measurement. May be null while the Viewport is mounting. */
  scrollElement: HTMLElement | null
  /** Tail inset in CSS pixels — published into {@link RootState}. */
  tailInset: number
}

/**
 * Props for `<ThreadPort.Root>`, the frame element that wraps a Viewport plus
 * any Overlays and publishes inset and scrollbar geometry through React
 * context.
 *
 * **Layout contract**: Root ships with `display: flex; flex-direction: column;
 * min-height: 0; min-width: 0` inline-style defaults so its child Viewport
 * fills any parent that has a definite height. The Root's parent must provide
 * that height (100dvh, `flex: 1`, fixed pixels, or a sized grid track) for
 * internal scrolling to engage; an unconstrained parent will let the viewport
 * grow with content. See the Layout section of the README for patterns.
 */
export type RootProps = {
  /** Children rendered inside the frame, typically one Viewport plus zero or more Overlays. */
  children?: ReactNode
  /** Class applied to the frame `<div>`. */
  className?: string
  /**
   * Inline style merged onto the frame. Spread *after* the library's
   * defaults, so any property you set wins over the shipped flex /
   * min-height values. Override `display` or `min-height` only if you
   * understand the layout contract — the defaults exist to prevent the
   * "viewport expands to content" failure mode.
   */
  style?: CSSProperties
}

/**
 * Where an {@link OverlayProps} docks inside the Root frame.
 *
 * - `head` — covers the headInset region only (the top band).
 * - `tail` — covers the tailInset region only (the bottom band, typically a composer dock).
 * - `fill` — spans the entire frame; useful for jump-to-bottom buttons and floating affordances.
 */
export type OverlayPlacement = 'fill' | 'head' | 'tail'

/**
 * Props for `<ThreadPort.Overlay>`, a frame-relative dock for chrome and
 * floating controls.
 *
 * Overlays render absolutely-positioned inside the enclosing Root,
 * automatically avoid the scrollbar lane, and forward wheel events to the
 * Viewport so the user can scroll the transcript even when the cursor is
 * over an Overlay (a composer, a sticky header, a jump button). Anything
 * that should hover over the transcript without disrupting scroll mechanics
 * belongs in an Overlay.
 */
export type OverlayProps = {
  /**
   * Reserve space for the scrollbar lane so the Overlay's right edge does
   * not slide under the scrollbar. Defaults to `true`. Disable for
   * full-bleed Overlays.
   */
  avoidScrollbar?: boolean
  children?: ReactNode
  className?: string
  /**
   * Forward wheel events on the Overlay to the Viewport's scroll element.
   * Defaults to `true`. Disable for Overlays whose children own their own
   * scroll (e.g. a popover with an internal list).
   */
  forwardWheelToViewport?: boolean
  /** Where the Overlay docks. See {@link OverlayPlacement}. Defaults to `fill`. */
  placement?: OverlayPlacement
  /**
   * `pointer-events` on the Overlay element. Defaults to `none`, so the
   * Overlay is visible but click-through. Set to `auto` for Overlays whose
   * children must receive pointer input (forms, buttons, draggable
   * controls).
   */
  pointerEvents?: CSSProperties['pointerEvents']
  style?: CSSProperties
}

/**
 * Stable identifier for a virtualized item.
 *
 * The same item must always return the same key across renders, even when
 * its index changes. The library uses keys for append/prepend detection,
 * scroll target tracking, and React reconciliation.
 */
export type ItemKey = string | number

/**
 * Where to align an item within the visible viewport when scrolling to it.
 *
 * - `head` — top of the visible region, just below `headInset`. The default
 *   for submitted prompts in chat patterns ("scroll the new prompt to the
 *   top, leave room for the answer below").
 * - `center` — vertically centered within the visible region.
 * - `tail` — bottom of the visible region, just above `tailInset`.
 * - `auto` — scroll just enough to bring the item into view; if it's already
 *   visible, no scroll occurs.
 */
export type ScrollAlign = 'head' | 'center' | 'tail' | 'auto'

/**
 * Direction of the most recent scroll motion.
 *
 * - `head` — toward older content (upward in a top-anchored transcript).
 * - `tail` — toward newer content (downward).
 * - `null` — no recent motion (initial state, or settled).
 */
export type ScrollDirection = 'head' | 'tail' | null

export type { ScrollAnimation, ScrollEasing }

/**
 * Options for {@link ViewportHandle.scrollToItem} and
 * {@link ViewportHandle.scrollToIndex}.
 */
export type ScrollToItemOptions = {
  /** Where to align the target. See {@link ScrollAlign}. Defaults to `head`. */
  align?: ScrollAlign
  /**
   * Animation timing. Pass an `Animation.<curve>(duration)` factory result
   * for an eased scroll, or `{ duration: 0 }` to jump instantly. Defaults to
   * the Viewport's `scrollAnimation` prop.
   */
  animation?: ScrollAnimation
}

/**
 * Snapshot of the Viewport's scroll state.
 *
 * Emitted on every measurable change via {@link ViewportProps.onStateChange}
 * and readable on demand via {@link ViewportHandle.getState}. The host uses
 * this to drive product decisions (showing a jump-to-bottom button when
 * `distanceFromTail` exceeds a threshold, loading older history when
 * `distanceFromHead` approaches zero, etc.). The Viewport itself never acts
 * on these values — it just reports them.
 */
export type ViewportState = {
  /** Pixels from the head boundary (after `headInset`) to the current scroll position. */
  distanceFromHead: number
  /** Pixels from the current scroll position to the tail boundary (before `tailInset`). */
  distanceFromTail: number
  /** True when scroll position is within `atHeadThreshold` pixels of the head. */
  isAtHead: boolean
  /** True when scroll position is within `atTailThreshold` pixels of the tail. */
  isAtTail: boolean
  /** True while a programmatic or user-driven scroll is in flight. */
  isScrolling: boolean
  /** Width of the scrollbar lane in CSS pixels. Mirrors {@link RootState.scrollbarInlineSize}. */
  scrollbarInlineSize: number
  /** Native `scrollTop` of the scroll element. */
  scrollOffset: number
  /** Total height of the virtualized content (the scrollable range). */
  scrollSize: number
  /** Visible height of the Viewport (`clientHeight` of the scroll element). */
  viewportSize: number
  /** Direction of the most recent scroll motion. See {@link ScrollDirection}. */
  scrollDirection: ScrollDirection
  /** Total number of items in `items`. */
  totalItems: number
  /** Number of items currently rendered (after virtualization). */
  virtualItems: number
}

/**
 * Geometry passed into a {@link TailReserveOptions.minHeight} callback. The
 * default minimum is computed from these values; override `minHeight` with a
 * function to derive a custom reserve (e.g. half-screen on mobile, full
 * screen on desktop).
 */
export type TailReserveMetrics = {
  /** Active `headInset` in CSS pixels. */
  headInset: number
  /** Active `headReserve` in CSS pixels. */
  headReserve: number
  /** Active `tailInset` in CSS pixels. */
  tailInset: number
  /** Current viewport size (clientHeight) in CSS pixels. */
  viewportSize: number
}

/**
 * Configuration for the optional tail reserve.
 *
 * Tail reserve is a viewport-sized minimum height applied to the most
 * recently appended tail item, so a freshly submitted prompt has empty
 * space beneath it for the assistant response to unfurl into. The reserve
 * burns down as the appended item grows; once the item exceeds the reserve,
 * the reserve disappears and normal scroll resumes.
 *
 * Unlike a synthetic spacer item, the reserve is attached to the row that
 * actually owns the response — so streaming, selection, focus, and copy
 * behavior all coordinate naturally without an extra entity to manage.
 */
export type TailReserveOptions = {
  /** Class on the wrapper element around the active tail item. */
  className?: string
  /**
   * Disable the reserve without removing the configuration block. Defaults
   * to `true` when an options object is passed; pass `tailReserve={false}`
   * to disable outright.
   */
  enabled?: boolean
  /**
   * Minimum height in CSS pixels, or a function deriving the height from
   * runtime geometry. The default callback returns
   * `viewportSize - headInset - headReserve - tailInset`, i.e. the visible
   * region beneath any reserved chrome.
   */
  minHeight?: number | ((metrics: TailReserveMetrics) => number)
  /** Inline style on the wrapper element. */
  style?: CSSProperties
}

/**
 * Tail reserve toggle. Pass `true` to enable with defaults, `false` to
 * disable, or {@link TailReserveOptions} for full control.
 */
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

/**
 * Pass-through options for the underlying TanStack Virtual instance.
 *
 * The library owns the scroll-and-measurement-critical options (count,
 * getItemKey, estimateSize, padding, scroll callbacks, lanes, orientation,
 * initial offset) so they can't be set in two places. Use this type to tune
 * the rest: `overscan`, `gap`, `useAnimationFrameWithResizeObserver`, custom
 * `scrollingDelay`, etc.
 *
 * The `overscan` and `itemGap` props on Viewport are convenience shortcuts
 * that win over `virtualizerOptions.overscan` and `virtualizerOptions.gap`.
 */
export type VirtualizerOptions = Partial<
  Omit<
    ReactVirtualizerOptions<HTMLDivElement, HTMLDivElement>,
    OwnedVirtualizerOption
  >
>

/**
 * Imperative handle exposed via `ref` on `<ThreadPort.Viewport>`.
 *
 * The host uses this to drive scroll commands in response to product events
 * (submit, jump to bottom, load history, etc.). The Viewport never invokes
 * these on its own — every motion is host-driven.
 */
export type ViewportHandle = {
  /** The underlying scroll `<div>`, or null while unmounted. Useful for one-off DOM measurements. */
  getScrollElement: () => HTMLDivElement | null
  /** Read the current {@link ViewportState} synchronously. Cheap; no extra measurement. */
  getState: () => ViewportState
  /**
   * Force the virtualizer to remeasure rendered rows. Call after a
   * font-load, content substitution, or any change that affects row heights
   * but isn't observable by the built-in ResizeObserver.
   */
  measure: () => void
  /** Animate to the head (top) of the transcript. */
  scrollToHead: (options?: ScrollAnimation) => void
  /**
   * Animate to a specific item by index.
   *
   * @param index Zero-based index into `items`.
   * @param options Alignment and animation. See {@link ScrollToItemOptions}.
   */
  scrollToIndex: (index: number, options?: ScrollToItemOptions) => void
  /**
   * Animate to a specific item by its stable key (the value `getItemKey`
   * returned for that item). The standard "scroll the new prompt to the
   * top after submit" call.
   *
   * @param key The item's stable key, as returned by `getItemKey`.
   * @param options Alignment and animation. See {@link ScrollToItemOptions}.
   */
  scrollToItem: (key: ItemKey, options?: ScrollToItemOptions) => void
  /**
   * Animate to the tail (bottom) of the transcript, including any active
   * tail reserve. Call this from a "jump to bottom" button.
   */
  scrollToTail: (options?: ScrollAnimation) => void
  /**
   * Cancel any in-flight scroll animation. User wheel/touch input cancels
   * animations automatically; this is for programmatic interruption (e.g.
   * cancel a settle-to-tail when a new submit arrives).
   */
  stopScrollAnimation: () => void
}

/**
 * Argument passed to {@link ViewportProps.renderItem} on every render.
 */
export type RenderItemArgs<TItem> = {
  /** The item being rendered, taken directly from `items`. */
  item: TItem
  /** Zero-based index of the item in `items`. */
  index: number
  /** The stable key returned by `getItemKey(item, index)`. */
  itemKey: ItemKey
  /**
   * The TanStack Virtual virtual-item record (start, size, key, etc.).
   * Generally not needed in `renderItem` since the Viewport handles
   * positioning; exposed for advanced cases (custom drag handles, scroll
   * indicators).
   */
  virtualItem: VirtualItem
}

/**
 * Props for `<ThreadPort.Viewport>`, the headless virtualized chat viewport.
 *
 * The Viewport ships with `flex: 1 1 auto; min-height: 0; overflow-y: auto`
 * inline-style defaults. It fills whatever height its parent (a Root) gives
 * it and scrolls internally when content exceeds that height. See the
 * Layout section of the README for parent sizing patterns and the
 * `headInset` / `tailInset` / `tailReserve` props for chrome and reserved
 * space.
 */
export type ViewportProps<TItem> = {
  /**
   * The list of items to virtualize. Treated as immutable per render — the
   * library detects appends, prepends, and rolling-buffer updates by
   * comparing first/last keys to the previous render.
   */
  items: readonly TItem[]
  /**
   * Returns a stable key for each item. Required for append/prepend
   * detection, scroll target tracking, and React reconciliation. The same
   * item must always return the same key, even when its index changes.
   */
  getItemKey: (item: TItem, index: number) => ItemKey
  /**
   * Initial height estimate for an item before it's measured by the
   * ResizeObserver. The library uses estimates only for the first layout
   * pass; once a row paints, its measured height takes over. Aim for the
   * median row height; very wrong estimates cause visible jumps on first
   * render.
   */
  estimateSize: (item: TItem, index: number) => number
  /**
   * Renders one item. The library positions the row absolutely and measures
   * its rendered height; the host owns everything else (markup, styling,
   * accessibility, content).
   */
  renderItem: (args: RenderItemArgs<TItem>) => ReactNode
  /** Accessible label for the scroll region (the element's `aria-label`). */
  ariaLabel?: string
  /** Pixel threshold within which {@link ViewportState.isAtHead} reports `true`. Defaults to 8. */
  atHeadThreshold?: number
  /** Pixel threshold within which {@link ViewportState.isAtTail} reports `true`. Defaults to 32. */
  atTailThreshold?: number
  /** Class on the scroll element. */
  className?: string
  /** Class on the inner virtual content element (the layer that holds positioned rows). */
  contentClassName?: string
  /**
   * Pixels to reserve at the head for sticky chrome that overlays the
   * transcript (a frosted header bar, etc.). Items align *below* this
   * region. Published via Root for Overlays to consume.
   */
  headInset?: number
  /**
   * Pixels of additional empty space before the first item. Distinct from
   * `headInset`: that's overlap with chrome, this is empty scroll space —
   * useful when the host loads older history above the visible region and
   * wants scrollback room before the data lands.
   */
  headReserve?: number
  /**
   * Where to position scroll on initial mount.
   *
   * - `head` (default) — top of transcript visible.
   * - `tail` — bottom of transcript visible (the chat default).
   */
  initialAnchor?: 'head' | 'tail'
  /** Class on each measured row wrapper. */
  itemClassName?: string
  /**
   * Pixels of vertical gap between rows. Convenience shortcut for the
   * virtualizer's `gap` option.
   */
  itemGap?: number
  /**
   * Called whenever the {@link ViewportState} changes. The cadence is at
   * most once per animation frame; a state-equal duplicate is suppressed.
   * Safe to use directly without memoization.
   */
  onStateChange?: (state: ViewportState) => void
  /**
   * Number of off-screen rows kept mounted on each side of the viewport.
   * Defaults to 10. Higher values smooth fast scrolling at the cost of
   * memory; lower values reduce DOM footprint at the cost of brief blanks
   * during fling scrolls.
   */
  overscan?: number
  /**
   * Preserve the visible scroll position when items are inserted at the
   * head. Defaults to `true`. The library captures the visible anchor and
   * its viewport-relative top before the prepend, then restores both after
   * the new rows land. Set to `false` to disable; the user will see the
   * list jump.
   */
  preserveScrollOnPrepend?: boolean
  /**
   * ARIA role for the scroll element. Defaults to `region` when `ariaLabel`
   * is set, otherwise unset. Use `log` for transcripts that should announce
   * new messages to assistive technology.
   */
  role?: string
  /**
   * Default {@link ScrollAnimation} for imperative scroll commands. When a
   * `scrollToItem` / `scrollToHead` / etc. call doesn't pass its own
   * animation, this one is used. Defaults to a 460ms ease-out-quart.
   */
  scrollAnimation?: ScrollAnimation
  /**
   * Inline style on the scroll element. Spread *after* the library's flex
   * defaults; override `flex` / `min-height` / `overflow` only when you
   * understand the layout contract.
   */
  style?: CSSProperties
  /**
   * Pixels to reserve at the tail for sticky chrome that overlays the
   * transcript (the composer dock, typically). Items align *above* this
   * region. Published via Root for Overlays to consume.
   */
  tailInset?: number
  /**
   * Tail reserve config. Pass `true` to enable with defaults, an options
   * object for fine control, or omit / pass `false` to disable. See
   * {@link TailReserveConfig}.
   */
  tailReserve?: TailReserveConfig
  /**
   * Pass-through options for the underlying TanStack Virtual instance. See
   * {@link VirtualizerOptions} for the (non-clobberable) subset.
   */
  virtualizerOptions?: VirtualizerOptions
}
