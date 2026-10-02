import { serializeJsonLd, type JsonLdData } from '@/lib/jsonld'

/** Structured data for search engines (schema.org). Rendered on the server only. */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
