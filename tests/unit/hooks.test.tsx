import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useLiteNetwork } from '@/hooks/useLiteNetwork'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { env } from './setup'

function Probe() {
  return <span>{`${useReducedMotion()} ${useLiteNetwork()}`}</span>
}

describe('useReducedMotion / useLiteNetwork', () => {
  it('read the client values', () => {
    env.reducedMotion = true
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true)
    env.reducedMotion = false
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false)
    env.saveData = true
    expect(renderHook(() => useLiteNetwork()).result.current).toBe(true)
    env.saveData = false
    env.effectiveType = '3g'
    expect(renderHook(() => useLiteNetwork()).result.current).toBe(true)
    env.effectiveType = '4g'
    expect(renderHook(() => useLiteNetwork()).result.current).toBe(false)
  })

  it('are true on the server (no motion, no video before hydration)', () => {
    expect(renderToString(<Probe />)).toContain('true true')
  })
})
