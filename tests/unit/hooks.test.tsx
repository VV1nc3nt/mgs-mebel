import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSaveData } from '@/hooks/useSaveData'
import { env } from './setup'

function Probe() {
  return <span>{`${useReducedMotion()} ${useSaveData()}`}</span>
}

describe('useReducedMotion / useSaveData', () => {
  it('read the client values', () => {
    env.reducedMotion = true
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true)
    env.reducedMotion = false
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false)
    env.saveData = true
    expect(renderHook(() => useSaveData()).result.current).toBe(true)
  })

  it('are true on the server (no motion, no video before hydration)', () => {
    expect(renderToString(<Probe />)).toContain('true true')
  })
})
