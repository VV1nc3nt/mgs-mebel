import { Button } from '@/components/ui/Button'

export const NOT_FOUND_TITLE = 'Страница не найдена'

/** Body of both 404s: unmatched URLs (global-not-found) and notFound() inside a page. */
export function NotFoundContent() {
  return (
    <section className="mx-auto max-w-page px-gutter py-section md:px-gutter-md xl:px-gutter-xl xl:py-section-xl">
      <h1 className="text-h1 md:text-h1-md xl:text-h1-xl">{NOT_FOUND_TITLE}</h1>
      <p className="mt-heading max-w-article text-lead text-text-2">
        Возможно, адрес введён с ошибкой или страница была удалена.
      </p>
      <Button href="/" size={44} className="mt-8">
        Перейти на главную
      </Button>
    </section>
  )
}
