import type { RequiredDataFromCollectionSlug } from 'payload'

import type { News } from '@/payload-types'
import { richParagraph } from '../lexical'
import { seoMeta } from '../seo'
import type { MediaId } from './types'

type NewsData = RequiredDataFromCollectionSlug<'news'>
type Block = NonNullable<News['body']>[number]

const p = (text: string): Block => ({ blockType: 'paragraph', text: richParagraph(text) })
const h = (text: string): Block => ({ blockType: 'heading', text })
const list = (items: string[]): Block => ({
  blockType: 'list',
  items: items.map((text) => ({ text })),
})
const quote = (text: string, author?: string): Block => ({ blockType: 'quote', text, author })

/** Texts of the ARTDOM article (news prototype); other articles reuse them, as the prototype does. */
const ARTDOM = {
  intro:
    'С 26 по 29 февраля в Москве прошла международная выставка ARTDOM — главная площадка для дизайнеров интерьера, архитекторов и производителей мебели. MGS MEBEL участвовала в ней как официальный партнёр ALVIC CENTER.',
  stand:
    'На стенде мы показали три кухонных гарнитура с фасадами из новой коллекции ALVIC и систему хранения с интегрированной подсветкой.',
  heading: 'Что показали на стенде',
  list: [
    'Кухню-остров с матовыми фасадами Zenit и столешницей из кварца',
    'Гардеробную систему на алюминиевых профилях MGS',
    'Новые текстуры дерева и камня в коллекции ALVIC 2026',
  ],
  quote:
    'Для нас выставка — возможность показать, как меняются материалы и что из этого можно собрать уже сегодня.',
  quoteAuthor: 'Команда MGS MEBEL',
  outro:
    'Все представленные модели можно посмотреть в фирменных салонах MGS MEBEL. Специалисты помогут подобрать декор и рассчитают проект под ваше помещение.',
}

const EMBED = {
  rutube: 'https://rutube.ru/video/1480655fcab995b927db77bdd9d83986/',
  vk: 'https://vkvideo.ru/video-71537209_456239752',
}

/** Day-only dates at noon UTC, so the day does not shift with the time zone. */
const day = (value: string) => `${value}T12:00:00.000Z`

export const news = (id: MediaId): NewsData[] => {
  const photos = (...keys: string[]) => keys.map(id)
  const items: (Omit<NewsData, 'meta' | 'slug'> & { slug: string; cover: number })[] = [
    {
      slug: 'artdom-2026',
      title: 'Выставка ARTDOM 2026',
      type: 'news',
      date: day('2026-02-19'),
      lead: 'MGS MEBEL — официальный партнёр ALVIC CENTER на международной дизайнерской выставке ARTDOM.',
      cover: id('U4'),
      body: [
        p(ARTDOM.intro),
        p(ARTDOM.stand),
        {
          blockType: 'media',
          photos: photos('U1', 'U6', 'U10', 'U2', 'U5'),
          caption: 'Стенд MGS MEBEL на ARTDOM 2026',
        },
        h(ARTDOM.heading),
        list(ARTDOM.list),
        {
          blockType: 'video',
          file: id('H8'),
          poster: id('U4'),
          duration: '0:07',
          caption: 'Обзор стенда за полторы минуты',
          wide: true,
        },
        quote(ARTDOM.quote, ARTDOM.quoteAuthor),
        {
          blockType: 'media',
          photos: photos('U3'),
          caption: 'Столешница из кварцевого агломерата',
        },
        p(ARTDOM.outro),
        { blockType: 'media', photos: photos('U7', 'U4') },
      ],
    },
    {
      slug: 'alvic-2026',
      title: 'Новые декоры ALVIC',
      type: 'new',
      date: day('2026-02-12'),
      lead: 'В ассортименте появились фасады из новой коллекции ALVIC 2026.',
      cover: id('U6'),
      body: [
        p('В ассортименте появились фасады из новой коллекции ALVIC 2026.'),
        { blockType: 'media', photos: photos('N16'), wide: true },
        h(ARTDOM.heading),
        list(ARTDOM.list),
        { blockType: 'media', photos: photos('N15', 'N3', 'N4', 'N1'), ratio: '1x1' },
      ],
    },
    {
      slug: 'korting',
      title: 'Конкурс проектов с Korting',
      type: 'news',
      date: day('2026-01-23'),
      lead: 'Выбираем лучший проект кухонного гарнитура MGS MEBEL с техникой Korting.',
      cover: id('U1'),
      body: [
        p('Выбираем лучший проект кухонного гарнитура MGS MEBEL с техникой Korting.'),
        { blockType: 'video', embedUrl: EMBED.rutube, poster: id('U1'), duration: '11:52' },
        h(ARTDOM.heading),
        list(ARTDOM.list),
        { blockType: 'media', photos: photos('N2', 'N15', 'N16') },
        quote(ARTDOM.quote, ARTDOM.quoteAuthor),
      ],
    },
    {
      slug: 'wardrobe-2026',
      title: 'Гардеробные системы 2026',
      type: 'new',
      date: day('2026-01-15'),
      lead: 'Обновлённая линейка систем хранения с подсветкой и профилями MGS.',
      cover: id('U7'),
      body: [
        p('Обновлённая линейка систем хранения с подсветкой и профилями MGS.'),
        { blockType: 'video', file: id('V5'), poster: id('N4'), duration: '0:12', vertical: true },
        { blockType: 'media', photos: photos('N5', 'N6', 'N17', 'U7', 'N7', 'N9'), ratio: '4x5' },
        list(ARTDOM.list),
      ],
    },
    {
      slug: 'khimki',
      title: 'Презентация в Химках',
      type: 'news',
      date: day('2025-11-27'),
      lead: 'Представили новые коллекции в шоу-руме MGS MEBEL.',
      cover: id('U2'),
      body: [
        p('Представили новые коллекции в шоу-руме MGS MEBEL.'),
        { blockType: 'video', embedUrl: EMBED.vk, poster: id('U2') },
        quote(ARTDOM.quote, ARTDOM.quoteAuthor),
        { blockType: 'media', photos: photos('U5', 'U10', 'N14', 'N13') },
      ],
    },
    {
      slug: 'quartz',
      title: 'Столешницы из кварца',
      type: 'new',
      date: day('2025-11-10'),
      lead: 'Кварцевый агломерат теперь доступен для всех моделей кухонь.',
      cover: id('U3'),
      body: [
        p('Кварцевый агломерат теперь доступен для всех моделей кухонь.'),
        h(ARTDOM.heading),
        list(ARTDOM.list),
        { blockType: 'media', photos: photos('N4') },
      ],
    },
    {
      slug: 'varshavskaya',
      title: 'Открытие нового салона',
      type: 'news',
      date: day('2025-10-02'),
      lead: 'Фирменный салон MGS MEBEL открылся в ЖК Варшавская LIFE.',
      cover: id('U10'),
      body: [
        p('Фирменный салон MGS MEBEL открылся в ЖК Варшавская LIFE.'),
        quote(ARTDOM.quote, ARTDOM.quoteAuthor),
        { blockType: 'media', photos: photos('N18', 'N14', 'N8'), ratio: '4x5' },
      ],
    },
  ]
  return items.map((item) => ({
    ...item,
    generateSlug: false,
    _status: 'published' as const,
    meta: seoMeta({ title: item.title, description: item.lead, image: item.cover }),
  }))
}
