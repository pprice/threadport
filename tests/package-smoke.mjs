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
assert.equal(threadport.easeOutCubic(420).duration, 420)
assert.equal(typeof threadport.easeOutQuad, 'function')
assert.equal(typeof threadport.easeOutQuart, 'function')
assert.equal(typeof threadport.easeOutQuint, 'function')
assert.equal(typeof threadport.easeInOutCubic, 'function')
assert.equal(typeof threadport.linear, 'function')
