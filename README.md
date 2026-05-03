# Threadport

Headless virtualized chat viewport primitives for React.

Threadport gives you the scroll mechanics for ChatGPT-style transcripts without
owning your message UI, composer, buttons, colors, or layout system.

## Install

```sh
npm install threadport
```

Threadport expects React from your app:

```sh
npm install react
```

## Basic Usage

```tsx
import {
  ChatVirtualViewport,
  type ChatVirtualViewportHandle,
} from 'threadport'
import { useRef } from 'react'

type Message = {
  id: string
  body: string
}

export function Chat({ messages }: { messages: Message[] }) {
  const viewportRef = useRef<ChatVirtualViewportHandle | null>(null)

  return (
    <ChatVirtualViewport
      ref={viewportRef}
      items={messages}
      getItemKey={(message) => message.id}
      estimateSize={() => 160}
      renderItem={({ item }) => <article>{item.body}</article>}
      initialAnchor="tail"
      tailInset={160}
      tailReserve
    />
  )
}
```

## Overlay-Aware Layout

Use `ChatViewportFrame` and `ChatViewportOverlay` when your composer, fade, or
floating controls overlap the viewport. The frame measures the native scrollbar
lane and exposes geometry to overlays so they do not paint over the scrollbar.

```tsx
import {
  ChatViewportFrame,
  ChatViewportOverlay,
  ChatVirtualViewport,
} from 'threadport'

export function ChatShell({ messages }: { messages: Message[] }) {
  return (
    <ChatViewportFrame>
      <ChatVirtualViewport
        items={messages}
        getItemKey={(message) => message.id}
        estimateSize={() => 160}
        renderItem={({ item }) => <MessageView message={item} />}
        headInset={64}
        tailInset={168}
        tailReserve
      />

      <ChatViewportOverlay placement="tail">
        <Composer />
      </ChatViewportOverlay>
    </ChatViewportFrame>
  )
}
```

## Concepts

- `head`: the older/start side of the transcript.
- `tail`: the newer/end side of the transcript.
- `inset`: persistent overlap from app chrome, such as a top bar or composer.
- `reserve`: intentional scrollable/measurable space, such as unloaded history or the active response tail reserve.
- `threshold`: tolerance used for `isAtHead` and `isAtTail`.

## Public API

- `ChatVirtualViewport`: virtualized, variable-height chat viewport.
- `ChatViewportFrame`: geometry provider for overlays around a viewport.
- `ChatViewportOverlay`: frame-relative overlay that avoids the scrollbar lane.
- `useChatViewportFrameState`: reads measured frame geometry.
- `easeOutCubic` / `easeOutQuart`: small easing helpers for scroll commands.

## Playground

Run the local playground:

```sh
npm install
npm run dev
```

Open the visual demo at `/`. The direct API harness used by tests is available
at `/?fixture=api`.

Run the package build and playground build:

```sh
npm run build
```

Run all local checks:

```sh
npm test
```

Run only the browser regression tests:

```sh
npm run test:e2e
```

Run only the package export smoke test:

```sh
npm run test:package
```

## Publishing Checklist

Before publishing:

```sh
npm run build
npm test
npm run pack:dry
```

Inspect the dry-run output. Only `dist`, `README.md`, `LICENSE`, and package
metadata should be included.

## License

MIT
