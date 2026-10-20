'use client'

import type { DefaultCellComponentProps } from 'payload'

/**
 * Number of related documents in a list column (photos of an item, items of a project) instead
 * of the whole list of file names or titles.
 */
export const CountCell = ({ cellData }: DefaultCellComponentProps) => {
  const value = cellData as unknown
  const count = Array.isArray(value)
    ? value.length
    : value && typeof value === 'object' && 'docs' in value && Array.isArray(value.docs)
      ? value.docs.length + ('hasNextPage' in value && value.hasNextPage ? '+' : '')
      : 0
  return <span>{count}</span>
}
