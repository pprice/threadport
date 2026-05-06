# Threadport

Headless virtualized chat viewport primitives for React, built on TanStack
Virtual. Threadport is intended to mimic the scroll behavior of ChatGPT and
Claude-style applications while your app owns messages, composer, buttons,
styling, and layout.

## Demo

- Site: https://threadport.pprice.me/
- Basic example: https://threadport.pprice.me/examples/basic
- Full featured example: https://threadport.pprice.me/examples/full-featured
- Insets example: https://threadport.pprice.me/examples/insets
- Long response example: https://threadport.pprice.me/examples/long-response

## Install

```sh
npm install @phipri/react-threadport react
```

## Usage

```tsx
import * as ThreadPort from '@phipri/react-threadport'
import { useRef } from 'react'

type Message = { id: string; body: string }

export function Chat({ messages }: { messages: Message[] }) {
  const viewportRef = useRef<ThreadPort.ViewportHandle | null>(null)

  return (
    <ThreadPort.Root>
      <ThreadPort.Viewport
        ref={viewportRef}
        items={messages}
        getItemKey={(message) => message.id}
        estimateSize={() => 160}
        renderItem={({ item }) => <article>{item.body}</article>}
        headInset={64}
        tailInset={168}
        initialAnchor="tail"
        className="chatScroll"
        scrollElementProps={{ 'data-gesture-root': 'chat' }}
        scrollAnimation={ThreadPort.Animation.easeOutCubic(420)}
        tailReserve
        virtualizerOptions={{ overscan: 12 }}
      />

      <ThreadPort.Overlay placement="tail">
        <Composer
          onSubmit={(messageId) => {
            viewportRef.current?.scrollToItem(messageId, {
              align: 'head',
              animation: ThreadPort.Animation.easeOutQuart(520),
            })
          }}
        />
      </ThreadPort.Overlay>
    </ThreadPort.Root>
  )
}
```

## Concepts

- `head`: older/start side of the transcript.
- `tail`: newer/end side of the transcript.
- `inset`: persistent overlap from app chrome, such as a header or composer.
- `reserve`: intentional space, such as unloaded history or active tail space.
- `threshold`: tolerance for `isAtHead` and `isAtTail`.

## API

`Viewport` props:

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `readonly TItem[]` | Yes | Items to virtualize. |
| `getItemKey` | `(item, index) => string \| number` | Yes | Stable key for each item. |
| `estimateSize` | `(item, index) => number` | Yes | Estimated row height before measurement. |
| `renderItem` | `(args) => ReactNode` | Yes | Renders one item. |
| `ariaLabel` | `string` | No | Accessible label for the scroll region. |
| `atHeadThreshold` | `number` | No | Distance in px considered "at head". |
| `atTailThreshold` | `number` | No | Distance in px considered "at tail". |
| `className` | `string` | No | Class for the scroll element. |
| `contentClassName` | `string` | No | Class for the virtual content element. |
| `headInset` | `number` | No | Persistent overlap at the head, usually top chrome. |
| `headReserve` | `number` | No | Extra reserved space before the first item. |
| `initialAnchor` | `'head' \| 'tail'` | No | Initial scroll position. |
| `itemClassName` | `string` | No | Class for each measured virtual row. |
| `itemGap` | `number` | No | Gap in px between rows. |
| `onStateChange` | `(state) => void` | No | Receives scroll distances, booleans, sizes, and render count. |
| `overscan` | `number` | No | Extra rows rendered outside the viewport. |
| `preserveScrollOnPrepend` | `boolean` | No | Keeps the visible anchor stable when items are inserted at the head. |
| `role` | `string` | No | ARIA role for the scroll element. |
| `scrollAnimation` | `ScrollAnimation` | No | Default animation for imperative scroll commands. |
| `scrollElementProps` | `ScrollElementProps` | No | Extra props for the scroll element, such as `data-*`, `id`, and `title`. Use `className` for classes. |
| `style` | `CSSProperties` | No | Inline style for the scroll element. |
| `tailInset` | `number` | No | Persistent overlap at the tail, usually composer space. |
| `tailReserve` | `boolean \| TailReserveOptions` | No | Gives the active appended tail item a viewport-sized minimum height. |
| `virtualizerOptions` | `VirtualizerOptions` | No | Safe TanStack Virtual options; Threadport-owned scroll/padding options are omitted. |

