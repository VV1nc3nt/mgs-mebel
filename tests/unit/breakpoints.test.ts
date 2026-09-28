import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { DESKTOP_QUERY } from '@/lib/breakpoints'

describe('DESKTOP_QUERY', () => {
  it('matches --breakpoint-xl in globals.css', () => {
    const css = readFileSync(path.resolve('src/app/(frontend)/globals.css'), 'utf8')
    const xl = css.match(/--breakpoint-xl:\s*([^;]+);/)?.[1]
    expect(DESKTOP_QUERY).toBe(`(min-width: ${xl})`)
  })
})
