import type { Stat } from '@/payload-types'

import { cn } from '@/lib/cn'

const SIZE = {
  md: { card: 'gap-7', value: 'text-stat' },
  lg: { card: 'gap-6', value: 'text-stat-lg' },
} as const

type Props = Pick<NonNullable<Stat['items']>[number], 'value' | 'label'> & {
  /** md — the strip (34 / 300, 28 to the caption); lg — the grid in «История» (36, 24). */
  size?: keyof typeof SIZE
  className?: string
}

/** Statistics card (README §6.1, about v2 §2.4): value, caption below. Layout belongs to the section. */
export function StatCard({ value, label, size = 'md', className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-card border border-border bg-surface px-4.5 py-5',
        SIZE[size].card,
        className,
      )}
    >
      <p className={SIZE[size].value}>{value}</p>
      <p className="text-body-xs text-text-3">{label}</p>
    </div>
  )
}
