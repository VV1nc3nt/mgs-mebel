'use client'

import { useId, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { FOOTER_TITLE } from './footerStyles'

export type FooterSection = { key: string; title: string; content: ReactNode }

/** Below 768 one open panel; wider screens show both lists. No JS: all links stay visible. */
export function FooterAccordion({ sections }: { sections: FooterSection[] }) {
  const [open, setOpen] = useState(-1)
  const id = useId()

  if (sections.length === 0) return null

  return (
    <div className="flex flex-col border-b border-border md:contents">
      <noscript>
        <style>{`
          [data-footer-column] > h2 > button { display: none; }
          [data-footer-column] > h2 > span { display: block; }
          [data-footer-panel] { display: block; }
        `}</style>
      </noscript>
      {sections.map(({ key, title, content }, i) => {
        const expanded = open === i
        const panelId = `${id}-${key}`
        return (
          <div
            key={key}
            data-footer-column={key}
            className={cn(
              'flex min-w-0 flex-col border-t border-border md:row-start-2 md:gap-3.5 md:border-t-0 xl:row-start-1',
              key === 'menu' ? 'md:col-start-1 xl:col-start-2' : 'md:col-start-2 xl:col-start-3',
            )}
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
            <div
              id={panelId}
              data-footer-panel=""
              className={cn('pb-3 md:pb-0', !expanded && 'max-md:hidden')}
            >
              {content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
