import type { ProjectAbout as About } from '@/lib/workProject'

type Props = {
  about: About
  /** «Цена актуальна на …» (worksPage.prices); empty — no line. */
  priceDate: string | null
}

const LABEL_ID = 'project-about-label'

/**
 * «О проекте» of a project page (works v2 §3.3): the text; the price; the designer. Below 768 one
 * column, from 768 the text and, beside it, the price and the designer. Empty parts are left out.
 */
export function ProjectAbout({ about, priceDate }: Props) {
  const side = about.price || about.designer
  return (
    <section aria-labelledby={LABEL_ID} className="page-container">
      <div className="flex flex-col gap-5 rounded-media border border-border bg-surface p-6 md:grid md:grid-project-about md:gap-x-10">
        <div className="flex flex-col gap-5">
          <p
            id={LABEL_ID}
            className="flex min-h-label items-center gap-2.5 text-label text-accent uppercase"
          >
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-accent" />О проекте
          </p>
          {about.text.map((paragraph, i) => (
            <p key={i} className="text-body text-pretty text-text-2">
              {paragraph}
            </p>
          ))}
        </div>
        {side && (
          <div className="flex flex-col gap-5 border-t border-border pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-10">
            {about.price && (
              <div className="flex flex-col gap-1">
                <p className="text-body-xs font-semibold text-text-4">Стоимость проекта</p>
                <p className="text-price whitespace-nowrap text-accent">{about.price}</p>
                {priceDate && (
                  <p className="text-caption font-normal text-text-4">
                    Цена актуальна на {priceDate}
                  </p>
                )}
              </div>
            )}
            {about.price && about.designer && <hr className="border-border" />}
            {about.designer && (
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-body font-extrabold text-accent shadow-avatar-ring-sm"
                >
                  {Array.from(about.designer)[0]?.toUpperCase()}
                </span>
                <p className="flex flex-col gap-0.5">
                  <span className="text-caption font-normal text-text-4">Дизайнер проекта</span>
                  <span className="text-body font-bold">{about.designer}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
