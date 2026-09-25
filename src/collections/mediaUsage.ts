import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeDeleteHook, type Payload } from 'payload'

type Reference = { table: string; column: string }
type Owner = {
  kind: 'collection' | 'global'
  slug: string
  label: string
  table: string
  useAsTitle?: string
}

const snake = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

const labelOf = (label: unknown, fallback: string): string =>
  typeof label === 'string'
    ? label
    : typeof label === 'object' && label && 'ru' in label
      ? String(label.ru)
      : fallback

let referencesCache: Reference[] | undefined

/** Every column with a foreign key to media, except versions and Payload internals. */
const findReferences = async (payload: Payload): Promise<Reference[]> => {
  if (referencesCache) return referencesCache
  const result = await payload.db.drizzle.execute(sql`
    SELECT kcu.table_name AS "table", kcu.column_name AS "column"
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = rc.constraint_name AND kcu.constraint_schema = rc.constraint_schema
    JOIN information_schema.key_column_usage pk
      ON pk.constraint_name = rc.unique_constraint_name AND pk.constraint_schema = rc.unique_constraint_schema
    WHERE pk.table_name = 'media' AND kcu.constraint_schema = current_schema()
  `)
  referencesCache = (result.rows as Reference[]).filter(
    ({ table }) => !table.startsWith('_') && !table.startsWith('payload_'),
  )
  return referencesCache
}

const owners = (payload: Payload): Owner[] =>
  [
    ...payload.config.collections.map<Owner>((c) => ({
      kind: 'collection',
      slug: c.slug,
      label: labelOf(c.labels?.plural, c.slug),
      table: snake(c.slug),
      useAsTitle: c.admin?.useAsTitle,
    })),
    ...payload.config.globals.map<Owner>((g) => ({
      kind: 'global',
      slug: g.slug,
      label: labelOf(g.label, g.slug),
      table: snake(g.slug),
    })),
  ].sort((a, b) => b.table.length - a.table.length) // longest prefix first: salons_page before salons

/**
 * Deleting a media file that is still referenced would either fail on a NOT NULL column
 * or silently empty the field. Refuse with a readable list of places instead.
 */
export const preventDeletingUsedMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { payload } = req
  const places = new Set<string>()
  const allOwners = owners(payload)

  for (const { table, column } of await findReferences(payload)) {
    const { rows } = await payload.db.drizzle.execute(
      sql`SELECT * FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${id} LIMIT 20`,
    )
    if (!rows.length) continue
    const owner = allOwners.find((o) => table === o.table || table.startsWith(`${o.table}_`))
    if (!owner) {
      places.add(table)
      continue
    }
    if (owner.kind === 'global') {
      places.add(`«${owner.label}»`)
      continue
    }
    for (const row of rows as Record<string, unknown>[]) {
      const docId = table === owner.table ? row.id : (row.parent_id ?? row._parent_id)
      let title: string | undefined
      if (typeof docId === 'number' && owner.useAsTitle) {
        const doc = await payload
          .findByID({ collection: owner.slug as 'projects', id: docId, depth: 0, req, draft: true })
          .catch(() => null)
        const value = doc
          ? (doc as unknown as Record<string, unknown>)[owner.useAsTitle]
          : undefined
        if (typeof value === 'string') title = value
      }
      places.add(title ? `${owner.label}: «${title}»` : owner.label)
    }
  }

  if (places.size) {
    throw new ValidationError({
      collection: 'media',
      errors: [
        {
          path: 'file',
          message: `Файл используется: ${[...places].join(', ')}. Сначала замените или уберите его там.`,
        },
      ],
    })
  }
}
