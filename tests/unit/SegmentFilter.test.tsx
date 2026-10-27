import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentFilter } from '@/components/ui/SegmentFilter'

const VIEWS = [
  { value: 'map', label: 'Карта' },
  { value: 'list', label: 'Список' },
] as const

type Value = (typeof VIEWS)[number]['value']

function Controlled({ onChange }: { onChange?: (value: Value) => void }) {
  const [value, setValue] = useState<Value>('map')
  return (
    <SegmentFilter
      items={VIEWS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      label="Вид"
    />
  )
}

describe('SegmentFilter', () => {
  it('is a labelled group of toggle buttons on glass', () => {
    render(<Controlled />)
    const group = screen.getByRole('group', { name: 'Вид' })
    expect(group.className).toContain('glass-strong')
    expect(screen.getByRole('button', { name: 'Карта' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Список' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('selects with the keyboard: Tab, then Enter or Space', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Карта' }))
    await user.tab()
    // Moving focus alone does not select
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('list')
    expect(screen.getByRole('button', { name: 'Список' }).getAttribute('aria-pressed')).toBe('true')

    await user.tab({ shift: true })
    await user.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith('map')
  })

  it('selects on click', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Список' }))
    expect(onChange).toHaveBeenCalledWith('list')
  })
})
