'use client'

import { useState } from 'react'

import { SegmentFilter, type SegmentItem } from '@/components/ui/SegmentFilter'
import { catalogCategoryOptions } from '@/lib/catalogCategories'
import { catalogCount } from '@/lib/catalogs'
import { worksCount } from '@/lib/works'
import { WORK_FEEDS, type WorkFeed } from '@/lib/workTypes'

// Works feeds — the same list as the works page; catalog categories — the same list as the CMS.
const WORKS: readonly SegmentItem<WorkFeed>[] = WORK_FEEDS

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
  const [value, setValue] = useState<WorkFeed>('complex')
  return (
    <SegmentFilter
      items={WORKS}
      value={value}
      onChange={setValue}
      label="Категории работ"
      sticky
      count={worksCount(workCounts[value] ?? 0, value)}
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
