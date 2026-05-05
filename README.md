# Threadport

Headless virtualized chat viewport primitives for React, built on TanStack
Virtual. Threadport is intended to mimic the scroll behavior of ChatGPT and
Claude-style applications while your app owns messages, composer, buttons,
styling, and layout.

## Demo

- Site: https://threadport.pprice.me/
- Basic example: https://threadport.pprice.me/examples/basic
- Full featured example: https://threadport.pprice.me/examples/full-featured

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

The primary package README lives at
`packages/react-threadport/README.md` and is kept beside the library package for
npm publishing. It includes the full `Viewport` prop table, imperative handle
methods, animation factories, layout contract, and development notes.

## Development

This repository is a pnpm monorepo. From the repo root:

```sh
pnpm install
pnpm dev:site                  # marketing home + examples site
pnpm dev:harness               # Playwright fixtures host
pnpm test:react                # vitest unit tests
pnpm test:integration          # Playwright integration tests
pnpm build:lib                 # tsup build for the published package
```

React component tests live in `packages/react-threadport/tests/react`.
Browser-backed integration tests live in `tests/integration`.

## License

MIT
