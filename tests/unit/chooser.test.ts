import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeChooser, getActiveChooser, openChooser, subscribeChooser } from '@/lib/chooser'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const setScroll = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  fireEvent.scroll(window)
}
const resize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  fireEvent(window, new Event('resize'))
}

describe('chooser store', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    })
    resize(390, 800)
  })
  afterEach(() => closeChooser())

  it('keeps one choice open: a new one replaces the old', () => {
    let calls = 0
    const unsubscribe = subscribeChooser(() => calls++)
    openChooser('dock')
    openChooser('dock')
    expect(getActiveChooser()).toBe('dock')
    openChooser('hero')
    expect(getActiveChooser()).toBe('hero')
    expect(calls).toBe(2)
    unsubscribe()
  })

  it('closes only its own choice by id, any without an id', () => {
    openChooser('hero')
    closeChooser('dock')
    expect(getActiveChooser()).toBe('hero')
    closeChooser()
    expect(getActiveChooser()).toBeNull()
  })

  it('a page scroll of more than 6px closes it, up to 6px does not', async () => {
    openChooser('dock')
    setScroll(1006)
    await frame()
    expect(getActiveChooser()).toBe('dock')
    setScroll(993)
    await frame()
    expect(getActiveChooser()).toBeNull()
  })

  it('a change of the width closes it, of the height only (a browser toolbar) does not', () => {
    openChooser('dock')
    resize(390, 700)
    expect(getActiveChooser()).toBe('dock')
    resize(844, 390)
    expect(getActiveChooser()).toBeNull()
  })
})
