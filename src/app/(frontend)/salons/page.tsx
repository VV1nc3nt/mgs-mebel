import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Фирменные салоны',
}

export default function Page() {
  return (
    <section className="page-container py-section xl:py-section-xl">
      <h1 className="text-h1 md:text-h1-md xl:text-h1-xl">Фирменные салоны</h1>
    </section>
  )
}
