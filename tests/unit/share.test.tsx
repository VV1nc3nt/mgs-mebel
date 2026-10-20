import { describe, expect, it } from 'vitest'

import { clipboardMethod, shareMethod, shareRefusal } from '@/lib/share'

const DATA = { title: 'Кухня-гостиная', url: 'https://mgs.example/works/kuhnya' }
const share = () => Promise.resolve()
const writeText = () => Promise.resolve()
const domError = (name: string) => Object.assign(new Error(name), { name })

describe('share decisions', () => {
  it('the share sheet when there is one and it takes the data', () => {
    expect(shareMethod({ share, clipboard: { writeText } }, DATA)).toBe('share')
    expect(shareMethod({ share, canShare: () => true }, DATA)).toBe('share')
  })

  it('no share sheet, or it refuses the data: the clipboard, else the text', () => {
    expect(shareMethod({ clipboard: { writeText } }, DATA)).toBe('clipboard')
    expect(shareMethod({ share, canShare: () => false, clipboard: { writeText } }, DATA)).toBe(
      'clipboard',
    )
    const throwing = () => {
      throw new TypeError('bad data')
    }
    expect(shareMethod({ share, canShare: throwing, clipboard: { writeText } }, DATA)).toBe(
      'clipboard',
    )
    expect(shareMethod({}, DATA)).toBe('text')
    expect(shareMethod({ clipboard: {} }, DATA)).toBe('text')
    expect(clipboardMethod({ clipboard: undefined })).toBe('text')
  })

  it('a closed share sheet is no failure; other refusals fall back', () => {
    expect(shareRefusal(domError('AbortError'))).toBe('ignore')
    expect(shareRefusal(domError('NotAllowedError'))).toBe('fallback')
    expect(shareRefusal(new TypeError('x'))).toBe('fallback')
    expect(shareRefusal('x')).toBe('fallback')
  })
})
