'use client'

import { useState, type ReactNode } from 'react'

import { FilterChip } from '@/components/ui/FilterChip'
import type { WorkFeed } from '@/lib/workTypes'

type Props = {
  chips: { key: WorkFeed; label: string }[]
  initial: WorkFeed
  /** Server-rendered panel per chip, in the same order. */
  panels: ReactNode[]
}

const panelId = (key: WorkFeed) => `works-${key}`

/**
 * Chips of «Наши работы» (README §6.1 п.6): toggle buttons over server-rendered panels;
 * the panel of an inactive chip is `hidden`, so its lazy images do not load until it is shown.
 */
export function WorksChips({ chips, initial, panels }: Props) {
  const [active, setActive] = useState(initial)

  return (
    <>
      {/* Vertical padding keeps the chips' 44 hit area inside the scroller */}
      <div
        role="group"
        aria-label="Категории работ"
        className="page-container no-scrollbar flex gap-2 overflow-x-auto py-0.5"
      >
        {chips.map(({ key, label }) => (
          <FilterChip
            key={key}
            selected={key === active}
            aria-controls={panelId(key)}
            onClick={() => setActive(key)}
            className="lowercase"
          >
            {label}
          </FilterChip>
        ))}
      </div>
      {chips.map(({ key }, i) => (
        <div key={key} id={panelId(key)} hidden={key !== active}>
          {panels[i]}
        </div>
      ))}
    </>
  )
}
