import { createContext, useContext } from 'react'
import type { RootRegistration, RootState } from '../types'
import type { ViewportStore } from './viewportStore'

export type RootContextValue = {
  registerViewport: (registration: RootRegistration) => () => void
  requestViewportStateUpdate: () => void
  scrollElement: HTMLElement | null
  state: RootState
  /**
   * The Root's viewport state store. Always present (created lazily by Root,
   * not by Viewport), so descendant selector hooks can subscribe synchronously
   * on first render even before any Viewport effect has run. The Viewport
   * emits into this store via the Root registration. Reads `SSR_STATE` until
   * the first emit lands.
   */
  viewportStore: ViewportStore
}

export const initialRootState: RootState = {
  headInset: 0,
  scrollbarInlineSize: 0,
  tailInset: 0,
}

export const RootContext = createContext<RootContextValue | null>(null)

export function useRootRegistration() {
  return useContext(RootContext)?.registerViewport
}
