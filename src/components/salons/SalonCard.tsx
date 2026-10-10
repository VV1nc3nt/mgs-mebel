import { X } from 'lucide-react'
import type { Ref } from 'react'

import { ContactButton } from '@/components/ui/ContactButton'
import { IconButton } from '@/components/ui/IconButton'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { telHref } from '@/lib/phone'
import type { SalonPin } from '@/lib/queries'

type Props = {
  salon: Pick<SalonPin, 'name' | 'address' | 'phone'>
  /** Button label from the «Салоны» page (`map.cardCtaLabel`). */
  ctaLabel?: string | null
  /** Messengers of the CTA, in order; none — no button. */
  messengers: Messenger[]
  /** Shows the × button. */
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
  /** Makes the name focusable from code (tabindex −1), e.g. after a pick in the salon list. */
  titleRef?: Ref<HTMLHeadingElement>
  className?: string
}

/**
 * Salon card over the map (README §6.1 п.5, §6.3): name, address, phone, messenger CTA.
 * Shared by the home page and the «Салоны» page.
 */
export function SalonCard({
  salon,
  ctaLabel,
  messengers,
  onClose,
  closeRef,
  titleRef,
  className,
}: Props) {
  const phone = salon.phone?.trim()
  const phoneHref = phone ? telHref(phone) : undefined

  return (
    <div
      className={cn(
        'flex max-w-salon-card flex-col gap-4 rounded-card border border-divider bg-surface p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-eyebrow text-accent uppercase">Фирменный салон</p>
          <h3 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="text-title-s">
            {salon.name}
          </h3>
        </div>
        {onClose && (
          <IconButton
            ref={closeRef}
            onClick={onClose}
            variant="surface"
            size={32}
            aria-label="Скрыть карточку салона"
          >
            <X />
          </IconButton>
        )}
      </div>
      <dl
        className={cn(
          'grid gap-3 border-y border-divider py-3.5',
          phoneHref ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <div className="flex flex-col gap-1">
          <dt className="text-caption font-normal text-text-4">Адрес</dt>
          <dd className="text-body-xs">{salon.address}</dd>
        </div>
        {phone && phoneHref && (
          <div className="flex flex-col gap-1">
            <dt className="text-caption font-normal text-text-4">Телефон</dt>
            <dd className="text-body-xs font-semibold">
              <a href={phoneHref}>{phone}</a>
            </dd>
          </div>
        )}
      </dl>
      <ContactButton caption={ctaLabel} messengers={messengers} size={48} fullWidth arrow />
    </div>
  )
}
