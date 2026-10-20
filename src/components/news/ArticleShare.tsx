'use client'

import { Link as LinkIcon } from 'lucide-react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { IconButton } from '@/components/ui/IconButton'
import { SHARE_COPIED, useShareStatus } from '@/hooks/useShareStatus'
import type { MessengerKind } from '@/lib/chrome'

import { ARTICLE_COLUMN } from './articleStyles'

/** Microcopy: the row and the button names. */
const SHARE_LABEL = 'Поделиться'
const COPY_LABEL = 'Скопировать ссылку'
const MESSENGER_NAME: Record<MessengerKind, string> = {
  max: 'MAX',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

type Props = {
  /** Absolute URL of the article (as canonical): what «Скопировать ссылку» copies. */
  url: string
  /** Share links of the messengers in MESSENGER_ORDER (built on the server, MAX — by template). */
  links: { kind: MessengerKind; href: string }[]
}

/**
 * «Поделиться» under the article (README §6.8): the label on the left, round buttons on the right
 * — the messengers' share pages (a new tab, by Action), then «Скопировать ссылку». The label turns
 * into «Ссылка скопирована» for --share-status-time; without the clipboard it turns into the link
 * itself, kept until the next press. Only the outcome is announced (the live region holds nothing
 * else).
 */
export function ArticleShare({ url, links }: Props) {
  const { status, shown, hide, copy } = useShareStatus()
  const outcome = shown ? status : null

  return (
    <div className="page-container mt-8">
      <div
        role="group"
        aria-label={SHARE_LABEL}
        className={`${ARTICLE_COLUMN} flex items-center gap-2.5 border-t border-border pt-5`}
        data-article-share=""
      >
        <div className="min-w-0 flex-1 text-body-s font-semibold text-text-4">
          {!outcome && <span aria-hidden="true">{SHARE_LABEL}</span>}
          <span role="status" aria-live="polite">
            {outcome?.kind === 'copied' && SHARE_COPIED}
            {outcome?.kind === 'link' && (
              <span className="break-all select-all">{outcome.url}</span>
            )}
          </span>
        </div>
        {links.map(({ kind, href }) => (
          <IconButton
            key={kind}
            href={href}
            variant="surface"
            size={44}
            aria-label={`${SHARE_LABEL} в ${MESSENGER_NAME[kind]}`}
          >
            <MessengerIcon kind={kind} />
          </IconButton>
        ))}
        <IconButton
          variant="surface"
          size={44}
          aria-label={COPY_LABEL}
          onClick={() => {
            hide()
            copy(url)
          }}
        >
          <LinkIcon />
        </IconButton>
      </div>
    </div>
  )
}
