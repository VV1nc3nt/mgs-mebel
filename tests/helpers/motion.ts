import type { Locator } from '@playwright/test'

/**
 * End of the CSS transitions and animations of an element and its subtree (a messenger choice
 * opening, stagger included). A click on a cell that still moves fails Playwright's stability
 * check, and its retries scroll the page to reveal the cell (block end, centre, start in turn) —
 * a scroll that closes the choice, as any scroll does.
 */
export const motionEnded = (locator: Locator) =>
  locator.evaluate((el) =>
    // A transition replaced mid-way rejects its promise: that one is over too
    Promise.all(
      el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => null)),
    ),
  )

/**
 * End of the CSS transitions only: animations (a progress fill whose end switches the hero
 * segment) are left running.
 */
export const transitionsEnded = (locator: Locator) =>
  locator.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => null)),
    ),
  )
