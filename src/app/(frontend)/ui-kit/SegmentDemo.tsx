'use client'

import { useState } from 'react'

import { SegmentFilter, type SegmentItem } from '@/components/ui/SegmentFilter'
import { catalogCategoryOptions } from '@/lib/catalogCategories'
import { catalogCount } from '@/lib/catalogs'
import { plural } from '@/lib/plural'

// Works filter labels from README §6.4; catalog categories — the same list as the CMS.
const WORKS = [
  { value: 'reels', label: 'reels' },
  { value: 'complex', label: 'комплекс' },
  { value: 'kitchens', label: 'кухни' },
  { value: 'hallways', label: 'прихожие' },
  { value: 'bedrooms', label: 'спальни' },
  { value: 'bathrooms', label: 'санузел' },
  { value: 'wardrobes', label: 'гардеробные' },
  { value: 'livingrooms', label: 'гостиные' },
] as const satisfies readonly SegmentItem<string>[]

const CATALOGS = [
  { value: 'all', label: 'все' },
  ...catalogCategoryOptions,
] as const satisfies readonly SegmentItem<string>[]

const VIEWS = [
  { value: 'map', label: 'Карта' },
  { value: 'list', label: 'Список' },
] as const satisfies readonly SegmentItem<string>[]

type Props = {
  workCounts: Partial<Record<string, number>>
  catalogCounts: Partial<Record<string, number>>
}

export function WorksSegmentDemo({ workCounts }: Pick<Props, 'workCounts'>) {
  const [value, setValue] = useState<(typeof WORKS)[number]['value']>('complex')
  const n = workCounts[value] ?? 0
  const label = WORKS.find((item) => item.value === value)?.label
  return (
    <SegmentFilter
      items={WORKS}
      value={value}
      onChange={setValue}
      label="Категории работ"
      sticky
      count={`${n} ${plural(n, ['работа', 'работы', 'работ'])} · ${label}`}
    />
  )
}

export function CatalogsSegmentDemo({ catalogCounts }: Pick<Props, 'catalogCounts'>) {
  const [value, setValue] = useState<(typeof CATALOGS)[number]['value']>('all')
  const n = catalogCounts[value] ?? 0
  return (
    <SegmentFilter
      items={CATALOGS}
      value={value}
      onChange={setValue}
      label="Категории каталогов"
      count={catalogCount(n)}
    />
  )
}

export function ViewSegmentDemo() {
  const [value, setValue] = useState<(typeof VIEWS)[number]['value']>('map')
  return (
    <SegmentFilter items={VIEWS} value={value} onChange={setValue} label="Вид" variant="overlay" />
  )
}
