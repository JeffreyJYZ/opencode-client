import { Shell } from "@/app/Shell";
import { SHELL_CONTRIBUTION_ID } from "@/constants/plugins";
import { SLOT_LOCKED } from "@/constants/slots";
import type { Disposable } from "@/plugins/disposable";
import { register } from "@/plugins/registry";

/**
 * The shell is a built-in contribution (M4.17, spec 040 §Model): the app renders
 * its own frame through `<Slot id="app.substrate">`, and this registrant puts
 * `Shell` there — through the same `register` a plugin's `host.ui.register`
 * reaches, with the substrate as its actor (the only caller a locked area
 * accepts). The frame renders the identical components in the identical order
 * and looks exactly as before; with the registration absent the slot renders
 * nothing at all, which is what a test can prove.
 *
 * `app.builtins` gets **no contents and no renderer** of its own: it is the
 * built-ins' *grouping*, not a second place to draw. Its members — the topnav
 * controls, the sidebar panels, the settings sections — already register
 * through the same calls a plugin uses (`topnavBuiltins.tsx`,
 * `builtinPanels.tsx`, the settings registry) and render where their hosts put
 * them, so the app may never draw a second copy of them, whatever container
 * hosted `app.builtins`. Spec 040 §Slots reads as though both locked areas are
 * places to draw; the controller corrects the spec (the manager lists both
 * areas as built-in rows and refuses their disable instead).
 */

let installed: Disposable[] | null = null;

/** Register the shell once; a second call is a no-op, never a duplicate. */
export function registerShellBuiltins(): void {
	if (installed !== null) return;
	installed = [
		register({ id: SHELL_CONTRIBUTION_ID, slot: SLOT_LOCKED.substrate, component: Shell }),
	];
}

/** Retract the shell contribution. The tests' teardown; production never calls it. */
export function disposeShellBuiltins(): void {
	if (installed === null) return;
	for (const disposable of installed.splice(0)) disposable.dispose();
	installed = null;
}
