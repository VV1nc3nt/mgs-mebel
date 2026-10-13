import Image from 'next/image'

import { LogoMark } from '@/components/app/Logo'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { PosterImage } from '@/components/ui/PosterImage'
import { catalogCategoryLabel } from '@/lib/catalogCategories'
import { catalogMeta } from '@/lib/catalogs'
import { asMedia, imageSizes, imageSource } from '@/lib/media'
import type { CatalogData } from '@/lib/queries'

type Props = { catalog: CatalogData }

/** Without a render: the tilted booklet with the logo, the title and the cover photo. */
function BookletMockup({ catalog }: Props) {
  return (
    <div className="catalog-booklet">
      <div className="catalog-booklet-back" />
      <div className="catalog-booklet-face">
        <div className="catalog-booklet-photo">
          <PosterImage
            media={catalog.cover}
            sizes={{ base: '40vw', md: '20vw', xl: '12vw' }}
            imageSize="thumb"
          />
        </div>
        <div className="catalog-booklet-logo">
          <LogoMark size="booklet" />
        </div>
        <p aria-hidden="true" className="catalog-booklet-title text-booklet-title text-text-2 uppercase">
          {catalog.title}
        </p>
      </div>
    </div>
  )
}

/**
 * Catalog card (README §6.5): the cover — the render on the gradient if there is one, otherwise
 * the booklet mockup — the category badge, the title, pages and file size, «Смотреть» (the PDF in
 * a new tab) and «↓ PDF» (download).
 */
export function CatalogCard({ catalog }: Props) {
  const render = imageSource(catalog.render, 'card')
  const pdf = asMedia(catalog.pdf)
  const category = catalogCategoryLabel(catalog.category)

  return (
    <article className="flex flex-col overflow-hidden rounded-media border border-border bg-surface">
      <div className="catalog-cover flex items-center justify-center">
        {render ? (
          <Image
            src={render.src}
            alt={render.alt}
            fill
            sizes={imageSizes({ base: '100vw', md: '50vw', xl: '33vw' })}
            className="object-contain p-4"
          />
        ) : (
          <>
            <div aria-hidden="true" className="catalog-line" />
            <BookletMockup catalog={catalog} />
          </>
        )}
        {category && (
          <div className="absolute top-4 left-4">
            <Chip variant="glass" muted className="lowercase">
              {category}
            </Chip>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-4.5 pb-5">
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-eyebrow text-text-4 uppercase">Каталог</p>
          <h2 className="text-card-title">{catalog.title}</h2>
          <p className="text-body-xs text-text-3">{catalogMeta(catalog.pages, pdf?.filesize)}</p>
        </div>
        {pdf?.url && (
          <div className="flex gap-2">
            <Button
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              size={48}
              arrow
              className="flex-1"
              aria-label={`Смотреть каталог „${catalog.title}“`}
            >
              Смотреть
            </Button>
            <Button
              href={pdf.url}
              download
              variant="outline"
              size={48}
              icon="↓"
              aria-label={`Скачать PDF „${catalog.title}“`}
            >
              PDF
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
