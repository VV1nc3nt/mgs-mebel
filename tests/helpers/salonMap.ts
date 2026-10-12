import { expect, type Locator } from '@playwright/test'

/** Inset of the salon card and of «Показать салон» from the map edges (bottom-3 left-3). */
const INSET = 12
const BUTTON_HEIGHT = 44

/**
 * «Показать салон» takes the place of the closed card: inside the map, at its bottom-left corner.
 * `map` is the map block (`.bg-map-bg`, it clips its content), `show` — the button.
 */
export const expectShowSalonAtCorner = async (map: Locator, show: Locator) => {
  await expect(show).toBeVisible()
  const box = (await map.boundingBox())!
  const button = (await show.boundingBox())!
  const inside = {
    left: button.x >= box.x - 0.05,
    top: button.y >= box.y - 0.05,
    right: button.x + button.width <= box.x + box.width + 0.05,
    bottom: button.y + button.height <= box.y + box.height + 0.05,
  }
  expect(inside, 'the button lies inside the map').toEqual({
    left: true,
    top: true,
    right: true,
    bottom: true,
  })
  expect(button.height).toBeCloseTo(BUTTON_HEIGHT, 1)
  expect(button.x, 'left = the map left + 12').toBeCloseTo(box.x + INSET, 1)
  expect(button.y + button.height, 'bottom = the map bottom − 12').toBeCloseTo(
    box.y + box.height - INSET,
    1,
  )
}
