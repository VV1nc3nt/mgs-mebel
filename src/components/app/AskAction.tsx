import { Action } from '@/components/ui/Action'
import { contactLabel, type Messenger } from '@/lib/chrome'

/**
 * «Спросить» (README §5.4). The only place that decides what the button does: for now a link to
 * WhatsApp or Telegram (resolveContactAction); the consultant widget replaces it here.
 */
export function AskAction({ label, action }: { label?: string; action?: Messenger }) {
  if (!label || !action) return null

  return (
    <Action
      href={action.href}
      aria-label={contactLabel(label, action)}
      className="flex h-11 items-center gap-2.5 rounded-pill bg-accent pr-4.5 pl-1.5 text-button-s text-on-accent transition-colors hover:bg-accent-hover"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center gap-0.75 rounded-full bg-bg"
      >
        <span className="size-1 rounded-full bg-accent" />
        <span className="size-1 rounded-full bg-accent" />
        <span className="size-1 rounded-full bg-accent" />
      </span>
      {label}
    </Action>
  )
}
