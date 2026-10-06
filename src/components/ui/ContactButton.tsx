import { contactLinkLabel, type Messenger } from '@/lib/chrome'
import { Button } from './Button'
import {
  ContactChooser,
  type ContactSize,
  type ContactTone,
  type ContactWidth,
} from './ContactChooser'

type Props = {
  /** Visible label («Рассчитать проект»); without it there is no button. */
  caption: string | null | undefined
  /** In MESSENGER_ORDER (chrome.messengers). */
  messengers: Messenger[]
  size?: ContactSize
  fullWidth?: ContactWidth
  tone?: ContactTone
  /** Trailing «→». */
  arrow?: boolean
  /** Which way the open choice grows: `start` — to the left, `end` — to the right. */
  grow?: 'start' | 'end'
  /** Moves the neighbours aside by the growth of the capsule (ContactChooser). */
  shiftNeighbours?: boolean
}

const LINK_WIDTH = { true: 'full', false: 'auto', mobile: 'mobile-full' } as const

/**
 * Contact button (README of the buttons §3): no messengers — nothing; one — a plain link to it,
 * no script; two or three — the choice opened in place (ContactChooser). Works in server and
 * client trees alike.
 */
export function ContactButton({
  caption,
  messengers,
  size = 52,
  fullWidth = false,
  tone = 'accent',
  arrow = false,
  grow = 'end',
  shiftNeighbours = false,
}: Props) {
  const label = caption?.trim()
  const [first] = messengers
  if (!label || !first) return null

  if (messengers.length === 1) {
    return (
      <Button
        href={first.href}
        variant={tone === 'outline' ? 'inverse-outline' : 'primary'}
        size={size}
        width={LINK_WIDTH[`${fullWidth}`]}
        arrow={arrow}
        aria-label={contactLinkLabel(label, first)}
      >
        {label}
      </Button>
    )
  }

  return (
    <ContactChooser
      caption={label}
      messengers={messengers}
      size={size}
      fullWidth={fullWidth}
      tone={tone}
      arrow={arrow}
      grow={grow}
      shiftNeighbours={shiftNeighbours}
    />
  )
}
