import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Setting } from '@/payload-types'

import { getTestPayload } from './helpers'

// Outside a Next request: no request scope for connection(), no incremental cache.
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

const { getLayout, getSettings } = await import('@/lib/queries')

describe('site chrome queries', () => {
  let payload: Payload
  let original: Setting

  beforeAll(async () => {
    payload = await getTestPayload()
    original = await payload.findGlobal({ slug: 'settings', depth: 0 })
    await payload.updateGlobal({
      slug: 'settings',
      depth: 0,
      data: {
        contacts: { hotlinePhone: original.contacts?.hotlinePhone || '8 800 100-16-58' },
        technical: { consultantWidgetCode: '<script>window.widget = true</script>' },
      },
    })
  })

  afterAll(async () => {
    const { id: _id, updatedAt: _u, createdAt: _c, ...data } = original
    await payload.updateGlobal({ slug: 'settings', depth: 0, data })
  })

  it('the raw Local API read does return the widget code (control)', async () => {
    const raw = await payload.findGlobal({ slug: 'settings', depth: 0 })
    expect(raw.technical?.consultantWidgetCode).toContain('window.widget')
  })

  it('getSettings returns only public contacts and messengers', async () => {
    const settings = await getSettings()
    expect(Object.keys(settings).sort()).toEqual(['contacts', 'messengers'])
    expect(settings).not.toHaveProperty('technical')
    expect(settings).not.toHaveProperty('designerManager')
    expect(JSON.stringify(settings)).not.toContain('window.widget')
  })

  it('getLayout reads the layout global', async () => {
    const layout = await getLayout()
    expect(layout).toHaveProperty('nav')
  })
})
