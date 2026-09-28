import { ArrowLeft, ArrowRight, ArrowUp, Download, Menu, Play, X } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import type { ReactNode } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { BgVideo } from '@/components/ui/BgVideo'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FilterChip } from '@/components/ui/FilterChip'
import { IconButton } from '@/components/ui/IconButton'
import { MediaCard } from '@/components/ui/MediaCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { StatCard } from '@/components/ui/StatCard'
import { MESSENGER_NAMES } from '@/lib/chrome'
import { getUiKitData } from './data'
import { CatalogsSegmentDemo, ViewSegmentDemo, WorksSegmentDemo } from './SegmentDemo'

// Dev sandbox: hidden from search engines and never listed in the sitemap.
export const metadata: Metadata = {
  title: 'UI-kit',
  robots: { index: false, follow: false },
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' }).format(new Date(iso))

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-heading border-t border-divider pt-10">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  )
}

function Row({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {note && <p className="text-body-s text-text-3">{note}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default async function UiKitPage() {
  // Rendered per request: the flag is read at runtime, not inlined at build time.
  await connection()
  if (process.env.ENABLE_UI_KIT !== 'true') notFound()

  const { news, newsCount, hero, history, mission, stats, workCounts, catalogCounts } =
    await getUiKitData()
  const [first, second, third] = news

  return (
    <div className="mx-auto flex max-w-page flex-col gap-12 px-gutter py-section md:px-gutter-md xl:px-gutter-xl">
      <h1 className="text-h1 md:text-h1-md xl:text-h1-xl">UI-kit</h1>
      <p className="max-w-article text-body text-text-3">
        Все примитивы в вариантах, размерах и состояниях. Hover работает только на устройствах с
        указателем; фокус — клавишей Tab. Демо-данные — из seed; без базы примитивы показывают
        пустые состояния.
      </p>

      <Section title="SectionLabel">
        <SectionLabel>о нас</SectionLabel>
        <SectionLabel>наши работы</SectionLabel>
        <Row note="Длинная метка">
          <SectionLabel>mgs новости / новинки</SectionLabel>
        </Row>
      </Section>

      <Section title="Button">
        <Row note="Варианты. Hover: primary → accent-hover, outline → обводка text.">
          <Button arrow>Рассчитать проект</Button>
          <Button variant="outline" arrow>
            Смотреть все работы
          </Button>
        </Row>
        <Row note="Размеры 40 / 44 / 48 / 52 / 56">
          {([40, 44, 48, 52, 56] as const).map((size) => (
            <Button key={size} size={size}>
              Рассчитать проект
            </Button>
          ))}
        </Row>
        <Row note="mobile-full: во всю ширину до 768, дальше по контенту">
          <Button width="mobile-full" arrow>
            Рассчитать проект
          </Button>
        </Row>
        <Row note="Ссылки: внутренняя (next/link), внешняя (новая вкладка), tel:">
          <Button href="/works" variant="outline" size={48}>
            Смотреть все работы
          </Button>
          <Button href="https://t.me/mgsmebel_official" variant="outline" size={48}>
            Telegram
          </Button>
          <Button href="tel:88001001658" variant="outline" size={48}>
            8 800 100-16-58
          </Button>
        </Row>
        <Row note="Иконка слева, длинный текст">
          <Button variant="outline" size={48} icon={<Download />}>
            PDF
          </Button>
          <Button size={48} arrow>
            Заказать персональный дизайн
          </Button>
        </Row>
        <Row note="Disabled: кнопка и ссылка">
          <Button disabled>Рассчитать проект</Button>
          <Button href="/works" variant="outline" disabled>
            Показать ещё
          </Button>
        </Row>
        <Row note="На лаймовом блоке: inverse / inverse-outline">
          <div className="flex flex-wrap gap-3 rounded-media bg-accent p-7">
            <Button variant="inverse" size={48}>
              Найти салон
            </Button>
            <Button variant="inverse-outline" size={48}>
              Рассчитать проект
            </Button>
          </div>
        </Row>
      </Section>

      <Section title="IconButton">
        {(['surface', 'glass', 'ghost', 'outline', 'outline-media', 'light'] as const).map(
          (variant) => (
            <Row key={variant} note={`${variant}: 32 / 36 / 40 / 44 / 48 / 56`}>
              {([32, 36, 40, 44, 48, 56] as const).map((size) => (
                <IconButton key={size} variant={variant} size={size} aria-label="Наверх">
                  <ArrowUp />
                </IconButton>
              ))}
            </Row>
          ),
        )}
        <Row note="Соц-кнопки подвала: surface 48, логотипы 22">
          {(['telegram', 'max', 'whatsapp'] as const).map((kind) => (
            <IconButton key={kind} size={48} aria-label={MESSENGER_NAMES[kind]}>
              <MessengerIcon kind={kind} />
            </IconButton>
          ))}
        </Row>
        <Row note="Ссылки и disabled">
          <IconButton href="/" variant="outline" aria-label="Назад">
            <ArrowLeft />
          </IconButton>
          <IconButton variant="outline" aria-label="Меню">
            <Menu />
          </IconButton>
          <IconButton variant="outline" size={44} aria-label="Предыдущая новость">
            <ArrowLeft />
          </IconButton>
          <IconButton variant="light" size={44} aria-label="Следующая новость">
            <ArrowRight />
          </IconButton>
          <IconButton disabled aria-label="Скачать PDF">
            <Download />
          </IconButton>
        </Row>
      </Section>

      <Section title="Chip">
        <Row note="surface — ценности">
          {(history?.values?.length
            ? history.values.map((v) => v.label)
            : ['Качество', 'Инновации', 'Долговечность']
          ).map((label) => (
            <Chip key={label}>{label}</Chip>
          ))}
        </Row>
        <Row note="surface-media — hero «Дизайнерам», длинный текст">
          <Chip variant="surface-media">Дизайнерам</Chip>
          <Chip variant="surface-media">Интерьерным студиям</Chip>
        </Row>
        <Row note="glass, accent, outline, frost; bordered — шапка статьи">
          <Chip variant="glass">19.02.2026</Chip>
          <Chip variant="glass" muted strong>
            Новость
          </Chip>
          <Chip variant="accent">Новинка</Chip>
          <Chip variant="accent" bordered>
            Новинка
          </Chip>
          <Chip variant="glass" muted strong bordered>
            Новость
          </Chip>
          <Chip variant="outline">19.02.2026</Chip>
          <Chip variant="frost">видео + фото</Chip>
          <Chip variant="glass" icon={<Play className="size-3 fill-current" />}>
            0:12
          </Chip>
        </Row>
      </Section>

      <Section title="FilterChip">
        <Row note="Кнопки (aria-pressed), счётчик из базы; без базы — без счётчика">
          <FilterChip selected count={newsCount?.all}>
            все
          </FilterChip>
          <FilterChip selected={false} count={newsCount?.news}>
            новости
          </FilterChip>
          <FilterChip selected={false} count={newsCount?.new}>
            новинки
          </FilterChip>
        </Row>
        <Row note="Ссылки (aria-current). Hover неактивного: обводка и текст text.">
          {['reels', 'комплекс', 'кухни', 'прихожие'].map((label) => (
            <FilterChip key={label} href="/works" selected={label === 'комплекс'}>
              {label}
            </FilterChip>
          ))}
        </Row>
      </Section>

      <Section title="StatCard">
        {stats.length ? (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            {stats.map((item) => (
              <StatCard key={item.id ?? item.value} value={item.value} label={item.label} />
            ))}
          </div>
        ) : (
          <p className="text-body-s text-text-3">Глобал stats пуст — секция не выводится.</p>
        )}
      </Section>

      <Section title="MediaCard">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MediaCard
            media={first?.cover}
            href={first ? `/news/${first.slug}` : undefined}
            sizes={{ base: '100vw', md: '50vw', xl: '33vw' }}
            overlay="card"
            className="h-105"
            priority
            top={
              first && (
                <>
                  <Chip variant="glass">{formatDate(first.date)}</Chip>
                  <Chip
                    variant={first.type === 'new' ? 'accent' : 'glass'}
                    muted={first.type !== 'new'}
                    strong
                  >
                    {first.type === 'new' ? 'Новинка' : 'Новость'}
                  </Chip>
                </>
              )
            }
          >
            {first && (
              <>
                <h3 className="text-h3">{first.title}</h3>
                {first.lead && <p className="text-body-s text-text-2">{first.lead}</p>}
              </>
            )}
          </MediaCard>

          <MediaCard
            media={second?.cover}
            as="article"
            sizes={{ base: '100vw', md: '50vw', xl: '33vw' }}
            overlay="card"
            className="h-105"
            top={
              <>
                {second && <Chip variant="glass">{formatDate(second.date)}</Chip>}
                <IconButton variant="glass" size={36} aria-label="Закрыть" className="ml-auto">
                  <X />
                </IconButton>
              </>
            }
          >
            {second && <h3 className="text-h3">{second.title}</h3>}
            <div className="flex flex-wrap gap-2">
              <Button variant="light" size={44}>
                На карте
              </Button>
              <Button variant="outline-media" size={44}>
                Маршрут
              </Button>
            </div>
          </MediaCard>

          <MediaCard
            media={null}
            sizes={{ base: '100vw', md: '50vw', xl: '33vw' }}
            overlay="card"
            className="h-105"
          >
            <p className="text-body-s text-text-3">Пустое медиа: фон surface, без изображения.</p>
          </MediaCard>
        </div>

        <Row note="Превью работ 9:14 (ссылка, hover opacity .88), фото 3:4 / 1:1 без оверлея">
          <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
            {[first, second, third].map((item, index) => (
              <MediaCard
                key={item?.id ?? index}
                media={item?.cover}
                imageSize="thumb"
                href="/works"
                sizes={{ base: '50vw', md: '25vw', xl: '20vw' }}
                ratio="9/14"
                radius="thumb-lg"
                overlay="work"
                inset="sm"
              >
                {item && <span className="text-body-xs font-bold">{item.title}</span>}
              </MediaCard>
            ))}
            <MediaCard
              media={history?.photoMain}
              sizes={{ base: '50vw', md: '25vw', xl: '20vw' }}
              ratio="3/4"
              radius="card"
            />
          </div>
        </Row>
        <Row note="Обложка статьи: радиус 24 / 28 / 32">
          <MediaCard
            media={history?.photoSecondary}
            imageSize="hero"
            sizes={{ base: '100vw' }}
            ratio="16/9"
            radius="cover"
            className="w-full"
          />
        </Row>
      </Section>

      <Section title="BgVideo">
        <Row note="Hero: постер — LCP (priority), видео стартует сразу. Reduced motion / Save-Data / ошибка автоплея — только постер.">
          <div className="relative isolate flex h-160 w-full flex-col justify-end overflow-hidden rounded-media p-5 md:h-195 md:p-8">
            {hero ? (
              <BgVideo
                poster={hero.poster}
                video={hero.video}
                sizes={{ base: '100vw' }}
                priority
                className="-z-20"
              />
            ) : (
              <div className="absolute inset-0 -z-20 bg-surface" />
            )}
            <div className="absolute inset-0 -z-10 bg-overlay-hero" />
            <div className="flex max-w-2xl flex-col gap-4">
              {hero?.label && <SectionLabel>{hero.label}</SectionLabel>}
              <h3 className="text-h2 md:text-h2-md">{hero?.title ?? 'Пустой глобал home'}</h3>
              {hero?.text && <p className="text-body text-text-2">{hero.text}</p>}
              {hero?.ctaLabel && (
                <Button width="mobile-full" arrow>
                  {hero.ctaLabel}
                </Button>
              )}
            </div>
          </div>
        </Row>
        <Row note="В карточке (MediaCard video): монтируется у вьюпорта, вне вьюпорта — пауза">
          <MediaCard
            media={mission?.poster}
            video={mission?.video}
            sizes={{ base: '100vw', md: '50vw' }}
            ratio="4/5"
            className="w-full md:w-1/2"
          />
        </Row>
      </Section>

      <Section title="SegmentFilter">
        <Row note="Sticky-лента со счётчиком (работы, счёт из базы). Активный пункт прокручивается в видимую область.">
          <div className="flex w-full flex-col gap-3.5">
            <WorksSegmentDemo workCounts={workCounts} />
            {/* Content under the bar, so it has room to stick while scrolling */}
            <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4 xl:grid-cols-6">
              {[...news, ...news].map((item, index) => (
                <MediaCard
                  key={`${item.id}-${index}`}
                  media={item.cover}
                  imageSize="thumb"
                  sizes={{ base: '33vw', md: '25vw', xl: '16vw' }}
                  ratio="9/16"
                  radius="thumb"
                  overlay="work"
                />
              ))}
            </div>
          </div>
        </Row>
        <Row note="Не sticky (каталоги)">
          <div className="w-full">
            <CatalogsSegmentDemo catalogCounts={catalogCounts} />
          </div>
        </Row>
        <Row note="overlay — «Карта / Список» поверх карты">
          <div className="flex h-40 w-full items-start justify-end rounded-media bg-map-bg p-4">
            <ViewSegmentDemo />
          </div>
        </Row>
      </Section>
    </div>
  )
}
