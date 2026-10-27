import { cn } from '@/lib/cn'
import { HIT_AREA_Y } from './hitArea'

/*
 * «Карта / Список» switch over the map (design: home, salons). Shared by SegmentFilter (toggle
 * buttons) and the home salons section (current view + a link), so a
 * server component can use them: the client module would only hand it a reference.
 */
/** Pill item of the switch; under 44 high, ::before extends the hit area. */
export const segmentItemBase = cn(
  'relative inline-flex shrink-0 items-center rounded-pill whitespace-nowrap transition-colors',
  HIT_AREA_Y,
)

export const segmentOverlayGroup = 'inline-flex gap-1 rounded-media glass-strong p-1'

export const segmentOverlayItem = (selected: boolean) =>
  cn(
    segmentItemBase,
    'px-3.5 py-2 text-body-xs',
    selected ? 'bg-text font-bold text-bg' : 'font-semibold text-text-2 hover:text-text',
  )
