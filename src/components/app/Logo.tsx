import Link from 'next/link'
import type { MouseEventHandler } from 'react'

import { cn } from '@/lib/cn'

const SIZE = {
  header: { mark: 'text-logo', sub: 'text-logo-sub' },
  // Catalog booklet mockup (design: catalogs)
  booklet: { mark: 'text-logo-booklet', sub: 'text-logo-booklet-sub' },
  // Footer: 22 / 7 below 768, as the header from 768 (design: footer 2a / 1a)
  footer: { mark: 'text-logo-footer md:text-logo', sub: 'text-logo-footer-sub md:text-logo-sub' },
} as const

/**
 * Text logo (README §3): «MGS» with an accent «S», «MEBEL» spaced out below — two lines for a
 * flex column of the parent. The official SVG replaces it here, in one place (README §10).
 */
export function LogoMark({ size = 'header' }: { size?: keyof typeof SIZE }) {
  return (
    <>
      <span aria-hidden="true" className={cn(SIZE[size].mark, 'text-text')}>
        MG<span className="text-accent">S</span>
      </span>
      {/* The negative margin cancels the letter-spacing after the last letter, so it stays centred */}
      <span aria-hidden="true" className={cn('-mr-[0.7em]', SIZE[size].sub, 'text-text-2')}>
        MEBEL
      </span>
    </>
  )
}

/** The logo link to the home page. `onClick`: the menu closes itself on it. */
export function Logo({ onClick }: { onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="MGS MEBEL — на главную"
      className="flex min-h-logo flex-col items-center gap-0.75"
    >
      <LogoMark />
    </Link>
  )
}
