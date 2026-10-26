import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidateTag }))

const { ALL_TAGS, expireTags, newsTags, shouldRevalidate } = await import('@/lib/revalidate')

describe('shouldRevalidate', () => {
  it.each([
    ['autosave of a draft', { operation: 'update', draftSave: true, status: 'draft' }, false],
    [
      'a saved draft of a published doc',
      { operation: 'update', draftSave: true, status: 'draft' },
      false,
    ],
    ['creating a draft', { operation: 'create', draftSave: true, status: 'draft' }, false],
    ['publishing', { operation: 'update', draftSave: false, status: 'published' }, true],
    ['unpublishing', { operation: 'update', draftSave: false, status: 'draft' }, true],
    [
      'creating a published doc',
      { operation: 'create', draftSave: false, status: 'published' },
      true,
    ],
    ['deleting', { operation: 'delete' }, true],
    ['a collection without drafts', { operation: 'update', status: undefined }, true],
    ['a global without drafts', { operation: 'update', draftSave: false, status: undefined }, true],
    ['a seed write', { operation: 'update', status: 'published', disabled: true }, false],
    ['a seed delete', { operation: 'delete', disabled: true }, false],
  ] as const)('%s → %s', (_, decision, expected) => {
    expect(shouldRevalidate(decision)).toBe(expected)
  })

  it('ignores the status of the previous version: unpublishing over a draft still counts', () => {
    // previousDoc is the latest version (a draft here), not the published row.
    expect(shouldRevalidate({ operation: 'update', draftSave: false, status: 'draft' })).toBe(true)
  })
})

describe('newsTags', () => {
  it('the list and the page of the news', () => {
    expect(newsTags({ slug: 'a' }, { slug: 'a' })).toEqual(['collection:news', 'news:a'])
  })

  it('a changed slug expires the old page too', () => {
    expect(newsTags({ slug: 'b' }, { slug: 'a' })).toEqual(['collection:news', 'news:b', 'news:a'])
  })

  it('without a previous document or a slug', () => {
    expect(newsTags({ slug: 'a' })).toEqual(['collection:news', 'news:a'])
    expect(newsTags({ slug: null }, null)).toEqual(['collection:news'])
  })
})

describe('expireTags', () => {
  beforeEach(() => {
    revalidateTag.mockClear()
    revalidateTag.mockImplementation(() => undefined)
  })

  it('expires every tag at once (no stale reads)', () => {
    expireTags(['global:layout', 'collection:news'])
    expect(revalidateTag.mock.calls).toEqual([
      ['global:layout', { expire: 0 }],
      ['collection:news', { expire: 0 }],
    ])
  })

  it('outside a Next request skips silently', () => {
    revalidateTag.mockImplementation(() => {
      throw Object.assign(
        new Error('Invariant: static generation store missing in revalidateTag global:layout'),
        { __NEXT_ERROR_CODE: 'E263' },
      )
    })
    expect(() => expireTags(ALL_TAGS)).not.toThrow()
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })

  it('other errors are thrown', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('Route / used "revalidateTag global:layout" during render')
    })
    expect(() => expireTags(['global:layout'])).toThrow(/during render/)
  })

  it('ALL_TAGS covers globals, page globals and collections', () => {
    expect(ALL_TAGS).toEqual(
      expect.arrayContaining([
        'global:layout',
        'global:settings',
        'global:stats',
        'global:home',
        'global:newsPage',
        'global:legalPrivacy',
        'global:legalCookies',
        'global:legalOffer',
        'collection:news',
        'collection:projects',
        'collection:items',
        'collection:salons',
        'collection:catalogs',
      ]),
    )
    expect(ALL_TAGS).toHaveLength(18)
  })
})
