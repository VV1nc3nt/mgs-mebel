'use client'

import { FieldLabel } from '@payloadcms/ui'
import type { FieldLabelClientComponent, UploadFieldClient } from 'payload'

/**
 * Label with the «required» mark for a field that is required through `validate` only (no NOT NULL
 * on a column with existing data): the admin draws the mark from `field.required`.
 */
export const RequiredLabel: FieldLabelClientComponent<UploadFieldClient> = ({ field, path }) => (
  <FieldLabel label={field?.label} path={path} required />
)
