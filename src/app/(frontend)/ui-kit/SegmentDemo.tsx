'use client'

import { useState } from 'react'

import { SegmentFilter, type SegmentItem } from '@/components/ui/SegmentFilter'

const VIEWS = [
  { value: 'map', label: 'Карта' },
  { value: 'list', label: 'Список' },
] as const satisfies readonly SegmentItem<string>[]

export function ViewSegmentDemo() {
  const [value, setValue] = useState<(typeof VIEWS)[number]['value']>('map')
  return <SegmentFilter items={VIEWS} value={value} onChange={setValue} label="Вид" />
}
