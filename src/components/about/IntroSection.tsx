import type { About } from '@/payload-types'

type Props = {
  /** `intro` of the about global. */
  intro: About['intro'] | undefined
}

/**
 * «О нас» intro (about v2 §2.3): a centred paragraph, its last phrase in accent. Desktop only —
 * the text is in the HTML at every width. No text — no section.
 */
export function IntroSection({ intro }: Props) {
  const text = intro?.text?.trim()
  if (!text) return null
  const accent = intro?.accent?.trim()
  return (
    <section className="page-container hidden pt-section-xl xl:block">
      <p className="mx-auto max-w-intro text-center text-intro text-balance">
        {text}
        {accent && (
          <>
            {' '}
            <span className="text-accent">{accent}</span>
          </>
        )}
      </p>
    </section>
  )
}
