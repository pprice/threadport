import { createContext, useContext } from 'react'
import type { RootRegistration, RootState } from '../types'

export type RootContextValue = {
  registerViewport: (registration: RootRegistration) => () => void
  requestViewportStateUpdate: () => void
  scrollElement: HTMLElement | null
  state: RootState
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
