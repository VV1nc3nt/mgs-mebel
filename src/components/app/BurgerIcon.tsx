import { cn } from '@/lib/cn'

const BAR =
  'absolute inset-0 rounded-full bg-text transition-[translate,rotate] duration-(--motion-burger) ease-menu motion-reduce:transition-none'

/**
 * Two 14×1.5 lines, 6 apart; `crossed` turns them into × (translateY ±3px, rotate ±45°,
 * README §5.3). The header and the menu use the same geometry, so the morph happens in place.
 */
export function BurgerIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-burger-bar w-3.5">
      <span className={cn(BAR, crossed ? 'translate-y-0 rotate-45' : '-translate-y-0.75')} />
      <span className={cn(BAR, crossed ? 'translate-y-0 -rotate-45' : 'translate-y-0.75')} />
    </span>
  )
}
