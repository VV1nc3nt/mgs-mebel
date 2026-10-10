type Props = {
  /** `salonsPage.map.emptyText`, «Скоро откроемся» by default. */
  text?: string | null
  /** The hotline from `settings`. */
  phone?: { display: string; href: string }
}

/** The «Салоны» page without salons (design: salons v2 §8): the text and the hotline phone. */
export function SalonsEmpty({ text, phone }: Props) {
  const title = text?.trim()
  if (!title && !phone) return null
  return (
    <section className="page-container flex flex-col gap-3 pt-6">
      {title && <h2 className="text-h3">{title}</h2>}
      {phone && (
        <a href={phone.href} className="self-start text-phone">
          {phone.display}
        </a>
      )}
    </section>
  )
}
