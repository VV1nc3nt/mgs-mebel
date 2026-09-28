import type { MessengerKind } from '@/lib/chrome'
import { MaxIcon } from './MaxIcon'
import { TelegramIcon } from './TelegramIcon'
import { WhatsAppIcon } from './WhatsAppIcon'

const ICONS = { max: MaxIcon, whatsapp: WhatsAppIcon, telegram: TelegramIcon }

export function MessengerIcon({ kind, className }: { kind: MessengerKind; className?: string }) {
  const Icon = ICONS[kind]
  return <Icon className={className} />
}
