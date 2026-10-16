/*
 * «Поделиться» (README §6.4): the system share sheet where the browser has one, else the link to
 * the clipboard, else the link itself as text to copy by hand. Pure decisions; the button calls
 * the browser APIs.
 */

export type ShareData = { title: string; url: string }

/** What the browser offers, read from `navigator` at the moment of the press. */
export type ShareSupport = {
  share?: ((data: ShareData) => Promise<void>) | undefined
  canShare?: ((data: ShareData) => boolean) | undefined
  clipboard?: { writeText?: ((text: string) => Promise<void>) | undefined } | undefined
}

export type ShareMethod = 'share' | 'clipboard' | 'text'

/** The share sheet, if there is one and it takes this data; else the clipboard; else the text. */
export function shareMethod(support: ShareSupport, data: ShareData): ShareMethod {
  if (typeof support.share === 'function') {
    let can = true
    try {
      can = support.canShare ? support.canShare(data) : true
    } catch {
      can = false
    }
    if (can) return 'share'
  }
  return clipboardMethod(support)
}

/** The step after the share sheet: the clipboard if it can be written, else the text. */
export const clipboardMethod = (support: ShareSupport): Exclude<ShareMethod, 'share'> =>
  typeof support.clipboard?.writeText === 'function' ? 'clipboard' : 'text'

/** A rejected `navigator.share()`: closed by the person (AbortError) — nothing; else a fallback. */
export const shareRefusal = (error: unknown): 'ignore' | 'fallback' =>
  error instanceof Error && error.name === 'AbortError' ? 'ignore' : 'fallback'
