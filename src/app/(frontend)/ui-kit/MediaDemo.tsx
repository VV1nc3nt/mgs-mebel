import { ExhibitionCard, type Exhibition } from '@/components/about/ExhibitionCard'
import { BgVideo } from '@/components/ui/BgVideo'
import { MediaSlider } from '@/components/ui/MediaSlider'
import { PosterImage } from '@/components/ui/PosterImage'
import { PosterPlayer } from '@/components/ui/PosterPlayer'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { asMedia, videoSource } from '@/lib/media'
import type { About } from '@/payload-types'

// The demo links of the seed news (a public RuTube video and a VK Video one)
const RUTUBE = 'https://rutube.ru/video/1480655fcab995b927db77bdd9d83986/'
const VK = 'https://vkvideo.ru/video-71537209_456239752'

const BLOCK = 'aspect-4/5 w-full rounded-media md:aspect-video'

/** Poster player: a file, RuTube, VK Video, neither; the «О нас» presentation data. */
export function PlayerDemo({ mission }: { mission: About['mission'] | null }) {
  if (!asMedia(mission?.poster)) {
    return <p className="text-body-s text-text-3">Нет постера презентации «О нас».</p>
  }
  const poster = <PosterImage media={mission!.poster} sizes={{ base: '100vw', md: '50vw' }} />
  const caption = mission?.caption
  return (
    <div className="grid w-full gap-3 md:grid-cols-2">
      <PosterPlayer
        poster={poster}
        file={videoSource(mission?.video)}
        caption={caption}
        duration={mission?.duration}
        className={BLOCK}
      />
      <PosterPlayer poster={poster} embedUrl={RUTUBE} caption="RuTube" className={BLOCK} />
      <PosterPlayer poster={poster} embedUrl={VK} caption="VK Видео" className={BLOCK} />
      <PosterPlayer poster={poster} caption="Без видео: постер без ▶" className={BLOCK} />
    </div>
  )
}

function ProjectCard({ item, index }: { item: Exhibition; index: number }) {
  return (
    <>
      <BgVideo
        poster={item.poster}
        video={item.video}
        sizes={{ base: '86vw', md: '80vw', xl: '82vw' }}
        lazySrc
      />
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-project" />
      <p className="absolute top-4 left-4 flex size-9 items-center justify-center rounded-full glass text-body-xs font-bold text-accent">
        {String(index + 1).padStart(2, '0')}
      </p>
      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
        <p className="text-title-s">{item.title}</p>
        <p className="text-body-xs text-text-2">{item.date}</p>
      </div>
    </>
  )
}

/**
 * Media slider in both variants, from the «О нас» exhibitions: «О нас» (arrows) and «Дизайнерам»
 * (counter and progress, 4:5 / 16:10 / 16:8 cards); one card and none.
 */
export function SliderDemo({ exhibitions }: { exhibitions: About['exhibitions'] | null }) {
  const items = (exhibitions?.items ?? []).filter((item) => asMedia(item.poster))
  if (!items.length) {
    return <p className="text-body-s text-text-3">Нет выставок «О нас» — слайдер не выводится.</p>
  }
  // Out of the page container: the slider has its own
  const bleed = '-mx-gutter md:-mx-gutter-md xl:-mx-gutter-xl'
  return (
    <div className={`flex flex-col gap-10 ${bleed}`}>
      <MediaSlider
        size="exhibition"
        arrows
        prevLabel="Предыдущая выставка"
        nextLabel="Следующая выставка"
        headingId="ui-kit-expo-title"
        heading={
          <SectionHeading
            label="выставки"
            title="Вариант «О нас»: стрелки"
            id="ui-kit-expo-title"
          />
        }
        slides={items.map((item) => (
          <ExhibitionCard key={item.id} item={item} />
        ))}
      />
      <MediaSlider
        size="project"
        arrows
        counter
        progress
        prevLabel="Предыдущий проект"
        nextLabel="Следующий проект"
        headingId="ui-kit-projects-title"
        heading={
          <SectionHeading
            label="проекты"
            title="Вариант «Дизайнерам»: счётчик и прогресс"
            id="ui-kit-projects-title"
          />
        }
        slides={[...items, ...items].map((item, i) => (
          <ProjectCard key={`${item.id}-${i}`} item={item} index={i} />
        ))}
      />
      <MediaSlider
        size="project"
        arrows
        counter
        progress
        headingId="ui-kit-one-title"
        heading={
          <SectionHeading
            label="проекты"
            title="Одна карточка: без управления"
            id="ui-kit-one-title"
          />
        }
        slides={[<ProjectCard key="one" item={items[0]} index={0} />]}
      />
    </div>
  )
}
