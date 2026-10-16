/**
 * The slots the host knows (spec 040 §Slots).
 *
 * One `as const` tuple is the single source of the `SlotName` type *and* of the
 * runtime check, so a name can never be a type without being a slot. The order is
 * the spec's; `app.substrate` and `app.builtins` are the two locked areas.
 */
export const SLOTS = [
	"app.substrate",
	"topnav.left",
	"topnav.center",
	"topnav.right",
	"home.hero",
	"home.widgets",
	"home.actions",
	"session.toolbar",
	"session.sidebar.panels",
	"transcript.row.actions",
	"transcript.footer",
	"composer.toolbar",
	"composer.above",
	"composer.below",
	"statusline.left",
	"statusline.right",
	"settings.sections",
	"overlays",
	"app.builtins",
] as const;

export type SlotName = (typeof SLOTS)[number];

const SLOT_NAMES: ReadonlySet<string> = new Set<string>(SLOTS);

/** The runtime half of the tuple: the only check a slot name ever gets. */
export function isSlotName(value: string): value is SlotName {
	return SLOT_NAMES.has(value);
}

/**
 * The two areas a **plugin** may not contribute to (spec 040 §Model: the app
 * substrate and the plugin manager). The substrate registers into them through
 * the same function, which is what proves the lock is a check rather than a
 * convention.
 */
export const LOCKED_SLOTS: readonly SlotName[] = ["app.substrate", "app.builtins"];

const LOCKED: ReadonlySet<string> = new Set<string>(LOCKED_SLOTS);

/** Whether a slot is one of the locked areas. */
export function isLockedSlot(value: string): boolean {
	return LOCKED.has(value);
}
