// README §9: hit area ≥ 44. For controls drawn smaller, a centred ::before of the `hit` size (44)
// takes the pointer. A fixed size, not negative insets: insets start at the padding box, so a 1px
// border would shrink the area to 42.

/** Both axes: icon buttons 32/36/40. */
export const HIT_AREA =
  'before:absolute before:top-1/2 before:left-1/2 before:size-hit before:-translate-1/2'

/** Height only: pills 38/40 are wider than 44 anyway. */
export const HIT_AREA_Y =
  'before:absolute before:inset-x-0 before:top-1/2 before:h-hit before:-translate-y-1/2'
