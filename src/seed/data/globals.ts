import type { DataFromGlobalSlug, GlobalSlug } from 'payload'

import { seoMeta } from '../seo'
import { projectPlan } from './projects'
import type { MediaId } from './types'

type Service = 'id' | 'createdAt' | 'updatedAt' | 'globalType'
type GlobalData<S extends GlobalSlug> = Omit<DataFromGlobalSlug<S>, Service>
export type SeedGlobals = { [S in GlobalSlug]: GlobalData<S> }

/** Paragraphs of a textarea are separated by a blank line. */
const paragraphs = (...items: string[]) => items.join('\n\n')

const HERO_TEXT =
  'Мебельная фабрика полного цикла для комплексных заказов. Дизайнерская мебель, доступная каждому.'
const MESSENGERS_LABEL = 'Рассчитать проект в мессенджере'
const HOTLINE_LABEL = 'Бесплатная горячая линия'

const history = (id: MediaId) => ({
  photoMain: id('U2'),
  yearValue: '2001',
  yearCaption: 'год основания фабрики',
  photoSecondary: id('U3'),
  lead: 'Путь MGS MEBEL начался в 2001 году с производства стеклянных фасадов. Идея была проста — создавать вещи, которые служат долгие годы.',
  text: 'Шаг за шагом мы выросли в крупную мебельную компанию. Мы инвестируем в современное оборудование и технологии, поэтому наша мебель соответствует строгим европейским и российским стандартам качества.',
  values: ['Качество', 'Инновации', 'Долговечность'].map((label) => ({ label })),
})

