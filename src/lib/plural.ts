/** Russian plural form: plural(1, ['работа', 'работы', 'работ']) → 'работа'; 5 → 'работ'. */
export const plural = (n: number, [one, few, many]: readonly [string, string, string]): string => {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
