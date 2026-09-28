import { describe, expect, it } from 'vitest'

import { telHref } from '@/lib/phone'

describe('telHref', () => {
  it('keeps digits only', () => {
    expect(telHref('8 800 100-16-58')).toBe('tel:88001001658')
    expect(telHref('8 (495) 777-35-75')).toBe('tel:84957773575')
  })

  it('keeps a leading plus', () => {
    expect(telHref(' +7 927 096-35-55')).toBe('tel:+79270963555')
  })

  it('returns undefined without digits', () => {
    expect(telHref('')).toBeUndefined()
    expect(telHref('—')).toBeUndefined()
  })
})
