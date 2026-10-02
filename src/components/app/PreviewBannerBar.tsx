'use client'

import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

/**
 * Draft mode strip: «Предпросмотр черновика · Выйти». Hidden inside the Live Preview iframe, where
 * the admin already says what is shown. «Выйти» is a GET form, not a link: links are prefetched
 * and would leave draft mode before the click.
 */
export function PreviewBannerBar() {
  const framed = useSyncExternalStore(
    noSubscribe,
    () => window.self !== window.top,
    () => false,
  )
  const pathname = usePathname()
  if (framed) return null

  return (
    <form
      action="/preview/exit"
      method="get"
      role="status"
      className="flex h-11 items-center justify-center gap-2 bg-accent px-gutter text-caption text-on-accent md:px-gutter-md xl:px-gutter-xl"
    >
      <span>Предпросмотр черновика</span>
      <span aria-hidden="true">·</span>
      <input type="hidden" name="path" value={pathname} />
      <button type="submit" className="h-full font-bold underline underline-offset-2">
        Выйти
      </button>
    </form>
  )
}