/** All texts come from the design prototype and README. */
export const globals = (id: MediaId): SeedGlobals => ({
  layout: {
    header: { ctaLabel: 'Рассчитать проект' },
    nav: {
      about: { label: 'О нас' },
      salons: { label: 'Фирменные салоны', shortLabel: 'Салоны' },
      works: { label: 'Наши работы' },
      catalogs: { label: 'Каталоги' },
      designers: { label: 'Дизайнерам' },
      news: { label: 'Новости / новинки', shortLabel: 'Новости' },
    },
    menu: { hotlineLabel: HOTLINE_LABEL, messengersLabel: MESSENGERS_LABEL },
    dock: { askLabel: 'Спросить' },
    footer: {
      sloganText: 'Производитель мебели',
      sloganAccent: 'для жизни',
      hotlineLabel: HOTLINE_LABEL,
      copyright: 'MGS MEBEL. Все права защищены.',
    },
  },
  settings: {
    contacts: { hotlinePhone: '8 800 100-16-58' },
    messengers: {
      max: 'https://max.ru/join/NT3_4HMbMu7LfvccQtmD3eV4-uv7nvlv6tv-Bm2mgaQ',
      whatsapp: 'https://wa.me/79270963555',
      telegram: 'https://t.me/mgsmebel_official',
    },
    designerManager: {
      photo: id('U11'),
      name: 'Харламов Максим Игоревич',
      position: 'Руководитель развития',
      phone: '8 995 783-94-28',
      whatsapp: 'https://wa.me/79957839428',
    },
  },
  stats: {
    items: [
      { value: '1000+', label: 'изделий производим ежедневно' },
      { value: '400+', label: 'филиалов в городах России' },
      { value: '20+', label: 'лет на рынке мебели' },
      { value: '20 000', label: 'м² производственных площадей' },
      { value: '50+', label: 'фирменных салонов' },
      { value: '2000+', label: 'декоров в ассортименте' },
    ],
  },
  home: {
    hero: {
      label: 'о нас',
      title: 'Мы — MGS MEBEL',
      text: HERO_TEXT,
      ctaLabel: 'Рассчитать проект',
      video: id('H1'),
      poster: id('U1'),
    },
    history: { ...history(id), linkLabel: 'Подробнее о компании' },
    news: { label: 'новости', title: 'Что нового' },
    salons: { label: 'фирменные салоны', title: '50+ салонов по России' },
    works: { label: 'наши работы', title: 'Реальные проекты', buttonLabel: 'Смотреть все работы' },
    meta: seoMeta({
      title: 'Мы — MGS MEBEL',
      brand: 'start',
      description: HERO_TEXT,
      image: id('U1'),
    }),
  },
  about: {
    hero: {
      label: 'о нас',
      title: 'Мы — MGS MEBEL',
      text: HERO_TEXT,
      video: id('H2'),
      poster: id('U10'),
    },
    history: history(id),
    mission: {
      label: 'миссия',
      title: 'Воплощаем мечты и идеи для жизни',
      video: id('H3'),
      poster: id('U5'),
    },
    hardware: {
      label: 'фурнитура',
      title: 'Фурнитура MGS — наша гордость',
      text: paragraphs(
        'MGS MEBEL предлагает широкий ассортимент качественной фурнитуры и комплектующих для мебели под собственным брендом.',
        'Более 15 000 партнёров-производителей мебели уже доверились MGS MEBEL благодаря отлаженной системе работы и программе строгого контроля качества. Много лет мы отвечаем запросам современного российского рынка мебели.',
      ),
      warrantyValue: '10',
      warrantyUnit: 'лет',
      warrantyText: 'Гарантия от MGS на всю фирменную фурнитуру',
      items: [
        { photo: id('U7'), title: 'Петли с доводчиком' },
        { photo: id('U6'), title: 'Направляющие' },
        { photo: id('U9'), title: 'Ящики' },
        { photo: id('U8'), title: 'Подъёмные механизмы' },
        { photo: id('U4'), title: 'Системы хранения' },
        { photo: id('U3'), title: 'Профили и подсветка' },
      ],
      qualityWord: 'QUALITY',
    },
    exhibitions: {
      label: 'выставки',
      title: 'MGS MEBEL на выставках',
      text: 'Мы следим за новинками и трендами в мире дизайна и каждый год показываем покупателям всё новое в мебельной индустрии.',
      items: [
        {
          date: '19.02.2026',
          title: 'ARTDOM 2026',
          text: 'MGS MEBEL — официальный партнёр ALVIC CENTER на международной дизайнерской выставке ARTDOM.',
          video: id('H5'),
          poster: id('U4'),
        },
        {
          date: '27.11.2025',
          title: 'Презентация 2025',
          text: 'Представили новые коллекции в шоу-руме MGS MEBEL в Химках.',
          video: id('H4'),
          poster: id('U1'),
        },
        {
          date: '2025',
          title: 'ARTDOM 2025',
          text: 'Показали новинки кухонь и гардеробных на выставке ARTDOM.',
          video: id('H6'),
          poster: id('U2'),
        },
      ],
    },
    meta: seoMeta({ title: 'Мы — MGS MEBEL', description: HERO_TEXT, image: id('U10') }),
  },
  salonsPage: {
    hero: {
      label: 'фирменные салоны',
      title: 'Приходите в гости',
      lead: 'Образцы фасадов, декоров и готовые экспозиции — в каждом салоне.',
    },
    map: { listCaption: 'в Москве и области', cardCtaLabel: 'Заказать персональный дизайн' },
    reviews: { label: 'обзор салонов', title: 'Загляните внутрь' },
    // No hero media: the first section with media is the salon review (Пражская).
    meta: seoMeta({
      title: 'Приходите в гости',
      description: 'Образцы фасадов, декоров и готовые экспозиции — в каждом салоне.',
      image: id('U5'),
    }),
  },
  worksPage: {
    hero: { label: 'наши работы', title: 'Реальные проекты' },
    viewer: { ctaLabel: 'Хочу такой же проект' },
    // No description text on the page; the image is the first photo of the first project.
    meta: seoMeta({ title: 'Реальные проекты', image: id(projectPlan[0].photos[0]) }),
  },
  catalogsPage: {
    hero: {
      label: 'каталоги',
      title: 'Каталоги продукции',
      lead: 'Смотрите онлайн или скачивайте в PDF.',
    },
    meta: seoMeta({
      title: 'Каталоги продукции',
      description: 'Смотрите онлайн или скачивайте в PDF.',
      image: id('U6'),
    }),
  },
  designers: {
    hero: {
      label: 'дизайнерам',
      title: 'Ваш дизайн.\nНаши возможности.',
      text: 'Вы создаёте интерьер — мы помогаем реализовать его именно таким, каким он был задуман. Без упрощения идеи, бесконечных согласований и поиска подрядчиков под каждую задачу.',
      audiences: ['Дизайнерам', 'Архитекторам', 'Интерьерным студиям'].map((label) => ({ label })),
      video: id('H4'),
      poster: id('U4'),
    },
    capabilities: {
      label: 'возможности',
      title: 'Что мы берём на себя',
      items: [
        {
          photo: id('U10'),
          title: 'Не упрощаем сложное',
          text: 'Нестандартные размеры, сложные конструкции, интегрированные решения и необычные сочетания материалов.',
        },
        {
          photo: id('U7'),
          title: 'Весь проект в одних руках',
          text: 'Кухни, гардеробные, гостиные и прихожие — одно производство вместо нескольких подрядчиков.',
        },
        {
          photo: id('U6'),
          title: '2000+ декоров',
          text: 'Фасады ALVIC, EGGER, кварцевый агломерат — подберём материал под вашу концепцию.',
        },
        {
          photo: id('U8'),
          title: 'Личный менеджер',
          text: 'Один контакт на весь проект: от расчёта до монтажа, без бесконечных согласований.',
        },
      ],
    },
    project: {
      label: 'проект',
      title: 'Пример реализованного проекта',
      video: id('H5'),
      poster: id('U2'),
      caption: 'Кухня-гостиная, 42 м²',
      subcaption: 'Дизайн — студия партнёра · производство — MGS MEBEL',
    },
    cooperation: {
      label: 'сотрудничество',
      title: 'Начнём сотрудничество?',
      messengersLabel: MESSENGERS_LABEL,
    },
    meta: seoMeta({
      title: 'Ваш дизайн.\nНаши возможности.',
      description:
        'Вы создаёте интерьер — мы помогаем реализовать его именно таким, каким он был задуман. Без упрощения идеи, бесконечных согласований и поиска подрядчиков под каждую задачу.',
      image: id('U4'),
    }),
  },
  newsPage: {
    hero: { label: 'mgs новости / новинки', title: 'События и новинки' },
    articleCta: {
      title: 'Хотите увидеть новинки вживую?',
      text: 'Приходите в фирменный салон — покажем образцы и рассчитаем проект.',
      primaryLabel: 'Найти салон',
      secondaryLabel: 'Рассчитать проект',
    },
    related: { title: 'Ещё новости' },
    // No description text on the page; the image is the cover of the latest news.
    meta: seoMeta({ title: 'События и новинки', image: id('U4') }),
  },
})