`virtualizerOptions` is for TanStack tuning without prop thunking. Threadport
still owns `count`, `getScrollElement`, item keys, estimates, inset padding,
scroll padding, `onChange`, orientation, lanes, and initial offset. `overscan`
and `itemGap` are shorthands that win over `virtualizerOptions.overscan` and
`virtualizerOptions.gap`.

Imperative handle:

- `scrollToHead(options) → Promise<ScrollResult>`
- `scrollToTail(options) → Promise<ScrollResult>`
- `scrollToIndex(index, { align, animation }) → Promise<ScrollResult>`
- `scrollToItem(key, { align, animation, awaitMount }) → Promise<ScrollResult>`
- `measure()`, `getState()`, `getScrollElement()`, `stopScrollAnimation()`

`ScrollResult` resolves to `'completed'`, `'cancelled'` (user wheel/touch
interrupted, or another scroll cancelled in flight), or `'rejected'`
(target couldn't be resolved — out-of-range index, missing key, or
`awaitMount` timed out).

`scrollToItem({ awaitMount: true })` is the "scroll the just-submitted
prompt to the head" pattern. Call it immediately after `setItems(append)`
without manually waiting for paint — the library defers the scroll until
the next frame after the new key appears in `items`. Times out at 1000ms.

Animations honor `prefers-reduced-motion` automatically (clamping to
instant scroll). Set `respectReducedMotion: false` on a `ScrollAnimation`
only if you have a reason to override that — almost never the right call.

Animation factories:

- `Animation.linear(duration)`
- `Animation.easeOutQuad(duration)`, `Animation.easeOutCubic(duration)`, `Animation.easeOutQuart(duration)`, `Animation.easeOutQuint(duration)`
- `Animation.easeInOutCubic(duration)`

Frame helpers:

- `Root`: shares inset and scrollbar geometry with overlays.
- `Overlay`: frame-relative overlay; avoids the scrollbar lane by default and can forward wheel events to the viewport.
- `useRootState`: read frame geometry in custom UI.

State subscription helpers (call from descendants of a `<Root>`):

- `useViewportSelector(selector, equalityFn?)`: subscribe to a slice of
  `ViewportState`; only re-renders when the slice changes. Returns a
  synthetic initial state until the Viewport's first emit lands, so the
  hook is safe on first render.
- `useViewportReady()`: one-shot `state.isReady` signal — `false` until
  the first settled-state emission, then `true` for the lifetime of the
  Viewport. Empty (`items.length === 0`) Viewports report `true`
  immediately. Use to gate first-paint UI.
- `useReducedMotion()`: subscribes to the OS-level
  `prefers-reduced-motion` setting. Use for *host-level* motion
  decisions (composer streaming pacing, message-enter animations) — the
  Viewport's scroll animations already auto-respect PRM.

Visibility tunables (on `Viewport`):

- `visibilityOptions={{ thresholdPercent, dwellMs, debounceMs }}`:
  - `thresholdPercent`: 0..1, fraction of an item's rect that must
    overlap the viewport to count as visible. Default 0 (any pixel
    counts).
  - `dwellMs`: delay before a newly-overlapping item is included in the
    next `entered` array. Filters scroll-flyby noise for read receipts.
    Exits still fire immediately. Default 0.
  - `debounceMs`: trailing-debounce the entire visibility computation.
    Default 0. The whole computation is skipped when no
    `onVisibilityChange` handler is registered, regardless of options.

## Layout

`<ThreadPort.Root>` ships with `display: flex; flex-direction: column; min-height: 0` as inline-style defaults. `<ThreadPort.Viewport>` ships with `flex: 1 1 auto; min-height: 0; overflow-y: auto`. Together: the viewport fills any parent that gives it a definite height, and stays out of the way of any parent that doesn't.

**The contract: the Root's parent must have a definite height for internal scrolling.** The library can't manufacture a height; it can only respect the one you provide.

Four common patterns:

