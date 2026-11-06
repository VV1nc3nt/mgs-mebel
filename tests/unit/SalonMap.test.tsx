import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalonMapSlot } from '@/components/salons/SalonMapSlot'
import { loadYandexMaps } from '@/lib/yandexMaps'

vi.mock('@/lib/yandexMaps', () => ({ loadYandexMaps: vi.fn() }))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('unavailable map', () => {
  it('keeps a real external link and the page content without an API key', () => {
    vi.stubEnv('NEXT_PUBLIC_YMAPS_KEY', '')
    render(
      <SalonMapSlot
        salons={[{ id: 1, name: 'Салон', location: { lat: 55, lng: 37 } }]}
        activeId={1}
      >
        <p>Адрес салона</p>
      </SalonMapSlot>,
    )
    expect(screen.getByRole('status').textContent).toBe('Карта недоступна.')
    expect(screen.getByRole('link', { name: 'Открыть в Картах' }).getAttribute('href')).toContain(
      'pt=37%2C55',
    )
    expect(screen.getByText('Адрес салона')).toBeTruthy()
    expect(loadYandexMaps).not.toHaveBeenCalled()
  })
  it('does not load the SDK or invent a link for incomplete coordinates', () => {
    vi.stubEnv('NEXT_PUBLIC_YMAPS_KEY', 'unit-test-stub')
    render(<SalonMapSlot salons={[{ id: 1, name: 'Салон', location: { lat: 55 } }]} activeId={1} />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(loadYandexMaps).not.toHaveBeenCalled()
  })
})
