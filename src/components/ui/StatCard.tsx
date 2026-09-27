import type { Stat } from '@/payload-types'

import { cn } from '@/lib/cn'

type Props = Pick<NonNullable<Stat['items']>[number], 'value' | 'label'> & {
  className?: string
}

/** Statistics card (README §6.1): value 34/300, caption below. Layout belongs to the section. */
export function StatCard({ value, label, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-7 rounded-card border border-border bg-surface px-4.5 py-5',
        className,
      )}
    >
      <p className="text-stat">{value}</p>
      <p className="text-body-xs text-text-3">{label}</p>
    </div>
  )
}
