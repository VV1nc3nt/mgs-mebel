import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CapabilitiesSection } from '@/components/designers/CapabilitiesSection'
import { CooperationSection } from '@/components/designers/CooperationSection'
import { ProjectsSection } from '@/components/designers/ProjectsSection'
import { HeroSection } from '@/components/sections/HeroSection'
import { orderMessengers } from '@/lib/chrome'
import {
  capabilityCount,
  itemNumber,
  toDesignerManager,
  visibleProjects,
  type DesignerProject,
} from '@/lib/designers'
import { photo, video } from './fixtures'

const project = (title: string, extra: Partial<DesignerProject> = {}): DesignerProject => ({
  id: title,
  title,
  meta: 'Дизайн — студия партнёра · производство — MGS MEBEL',
  poster: photo,
  video: null,
  hidden: false,
  ...extra,
})

const manager = {
  photo,
  name: 'Харламов Максим Игоревич',
  position: 'Руководитель развития',
  phone: '8 995 783-94-28',
  max: 'https://max.ru/u/manager',
  whatsapp: 'https://wa.me/79957839428',
  telegram: 'https://t.me/manager',
}

describe('lib/designers', () => {
  it('visible projects: not hidden, with a title and a poster, in order', () => {
    const items = [
      project('A'),
      project('B', { hidden: true }),
      project(' ', {}),
      project('C', { poster: 7 }),
      project('D'),
    ]
    expect(visibleProjects(items).map((p) => p.title)).toEqual(['A', 'D'])
    expect(visibleProjects(undefined)).toEqual([])
  })

  it('numbers and the capabilities counter', () => {
    expect([0, 5, 9].map(itemNumber)).toEqual(['01', '06', '10'])
    expect([1, 2, 5, 6, 11, 21, 22].map(capabilityCount)).toEqual([
      '1 преимущество',
      '2 преимущества',
      '5 преимуществ',
      '6 преимуществ',
      '11 преимуществ',
      '21 преимущество',
      '22 преимущества',
    ])
  })

  it('messengers in MESSENGER_ORDER, empty ones dropped', () => {
    expect(
      orderMessengers({ whatsapp: 'https://wa.me/1', max: ' ', telegram: 'https://t.me/x' }),
    ).toEqual([
      { kind: 'telegram', href: 'https://t.me/x' },
      { kind: 'whatsapp', href: 'https://wa.me/1' },
    ])
    expect(orderMessengers(null)).toEqual([])
  })

  it('the manager view-model: tel: link, ordered messengers; nothing to contact — null', () => {
    const view = toDesignerManager(manager)!
    expect(view.phone).toEqual({ display: '8 995 783-94-28', href: 'tel:89957839428' })
    expect(view.messengers.map((m) => m.kind)).toEqual(['max', 'telegram', 'whatsapp'])
    expect(view.name).toBe(manager.name)
    expect(Object.keys(view).sort()).toEqual(['messengers', 'name', 'phone', 'photo', 'position'])
    expect(
      toDesignerManager({ ...manager, phone: '', max: null, whatsapp: null, telegram: ' ' }),
    ).toBeNull()
    expect(toDesignerManager(undefined)).toBeNull()
    // A phone alone or a messenger alone is enough
    expect(toDesignerManager({ phone: '8 800 100-16-58' })?.messengers).toEqual([])
    expect(toDesignerManager({ telegram: 'https://t.me/x' })?.phone).toBeUndefined()
  })
})

describe('HeroSection: variants', () => {
  const hero = {
    label: 'дизайнерам',
    title: 'Ваш дизайн.\nНаши возможности.',
    text: 'Вы создаёте интерьер.',
    poster: photo,
    video,
  }

  it('«Дизайнерам»: the line break is a <br>, chips, no CTA; its overlay, height, text width', () => {
    const { container } = render(
      <HeroSection
        hero={hero}
        variant="designers"
        idPrefix="designers"
        chips={
          <ul>
            <li>Дизайнерам</li>
          </ul>
        }
      />,
    )
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.innerHTML).toBe('Ваш дизайн.<br>Наши возможности.')
    expect(h1.id).toBe('designers-hero-title')
    expect(screen.getByRole('listitem').textContent).toBe('Дизайнерам')
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    const section = container.querySelector('section')!
    expect(section.className).toContain('h-hero-tall')
    expect(container.querySelector('.bg-overlay-hero')).not.toBeNull()
    expect(container.querySelector('.bg-overlay-about')).toBeNull()
    expect(screen.getByText(hero.text).className).toContain('max-w-hero-lead')
  })

  it('«О нас» by default: the same markup as before (overlay, height, text width, plain H1)', () => {
    const { container } = render(
      <HeroSection hero={{ ...hero, title: 'Мы — MGS MEBEL' }} messengers={[]} />,
    )
    const section = container.querySelector('section')!
    expect(section.className.split(' ').sort()).toEqual(
      'relative h-hero overflow-hidden bg-surface md:h-hero-md xl:h-screen xl:min-h-hero-md'
        .split(' ')
        .sort(),
    )
    expect(container.querySelector('.bg-overlay-about')).not.toBeNull()
    expect(screen.getByText(hero.text).className).toContain('max-w-hero-text')
    expect(screen.getByRole('heading', { level: 1 }).innerHTML).toBe('Мы — MGS MEBEL')
  })
})

