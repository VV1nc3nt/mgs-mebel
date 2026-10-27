'use client'

import { useId, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { FOOTER_TITLE } from './footerStyles'

export type FooterSection = { key: string; title: string; content: ReactNode }

/**
 * Footer columns «Меню», «Покупателям», «Салоны» (design: footer 2a / 1a). Below 768 — an
 * accordion: one open at a time, all closed at first; from 768 the same lists are plain columns
 * of the footer grid (`md:contents`). The links come from the server in `content`, so they are in
 * the HTML; the island only keeps which one is open. A closed panel is hidden below 768 only —
 * not by the `hidden` attribute: the same list is the column from 768.
 */
export function FooterAccordion({ sections }: { sections: FooterSection[] }) {
  const [open, setOpen] = useState(-1)
  const id = useId()

  if (sections.length === 0) return null

  return (
    <div className="flex flex-col border-b border-border md:contents">
      {sections.map(({ key, title, content }, i) => {
        const expanded = open === i
        const panelId = `${id}-${key}`
        return (
          <div
            key={key}
            data-footer-column={key}
            className="flex flex-col border-t border-border md:gap-3.5 md:border-t-0"
          >
            <h2>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? -1 : i)}
                className="flex h-15 w-full items-center justify-between text-left text-title-s md:hidden"
              >
                {title}
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3"
                >
                  <span
                    className={cn(
                      'relative flex size-3 items-center justify-center footer-plus',
                      expanded && 'rotate-45 text-accent',
                    )}
                  >
                    <span className="absolute h-0.5 w-3 rounded-full bg-current" />
                    <span className="absolute h-3 w-0.5 rounded-full bg-current" />
                  </span>
                </span>
              </button>
              <span className={cn(FOOTER_TITLE, 'block max-md:hidden')}>{title}</span>
            </h2>
            <div id={panelId} className={cn('pb-3 md:pb-0', !expanded && 'max-md:hidden')}>
              {content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
