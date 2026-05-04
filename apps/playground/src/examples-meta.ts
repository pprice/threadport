export type ExampleMeta = {
  description: string
  href: string
  id: string
  integration: string[]
  label: string
  ownedBy: 'host' | 'viewport'
  scope: string
  sourcePath: string
}

export const REPO_URL = 'https://github.com/pprice/threadport'

export const examples: ExampleMeta[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'A GPT-style transcript with submitted prompts aligned high.',
    href: '/examples/standard',
    integration: [
      'items',
      'estimateSize',
      'getItemKey',
      'renderItem',
      'scrollToItem',
      'tailReserve',
    ],
    ownedBy: 'host',
    scope: 'Baseline',
    sourcePath: 'apps/playground/src/pages/standard.tsx',
  },
  {
    id: 'insets',
    label: 'Insets',
    description: 'Visible head and tail insets for app chrome.',
    href: '/examples/insets',
    integration: [
      'headInset',
      'tailInset',
      'Overlay head',
      'Overlay tail',
      'scrollToItem',
    ],
    ownedBy: 'viewport',
    scope: 'Chrome',
    sourcePath: 'apps/playground/src/pages/insets.tsx',
  },
  {
    id: 'long-response',
    label: 'Long response',
    description: 'Tail reserve with a deliberately long assistant answer.',
    href: '/examples/long-response',
    integration: [
      'tailReserve',
      'minHeight',
      'scrollToItem',
      'estimateSize',
      'measureElement',
    ],
    ownedBy: 'viewport',
    scope: 'Tail reserve',
    sourcePath: 'apps/playground/src/pages/long-response.tsx',
  },
  {
    id: 'jump-to-bottom',
    label: 'Jump to bottom',
    description: 'Expose a jump control when the reader leaves the tail.',
    href: '/examples/jump-to-bottom',
    integration: [
      'ViewportHandle',
      'scrollToTail',
      'onStateChange',
      'Overlay fill',
      'useReducedMotion',
    ],
    ownedBy: 'host',
    scope: 'Policy',
    sourcePath: 'apps/playground/src/pages/jump-to-bottom.tsx',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    description: 'A phone-sized GPT shell with frame-relative overlays.',
    href: '/examples/mobile',
    integration: ['headInset', 'tailInset', 'Overlay', 'Root', 'Viewport'],
    ownedBy: 'host',
    scope: 'Responsive',
    sourcePath: 'apps/playground/src/pages/mobile.tsx',
  },
  {
    id: 'prepend',
    label: 'Prepend',
    description: 'Load older messages above while preserving the anchor.',
    href: '/examples/prepend',
    integration: ['preserveScrollOnPrepend', 'estimateSize', 'initialAnchor'],
    ownedBy: 'viewport',
    scope: 'History',
    sourcePath: 'apps/playground/src/pages/prepend.tsx',
  },
  {
    id: 'data-loading',
    label: 'Data loading',
    description: 'Fetch older pages as the reader scrolls backward.',
    href: '/examples/data-loading',
    integration: [
      'onStateChange',
      'scrollOffset',
      'auto load threshold',
      'preserveScrollOnPrepend',
      'headReserve',
      'loading state',
    ],
    ownedBy: 'host',
    scope: 'Loading',
    sourcePath: 'apps/playground/src/pages/data-loading.tsx',
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    description:
      'Viewport fills the full document height — phone, tablet, or desktop.',
    href: '/examples/fullscreen',
    integration: ['Root', 'Viewport', 'Overlay tail', 'tailReserve'],
    ownedBy: 'host',
    scope: 'Layout',
    sourcePath: 'apps/playground/src/pages/fullscreen.tsx',
  },
  {
    id: 'variable-height',
    label: 'Variable height',
    description: 'Resize the host container live; the viewport tracks it.',
    href: '/examples/variable-height',
    integration: ['Root', 'Viewport', 'min-height', 'overflow'],
    ownedBy: 'host',
    scope: 'Layout',
    sourcePath: 'apps/playground/src/pages/variable-height.tsx',
  },
]
