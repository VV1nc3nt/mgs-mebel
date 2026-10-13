import { cn } from '@/lib/cn'

type Props = {
  /** Label from the CMS, stored without «#». */
  children: string
  /** For `aria-labelledby` of a section without a heading («История»). */
  id?: string
  className?: string
}

/** Section label (README §5.1): accent line 24×1, gap 10, «#label». Not a heading: the H2 follows. */
export function SectionLabel({ children, id, className }: Props) {
  return (
    <p
      id={id}
      className={cn(
        'flex min-h-label items-center gap-2.5 text-label text-accent uppercase',
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-accent" />
      <span>
        <span aria-hidden="true">#</span>
        {children}
      </span>
    </p>
  )
}
