// Dates are shown in Moscow time: a day-only date stored at noon UTC stays the same day.
const DAY = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
})

/** `dd.MM.yyyy`, e.g. «19.02.2026»; an empty or invalid value gives an empty string. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DAY.format(date)
}
