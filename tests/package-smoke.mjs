import assert from 'node:assert/strict'
import * as threadport from '../dist/index.js'

const expectedExports = [
  'ChatViewportFrame',
  'ChatViewportOverlay',
  'ChatVirtualViewport',
  'readScrollbarInlineSize',
  'useChatViewportFrameState',
]

for (const exportName of expectedExports) {
  assert.ok(threadport[exportName], `Expected ${exportName} to be exported`)
}

assert.equal(typeof threadport.easeOutCubic, 'function')
assert.equal(typeof threadport.easeOutQuart, 'function')
