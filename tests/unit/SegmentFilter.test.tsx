import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentFilter } from '@/components/ui/SegmentFilter'

const ITEMS = [
  { value: 'complex', label: 'комплекс' },
  { value: 'kitchens', label: 'кухни' },
  { value: 'hallways', label: 'прихожие' },
] as const

type Value = (typeof ITEMS)[number]['value']

function Controlled({ onChange }: { onChange?: (value: Value) => void }) {
  const [value, setValue] = useState<Value>('complex')
  return (
    <SegmentFilter
      items={ITEMS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      label="Категории работ"
      count="60 работ · комплекс"
    />
  )
}

describe('SegmentFilter', () => {
  it('is a labelled group of toggle buttons', () => {
    render(<Controlled />)
    expect(screen.getByRole('group', { name: 'Категории работ' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'комплекс' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'кухни' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('selects with the keyboard: Tab, then Enter or Space', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'комплекс' }))
    await user.tab()
    // Moving focus alone does not select
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('kitchens')
    expect(screen.getByRole('button', { name: 'кухни' }).getAttribute('aria-pressed')).toBe('true')

    await user.tab()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith('hallways')
  })

  it('selects on click and announces the counter', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'прихожие' }))
    expect(onChange).toHaveBeenCalledWith('hallways')
    expect(screen.getByText('60 работ · комплекс').getAttribute('aria-live')).toBe('polite')
  })

  it('scrolls the active item into view', async () => {
    render(<Controlled />)
    const group = screen.getByRole('group')
    Object.defineProperty(group, 'clientWidth', { configurable: true, value: 100 })
    const target = screen.getByRole('button', { name: 'прихожие' })
    Object.defineProperty(target, 'offsetLeft', { configurable: true, value: 180 })
    Object.defineProperty(target, 'offsetWidth', { configurable: true, value: 60 })
    await userEvent.click(target)
    expect(group.scrollTo).toHaveBeenCalledWith({ left: 140, behavior: 'smooth' })
  })

  it('renders the overlay switch without counter', () => {
    render(
      <SegmentFilter
        items={[
          { value: 'map', label: 'Карта' },
          { value: 'list', label: 'Список' },
        ]}
        value="map"
        onChange={() => {}}
        label="Вид"
        variant="overlay"
        count="не выводится"
      />,
    )
    expect(screen.getByRole('button', { name: 'Карта' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('не выводится')).toBeNull()
  })
})