describe('CapabilitiesSection', () => {
  const items = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    photo,
    title: `Карточка ${i + 1}`,
    text: 'Текст.',
  }))

  it('counter, numbers 01–06, H3; a focusable strip that becomes a grid', () => {
    const { container } = render(
      <CapabilitiesSection capabilities={{ label: 'возможности', title: 'Что мы берём', items }} />,
    )
    expect(screen.getByText('6 преимуществ')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6)
    expect(
      [...container.querySelectorAll('article p[aria-hidden]')].map((p) => p.textContent),
    ).toEqual(['01', '02', '03', '04', '05', '06'])
    const list = container.querySelector('ul')!
    expect(list.tabIndex).toBe(0)
    expect(list.className).toContain('snap-x')
    expect(list.className).toContain('md:grid-cols-2')
    expect(list.className).toContain('xl:grid-cols-3')
    expect(list.querySelector('li')!.className).toContain('basis-capability-card')
  })

  it('no cards — no section', () => {
    expect(render(<CapabilitiesSection capabilities={{ items: [] }} />).container.innerHTML).toBe(
      '',
    )
    expect(render(<CapabilitiesSection capabilities={undefined} />).container.innerHTML).toBe('')
  })
})

describe('ProjectsSection', () => {
  it('hidden projects are neither shown nor counted', () => {
    render(
      <ProjectsSection
        projects={{
          label: 'проекты',
          title: 'Реализованные проекты',
          items: [project('A'), project('Скрытый', { hidden: true }), project('B'), project('C')],
        }}
      />,
    )
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'A',
      'B',
      'C',
    ])
    expect(screen.queryByText('Скрытый')).toBeNull()
    expect(screen.getByText('/ 03', { exact: false }).textContent).toBe('01 / 03')
    const groups = screen.getAllByRole('group')
    expect(groups.map((g) => within(g).getByText(/^\d\d$/).textContent)).toEqual(['01', '02', '03'])
    expect(screen.getByRole('button', { name: 'Следующий проект' })).toBeTruthy()
  })

  it('one visible — no counter or arrows; none — no section', () => {
    const { container, rerender } = render(
      <ProjectsSection projects={{ items: [project('A'), project('B', { hidden: true })] }} />,
    )
    expect(screen.getAllByRole('group')).toHaveLength(1)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('.tabular-nums')).toBeNull()
    rerender(<ProjectsSection projects={{ items: [project('A', { hidden: true })] }} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('CooperationSection', () => {
  const cooperation = {
    label: 'сотрудничество',
    title: 'Начнём сотрудничество?',
    messengersLabel: 'Рассчитать проект в мессенджере',
  }

  it('the card: photo in the ring, name, tel: row, direct messenger links in order', () => {
    const { container } = render(
      <CooperationSection cooperation={cooperation} manager={toDesignerManager(manager)} />,
    )
    expect(container.querySelector('.shadow-avatar-ring')).not.toBeNull()
    expect(screen.getByText(manager.name)).toBeTruthy()
    const phone = screen.getByRole('link', { name: /Телефон/ })
    expect(phone.getAttribute('href')).toBe('tel:89957839428')
    const links = within(container.querySelector('ul')!).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['MAX', 'Telegram', 'WhatsApp'])
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it('one column per messenger, three at most', () => {
    const columns = (links: Partial<typeof manager>) => {
      const { container, unmount } = render(
        <CooperationSection
          cooperation={cooperation}
          manager={toDesignerManager({
            ...manager,
            max: null,
            whatsapp: null,
            telegram: null,
            ...links,
          })}
        />,
      )
      const list = container.querySelector('ul')
      const result = list?.className.match(/grid-cols-\d/)?.[0] ?? 'none'
      unmount()
      return result
    }
    expect(columns({})).toBe('none')
    expect(columns({ whatsapp: manager.whatsapp })).toBe('grid-cols-1')
    expect(columns({ whatsapp: manager.whatsapp, telegram: manager.telegram })).toBe('grid-cols-2')
    expect(columns(manager)).toBe('grid-cols-3')
  })

  it('no phone and no messengers — no section', () => {
    const { container } = render(
      <CooperationSection
        cooperation={cooperation}
        manager={toDesignerManager({
          ...manager,
          phone: null,
          max: null,
          whatsapp: null,
          telegram: null,
        })}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