```tsx
// 1. 100dvh shell — the canonical "chat fills the screen" layout
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
  <header>...</header>
  <ThreadPort.Root style={{ flex: 1 }}>...</ThreadPort.Root>
</div>

// 2. Fixed pixel container
<ThreadPort.Root style={{ height: 600 }}>...</ThreadPort.Root>

// 3. Sized grid track
<div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr)', height: '100dvh' }}>
  <ThreadPort.Root>...</ThreadPort.Root>
</div>

// 4. Variable, react-state driven
<div style={{ height: hostHeight }}>
  <ThreadPort.Root>...</ThreadPort.Root>
</div>
```

If the Root's parent is content-sized — no height, no `flex: 1`, not a stretching grid item with a constrained row — the viewport will grow with each new message instead of scrolling. That's the symptom of an unconstrained parent.

When stacking inside a flex column, `min-height: 0` matters at every level: parent flex items default to `min-height: auto` (content-based) and won't shrink to allow overflow. Threadport sets it on its own elements; you may need it on yours too.

The `headInset` and `tailInset` props reserve space *within* the viewport for chrome (sticky headers, composers via `Overlay`). They are not a substitute for a sized parent.

Other rules of thumb:

- Keep composer and floating controls outside `Viewport`. Use `Overlay` with `placement="head"` / `placement="tail"` for frame-relative chrome.
- Pass overlap as `headInset` / `tailInset`; do not fake it with message padding.
- Use `tailReserve` when newly appended responses should start with a screen of empty space beneath them.

## Chat Transcript Patterns

The full featured example at
https://threadport.pprice.me/examples/full-featured shows a staged assistant
response with loading/search phases, streaming Markdown, feedback controls, a
variable-height composer, and a jump-to-bottom affordance.

For mixed row types, keep one virtualized item stream and render by
discriminated type:

```tsx
type TranscriptItem =
  | { kind: 'message'; id: string; role: 'user' | 'assistant'; body: string }
  | { kind: 'tool'; id: string; label: string; state: 'running' | 'complete' }
  | { kind: 'image'; id: string; src: string; width: number; height: number }

<ThreadPort.Viewport
  items={items}
  getItemKey={(item) => item.id}
  estimateSize={(item) => estimateTranscriptRow(item)}
  renderItem={({ item }) => <TranscriptRow item={item} />}
/>
```

Use stable keys for every row, including tool/status/image rows. If the row
scrolls with the transcript, make it an item; keep only fixed chrome such as
the composer or jump button in `Overlay`.

For tail behavior during streaming, treat `isAtTail` as policy input rather
than a command. Capture whether the user was following the tail before you
append or extend the assistant row, then decide whether to follow the stream or
show a jump control:

```tsx
const stateRef = useRef<ThreadPort.ViewportState | null>(null)
const [showJump, setShowJump] = useState(false)

function appendAssistantDelta(delta: string) {
  const wasAtTail = stateRef.current?.isAtTail ?? true

  setItems((items) => applyAssistantDelta(items, delta))

  if (wasAtTail) {
    requestAnimationFrame(() => viewportRef.current?.scrollToTail({ duration: 0 }))
  } else {
    setShowJump(true)
  }
}
```

That policy is separate from "submitted prompt to head" behavior. Many chat apps
scroll the new user message to the head, then follow live output only while the
human stays near the tail.

For mobile Safari and dynamic Markdown heights:

- Put app gesture hooks on the scroll element with `scrollElementProps`, and
  classes/styles through `className` / `style`.
- Avoid nested touch scrollers around the viewport; let Threadport own the
  scroll container.
- Give images, previews, and embeds stable dimensions or aspect ratios before
  content loads.
- Let Markdown reflow normally. Threadport observes rendered row height changes
  and preserves the appropriate anchor after measurement.

## Development

This package lives in a pnpm monorepo. From the repo root:

```sh
pnpm install
pnpm dev:site                  # marketing home + examples site
pnpm dev:harness               # Playwright fixtures host
pnpm test:react                # vitest unit tests
pnpm test:integration          # Playwright integration tests
pnpm build:lib                 # tsup build for the published package
```

React component tests live in `packages/react-threadport/tests/react`.
Browser-backed integration tests live in the repo's `tests/integration`.

## License

MIT
