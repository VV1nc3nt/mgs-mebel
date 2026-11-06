import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let metrika: typeof import('@/lib/metrika')
let allowed: boolean
let ym: ReturnType<typeof vi.fn<(id: number, method: string, ...args: unknown[]) => void>>
const permitted = () => allowed
const tick = () => vi.advanceTimersByTimeAsync(40)

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 16),
  )
  document.head.querySelectorAll('script').forEach((script) => script.remove())
  delete window.ym
  history.replaceState(null, '', '/')
  allowed = true
  ym = vi.fn()
  metrika = await import('@/lib/metrika')
})
afterEach(() => {
  metrika.stopMetrika()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function loaded() {
  window.ym = ym
  document
    .querySelector<HTMLScriptElement>('script[src*="metrika/tag.js"]')!
    .dispatchEvent(new Event('load'))
}
const views = () => ym.mock.calls.filter((args) => args[1] === 'hit')

describe('Metrika lifecycle', () => {
  it('records current page only after a slow loader; navigations keep one init', async () => {
    const release = metrika.viewMetrika(7, '/', permitted)
    history.pushState(null, '', '/salons?utm_source=test&photo=2')
    release()
    metrika.viewMetrika(7, '/salons', permitted)
    expect(ym).not.toHaveBeenCalled()
    loaded()
    await tick()
    expect(views()).toHaveLength(1)
    expect(views()[0][2]).toBe('http://localhost:3000/salons?utm_source=test')
    history.pushState(null, '', '/')
    metrika.viewMetrika(7, '/', permitted)
    await tick()
    history.pushState(null, '', '/salons')
    metrika.viewMetrika(7, '/salons', permitted)
    await tick()
    expect(views()).toHaveLength(3)
    expect(ym.mock.calls.filter((args) => args[1] === 'init')).toHaveLength(1)
    expect(ym.mock.calls.find((args) => args[1] === 'init')?.[2]).toMatchObject({
      defer: true,
      ssr: true,
      webvisor: false,
    })
  })
  it('deduplicates repeated effects, including before first load', async () => {
    const release = metrika.viewMetrika(7, '/', permitted)
    release()
    metrika.viewMetrika(7, '/', permitted)
    loaded()
    await tick()
    metrika.viewMetrika(7, '/', permitted)
    await tick()
    expect(views()).toHaveLength(1)
  })
  it('cancels pending work on revocation and stops the live counter', async () => {
    metrika.viewMetrika(7, '/', permitted)
    allowed = false
    metrika.stopMetrika()
    loaded()
    await tick()
    expect(ym).not.toHaveBeenCalled()
    allowed = true
    metrika.viewMetrika(7, '/', permitted)
    await tick()
    expect(views()).toHaveLength(1)
    metrika.stopMetrika()
    expect(ym).toHaveBeenLastCalledWith(7, 'destruct')
  })
  it('does not send a departed page and tolerates a blocked loader', async () => {
    metrika.viewMetrika(7, '/', permitted)()
    await tick()
    loaded()
    await tick()
    expect(views()).toHaveLength(0)
  })
  it('handles loader failure without sending commands', async () => {
    metrika.viewMetrika(7, '/', permitted)
    document.querySelector('script')!.dispatchEvent(new Event('error'))
    await tick()
    expect(ym).not.toHaveBeenCalled()
    expect(document.querySelector('script')).toBeNull()
  })
})
