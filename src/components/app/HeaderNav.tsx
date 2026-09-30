'use client'

import Link from 'next/link'

import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { useRoutePath } from '@/hooks/useRoutePath'
import type { NavItem } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { isActive } from '@/lib/routes'

/** Desktop sections row (README §5.2). Client: layouts keep their render across navigations. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = useRoutePath()
  if (!items.length) return null

  return (
    <nav aria-label="Разделы сайта" className="hidden xl:block">
      <ul className="flex items-center gap-7">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative text-body-s transition-colors',
                  HIT_AREA_Y,
                  active ? 'font-bold text-accent' : 'font-semibold text-text-2 hover:text-text',
                )}
              >
                {item.shortLabel}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
