import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconButton } from '@/components/ui/IconButton'

describe('IconButton', () => {
  it('takes its accessible name from aria-label and hides the icon', () => {
    render(
      <IconButton aria-label="Наверх">
        <svg data-testid="icon" />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Наверх' })).toBeTruthy()
    expect(screen.getByTestId('icon').parentElement?.getAttribute('aria-hidden')).toBe('true')
  })

  it('requires aria-label at compile time', () => {
    // @ts-expect-error aria-label is required: an icon button has no visible text
    const element = <IconButton>{null}</IconButton>
    expect(element).toBeTruthy()
  })

  it('extends the hit area of sizes below 44 with ::before', () => {
    render(
      <>
        <IconButton aria-label="Закрыть" size={36}>
          <svg />
        </IconButton>
        <IconButton aria-label="Наверх" size={44}>
          <svg />
        </IconButton>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Закрыть' }).className).toContain('before:size-hit')
    expect(screen.getByRole('button', { name: 'Наверх' }).className).not.toContain('before:')
  })

  it('has a 48 size with a 22 icon for footer social buttons', () => {
    render(
      <IconButton aria-label="Telegram" size={48}>
        <svg />
      </IconButton>,
    )
    const className = screen.getByRole('button', { name: 'Telegram' }).className
    expect(className).toContain('size-12')
    expect(className).toContain('[&_svg]:size-5.5')
    expect(className).not.toContain('before:')
  })

  it('outline-soft: the article slider arrows light up white on hover', () => {
    render(
      <IconButton aria-label="Вперёд" variant="outline-soft">
        <svg />
      </IconButton>,
    )
    const className = screen.getByRole('button', { name: 'Вперёд' }).className
    expect(className).toContain('border-border-strong')
    expect(className).toContain('hover:border-text')
  })
})
