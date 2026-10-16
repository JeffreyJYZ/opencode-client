/**
 * The context menu's vocabulary (spec 010 §Desktop behaviours: "Context menus").
 *
 * An item's id is its **registry binding's own id** (`KEY_ACTION.*`), so nothing
 * here names an action twice; only the one item the map cannot bind — "open this
 * recents row", whose keyboard route is the row's own `Enter` — needs an id of
 * its own.
 */

/** The menu's accessible name. The item names the action, so this names the region. */
export const CONTEXT_MENU_LABEL = "Context menu";

/**
 * The click-swallowing backdrop's accessible name. It is the menu's dismiss
 * affordance — the only thing a click outside reaches — so it is a control with a
 * name rather than an anonymous layer.
 */
export const MENU_DISMISS_LABEL = "Close menu";

/**
 * The attribute on the click-swallowing backdrop. Named here so a test can press
 * "outside" on the element that actually receives it, rather than guessing at a
 * sibling of the menu.
 */
export const MENU_BACKDROP_ATTR = "data-menu-backdrop";

/** The one item with no chord: the row it belongs to is the route (`Enter`). */
export const MENU_OPEN_SESSION_ID = "menu.open-session";
export const MENU_OPEN_SESSION_LABEL = "Open";

/**
 * The distance a menu keeps from the viewport edge, in pixels.
 *
 * This is the **viewport math** the placement clamps by, not theme spacing: the
 * menu's own padding and gaps come from `--oc-space-*` in
 * `contextMenuStyles.ts`, while a clamp against `window.innerWidth` is arithmetic
 * a CSS token cannot do.
 */
export const MENU_EDGE_GUTTER_PX = 8;

/** The route a keyboard user takes for an item no chord reaches: the element's `Enter`. */
export const MENU_ELEMENT_ROUTE_HINT = "Enter";

/** Why an item whose turn has no running session is inert, shown as its `title`. */
export const MENU_INTERRUPT_IDLE_HINT = "No turn is running";

/**
 * The transcript region's own menu target, for the `⇧F10` route: the region is the
 * element that opened the menu, so it is what focus returns to, and it is alive for
 * as long as it renders.
 */
export const TRANSCRIPT_REGION_TARGET = "transcript.region";
