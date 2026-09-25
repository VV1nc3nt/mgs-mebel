import type { TextareaField, TextField } from 'payload'

/** Section label (README §5.1). Stored without «#». */
export const labelField = (): TextField => ({
  name: 'label',
  type: 'text',
  label: 'Метка раздела',
  admin: { description: 'Без «#» — он добавляется автоматически.' },
})

export const titleField = (required = false): TextField => ({
  name: 'title',
  type: 'text',
  label: 'Заголовок',
  required,
})

export const textField = (name = 'text', label = 'Текст'): TextareaField => ({
  name,
  type: 'textarea',
  label,
  admin: { description: 'Абзацы разделяются пустой строкой.' },
})

export const leadField = (): TextareaField => ({ name: 'lead', type: 'textarea', label: 'Лид' })
