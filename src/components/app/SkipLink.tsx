/** First Tab stop of every page: jumps over the header to <main id="content">. */
export function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-skip-link focus:inline-flex focus:h-11 focus:items-center focus:rounded-pill focus:bg-accent focus:px-4.5 focus:text-button-s focus:text-on-accent"
    >
      Перейти к содержимому
    </a>
  )
}
