'use client'

import { createContext, useContext } from 'react'

const BgVideoActiveContext = createContext(true)

/**
 * Marks the background videos inside as active or not, for a slide rendered on the server and
 * switched on the client (news slider): only the card in view plays (README §3).
 */
export const BgVideoActiveProvider = BgVideoActiveContext.Provider

/** False inside an inactive slide; true everywhere else. */
export function useBgVideoActive(): boolean {
  return useContext(BgVideoActiveContext)
}
